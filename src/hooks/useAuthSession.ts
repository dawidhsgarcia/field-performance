import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

export function useAuthSession() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    const cleanup = init()
    return cleanup
  }, [init])
}
