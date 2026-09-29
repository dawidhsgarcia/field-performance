import { doc, collection, type DocumentReference, type CollectionReference } from 'firebase/firestore'
import { getFirebase } from './client'

export const STATE_DOC_PATH = ['produtividade', 'estado'] as const

export const USERS_COLLECTION = 'usuarios'

export function stateDocRef(): DocumentReference | null {
  const { db } = getFirebase()
  if (!db) return null
  return doc(db, ...STATE_DOC_PATH)
}

export function usersCollectionRef(): CollectionReference | null {
  const { db } = getFirebase()
  if (!db) return null
  return collection(db, USERS_COLLECTION)
}

/**
 * Lança em vez de devolver null quando não há Firestore.
 *
 * Um null silencioso fazia uma escrita impossível parecer bem-sucedida.
 * Prefira requireRef() de persistence.ts no caminho de escrita; estas
 * remain disponíveis para os caminhos de leitura que degradam com elegância.
 */
export function assertFirestoreReady(): void {
  const { db } = getFirebase()
  if (!db) {
    throw new Error('Firestore indisponível: configuração do Firebase ausente ou inválida.')
  }
}
