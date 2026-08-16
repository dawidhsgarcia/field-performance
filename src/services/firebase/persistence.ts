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

const MAX_ATTEMPTS = 3

export function hasStateDoc(): boolean {
  return stateDocRef() !== null
}

export async function fetchState(): Promise<AppState | null> {
  const ref = stateDocRef()
  if (!ref) return null
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return migrateState(snap.data())
}

export async function saveToFirestore(current: AppState | null): Promise<void> {
  if (!current) return
  const ref = stateDocRef()
  const { db } = getFirebase()
  if (!ref || !db) return
  const localVer = typeof current._meta?.version === 'number' ? current._meta.version : 0
  const nextVer = localVer + 1
  let lastErr: Error | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const meta = await runTransaction(db, async (t) => {
        const snap = await t.get(ref)
        const remote = (snap.exists() ? snap.data() : {}) as Record<string, unknown>
        const remoteMeta = remote._meta as { version?: number } | undefined
        const remoteVer = typeof remoteMeta?.version === 'number' ? remoteMeta.version : 0
        if (localVer > 0 && snap.exists() && remoteVer !== localVer) {
          throw new ConflictError('Conflito de edição concorrente no Firestore')
        }
        const next = serializeState(current)
        next._meta = { version: nextVer, updatedAt: new Date().toISOString() }
        t.set(ref, next)
        return next._meta
      })
      current._meta = meta as AppState['_meta']
      return
    } catch (e) {
      if (e instanceof ConflictError) {
        lastErr = e
        continue
      }
      throw e
    }
  }
  throw lastErr || new Error('Falha na gravação transacional no Firestore')
}

export async function reloadStateFromCloud(): Promise<AppState | null> {
  try {
    return await fetchState()
  } catch (e) {
    console.error('Falha ao recarregar o estado da nuvem:', e)
    return null
  }
}

export interface SaveWithRebaseOptions {
  getState: () => AppState | null
  setState: (s: AppState | null) => void
  reapply: () => AppState | null
}

export async function saveWithRebase(options: SaveWithRebaseOptions): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await saveToFirestore(options.getState())
      return
    } catch (e) {
      if (!(e instanceof ConflictError)) throw e
      const ok = await reloadStateFromCloud()
      if (!ok) throw e
      options.setState(ok)
      const reapplied = options.reapply()
      if (reapplied) options.setState(reapplied)
    }
  }
  throw new Error('Não foi possível gravar no Firestore após múltiplas tentativas')
}
