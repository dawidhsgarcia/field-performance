import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { fmtHrs, fmtNum } from '@/utils/format'
import { osDurationMin } from '@/utils/date'
import { entryOf, periodKeyOf } from '@/services/state'
import { useAcompanhamentoData } from '@/hooks/useAcompanhamentoData'
import { useStateStore } from '@/stores/state.store'
import { Sparkline } from './Sparkline'
import { quartilBadgeClass, quartilBarClass, quartilTextClass } from '@/utils/quartilColors'
import type { DayInfo, Params, RankingRow } from '@/types'

interface TechCardsProps {
  params: Params
  rankingRows: RankingRow[]
  pastBusinessDays: DayInfo[]
  onOpenMom: (funci: string) => void
  onOpenOs: (funci: string) => void
}

export function TechCards({ params, rankingRows, pastBusinessDays, onOpenMom, onOpenOs }: TechCardsProps) {
  const data = useStateStore((s) => s.data)
  const { region } = useAcompanhamentoData()

  const cards = useMemo(() => {
    if (!data || !region) return []
    const pk = periodKeyOf(data)
    return rankingRows.map((r) => {
      const techSla = region.sla?.[pk]?.techSla?.[r.tech.funci] || {
        evaluated: 0,
        onTime: 0,
        totalOS: 0,
      }
      const slaPctTech = techSla.evaluated > 0 ? Math.round((techSla.onTime / techSla.evaluated) * 100) : null
      const slaColor =
        slaPctTech !== null
          ? slaPctTech >= 90
            ? 'text-success-dark'
            : slaPctTech < 70
              ? 'text-danger'
              : 'text-muted-foreground'
          : 'text-muted-foreground'

      const mttrList: number[] = []
      ;(region.report?.[pk]?.[r.tech.funci] || []).forEach((x) => {
        if (!x.avaliada) return
        const m = osDurationMin(x)
        if (m != null) mttrList.push(m)
      })
      const techMttrMin = mttrList.length ? mttrList.reduce((s, m) => s + m, 0) / mttrList.length : null
      const techMttr = techMttrMin != null ? fmtHrs(techMttrMin) : '–'
      const mttrColor = techMttrMin == null ? '' : techMttrMin > 360 ? 'text-danger' : 'text-success-dark'

      const trendVals: number[] = []
      for (let i = pastBusinessDays.length - 1; i >= 0 && trendVals.length < 10; i--) {
        const raw = entryOf(region, pk, r.tech.funci, pastBusinessDays[i].iso)
        if (typeof raw === 'number') trendVals.unshift(raw)
      }

      const progressPct = r.days > 0 ? Math.round((r.days / pastBusinessDays.length) * 100) : 0
      return {
        tech: r.tech,
        sum: r.sum,
        days: r.days,
        avg: r.avg,
        quartil: r.quartil,
        avgLabel: r.avg !== null ? fmtNum(r.avg) : '–',
        badgeLabel: r.quartil ? `${r.quartil}º Quartil` : 'Sem dados',
        slaPctTech,
        slaEval: techSla.evaluated,
        slaOn: techSla.onTime,
        slaColor,
        techMttr,
        mttrColor,
        trendVals,
        progressPct,
      }
    })
  }, [data, region, rankingRows, pastBusinessDays])

  if (pastBusinessDays.length === 0) {
    return (
      <div className="px-4 py-4 text-xs text-muted-foreground">Sem dados de dias úteis para exibir.</div>
    )
  }

  const maxScore = Math.max(...params.dayMeta)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.tech.funci} className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <button
                type="button"
                className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
                title={`${c.tech.nome} — clique para ver comparativo mês a mês`}
                onClick={() => onOpenMom(c.tech.funci)}
              >
                {c.tech.nome}
              </button>
              <div className="text-xs text-muted-foreground">{c.tech.funci}</div>
            </div>
            <div className={cn('font-display text-xl font-bold tabular-nums', quartilTextClass(c.quartil))}>
              {c.avgLabel}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{c.days} dia(s) com produção</span>
            <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', quartilBadgeClass(c.quartil))}>
              {c.badgeLabel}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', quartilBarClass(c.quartil))}
              style={{ width: `${c.progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {c.days}/{pastBusinessDays.length} dias úteis ({c.progressPct}%)
            </span>
            <span>{fmtNum(c.sum || 0)} pts total</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              className={cn('font-semibold hover:underline', c.slaColor)}
              title="Ver OS executadas"
              onClick={() => onOpenOs(c.tech.funci)}
            >
              SLA: {c.slaPctTech !== null ? c.slaPctTech + '%' : '–'}
              {c.slaEval > 0 ? ` (${c.slaOn}/${c.slaEval} OS)` : ''}
            </button>
            <span title="Tempo médio de reparo (só OS com avaliação de prazo)">
              MTTR: <b className={c.mttrColor}>{c.techMttr}</b>
            </span>
          </div>
          <div className="mt-auto">
            <Sparkline values={c.trendVals} quartil={c.quartil ?? 0} maxScore={maxScore} />
          </div>
        </div>
      ))}
    </div>
  )
}
