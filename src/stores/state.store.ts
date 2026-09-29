import { create } from 'zustand'
import { toast } from 'sonner'
import { produce } from '@/lib/immutable'
import { ALL_REGION } from '@/lib/constants'
import { migrateState } from '@/lib/migrateState'
import { subscribeState } from '@/services/firebase/realtime'
import {
  ConflictError,
  describePersistenceError,
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
  saveError: string | null
  retrySave: () => void
  confirmDiscard: () => boolean | Promise<boolean>
  setConfirmDiscard: (fn: () => boolean | Promise<boolean>) => void
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
  realtimeUnsub = subscribeState(
    async (remoteRaw) => {
      if (!remoteRaw) return
      const store = useStateStore.getState()
      const local = store.data
      const remote = migrateState(remoteRaw)
      if (!remote || !remote._meta) return
      // A versão é a única autoridade de ordenação. updatedAt vem do relógio
      // do cliente e diverge entre usuários, o que fazia atualizações
      // legítimas serem descartadas sem aviso.
      const localVer = local?._meta?.version ?? 0
      const remoteVer = remote._meta.version ?? 0
      if (remoteVer <= localVer) return
      if (store.dirty && !(await store.confirmDiscard())) return
      useStateStore.setState((s) => {
        const keepRegion = s.data?.currentRegion ?? ALL_REGION
        const keepYear = s.data?.currentYear ?? new Date().getFullYear()
        const keepMonth = s.data?.currentMonth ?? new Date().getMonth()
        const merged = produce(remote, (d) => {
          d.currentRegion = keepRegion
          d.currentYear = keepYear
          d.currentMonth = keepMonth
        })
        return { data: merged, dirty: false, saveStatus: 'saved', saveError: null }
      })
    },
    (err) => {
      useStateStore.setState({
        saveError: describePersistenceError(err),
        saveStatus: 'error',
      })
    },
  )
}

/** Compara duas versões do documento de estado. */
export function isRemoteNewer(remoteVer: number | undefined, localVer: number | undefined): boolean {
  return (remoteVer ?? 0) > (localVer ?? 0)
}

/**
 * Executa a gravação de verdade.
 *
 * Regra inviolável: só marcamos 'saved' quando o Firestore aceitou. Falha vira
 * 'error' com o motivo visível, e o localStorage é apenas uma reserva local
 * declarada — nunca um substituto silencioso do banco.
 */
async function flushSave(): Promise<void> {
  const data = useStateStore.getState().data
  if (!data) {
    useStateStore.setState({ saveStatus: 'idle' })
    return
  }

  if (!hasStateDoc()) {
    await reserveLocally(data)
    useStateStore.setState({
      saveStatus: 'error',
      dirty: true,
      saveError:
        'Sem Firestore configurado: os dados ficaram apenas neste navegador e NÃO foram salvos no banco.',
    })
    return
  }

  try {
    await saveToFirestore(data)
    // O store pode ter sido resetado (logout) enquanto a gravação corria.
    if (!useStateStore.getState().data) return
    useStateStore.setState({ saveStatus: 'saved', dirty: false, saveError: null })
  } catch (e) {
    console.error('Falha ao salvar no Firestore:', e)
    const motivo = describePersistenceError(e)
    await reserveLocally(data)
    if (!useStateStore.getState().data) return
    useStateStore.setState({ saveStatus: 'error', dirty: true, saveError: motivo })
    toast.error(`Não foi possível salvar no banco. ${motivo}`, {
      id: 'fp-save-error',
      duration: Infinity,
    })
  }
}

/**
 * Reserva local. NÃO substitui o banco: só evita que a edição em curso se
 * perca se a aba recarregar antes de o Firestore voltar.
 */
async function reserveLocally(data: AppState): Promise<void> {
  try {
    await saveToStorage(data)
  } catch (e) {
    console.error('Falha ao gravar a reserva local:', e)
  }
}


export const useStateStore = create<StateStore>((set, get) => ({
  data: null,
  status: 'idle',
  saveStatus: 'idle',
  dirty: false,
  saveError: null,
  confirmDiscard: () => false,

  setConfirmDiscard: (fn) => set({ confirmDiscard: fn }),

  retrySave: () => {
    set({ saveError: null, saveStatus: 'saving', dirty: true })
    void flushSave()
  },

  loadState: async () => {
    set({ status: 'loading' })
    startRealtime()
    let fromCloud: AppState | null = null
    try {
      fromCloud = await fetchState()
    } catch (e) {
      set({ saveError: describePersistenceError(e), saveStatus: 'error' })
    }
    if (fromCloud) {
      set({ data: fromCloud, status: 'ready', saveStatus: 'saved', saveError: null })
      return
    }
    const fromStorage = await loadFromStorage()
    if (fromStorage) {
      set({ data: fromStorage, status: 'ready', saveStatus: 'idle', saveError: null })
      return
    }
    set({ data: seedState(), status: 'ready' })
  },

  refreshFromCloud: async () => {
    let remote: AppState | null = null
    try {
      remote = await fetchState()
    } catch (e) {
      set({ saveError: describePersistenceError(e), saveStatus: 'error' })
      return
    }
    if (!remote) return
    const localVer = get().data?._meta?.version ?? 0
    if (!isRemoteNewer(remote._meta?.version, localVer)) {
      if (get().data) return
    } else if (get().dirty && !(await get().confirmDiscard())) {
      return
    }
    set({ data: remote, dirty: false, status: 'ready', saveStatus: 'saved', saveError: null })
  },

  reset: () => {
    // Nunca descartar um save pendente: o usuário já viu "salvo".
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      void flushSave()
    }
    if (realtimeUnsub) {
      realtimeUnsub()
      realtimeUnsub = null
    }
    set({ data: null, status: 'idle', saveStatus: 'idle', dirty: false, saveError: null })
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
    saveTimer = setTimeout(() => {
      saveTimer = null
      void flushSave()
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

/**
 * Descarrega o save pendente quando a aba é fechada ou escondida.
 *
 * Sem isso, uma editação feita menos de 400 ms antes de fechar a aba se
 * perdia — depois de o usuário ter visto "salvo". A reserva local é
 * síncrona e não bloqueia; a gravação no Firestore segue em background.
 */
if (typeof window !== 'undefined') {
  const flushOnHide = () => {
    const s = useStateStore.getState()
    if (!s.dirty || !s.data) return
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    void reserveLocally(s.data)
    void flushSave()
  }
  window.addEventListener('pagehide', flushOnHide)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnHide()
  })
}
