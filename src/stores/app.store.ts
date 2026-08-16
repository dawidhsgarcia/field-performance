import { create } from 'zustand'

export type ActiveTab = 'dashboard' | 'acompanhamento' | 'combustivel' | 'bh' | 'params'

const COLLAPSED_KEY = 'fp-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

interface AppState {
  activeTab: ActiveTab
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  setActiveTab: (tab: ActiveTab) => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  sidebarOpen: false,
  sidebarCollapsed: readCollapsed(),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebarCollapsed: () =>
    set((s) => {
      const next = !s.sidebarCollapsed
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // segue apenas na sessão
      }
      return { sidebarCollapsed: next }
    }),
}))
