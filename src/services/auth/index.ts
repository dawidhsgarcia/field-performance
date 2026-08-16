import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  type User,
  type Unsubscribe,
} from 'firebase/auth'
import { getFirebase } from '@/services/firebase/client'
import type { AuthResult } from './types'

export function watchAuth(onChange: (user: User | null) => void): Unsubscribe {
  const { auth } = getFirebase()
  if (!auth) {
    onChange(null)
    return () => undefined
  }
  return onAuthStateChanged(auth, onChange)
}

function errorCode(e: unknown): string | undefined {
  if (e && typeof e === 'object') return (e as { code?: string }).code
  return undefined
}

function errorMessage(e: unknown): string | undefined {
  if (e instanceof Error) return e.message
  return undefined
}

export async function login(email: string, senha: string): Promise<AuthResult> {
  const { auth } = getFirebase()
  if (!auth) return { ok: false, msg: 'Autenticação não disponível.' }
  try {
    await signInWithEmailAndPassword(auth, email, senha)
    return { ok: true }
  } catch (e) {
    const code = errorCode(e)
    if (code === 'auth/wrong-password') return { ok: false, msg: 'Senha incorreta.' }
    if (code === 'auth/user-not-found') return { ok: false, msg: 'Usuário não encontrado.' }
    if (code === 'auth/invalid-email') return { ok: false, msg: 'E-mail inválido.' }
    if (code === 'auth/invalid-credential') return { ok: false, msg: 'E-mail ou senha incorretos.' }
    if (code === 'auth/too-many-requests') {
      return { ok: false, msg: 'Muitas tentativas. Tente novamente em instantes.' }
    }
    return { ok: false, msg: errorMessage(e) || 'Falha no login.' }
  }
}

export async function logout(): Promise<void> {
  const { auth } = getFirebase()
  if (!auth) return
  try {
    await signOut(auth)
  } catch {
    // segue mesmo se falhar
  }
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const { auth } = getFirebase()
  if (!auth) return { ok: false, msg: 'Autenticação não disponível.' }
  try {
    await sendPasswordResetEmail(auth, email)
    return { ok: true }
  } catch (e) {
    const code = errorCode(e)
    if (code === 'auth/user-not-found') return { ok: false, msg: 'Nenhum usuário cadastrado com esse e-mail.' }
    return { ok: false, msg: errorMessage(e) || 'Não foi possível enviar o e-mail de recuperação.' }
  }
}
