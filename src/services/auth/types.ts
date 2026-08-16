import type { AuthUser, Perfil } from '@/types'

export type { AuthUser, Perfil }

export interface UserSession {
  user: AuthUser | null
  autenticado: boolean
}

export interface AuthResult {
  ok: boolean
  msg?: string
}
