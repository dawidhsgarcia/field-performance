/**
 * Poda cirúrgica de `produtividade/estado` — recuperação de emergência.
 *
 * POR QUE ISTO EXISTE
 * O app grava o estado inteiro em UM documento. O Firestore não limita isso
 * por tamanho (1 MiB), mas por ENTRADAS DE ÍNDICE (40.000). Com histórico
 * acumulado o documento passou do limite e toda gravação passou a ser rejeitada
 * com `invalid-argument: too many index entries for entity
 * /produtividade/estado`. Como o store engolia o erro e mostrava "salvo",
 * ninguém percebeu por semanas.
 *
 * POR QUE É PATCH PARCIAL E NÃO SET
 * Um `set` do documento inteiro continuaria sendo rejeitado: ele é grande
 * demais justamente porque ainda contém o que queremos remover. Só uma
 * escrita parcial (updateMask sem `fields` nesses caminhos) encolhe o
 * documento e por isso passa.
 *
 * POR QUE SOBE A VERSÃO
 * Sem bumpar `_meta.version`, os navegadores abertos seguem com o documento
 * velho em memória, o realtime não recarrega (a versão não mudou) e a
 * próxima edição reconstrói o documento inchado — o erro volta na hora.
 *
 * USO
 *   node scripts/prune-estado.mjs --dry-run
 *   node scripts/prune-estado.mjs --yes
 *   node scripts/prune-estado.mjs --auth admin --dry-run
 *   node scripts/prune-estado.mjs --report-keep 2026-09 --fuel-keep 2026-08 --yes
 */
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_PROJECT = 'produtividade-regionalnorte'
const DOC_PATH = 'produtividade/estado'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const has = (name) => process.argv.includes(name)

const options = {
  auth: arg('--auth', 'rest'),
  project: arg('--project', DEFAULT_PROJECT),
  reportKeep: arg('--report-keep', null),
  slaKeep: arg('--sla-keep', null),
  fuelKeep: arg('--fuel-keep', null),
  execute: has('--yes'),
  outDir: arg('--out', 'backups'),
  fromFile: arg('--from-file', null),
}

// ---------------------------------------------------------------------------
// REST (mesmo padrão já validado em .github/scripts/backup-firestore.mjs)
// ---------------------------------------------------------------------------
const base = (p) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents/${DOC_PATH}`

/** Mesma conversão do backup: o REST devolve {stringValue:...}, a gente quer o valor cru. */
function convert(v) {
  if (v === null || typeof v !== 'object') return v
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('timestampValue' in v) return v.timestampValue
  if (v.mapValue) {
    const fields = v.mapValue.fields || {}
    const out = {}
    for (const k of Object.keys(fields).sort()) out[k] = convert(fields[k])
    return out
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(convert)
  return v
}

async function getToken() {
  // Token já pronto (CI, ou o cache do `firebase login`). Tem precedência:
  // evita colocar senha em variável de ambiente.
  if (process.env.FIREBASE_ACCESS_TOKEN) return process.env.FIREBASE_ACCESS_TOKEN

  if (options.auth === 'admin') {
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_HOMOLOG_SERVICE_ACCOUNT
    if (!saPath) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT (ou FIREBASE_HOMOLOG_SERVICE_ACCOUNT) para --auth admin.')
    if (!fs.existsSync(saPath)) throw new Error('Service account não encontrado:', saPath)
    const { initializeApp, cert, getAccessToken } = await import('firebase-admin/app')
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
    initializeApp({ credential: cert(sa) })
    const t = await getAccessToken()
    return t.access_token
  }
  const API_KEY = process.env.FIREBASE_API_KEY
  const EMAIL = process.env.FIREBASE_BACKUP_EMAIL
  const PASS = process.env.FIREBASE_BACKUP_PASSWORD
  if (!API_KEY || !EMAIL || !PASS) {
    throw new Error('Faltam FIREBASE_API_KEY / FIREBASE_BACKUP_EMAIL / FIREBASE_BACKUP_PASSWORD.')
  }
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
  })
  if (!res.ok) throw new Error(`Falha ao autenticar (HTTP ${res.status}): ${await res.text()}`)
  const data = await res.json()
  if (!data.idToken) throw new Error('Sem idToken na resposta do Firebase Auth')
  return data.idToken
}

async function fetchDoc(token) {
  const res = await fetch(base(options.project), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Falha ao baixar o documento (HTTP ${res.status}): ${await res.text()}`)
  const doc = await res.json()
  const fields = doc.fields || {}
  const plain = {}
  for (const k of Object.keys(fields).sort()) plain[k] = convert(fields[k])
  return { plain, raw: doc }
}

// ---------------------------------------------------------------------------
// Contagem de chaves — a métrica que o Firestore realmente limita
// ---------------------------------------------------------------------------
function countKeys(v) {
  let n = 0
  const walk = (x) => {
    if (Array.isArray(x)) { x.forEach(walk); return }
    if (x && typeof x === 'object') { for (const k of Object.keys(x)) { n++; walk(x[k]) } }
  }
  walk(v)
  return n
}

