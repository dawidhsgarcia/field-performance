import { CalendarX2, ClipboardList, Flag, Gauge, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtNum } from '@/utils/format'
import type { DashboardKpis, Params, TeamGoalsSummary } from '@/types'

interface KpiGridProps {
  kpis: DashboardKpis
  goals: TeamGoalsSummary
  params: Params
  onOpenSla: () => void
  onOpenTotalOs: () => void
  onOpenIndis: () => void
}

type Status = 'success' | 'warning' | 'danger' | ''

function statusColor(status: Status): string {
  if (status === 'success') return 'text-success-dark'
  if (status === 'warning') return 'text-warning-dark'
  if (status === 'danger') return 'text-danger'
  return ''
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  status = '',
  onClick,
  title,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  status?: Status
  onClick?: () => void
  title?: string
}) {
  const cls = cn(
    'group flex items-center gap-3 rounded-xl border bg-card p-5 text-left shadow-sm shadow-black/[0.03] transition-all',
    onClick && 'cursor-pointer hover:border-accent hover:shadow-md hover:shadow-black/[0.05]',
  )
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} title={title}>
        <KpiBody icon={icon} label={label} value={value} sub={sub} status={status} />
      </button>
    )
  }
  return (
    <div className={cls}>
      <KpiBody icon={icon} label={label} value={value} sub={sub} status={status} />
    </div>
  )
}

function KpiBody({
  icon,
  label,
  value,
  sub,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  status: Status
}) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground transition-colors group-hover:bg-accent/30 group-hover:text-accent-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
        <div className={cn('font-display text-3xl font-semibold tracking-tight tabular-nums', statusColor(status))}>
          {value}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      </div>
    </>
  )
}

export function KpiGrid({ kpis, goals, params, onOpenSla, onOpenTotalOs, onOpenIndis }: KpiGridProps) {
  const slaStatus: Status =
    kpis.slaPct !== null ? (kpis.slaPct >= 90 ? 'success' : kpis.slaPct < 70 ? 'danger' : 'warning') : 'warning'
  const goalsStatus: Status =
    goals.pct !== null
      ? goals.pct >= 100
        ? 'success'
        : goals.pct < params.alertTeam.belowPct
          ? 'danger'
          : 'warning'
      : 'warning'
  const avgStatus: Status =
    kpis.teamAvg !== null
      ? kpis.teamAvg >= params.quartil.q1
        ? 'success'
        : kpis.teamAvg < params.alertTech.below
          ? 'danger'
          : ''
      : ''
  const indisStatus: Status =
    kpis.unavailPct !== null
      ? kpis.unavailPct >= 20
        ? 'danger'
        : kpis.unavailPct >= 10
          ? 'warning'
          : 'success'
      : ''

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        icon={<Timer className="size-5" />}
        label="SLA — % no Prazo"
        value={kpis.slaPct !== null ? kpis.slaPct + '%' : '–'}
        sub={kpis.slaEval > 0 ? `${kpis.slaOn}/${kpis.slaEval} OS` : 'sem dados de prazo'}
        status={slaStatus}
        onClick={onOpenSla}
        title="Ver OS no prazo por atividade"
      />
      <KpiCard
        icon={<Flag className="size-5" />}
        label="Meta da Equipe"
        value={goals.pct !== null ? Math.round(goals.pct) + '%' : '–'}
        sub={`${fmtNum(goals.totalAchieved) || '0'} / ${fmtNum(goals.totalExpectedPast) || '0'} pts`}
        status={goalsStatus}
      />
      <KpiCard
        icon={<Gauge className="size-5" />}
        label="Média da Equipe"
        value={kpis.teamAvg !== null ? fmtNum(kpis.teamAvg) : '–'}
        sub="pts/dia em média"
        status={avgStatus}
      />
      <KpiCard
        icon={<ClipboardList className="size-5" />}
        label="Total de OS"
        value={fmtNum(kpis.totalOS) || '0'}
        sub="ordens de serviço no mês"
        onClick={onOpenTotalOs}
        title="Ver detalhe das OS do mês"
      />
      <KpiCard
        icon={<CalendarX2 className="size-5" />}
        label="Indisponibilidade Técnica"
        value={kpis.unavailPct !== null ? Math.round(kpis.unavailPct) + '%' : '–'}
        sub={`${kpis.totalJustified} dia(s) justificado(s)`}
        status={indisStatus}
        onClick={onOpenIndis}
        title="Ver justificativas / indisponibilidade técnica"
      />
    </div>
  )
}
