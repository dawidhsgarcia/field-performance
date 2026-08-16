import { AlertSection } from '@/components/dashboard/sections/AlertSection'
import type { AlertItem } from '@/types'

export function BhAlerts({ alerts }: { alerts: AlertItem[] }) {
  return <AlertSection alerts={alerts} />
}
