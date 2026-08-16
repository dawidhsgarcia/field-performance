import { onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { stateDocRef } from './firestore'

export function subscribeState(onChange: (data: Record<string, unknown> | null) => void): Unsubscribe | null {
  const ref = stateDocRef()
  if (!ref) return null
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
  })
}
