import { onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { stateDocRef } from './firestore'

/**
 * Assina o documento de estado.
 *
 * Devolve null apenas quando não há Firestore configurado (leitor de Elegante
 * pode degradar). Uma assinatura que morre em silêncio é perigosa: o usuário
 * continua editando sem nunca receber o que os outros salvaram. Por isso, erros
 * de rede/segurança vão para onError, e não são engolidos.
 */
export function subscribeState(
  onChange: (data: Record<string, unknown> | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe | null {
  const ref = stateDocRef()
  if (!ref) return null
  return onSnapshot(
    ref,
    (snap) => {
      onChange(snap.exists() ? (snap.data() as Record<string, unknown>) : null)
    },
    (err) => {
      console.error('Falha na assinatura do estado no Firestore:', err)
      onError?.(err)
    },
  )
}
