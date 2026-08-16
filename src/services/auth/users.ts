import { deleteDoc, doc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import { getFirebase } from '@/services/firebase/client'
import { usersCollectionRef } from '@/services/firebase/firestore'
import { firebaseConfig } from '@/lib/env'
import type { Perfil } from '@/types'
import type { UsuariosMap } from '@/lib/permissions'

export function loadUsuarios(onChange: (usuarios: UsuariosMap) => void): Unsubscribe | null {
  const ref = usersCollectionRef()
  if (!ref) return null
  return onSnapshot(
    ref,
    (snap) => {
      const map: UsuariosMap = {}
      snap.forEach((docSnap) => {
        const d = (docSnap.data() || {}) as Record<string, unknown>
        map[docSnap.id] = {
          uid: docSnap.id,
          email: String(d.email || '').toLowerCase(),
          nome: String(d.nome || ''),
          perfil: (d.perfil as Perfil) || 'leitura',
        }
      })
      onChange(map)
    },
    (err) => {
      console.error('Falha ao carregar usuários:', err)
    },
  )
}

export interface UsuarioInput {
  email: string
  nome: string
  perfil: Perfil
  senha: string
}

export interface UsuarioResult {
  ok: boolean
  uid?: string
  msg?: string
}

export async function createUsuario(data: UsuarioInput): Promise<UsuarioResult> {
  const ref = usersCollectionRef()
  if (!ref) return { ok: false, msg: 'Autenticação não disponível.' }
  const em = String(data.email || '').trim().toLowerCase()
  if (!em || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return { ok: false, msg: 'Informe um e-mail válido.' }
  if (!data.senha || String(data.senha).length < 6) {
    return { ok: false, msg: 'A senha precisa ter ao menos 6 caracteres.' }
  }
  const nomeTxt = String(data.nome || '').trim() || em
  const perfilVal = data.perfil || 'leitura'
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: String(data.senha), returnSecureToken: true }),
      },
    )
    const res = (await resp.json()) as { error?: { message?: string }; localId?: string }
    if (!resp.ok) {
      const code = res?.error?.message || 'unknown'
      const err = new Error(code) as Error & { code?: string }
      err.code = code
      throw err
    }
    const uid = res.localId
    if (!uid) throw new Error('Sem uid na resposta')
    await setDoc(doc(ref, uid), { email: em, nome: nomeTxt, perfil: perfilVal })
    return { ok: true, uid }
  } catch (e) {
    let msg = 'Não foi possível criar o usuário.'
    if (e instanceof Error) {
      const code = (e as Error & { code?: string }).code
      if (code === 'EMAIL_EXISTS' || code === 'auth/email-already-in-use') msg = 'Este e-mail já está em uso.'
      else if (e.message) msg = e.message
    }
    return { ok: false, msg }
  }
}

export async function updateUsuario(
  uid: string,
  dados: { nome?: string; perfil?: Perfil },
): Promise<UsuarioResult> {
  const ref = usersCollectionRef()
  if (!ref) return { ok: false, msg: 'Autenticação não disponível.' }
  try {
    const payload: Record<string, string> = {}
    if (dados.nome !== undefined) payload.nome = String(dados.nome || '').trim()
    if (
      dados.perfil !== undefined &&
      (dados.perfil === 'admin' || dados.perfil === 'gestor' || dados.perfil === 'leitura')
    ) {
      payload.perfil = dados.perfil
    }
    await updateDoc(doc(ref, uid), payload)
    return { ok: true }
  } catch (e) {
    let msg = 'Não foi possível atualizar o usuário.'
    if (e instanceof Error && e.message) msg = e.message
    return { ok: false, msg }
  }
}

export async function removeUsuario(uid: string): Promise<UsuarioResult> {
  const ref = usersCollectionRef()
  if (!ref) return { ok: false, msg: 'Autenticação não disponível.' }
  try {
    await deleteDoc(doc(ref, uid))
    return { ok: true }
  } catch (e) {
    let msg = 'Não foi possível remover o usuário.'
    if (e instanceof Error && e.message) msg = e.message
    return { ok: false, msg }
  }
}

export function getAuthClient() {
  const { auth } = getFirebase()
  return auth
}
