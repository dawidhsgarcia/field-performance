import { useEffect, useRef } from 'react'
import { ALL_REGION } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth.store'
import { useStateStore } from '@/stores/state.store'

export function useLeituraDefaultRegion() {
  const user = useAuthStore((s) => s.user)
  const perfil = useAuthStore((s) => s.perfil)
  const status = useStateStore((s) => s.status)
  const setRegion = useStateStore((s) => s.setRegion)
  const applied = useRef(false)

  useEffect(() => {
    if (!user) {
      applied.current = false
      return
    }
    if (perfil === 'leitura' && status === 'ready' && !applied.current) {
      applied.current = true
      setRegion(ALL_REGION)
    }
  }, [user, perfil, status, setRegion])
}
