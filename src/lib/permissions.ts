import { ADMIN_BOOTSTRAP_EMAIL } from './constants'
import type { Perfil, Permissao, AuthUser } from '@/types'

export const PERMISSOES: Record<Perfil, Record<Permissao, boolean>> = {
  admin: {
    editarMatriz: true,
    importar: true,
    programarFolga: true,
    programarSobreaviso: true,
    salvarParams: true,
    gerenciarColaboradores: true,
    gerenciarVeiculos: true,
    gerenciarUsuarios: true,
    criarRegiao: true,
    removerRegiao: true,
    backupRestore: true,
  },
  gestor: {
    editarMatriz: true,
    importar: true,
    programarFolga: true,
    programarSobreaviso: true,
    salvarParams: true,
    gerenciarColaboradores: true,
    gerenciarVeiculos: true,
    gerenciarUsuarios: false,
    criarRegiao: false,
    removerRegiao: false,
    backupRestore: false,
  },
  leitura: {
    editarMatriz: false,
    importar: false,
    programarFolga: false,
    programarSobreaviso: false,
    salvarParams: false,
    gerenciarColaboradores: false,
    gerenciarVeiculos: false,
    gerenciarUsuarios: false,
    criarRegiao: false,
    removerRegiao: false,
    backupRestore: false,
  },
}

export function can(perfil: Perfil | null, acao: Permissao): boolean {
  if (!perfil) return false
  const p = PERMISSOES[perfil]
  return !!(p && p[acao])
}

export interface UsuariosMap {
  [uid: string]: { uid: string; email: string; nome: string; perfil: Perfil }
}

export function applyAuthSession(
  user: { uid: string; email?: string | null },
  usuarios: UsuariosMap,
): { user: AuthUser; perfil: Perfil } {
  const email = (user.email || '').toLowerCase()
  const u = usuarios[user.uid]
  if (u) {
    return {
      user: { uid: user.uid, email: u.email, nome: u.nome || email, perfil: u.perfil || 'leitura' },
      perfil: u.perfil || 'leitura',
    }
  }
  if (email === ADMIN_BOOTSTRAP_EMAIL) {
    return { user: { uid: user.uid, email, nome: email, perfil: 'admin' }, perfil: 'admin' }
  }
  return { user: { uid: user.uid, email, nome: email, perfil: 'leitura' }, perfil: 'leitura' }
}
