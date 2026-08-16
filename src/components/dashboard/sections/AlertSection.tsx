import { CalendarX2, CheckCircle2, OctagonX, PhoneCall, TrendingDown, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertItem } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  error: OctagonX,
  warning: TriangleAlert,
  trending_down: TrendingDown,
  check_circle: CheckCircle2,
  event_busy: CalendarX2,
  phone_in_talk: PhoneCall,
}

export function AlertSection({ alerts }: { alerts: AlertItem[] }) {
  return (
    <section>
      <h2 className="font-display text-base font-bold text-foreground">Alertas</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {alerts.map((a, i) => {
          const Icon = ICONS[a.icon] ?? TriangleAlert
          const border =
            a.type === 'critical'
              ? 'border-l-destructive bg-destructive/5'
              : a.type === 'warning'
                ? 'border-l-warning bg-warning/5'
                : a.type === 'empty'
                  ? 'border-l-success bg-success/5'
                  : 'border-l-primary bg-primary/5'
          const iconColor =
            a.type === 'critical'
              ? 'text-danger'
              : a.type === 'warning'
                ? 'text-warning-dark'
                : a.type === 'empty'
                  ? 'text-success-dark'
                  : 'text-primary'
          return (
            <div key={i} className={cn('rounded-xl border border-l-4 bg-card p-3 shadow-sm', border)}>
              <div className="flex items-start gap-2">
                <Icon className={cn('mt-0.5 size-5 shrink-0', iconColor)} />
                <div>
                  <div className="text-sm font-semibold text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
