import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { MONTHS } from '@/utils/date'
import { fmtHrs, fmtNum } from '@/utils/format'
import { computeTechInsights, techActivitySlaRows, techMonthStats } from '@/utils/rules/kpis'
import { MomTechChart } from '@/components/dashboard/charts/MomTechChart'
import { ActivitySlaTable } from './ActivitySlaTable'
import type { Params, Region } from '@/types'

interface MomModalProps {
  region: Region
  pk: string
  funci: string
  params: Params
  currentMonth: number
  onOpenChange: (open: boolean) => void
}

export function MomModal({ region, pk, funci, params, currentMonth, onOpenChange }: MomModalProps) {
  const tech = region.technicians.find((t) => t.funci === funci)
  const y = Number(pk.slice(0, 4))
  const m = Number(pk.slice(5, 7)) - 1

  const data = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const atual = techMonthStats(region, funci, y, m, params)
    let py = y
    let pm = m - 1
    if (pm < 0) {
      pm = 11
      py--
    }
    const anterior = techMonthStats(region, funci, py, pm, params)
    const insights = computeTechInsights(region, funci, atual, anterior, params, today)
    const atvRows = techActivitySlaRows(region, funci, pk)
    return { atual, anterior, insights, atvRows, labelAtual: `${MONTHS[m]} ${y}`, labelAnterior: `${MONTHS[pm]} ${py}`, pm }
  }, [region, funci, pk, y, m, params])

  const arrowCell = (cur: number | null, prev: number | null, invert: boolean) => {
    if (cur === null || prev === null || prev === 0) {
      return <span className="text-muted-foreground">—</span>
    }
    const delta = ((cur - prev) / Math.abs(prev)) * 100
    const better = invert ? delta <= 0 : delta >= 0
    const cls = better ? 'text-success-dark' : 'text-danger'
    const arrow = better ? '↑' : '↓'
    return (
      <span className={cn('font-semibold', cls)}>
        {arrow} {Math.round(Math.abs(delta))}%
      </span>
    )
  }

  const { atual, anterior, insights, atvRows, labelAtual, labelAnterior } = data

  const slaCell = (s: typeof atual) =>
    s.slaPct !== null
      ? s.slaPct + '%' + (s.slaEval > 0 ? ` (${s.slaOn}/${s.slaEval})` : '')
      : '—'

  const quartilVar =
    atual.quartil && anterior.quartil
      ? atual.quartil < anterior.quartil
        ? '↑ melhorou'
        : atual.quartil > anterior.quartil
          ? '↓ piorou'
          : '— igual'
      : '—'

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhamento Técnico — {tech?.nome ?? funci}</DialogTitle>
        </DialogHeader>

        <section>
          <h4 className="font-display text-base font-bold">Insights</h4>
          <p className="text-xs text-muted-foreground">Análise automática — {labelAtual}</p>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {insights.map((it, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border-l-[3px] p-3 text-[13px]',
                  it.cls === 'ok'
                    ? 'border-l-success-dark bg-success/5'
                    : it.cls === 'warn'
                      ? 'border-l-warning-dark bg-warning/5'
                      : it.cls === 'urgent'
                        ? 'border-l-danger bg-danger/5'
                        : 'border-l-primary bg-primary/5',
                )}
                dangerouslySetInnerHTML={{ __html: it.html }}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h4 className="font-display text-base font-bold">Evolução Diária</h4>
          <p className="text-xs text-muted-foreground">Pontuação e Meta Atingida</p>
          <div className="mt-2">
            <MomTechChart region={region} funci={funci} pk={pk} params={params} currentMonth={currentMonth} />
          </div>
        </section>

        <section className="mt-6">
          <h4 className="font-display text-base font-bold">Resumo por Atividade</h4>
          <p className="text-xs text-muted-foreground">Desempenho por tipo de atividade — {labelAtual}</p>
          <div className="mt-2">
            <ActivitySlaTable rows={atvRows} />
          </div>
        </section>

        <section className="mt-6">
          <h4 className="font-display text-base font-bold">Comparativo Mensal</h4>
          <p className="text-xs text-muted-foreground">
            <strong>{labelAnterior}</strong> → <strong>{labelAtual}</strong> · Mês atual parcial (até D-1)
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">{labelAnterior}</TableHead>
                  <TableHead className="text-right">{labelAtual}</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">Média pts/dia</TableCell>
                  <TableCell className="text-right">{anterior.avg !== null ? fmtNum(anterior.avg) : '—'}</TableCell>
                  <TableCell className="text-right">{atual.avg !== null ? fmtNum(atual.avg) : '—'}</TableCell>
                  <TableCell className="text-right">{arrowCell(atual.avg, anterior.avg, false)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Total de pontos</TableCell>
                  <TableCell className="text-right">{fmtNum(anterior.sum)}</TableCell>
                  <TableCell className="text-right">{fmtNum(atual.sum)}</TableCell>
                  <TableCell className="text-right">{arrowCell(atual.sum, anterior.sum, false)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Quartil</TableCell>
                  <TableCell className="text-right">{anterior.quartil ? `${anterior.quartil}º` : '—'}</TableCell>
                  <TableCell className="text-right">{atual.quartil ? `${atual.quartil}º` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn('font-semibold', quartilVar.includes('↑') ? 'text-success-dark' : quartilVar.includes('↓') ? 'text-danger' : 'text-muted-foreground')}>
                      {quartilVar}
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">SLA % no prazo</TableCell>
                  <TableCell className="text-right">{slaCell(anterior)}</TableCell>
                  <TableCell className="text-right">{slaCell(atual)}</TableCell>
                  <TableCell className="text-right">{arrowCell(atual.slaPct, anterior.slaPct, false)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">MTTR (horas)</TableCell>
                  <TableCell className="text-right">{anterior.mttrMin != null ? fmtHrs(anterior.mttrMin) : '—'}</TableCell>
                  <TableCell className="text-right">{atual.mttrMin != null ? fmtHrs(atual.mttrMin) : '—'}</TableCell>
                  <TableCell className="text-right">{arrowCell(atual.mttrMin, anterior.mttrMin, true)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
