import { create } from 'zustand'
import { produce } from '@/lib/immutable'
import { ALL_REGION } from '@/lib/constants'
import { migrateState } from '@/lib/migrateState'
import { subscribeState } from '@/services/firebase/realtime'
import {
  ConflictError,
  fetchState,
  hasStateDoc,
  saveToFirestore,
  saveWithRebase,
} from '@/services/firebase/persistence'
import { loadFromStorage, saveToStorage } from '@/services/storage'
import { seedState } from '@/lib/seed'
import { applyActivityReport } from '@/services/importers/activityReport'
import { applyFuelReport } from '@/services/importers/fuelReport'
import { applyBhReport } from '@/services/importers/bhReport'
import type { ActivityReportSummary } from '@/types/imports'
import type { AppState } from '@/types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface StateStore {
  data: AppState | null
  status: LoadStatus
  saveStatus: SaveStatus
  dirty: boolean
  confirmDiscard: () => boolean
  setConfirmDiscard: (fn: () => boolean) => void
  loadState: () => Promise<void>
  refreshFromCloud: () => Promise<void>
  reset: () => void
  commit: (transform: (s: AppState) => AppState) => void
  applyMutation: (mutator: (draft: AppState) => void) => void
  scheduleSave: () => void
  setRegion: (region: string) => void
  setMonth: (year: number, month: number) => void
  importActivityReport: (
    rawRows: Array<Record<string, unknown>>,
    regionId: string | null,
  ) => Promise<{
    ok: boolean
    message?: string
    summary?: ActivityReportSummary | null
    savedToCloud?: boolean
  }>
  importFuel: (text: string) => Promise<{ ok: boolean; message?: string }>
  importBh: (rawRows: Array<Record<string, unknown>>) => Promise<{ ok: boolean; message?: string }>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let realtimeUnsub: (() => void) | null = null

function startRealtime() {
  if (realtimeUnsub) return
  realtimeUnsub = subscribeState((remoteRaw) => {
    if (!remoteRaw) return
    const store = useStateStore.getState()
    const local = store.data
    const remote = migrateState(remoteRaw)
    if (!remote || !remote._meta) return
    const localMeta = local?._meta || { version: 0, updatedAt: null }
    const remoteMeta = remote._meta || { version: 0, updatedAt: null }
    const localAt = localMeta.updatedAt ? new Date(localMeta.updatedAt).getTime() : 0
    const remoteAt = remoteMeta.updatedAt ? new Date(remoteMeta.updatedAt).getTime() : 0
    if (remoteAt <= localAt && (remoteMeta.version || 0) <= (localMeta.version || 0)) return
    if (store.dirty && !store.confirmDiscard()) return
    useStateStore.setState((s) => {
      const keepRegion = s.data?.currentRegion ?? ALL_REGION
      const keepYear = s.data?.currentYear ?? new Date().getFullYear()
      const keepMonth = s.data?.currentMonth ?? new Date().getMonth()
      const merged = produce(remote, (d) => {
        d.currentRegion = keepRegion
        d.currentYear = keepYear
        d.currentMonth = keepMonth
      })
      return { data: merged, dirty: false, saveStatus: 'saved' }
    })
  })
}

