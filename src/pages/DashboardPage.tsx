import { useState } from 'react'
import { toast } from 'sonner'
import { Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RegionMonthFilter } from '@/components/shared/RegionMonthFilter'
import { KpiGrid } from '@/components/dashboard/cards/KpiGrid'
import { TechCards } from '@/components/dashboard/cards/TechCards'
import { AlertSection } from '@/components/dashboard/sections/AlertSection'
import { ProjectionSection } from '@/components/dashboard/sections/ProjectionSection'
import { EvolucaoChart } from '@/components/dashboard/charts/EvolucaoChart'
import { TendenciaChart } from '@/components/dashboard/charts/TendenciaChart'
import { OsModal } from '@/components/dashboard/modals/OsModal'
import { SlaModal } from '@/components/dashboard/modals/SlaModal'
import { IndisModal } from '@/components/dashboard/modals/IndisModal'
import { TotalOsModal } from '@/components/dashboard/modals/TotalOsModal'
import { MomModal } from '@/components/dashboard/modals/MomModal'
import { PresentationOverlay } from '@/components/dashboard/PresentationOverlay'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useStateStore } from '@/stores/state.store'

type ModalState =
  | { type: 'sla' }
  | { type: 'indis' }
  | { type: 'totalos' }
  | { type: 'os'; funci: string }
  | { type: 'mom'; funci: string }
  | null

export function DashboardPage() {
  const status = useStateStore((s) => s.status)
  const data = useStateStore((s) => s.data)
  const dash = useDashboardData()
  const [modal, setModal] = useState<ModalState>(null)
  const [presenting, setPresenting] = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!data || !dash) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum dado carregado.</div>
        </div>
      </div>
    )
  }

  const noTechs = dash.techs.length === 0
  const { region, weeks, params, pk, monthLabel, currentMonth, currentYear, overview } = dash

  const openSla = () => {
    const sla = region.sla?.[pk]?.activitySla || {}
    if (Object.keys(sla).length === 0) {
      toast.error('Sem dados de OS no prazo neste período.')
      return
    }
    setModal({ type: 'sla' })
  }

  const openTotalOs = () => {
    const report = region.report?.[pk] || {}
    const total = Object.keys(report).reduce((s, f) => s + (report[f]?.length || 0), 0)
    if (total === 0) {
      toast.error('Sem detalhes de OS neste período. Importe o relatório para habilitar esta visualização.')
      return
    }
    setModal({ type: 'totalos' })
  }

  const openIndis = () => {
    if (overview.totalJustified === 0) {
      toast.error('Sem justificativas registradas neste período.')
      return
    }
    setModal({ type: 'indis' })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral da produtividade das equipes: KPIs, alertas, evolução e projeção de fechamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RegionMonthFilter />
          <Button type="button" variant="outline" size="sm" onClick={() => setPresenting(true)}>
            <Presentation className="size-4" />
            Apresentar
          </Button>
        </div>
      </div>

      {noTechs ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">
            Nenhum técnico importado do relatório nesta região ainda.
          </div>
        </div>
      ) : (
        <>
          <KpiGrid
            kpis={dash.kpis}
            goals={dash.goals}
            params={params}
            onOpenSla={openSla}
            onOpenTotalOs={openTotalOs}
            onOpenIndis={openIndis}
          />
          <AlertSection alerts={dash.alerts} />
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-display text-base font-bold">Evolução Diária da Equipe</h3>
              <div className="mt-2">
                <EvolucaoChart
                  region={region}
                  weeks={weeks}
                  params={params}
                  currentMonth={currentMonth}
                  colaboradores={data.colaboradores}
                />
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h3 className="font-display text-base font-bold">Tendência e Projeção Semanal</h3>
              <div className="mt-2">
                <TendenciaChart
                  region={region}
                  weeks={weeks}
                  params={params}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  colaboradores={data.colaboradores}
                />
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <h3 className="font-display text-base font-bold">Desempenho Individual</h3>
            <div className="mt-3">
              <TechCards
                params={params}
                rankingRows={dash.rankingRows}
                pastBusinessDays={dash.businessDaysPast}
                onOpenMom={(funci) => setModal({ type: 'mom', funci })}
                onOpenOs={(funci) => setModal({ type: 'os', funci })}
              />
            </div>
          </div>
          <ProjectionSection region={region} weeks={weeks} params={params} colaboradores={data.colaboradores} />
        </>
      )}

      {modal?.type === 'sla' && <SlaModal region={region} pk={pk} monthLabel={monthLabel} onOpenChange={() => setModal(null)} />}
      {modal?.type === 'indis' && <IndisModal overview={dash.overview} monthLabel={monthLabel} onOpenChange={() => setModal(null)} />}
      {modal?.type === 'totalos' && <TotalOsModal region={region} pk={pk} monthLabel={monthLabel} onOpenChange={() => setModal(null)} />}
      {modal?.type === 'os' && <OsModal region={region} pk={pk} funci={modal.funci} onOpenChange={() => setModal(null)} />}
      {modal?.type === 'mom' && (
        <MomModal
          region={region}
          pk={pk}
          funci={modal.funci}
          params={params}
          currentMonth={currentMonth}
          onOpenChange={() => setModal(null)}
        />
      )}

      {presenting && <PresentationOverlay dash={dash} onClose={() => setPresenting(false)} />}
    </div>
  )
}
