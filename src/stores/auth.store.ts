import { create } from 'zustand'
import type { AuthUser, Perfil, Permissao } from '@/types'
import { applyAuthSession, can as canPerm, type UsuariosMap } from '@/lib/permissions'
import { login as authLogin, logout as authLogout, sendPasswordReset, watchAuth } from '@/services/auth'
import { loadUsuarios } from '@/services/auth/users'
import type { AuthResult } from '@/services/auth/types'

interface AuthState {
  user: AuthUser | null
  perfil: Perfil | null
  carregando: boolean
  usuarios: UsuariosMap
  init: () => () => void
  login: (email: string, senha: string) => Promise<AuthResult>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  can: (acao: Permissao) => boolean
  setSession: (user: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  perfil: null,
  carregando: true,
  usuarios: {},

  init: () => {
    const unsubUsers = loadUsuarios((usuarios) => {
      set({ usuarios })
      const cur = get().user
      if (cur) {
        const sessao = applyAuthSession({ uid: cur.uid, email: cur.email }, usuarios)
        set({ user: sessao.user, perfil: sessao.perfil })
      }
    })
    const unsubAuth = watchAuth((firebaseUser) => {
      if (!firebaseUser) {
        set({ user: null, perfil: null, carregando: false })
        return
      }
      const sessao = applyAuthSession(
        { uid: firebaseUser.uid, email: firebaseUser.email },
        get().usuarios,
      )
      set({ user: sessao.user, perfil: sessao.perfil, carregando: false })
    })
    return () => {
      unsubAuth()
      unsubUsers?.()
    }
  },

  login: async (email, senha) => authLogin(email, senha),

  logout: async () => {
    await authLogout()
    set({ user: null, perfil: null })
  },

  resetPassword: async (email) => sendPasswordReset(email),

  can: (acao) => canPerm(get().perfil, acao),

  setSession: (user) => set({ user, perfil: user?.perfil ?? null }),
}))