export const useStateStore = create<StateStore>((set, get) => ({
  data: null,
  status: 'idle',
  saveStatus: 'idle',
  dirty: false,
  confirmDiscard: () => false,

  setConfirmDiscard: (fn) => set({ confirmDiscard: fn }),

  loadState: async () => {
    set({ status: 'loading' })
    startRealtime()
    const fromCloud = await fetchState()
    if (fromCloud) {
      set({ data: fromCloud, status: 'ready', saveStatus: 'saved' })
      return
    }
    const fromStorage = await loadFromStorage()
    if (fromStorage) {
      set({ data: fromStorage, status: 'ready', saveStatus: 'saved' })
      return
    }
    set({ data: seedState(), status: 'ready' })
  },

  refreshFromCloud: async () => {
    const remote = await fetchState()
    if (!remote) return
    const local = get().data
    const localMeta = local?._meta || { updatedAt: null }
    const remoteMeta = remote._meta || { updatedAt: null }
    if (
      localMeta.updatedAt &&
      remoteMeta.updatedAt &&
      new Date(localMeta.updatedAt) > new Date(remoteMeta.updatedAt)
    ) {
      if (!get().confirmDiscard()) return
    }
    set({ data: remote, dirty: false, status: 'ready', saveStatus: 'saved' })
  },

  reset: () => {
    if (saveTimer) clearTimeout(saveTimer)
    set({ data: null, status: 'idle', saveStatus: 'idle', dirty: false })
  },

  commit: (transform) => {
    const data = get().data
    if (!data) return
    set({ data: transform(data) })
    get().scheduleSave()
  },

  applyMutation: (mutator) => {
    const data = get().data
    if (!data) return
    const next = produce(data, mutator)
    set({ data: next })
    get().scheduleSave()
  },

  scheduleSave: () => {
    set({ dirty: true, saveStatus: 'saving' })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      const data = get().data
      if (!data) {
        set({ saveStatus: 'idle' })
        return
      }
      let saved = false
      if (hasStateDoc()) {
        try {
          await saveToFirestore(data)
          saved = true
        } catch (e) {
          console.error('Falha ao salvar no Firestore, tentando reserva local:', e)
        }
      }
      if (!saved) {
        const res = await saveToStorage(data)
        saved = res.saved
      }
      if (saved) set({ saveStatus: 'saved', dirty: false })
      else set({ saveStatus: 'error', dirty: true })
    }, 400)
  },

  setRegion: (region) =>
    set((s) => (s.data ? { data: { ...s.data, currentRegion: region } } : {})),

  setMonth: (year, month) =>
    set((s) => (s.data ? { data: { ...s.data, currentYear: year, currentMonth: month } } : {})),

  importActivityReport: async (rawRows, regionId) => {
    const data = get().data
    if (!data) return { ok: false, message: 'Sem estado carregado.' }
    if (!hasStateDoc()) {
      const out = applyActivityReport(rawRows, regionId, data)
      if (out.newState) set({ data: out.newState })
      get().scheduleSave()
      return { ok: out.newState !== null, message: out.message, summary: out.summary, savedToCloud: false }
    }
    let lastSummary: ActivityReportSummary | null = null
    let lastMessage: string | undefined
    const apply = () => {
      const current = get().data
      if (!current) return null
      const out = applyActivityReport(rawRows, regionId, current)
      if (out.message) lastMessage = out.message
      if (out.summary) lastSummary = out.summary
      if (out.newState) set({ data: out.newState })
      return out.newState
    }
    const applied = apply()
    if (!applied) return { ok: false, message: lastMessage }
    try {
      await saveWithRebase({
        getState: () => get().data,
        setState: (s) => set({ data: s }),
        reapply: apply,
      })
      return { ok: true, summary: lastSummary, savedToCloud: true }
    } catch (e) {
      console.error('Falha ao salvar o relatório no Firestore:', e)
      return {
        ok: false,
        message: e instanceof ConflictError ? 'Conflito de edição concorrente.' : 'Erro ao salvar o relatório.',
        savedToCloud: false,
      }
    }
  },

  importFuel: async (text) => {
    const data = get().data
    if (!data) return { ok: false, message: 'Sem estado carregado.' }
    const out = applyFuelReport(text, data)
    if (out.newState) {
      set({ data: out.newState })
      get().scheduleSave()
    }
    return { ok: out.newState !== null, message: out.message }
  },

  importBh: async (rawRows) => {
    const data = get().data
    if (!data) return { ok: false, message: 'Sem estado carregado.' }
    const out = applyBhReport(rawRows, data)
    if (out.newState) {
      set({ data: out.newState })
      get().scheduleSave()
    }
    return { ok: out.newState !== null, message: out.message }
  },
}))
