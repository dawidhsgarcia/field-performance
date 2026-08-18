import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const IDLE_LAST_ACTIVITY_KEY = 'fp-idle-last-activity'

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'] as const

export function useIdleLogout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      try {
        sessionStorage.removeItem(IDLE_LAST_ACTIVITY_KEY)
      } catch {
        // storage indisponível: segue apenas na sessão
      }
      return
    }

    const now = Date.now()

    const expire = () => {
      try {
        sessionStorage.removeItem(IDLE_LAST_ACTIVITY_KEY)
      } catch {
        // segue
      }
      toast.info('Sessão expirada por inatividade. Faça login novamente.')
      void logout()
    }

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(expire, IDLE_TIMEOUT_MS)
    }

    const recordActivity = () => {
      try {
        sessionStorage.setItem(IDLE_LAST_ACTIVITY_KEY, String(Date.now()))
      } catch {
        // segue
      }
      schedule()
    }

    const checkOnMount = () => {
      try {
        const last = Number(sessionStorage.getItem(IDLE_LAST_ACTIVITY_KEY))
        if (last && now - last >= IDLE_TIMEOUT_MS) {
          expire()
          return false
        }
      } catch {
        // segue
      }
      return true
    }

    const active = checkOnMount()
    if (!active) return

    recordActivity()

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }))

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, recordActivity))
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [user, logout])
}