/**
 * Segmento de field path. O Firestore aceita um segmento sem aspas só se
 * casar `([a-zA-Z_][a-zA-Z_0-9]*)` — então `2026-07`, com hífen, é rejeitado
 * e precisa ir entre crases. Key com ponto tem o mesmo problema.
 */
function escapeSegment(s) {
  if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(s)) return s
  return '`' + s.replace(/\\/g, '\\\\').replace(/`/g, '\\`') + '`'
}
const fieldPath = (...segs) => segs.map(escapeSegment).join('.')

/** Quebra um field path em segmentos, respeitando crases e escapes. */
function splitPath(p) {
  const out = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (quoted && c === '\\') { cur += p[++i]; continue }
    if (c === '`') { quoted = !quoted; continue }
    if (c === '.' && !quoted) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out
}

function latest(keys) {
  return keys.filter((k) => /^\d{4}-\d{2}$/.test(k)).sort().pop() || null
}

// ---------------------------------------------------------------------------
// Planejar o corte
// ---------------------------------------------------------------------------
function plan(state) {
  const allRegions = Object.keys(state.regions || {})

  // Descobre o período mais recente por região, para não depender de ID fixo.
  const newestReport = latest(
    allRegions.flatMap((r) => Object.keys(state.regions[r]?.report || {})),
  )
  const newestFuel = latest(Object.keys(state.fuel || {}))

  const keepReport = options.reportKeep || newestReport
  const keepSla = options.slaKeep || newestReport
  const keepFuel = options.fuelKeep || newestFuel

  const deletes = []
  for (const rid of allRegions) {
    const region = state.regions[rid] || {}
    for (const sec of ['report', 'sla']) {
      for (const period of Object.keys(region[sec] || {})) {
        const keep = sec === 'report' ? keepReport : keepSla
        if (period !== keep) deletes.push({ path: fieldPath('regions', rid, sec, period), period, sec, rid })
      }
    }
  }
  for (const period of Object.keys(state.fuel || {})) {
    if (period !== keepFuel) deletes.push({ path: fieldPath('fuel', period), period, sec: 'fuel', rid: null })
  }

  return { deletes, keepReport, keepSla, keepFuel, regionCount: allRegions.length }
}

/** Réplica o corte em memória, só para estimar o tamanho final. */
function simulate(state, deletes) {
  const copy = JSON.parse(JSON.stringify(state))
  for (const d of deletes) {
    const segs = splitPath(d.path)
    let node = copy
    for (let i = 0; i < segs.length - 1; i++) {
      if (!node || typeof node !== 'object') { node = null; break }
      node = node[segs[i]]
    }
    if (node && typeof node === 'object') delete node[segs[segs.length - 1]]
  }
  return copy
}

/**
 * A projeção de tamanho vale tanto quanto a simulação. Se ela remover coisa
 * errada, o número "depois" mente e a decisão de produção sai errada — então
 * conferimos que o que devia sobreviver sobreviveu e o que devia sumir sumiu.
 */
