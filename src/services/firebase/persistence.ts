import { FirebaseError } from 'firebase/app'
import { getDoc, runTransaction } from 'firebase/firestore'
import { getFirebase } from './client'
import { stateDocRef } from './firestore'
import { migrateState } from '@/lib/migrateState'
import { serializeState } from '@/services/state'
import type { AppState } from '@/types'

export class ConflictError extends Error {
  isConflict = true

  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class PersistenceUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PersistenceUnavailableError'
  }
}

const MAX_ATTEMPTS = 3

export function hasStateDoc(): boolean {
  return stateDocRef() !== null
}

function requireRef() {
  const ref = stateDocRef()
  const { db } = getFirebase()
  if (!ref || !db) {
    throw new PersistenceUnavailableError(
      'Firestore indisponível: configuração do Firebase ausente ou inválida.',
    )
  }
  return { ref, db }
}

export async function fetchState(): Promise<AppState | null> {
  const { ref } = requireRef()
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return migrateState(snap.data())
}

export async function reloadStateFromCloud(): Promise<AppState | null> {
  try {
    return await fetchState()
  } catch (e) {
    console.error('Falha ao recarregar o estado da nuvem:', e)
    return null
  }
}

/**
 * Primitiva de escrita: grava o documento inteiro em uma transação.
 *
 * A verificação de versão é otimista e estrita — se a versão remota não for
 * exatamente a local, outra pessoa salvou no meio e lançamos ConflictError.
 * Nunca repetimos a mesma versão obsoleta: isso não passaria nunca.
 */
export async function writeOnce(current: AppState): Promise<AppState['_meta']> {
  const { ref, db } = requireRef()
  const localVer = typeof current._meta?.version === 'number' ? current._meta.version : 0
  const nextVer = localVer + 1

  return runTransaction(db, async (t) => {
    const snap = await t.get(ref)
    const remote = (snap.exists() ? snap.data() : {}) as Record<string, unknown>
    const remoteMeta = remote._meta as { version?: number } | undefined
    const remoteVer = typeof remoteMeta?.version === 'number' ? remoteMeta.version : 0
    if (localVer > 0 && snap.exists() && remoteVer !== localVer) {
      throw new ConflictError('Conflito de edição concorrente no Firestore')
    }
    const next = serializeState(current)
    const meta: AppState['_meta'] = { version: nextVer, updatedAt: new Date().toISOString() }
    next._meta = meta
    t.set(ref, next)
    return meta
  })
}

/**
 * Grava uma edição comum (digitação em célula, parâmetro, cadastro).
 *
 * Não faz rebase automático de propósito: o estado local é a verdade da
 * edição em curso, e adotá-lo remotamente por cima descartaria o que o
 * usuário acabou de digitar. Conflito propaga para o store, que_surface o
 * erro e oferece a escolha entre manter a edição local ou carregar a remota.
 */
export async function saveToFirestore(current: AppState | null): Promise<void> {
  if (!current) throw new Error('Nada para salvar: estado vazio.')
  const meta = await writeOnce(current)
  current._meta = meta
}

export interface SaveWithRebaseOptions {
  getState: () => AppState | null
  setState: (s: AppState | null) => void
  reapply: () => AppState | null
}

/**
 * Grava uma importação reaplicável resolvendo conflito por rebase.
 *
 * Usado apenas por importActivityReport: a importação é uma função pura
 * sobre o estado, então é seguro recarregar o remoto e reaplicar por cima.
 */
export async function saveWithRebase(options: SaveWithRebaseOptions): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = options.getState()
    if (!current) return
    try {
      const meta = await writeOnce(current)
      options.setState({ ...current, _meta: meta })
      return
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e
      const remote = await reloadStateFromCloud()
      if (!remote) throw e
      options.setState(remote)
      const reapplied = options.reapply()
      if (!reapplied) throw e
      options.setState(reapplied)
    }
  }
  throw new ConflictError('Não foi possível gravar no Firestore após múltiplas tentativas')
}

/**
 * O Firestore reporta estouro do limite de 1 MiB como 'invalid-argument'
 * ("The maximum write size is 1048576 bytes"), e não como
 * 'resource-exhausted'. Depender só do código esconde a causa real — foi o
 * que deixou o congelamento de setembro sem diagnóstico. Por isso a detecção
 * é feita pela mensagem, não pelo código.
 */
function isSizeExceeded(message: string): boolean {
  return /maximum write size|1048576|exceeds the maximum|too large|excede/i.test(message)
}

/**
 * Limite de ENTRADAS DE ÍNDICE (40.000), que é diferente do limite de tamanho
 * e foi o que realmente atingiu este projeto: o estado inteiro mora num
 * documento só e o histórico acumulado estourou as chaves. O Firestore
 * reporta como 'invalid-argument', igual ao de tamanho — só a mensagem
 * distingue os dois.
 */
function isIndexLimitExceeded(message: string): boolean {
  return /too many index entries/i.test(message)
}

/**
 * Traduz um erro de escrita para algo acionável, sempre preservando a mensagem
 * original do Firebase. Descartar `e.message` deixa o diagnóstico impossível
 * para qualquer erro fora desta lista — nunca mais codigo sem detalhe.
 */
export function describePersistenceError(e: unknown): string {
  if (e instanceof PersistenceUnavailableError) return e.message
  if (e instanceof ConflictError) return 'Edição concorrente: outro usuário salvou antes.'
  if (e instanceof FirebaseError) {
    const detalhe = e.message || e.code
    if (isIndexLimitExceeded(e.message)) {
      return 'O banco passou do limite de campos e está recusando gravações. '
        + `A gravação volta a funcionar ao rodar a manutenção scripts/prune-estado.mjs. Detalhe: ${detalhe}`
    }
    if (isSizeExceeded(e.message)) {
      return `Documento grande demais para o Firestore (limite de 1 MiB). Detalhe: ${detalhe}`
    }
    switch (e.code) {
      case 'permission-denied':
        return `Sem permissão para gravar (perfil não é gestor/admin). Detalhe: ${detalhe}`
      case 'unavailable':
      case 'deadline-exceeded':
        return `Firestore indisponível no momento (rede/offline). Detalhe: ${detalhe}`
      case 'resource-exhausted':
      case 'failed-precondition':
        return `Firestore recusou a gravação. Detalhe: ${detalhe}`
      case 'invalid-argument':
        return `Firestore rejeitou a gravação. Detalhe: ${detalhe}`
      default:
        return `Erro do Firestore: ${e.code} — ${detalhe}`
    }
  }
  return e instanceof Error ? e.message : 'Erro desconhecido ao salvar.'
}
