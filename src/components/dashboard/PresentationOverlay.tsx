import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getChartCanvas } from '@/lib/charts'
import { activitySlaRows } from '@/utils/rules/kpis'
import { MONTHS } from '@/utils/date'
import { KpiGrid } from './cards/KpiGrid'
import { TechCards } from './cards/TechCards'
import { ProjectionSection } from './sections/ProjectionSection'
import { ActivitySlaTable } from './modals/ActivitySlaTable'
import { IndisTable } from './modals/IndisTable'
import type { DashboardData } from '@/hooks/useDashboardData'
import type { ReactNode } from 'react'

interface PresentationOverlayProps {
  dash: DashboardData
  onClose: () => void
}

const VOID = <span className="text-[13px] text-muted-foreground">Nenhum dado disponível.</span>

export function PresentationOverlay({ dash, onClose }: PresentationOverlayProps) {
  const [current, setCurrent] = useState(0)
  const total = 7

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1))
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(total - 1, c + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const noop = () => undefined

  const evoImg = getChartCanvas('evolucao')?.toDataURL() ?? null
  const tendImg = getChartCanvas('tendencia')?.toDataURL() ?? null
  const slaRows = activitySlaRows(Object.entries(dash.region.sla?.[dash.pk]?.activitySla || {}))
  const monthText = `${MONTHS[dash.currentMonth]} ${dash.currentYear}`
  const regionName = dash.region.name

  const slides: Array<{ h1: string; sub: string; body: ReactNode }> = [
    {
      h1: 'Indicadores',
      sub: `${regionName} · ${monthText}`,
      body: (
        <KpiGrid kpis={dash.kpis} goals={dash.goals} params={dash.params} onOpenSla={noop} onOpenTotalOs={noop} onOpenIndis={noop} />
      ),
    },
    {
      h1: 'Desempenho Individual',
      sub: 'Média, quartil e SLA por técnico',
      body: (
        <TechCards
          params={dash.params}
          rankingRows={dash.rankingRows}
          pastBusinessDays={dash.businessDaysPast}
          onOpenMom={noop}
          onOpenOs={noop}
        />
      ),
    },
    {
      h1: 'Evolução Diária da Equipe',
      sub: 'Média de pontos por dia útil',
      body: evoImg ? <img src={evoImg} alt="Evolução Diária" className="max-h-[500px] w-auto" /> : VOID,
    },
    {
      h1: 'Tendência e Projeção Semanal',
      sub: 'Média realizada e projeção da semana em curso',
      body: tendImg ? <img src={tendImg} alt="Tendência Semanal" className="max-h-[500px] w-auto" /> : VOID,
    },
    {
      h1: 'OS no Prazo por Atividade',
      sub: 'Desempenho por tipo de atividade',
      body: <ActivitySlaTable rows={slaRows} />,
    },
    {
      h1: 'Indisponibilidade Técnica',
      sub: 'Justificativas registradas no período',
      body: <IndisTable overview={dash.overview} />,
    },
    {
      h1: 'Projeção de Fechamento',
      sub: 'Projeção baseada na tendência dos técnicos',
      body: <ProjectionSection region={dash.region} weeks={dash.weeks} params={dash.params} />,
    },
  ]

  const go = (n: number) => setCurrent(Math.max(0, Math.min(total - 1, n)))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <h2 className="font-display text-lg font-bold">
          Dashboard — {regionName}
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(current - 1)}
            style={{ visibility: current === 0 ? 'hidden' : 'visible' }}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            {current + 1}/{total}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => go(current + 1)}
            style={{ visibility: current === total - 1 ? 'hidden' : 'visible' }}
          >
            Próximo
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar apresentação" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {slides.map((s, i) => (
          <div key={i} hidden={i !== current} className="mx-auto flex max-w-[960px] flex-col gap-6">
            <div>
              <h1 className="font-display text-[28px] font-bold">{s.h1}</h1>
              <div className="text-sm text-muted-foreground">{s.sub}</div>
            </div>
            {s.body}
          </div>
        ))}
      </div>
    </div>
  )
}
