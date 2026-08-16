import { CalendarCheck, Clock3, Group, PiggyBank, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { bhFmtMin } from '@/utils/format'
import { fmtNum } from '@/utils/format'
import type { BhKpis } from '@/utils/rules/bh'

function Kpi({
  icon,
  label,
  value,
  sub,
  status = '',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  status?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{label}</div>
        <div className={cn('font-display text-2xl font-bold tabular-nums', status)}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  )
}

export function BhKpis({ kpis }: { kpis: BhKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Kpi
        icon={<Group className="size-5" />}
        label="Técnicos"
        value={String(kpis.count)}
        sub="com vencimento no período"
      />
      <Kpi
        icon={<Clock3 className="size-5" />}
        label="Horas a compensar"
        value={bhFmtMin(kpis.totHoras)}
        sub="total do período"
      />
      <Kpi
        icon={<Wallet className="size-5" />}
        label="VLR total"
        value={`R$ ${fmtNum(kpis.totVlr)}`}
        sub="a pagar se não compensado"
      />
      <Kpi
        icon={<PiggyBank className="size-5" />}
        label="Dias a compensar"
        value={String(kpis.totDias)}
        sub="folgas necessárias"
      />
      <Kpi
        icon={<CalendarCheck className="size-5" />}
        label="Compensado"
        value={bhFmtMin(kpis.totComp)}
        sub="folgas agendadas no período"
        status={kpis.compensado ? 'text-success-dark' : ''}
      />
    </div>
  )
}
