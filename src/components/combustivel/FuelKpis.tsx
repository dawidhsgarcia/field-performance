import { CircleDollarSign, Gauge, PiggyBank, ReceiptText, TrendingUp, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtNum } from '@/utils/format'
import type { FuelKpis, FuelStatus } from '@/types'

function statusColor(status: FuelStatus): string {
  if (status === 'success') return 'text-success-dark'
  if (status === 'warning') return 'text-warning-dark'
  if (status === 'danger') return 'text-danger'
  return ''
}

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
  status?: FuelStatus
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{label}</div>
        <div className={cn('font-display text-2xl font-bold tabular-nums', statusColor(status))}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  )
}

export function FuelKpis({ kpis }: { kpis: FuelKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Kpi
        icon={<Wallet className="size-5" />}
        label="Custo total"
        value={`R$ ${fmtNum(kpis.totCusto)}`}
        sub="valor gasto no mês"
      />
      <Kpi
        icon={<PiggyBank className="size-5" />}
        label="Orçamento"
        value={kpis.totOrcamento > 0 ? `R$ ${fmtNum(kpis.totOrcamento)}` : '—'}
        sub={kpis.totOrcamento > 0 ? 'orçamento mensal' : 'defina no Cadastro de Veículos'}
      />
      <Kpi
        icon={<TrendingUp className="size-5" />}
        label="Orçamento × Consumo"
        value={kpis.orcPct !== null ? fmtNum(kpis.orcPct) + '%' : '—'}
        sub={kpis.orcPct !== null ? 'do orçamento utilizado' : 'defina no Cadastro de Veículos'}
        status={kpis.orcStatus}
      />
      <Kpi
        icon={<Gauge className="size-5" />}
        label="KM/L médio"
        value={kpis.kmPorLitro !== null ? fmtNum(kpis.kmPorLitro) : '–'}
        sub="km por litro"
        status={kpis.kmlStatus}
      />
      <Kpi
        icon={<CircleDollarSign className="size-5" />}
        label="Custo por km"
        value={kpis.custoKm !== null ? `R$ ${fmtNum(kpis.custoKm)}` : '–'}
        sub="por km rodado"
      />
      <Kpi
        icon={<ReceiptText className="size-5" />}
        label="Custo Operacional"
        value={kpis.custoPorOS !== null ? `R$ ${fmtNum(kpis.custoPorOS)}` : '—'}
        sub={kpis.custoPorOS !== null ? 'custo por OS executada' : 'importe o relatório de atividades (.xlsx)'}
      />
    </div>
  )
}
