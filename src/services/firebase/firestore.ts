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
