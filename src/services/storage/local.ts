import { STORAGE_KEY } from '@/lib/constants'
import { migrateState } from '@/lib/migrateState'
import { serializeState } from '@/services/state'
import type { AppState } from '@/types'

interface WindowStorageLike {
  get(key: string): Promise<{ value?: string } | null> | { value?: string } | null
  set(key: string, value: string, flag?: boolean): Promise<void> | void
}

declare global {
  interface Window {
    storage?: WindowStorageLike
  }
}

export async function loadFromStorage(): Promise<AppState | null> {
  try {
    if (window.storage && typeof window.storage.get === 'function') {
      const res = await window.storage.get(STORAGE_KEY)
      if (res && res.value) return migrateState(JSON.parse(res.value))
    }
  } catch {
    // segue para localStorage
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrateState(JSON.parse(raw))
  } catch {
    // segue apenas em memória
  }
  return null
}

export async function saveToStorage(
  state: AppState,
): Promise<{ saved: boolean; via: string }> {
  const payload = JSON.stringify(serializeState(state))
  try {
    if (window.storage && typeof window.storage.set === 'function') {
      await window.storage.set(STORAGE_KEY, payload, false)
      return { saved: true, via: 'claude' }
    }
  } catch {
    // tenta localStorage
  }
  try {
    localStorage.setItem(STORAGE_KEY, payload)
    return { saved: true, via: 'local' }
  } catch {
    // segue apenas em memória
  }
  return { saved: false, via: '' }
}
