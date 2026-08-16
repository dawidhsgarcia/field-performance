import { DEFAULT_PARAMS, FUNCAO_DEFAULT } from './constants'
import type { AppState, Region } from '@/types'

type LegacyRegion = Region & Record<string, unknown>

export function migrateState(parsedRaw: unknown): AppState | null {
  const parsed = parsedRaw as AppState & Record<string, unknown>
  if (!parsed || !parsed.regions) return null

  parsed.currentYear = new Date().getFullYear()
  parsed.currentMonth = new Date().getMonth()

  const regions = parsed.regions as Record<string, LegacyRegion>
  Object.values(regions).forEach((r) => {
    if (typeof r.locked !== 'boolean') r.locked = false
    if (!r.slaCounts) r.slaCounts = { evaluated: 0, onTime: 0 }
    if (typeof r.totalOS !== 'number') r.totalOS = 0
    if (!r.techSla) r.techSla = {}
    if (!r.activitySla) r.activitySla = {}
    if (!r.sla) r.sla = {}
    delete r.activityCounts
    Object.values(r.sla).forEach((s) => {
      if (!s.activitySla) s.activitySla = {}
      if (!s.slaCounts) s.slaCounts = { evaluated: 0, onTime: 0 }
      if (typeof s.totalOS !== 'number') s.totalOS = 0
      if (!s.techSla) s.techSla = {}
      Object.values(s.techSla || {}).forEach((t) => {
        if (typeof t.totalOS !== 'number') t.totalOS = 0
      })
    })
    if (r.activitySla || r.slaCounts || typeof r.totalOS === 'number' || r.techSla) {
      let bestPeriod: string | null = null
      let bestCount = 0
      Object.entries(r.entries || {}).forEach(([p, byFunci]) => {
        const count = Object.values(byFunci || {}).reduce(
          (sum, dates) => sum + Object.keys(dates || {}).length,
          0,
        )
        if (count > bestCount) {
          bestCount = count
          bestPeriod = p
        }
      })
      if (bestPeriod && r.sla[bestPeriod] && !Object.keys(r.sla[bestPeriod]).length) {
        delete r.sla[bestPeriod]
      }
      if (bestPeriod && !r.sla[bestPeriod]) {
        r.sla[bestPeriod] = {
          activitySla: (r.activitySla || {}) as never,
          slaCounts: (r.slaCounts || { evaluated: 0, onTime: 0 }) as never,
          totalOS: typeof r.totalOS === 'number' ? (r.totalOS as number) : 0,
          techSla: (r.techSla || {}) as never,
        }
      }
      delete r.activitySla
      delete r.slaCounts
      delete r.totalOS
      delete r.techSla
    }
  })

  delete parsed.rankingMode
  delete parsed.avaliacoes
  const paramsLegacy = parsed.params as unknown as Record<string, unknown> | undefined
  if (paramsLegacy) delete paramsLegacy.avaliacaoCriterios
  if (!parsed._meta || typeof parsed._meta !== 'object') parsed._meta = { version: 0, updatedAt: null }
  if (typeof parsed._meta.version !== 'number') parsed._meta.version = 0
  if (!parsed.params) parsed.params = JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppState['params']
  if (!parsed.veiculos) parsed.veiculos = {}
  Object.keys(parsed.veiculos).forEach((p) => {
    const v = parsed.veiculos[p] as unknown as Record<string, unknown>
    if (!v || typeof v !== 'object') {
      delete parsed.veiculos[p]
      return
    }
    v.placa = String(v.placa || p).trim().toUpperCase()
    v.orcamento =
      v.orcamento === undefined || v.orcamento === null || v.orcamento === '' || isNaN(Number(v.orcamento))
        ? null
        : Number(v.orcamento)
  })
  if (!parsed.colaboradores || typeof parsed.colaboradores !== 'object') parsed.colaboradores = {}
  Object.entries(regions || {}).forEach(([rid, r]) => {
    const funcsWithEntries = new Set<string>()
    Object.values(r.entries || {}).forEach((byFunci) => {
      Object.keys(byFunci || {}).forEach((f) => funcsWithEntries.add(String(f).trim()))
    })
    ;(r.technicians || []).forEach((t) => {
      if (!t || !t.funci) return
      const f = String(t.funci).trim()
      if (t.imported === undefined) t.imported = funcsWithEntries.has(f)
      else if (t.imported === true && !funcsWithEntries.has(f)) t.imported = false
      if (!f) return
      const colab = parsed.colaboradores[f]
      if (colab) {
        if (!colab.funcao) colab.funcao = FUNCAO_DEFAULT
        if (!colab.telefone) colab.telefone = null
      } else {
        parsed.colaboradores[f] = {
          funci: f,
          nome: t.nome ? String(t.nome).trim().toUpperCase() : f,
          regiao: rid,
          funcao: FUNCAO_DEFAULT,
          telefone: null,
        }
      }
    })
  })
  if (!parsed.fuel) parsed.fuel = {}
  if (!parsed.bh) parsed.bh = { base: [], folgas: {}, period: null }
  if (!Array.isArray(parsed.bh.base)) parsed.bh.base = []
  if (!parsed.bh.folgas || typeof parsed.bh.folgas !== 'object') parsed.bh.folgas = {}
  Object.keys(parsed.bh.folgas).forEach((k) => {
    if (!Array.isArray(parsed.bh.folgas[k])) parsed.bh.folgas[k] = []
  })
  if (!parsed.bh.period || typeof parsed.bh.period !== 'string' || !/^\d{4}-\d{2}$/.test(parsed.bh.period)) {
    parsed.bh.period = null
  }
  if (!parsed.sobreaviso || typeof parsed.sobreaviso !== 'object') parsed.sobreaviso = {}
  Object.keys(parsed.sobreaviso).forEach((k) => {
    if (!Array.isArray(parsed.sobreaviso[k])) parsed.sobreaviso[k] = []
    parsed.sobreaviso[k] = parsed.sobreaviso[k].filter(
      (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v),
    ).sort()
  })

  const bhHasFolgas =
    Object.keys(parsed.bh.folgas).length > 0 ||
    Object.values(parsed.bh.folgas).some((arr) => arr.length > 0)
  if (!bhHasFolgas) {
    Object.values(regions || {}).forEach((r) => {
      Object.values(r.entries || {}).forEach((byFunci) => {
        Object.keys(byFunci || {}).forEach((funci) => {
          Object.keys(byFunci[funci] || {}).forEach((iso) => {
            if (byFunci[funci][iso] === 'BH') {
              if (!Array.isArray(parsed.bh.folgas[funci])) parsed.bh.folgas[funci] = []
              if (!parsed.bh.folgas[funci].includes(iso)) parsed.bh.folgas[funci].push(iso)
            }
          })
        })
      })
    })
  }

  if (parsed.params && !parsed.params.dayMeta) {
    const oldMin = typeof paramsLegacy?.minScore === 'number' ? paramsLegacy.minScore : 4
    parsed.params.dayMeta = [0, oldMin, oldMin, oldMin, oldMin, oldMin, 0]
    if (paramsLegacy) delete paramsLegacy.minScore
  }

  return parsed as AppState
}
