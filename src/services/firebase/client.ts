import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { firebaseConfig, hasFirebaseConfig } from '@/lib/env'

interface FirebaseClient {
  app: FirebaseApp | null
  db: Firestore | null
  auth: Auth | null
}

let client: FirebaseClient | null = null

function buildClient(): FirebaseClient {
  if (!hasFirebaseConfig()) return { app: null, db: null, auth: null }
  const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
  const db = getFirestore(app)
  const auth = getAuth(app)
  return { app, db, auth }
}

export function getFirebase(): FirebaseClient {
  if (!client) client = buildClient()
  return client
}