function verifySimulation(state, projected, deletes, keep) {
  const problems = []
  if (!projected.regions || Object.keys(projected.regions).length !== Object.keys(state.regions).length) {
    problems.push('a simulação alterou a lista de regiões')
  }
  for (const rid of Object.keys(state.regions || {})) {
    for (const sec of ['report', 'sla']) {
      const got = Object.keys(projected.regions?.[rid]?.[sec] || {})
      const want = [keep[sec === 'report' ? 'report' : 'sla']].filter((p) => p && state.regions[rid]?.[sec]?.[p])
      if (JSON.stringify(got.sort()) !== JSON.stringify(want.sort())) {
        problems.push(`${rid}.${sec}: esperado [${want}] veio [${got}]`)
      }
    }
  }
  const gotFuel = Object.keys(projected.fuel || {})
  const wantFuel = [keep.fuel].filter((p) => p && state.fuel?.[p])
  if (JSON.stringify(gotFuel.sort()) !== JSON.stringify(wantFuel.sort())) {
    problems.push(`fuel: esperado [${wantFuel}] veio [${gotFuel}]`)
  }
  for (const d of deletes) {
    let node = projected
    for (const s of splitPath(d.path)) {
      if (!node || typeof node !== 'object') break
      node = node[s]
    }
    if (node !== undefined) problems.push(`${d.path} não foi removido na simulação`)
  }
  return problems
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
/**
 * Escrita parcial. Na REST v1 o `updateMask` é parâmetro de QUERY
 * (`updateMask.fieldPaths`, repetido) e o corpo é apenas o Document — mandar
 * os dois no corpo devolve HTTP 400 "Unknown name updateMask".
 *
 * Efeito da máscara: campos listados que não vêm no corpo são apagados do
 * documento. É isso que encolhe o documento sem precisar reenviar tudo.
 */
async function patch(token, fieldPaths, fields) {
  const qs = new URLSearchParams()
  for (const p of fieldPaths) qs.append('updateMask.fieldPaths', p)
  const res = await fetch(`${base(options.project)}?${qs}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`PATCH falhou (HTTP ${res.status}): ${await res.text()}`)
  return res.json()
}

/** _meta completo: a máscara cobre o mapa inteiro, então os dois campos vão juntos. */
function metaFields(version) {
  return {
    _meta: {
      mapValue: {
        fields: {
          version: { integerValue: String(version) },
          updatedAt: { stringValue: new Date().toISOString() },
        },
      },
    },
  }
}

function fmt(n) { return `${n} chaves` }

async function main() {
  // --from-file ensaia o plano contra um backup local, sem rede e sem credencial.
  const offline = Boolean(options.fromFile)
  if (options.fromFile && options.execute) {
    throw new Error('Não faz sentido combinar --from-file com --yes: o PATCH exige o documento real.')
  }

  let plain
  if (offline) {
    if (!fs.existsSync(options.fromFile)) throw new Error('Arquivo não encontrado:', options.fromFile)
    plain = JSON.parse(fs.readFileSync(options.fromFile, 'utf-8'))
  } else {
    plain = (await fetchDoc(await getToken())).plain
  }

  if (!plain || !plain.regions) {
    throw new Error('Documento inesperado: sem `regions`. Abortando para não tocar em nada.')
  }

  const before = countKeys(plain)
  const { deletes, keepReport, keepSla, keepFuel, regionCount } = plan(plain)
  const projected = simulate(plain, deletes)

  const problems = verifySimulation(plain, projected, deletes, {
    report: keepReport,
    sla: keepSla,
    fuel: keepFuel,
  })
  if (problems.length) {
    console.error('A simulacao nao confere — abortando antes de qualquer escrita:')
    for (const p of problems) console.error('  !', p)
    process.exit(1)
  }

  const after = countKeys(projected)

  console.log('=== PODA DE EMERGENCIA — produtividade/estado ===')
  console.log(`projeto    : ${options.project}${offline ? '  (ENSAIO LOCAL: nada será escrito)' : ''}${options.auth === 'admin' ? '  (service account: ignora as rules)' : ''}`)
  console.log(`regioes    : ${regionCount}`)
  console.log(`mantem     : report=${keepReport}  sla=${keepSla}  fuel=${keepFuel}`)
  console.log(`chaves     : ${fmt(before)}  ->  ${fmt(after)}   (${before - after} removidas, ${((after / 40000) * 100).toFixed(0)}% do orcamento de 40000)`)
  console.log('')
  console.log('campos que serao removidos:')
  for (const d of deletes) console.log('  -', d.path)
  console.log(`  _meta.version ${plain._meta?.version ?? 0} -> ${(plain._meta?.version ?? 0) + 1} (forca recarregamento nos clientes)`)
  console.log('')

  if (!deletes.length) {
    console.log('Nada a remover. Encerrando sem escrever.')
    return
  }

  if (!options.execute) {
    console.log('DRY-RUN: nenhuma escrita foi feita. Rode com --yes para executar.')
    return
  }

  const token = await getToken()

  // 1) Backup antes de qualquer escrita.
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  fs.mkdirSync(options.outDir, { recursive: true })
  const backupFile = path.join(options.outDir, `pre-prune-${ts}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(plain, null, 2) + '\n')
  console.log(`[1/4] Backup: ${backupFile} (${fs.statSync(backupFile).size} bytes)`)

  // 2) Escrita parcial: os 9 caminhos entram só na máscara e não no corpo,
  //    então são apagados. `_meta` está na máscara E no corpo: é escrito.
  const nextVersion = (plain._meta?.version ?? 0) + 1
  await patch(token, [...deletes.map((d) => d.path), '_meta'], metaFields(nextVersion))
  console.log(`[2/4] PATCH aplicado: ${deletes.length} campo(s) removido(s), versao -> ${nextVersion}`)

  // 3) Verificacao: o documento ainda existe e esta dentro do orcamento?
  const check = await fetchDoc(token)
  const afterReal = countKeys(check.plain)
  if (!check.plain?.regions) throw new Error('ERRO GRAVE: o documento perdeu `regions` apos o PATCH. Restaure com o backup.')
  console.log(`[3/4] Verificado: ${fmt(afterReal)} (previsto ${fmt(after)})`)

  // 4) Prova de escrita: um PATCH que so mexe em _meta, sem criar nem apagar
  //    nenhuma chave. Se passar, o documento voltou a aceitar gravacao — que
  //    era o objetivo. E nao mascara uma poda insuficiente: nao adiciona chaves.
  await patch(token, ['_meta'], metaFields(nextVersion))
  console.log('[4/4] Prova de escrita OK: o documento aceita gravacao novamente.')
  console.log('')
  console.log('Agora recarregue o app (Ctrl+Shift+R) para todos pegarem o estado podado.')
}

// Erro operacional deve sair limpo, sem stack trace: quem roda isto é alguém
// decidindo se pode mexer no banco de produção.
try {
  await main()
} catch (e) {
  console.error('')
  console.error('PODA ABORTADA — nada foi escrito.')
  console.error(e instanceof Error ? e.message : String(e))
  process.exit(1)
}
