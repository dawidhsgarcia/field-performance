import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtNum } from '@/utils/format'
import { computeProjection, pointsAboveMeta } from '@/utils/rules/projection'
import { computeTeamGoalsSummary, computeTeamOverview } from '@/utils/rules/goals'
import { MIN_SCORE, quartilOf } from '@/utils/rules/quartis'
import { importedTechs } from '@/services/state'
import { quartilBadgeClass } from '@/utils/quartilColors'
import type { AppState, Params, Region, Week } from '@/types'

interface ProjectionSectionProps {
  region: Region
  weeks: Week[]
  params: Params
  colaboradores?: AppState['colaboradores']
}

export function ProjectionSection({ region, weeks, params, colaboradores }: ProjectionSectionProps) {
  const result = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const goals = computeTeamGoalsSummary(region, weeks, params, today, importedTechs(region, colaboradores))
    const overview = computeTeamOverview(region, weeks, today, importedTechs(region, colaboradores))
    const { rows, remaining } = computeProjection(region, weeks, params, today, colaboradores)
    return { goals, rows, remaining, overview }
  }, [region, weeks, params, colaboradores])

  if (region.technicians.length === 0 || result.goals.totalExpected === 0) return null

  const { goals, rows, remaining, overview } = result

  if (remaining === 0) {
    const pct =
      goals.totalExpectedPast > 0 ? Math.round((goals.totalAchieved / goals.totalExpectedPast) * 100) : null
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Projeção de Fechamento</CardTitle>
        </CardHeader>
        <CardContent className="text-[13px] text-muted-foreground">
          Mês encerrado. Total realizado: {fmtNum(goals.totalAchieved)} pts de{' '}
          {fmtNum(goals.totalExpectedPast)} esperados{pct !== null ? ` (${pct}%)` : ''}.
        </CardContent>
      </Card>
    )
  }

  const teamProjectedSum = rows.reduce((s, r) => s + (r.projectedSum || 0), 0)
  const projectedPct = goals.totalExpected > 0 ? (teamProjectedSum / goals.totalExpected) * 100 : null
  const remainingForGoal = goals.totalExpected - teamProjectedSum
  const ptsPerDayNeeded = remaining > 0 ? Math.ceil(remainingForGoal / remaining) : null
  const barPct = projectedPct !== null ? Math.min(projectedPct, 100) : 0
  const barCls =
    projectedPct !== null && projectedPct >= 100
      ? 'bg-success-dark'
      : projectedPct !== null && projectedPct >= 70
        ? 'bg-warning'
        : 'bg-danger'
  const projTextCls =
    barCls === 'bg-success-dark' ? 'text-success-dark' : barCls === 'bg-warning' ? 'text-warning-dark' : 'text-danger'

  let gapHtml: React.ReactNode = null
  if (projectedPct !== null && projectedPct < 100) {
    gapHtml = (
      <div className="rounded-lg border-l-4 border-l-warning bg-warning/10 p-3 text-[13px] text-warning-dark">
        {remainingForGoal > 0 ? (
          <>
            ⚠️ Faltam <strong>{fmtNum(remainingForGoal)} pts</strong> em <strong>{remaining} dias úteis</strong> ={' '}
            <strong>{ptsPerDayNeeded} pts/dia</strong> extras pela equipe para atingir a meta
          </>
        ) : (
          <>⚠️ Projeção indica {Math.round(projectedPct)}% da meta — abaixo do esperado</>
        )}
      </div>
    )
  } else if (projectedPct !== null && projectedPct >= 100) {
    gapHtml = (
      <div className="rounded-lg border-l-4 border-l-success-dark bg-success/10 p-3 text-[13px] text-success-dark">
        Projeção indica atingimento da meta ✓
      </div>
    )
  }

  const statCls = 'flex flex-col gap-0.5'
  const statValueCls = 'font-display text-lg font-bold tabular-nums'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Projeção de Fechamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Realizado</span>
            <span className={statValueCls}>
              {fmtNum(goals.totalAchieved)}{' '}
              <span className="text-[13px] font-medium text-muted-foreground">pts</span>
            </span>
          </div>
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Projetado</span>
            <span className={cn(statValueCls, projectedPct !== null && projectedPct >= 100 ? 'text-success-dark' : 'text-warning-dark')}>
              {fmtNum(teamProjectedSum)}{' '}
              <span className="text-[13px] font-medium text-muted-foreground">pts</span>
            </span>
          </div>
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Meta total</span>
            <span className={statValueCls}>
              {fmtNum(goals.totalExpected)}{' '}
              <span className="text-[13px] font-medium text-muted-foreground">pts</span>
            </span>
          </div>
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Dias úteis restantes</span>
            <span className={statValueCls}>{remaining}</span>
          </div>
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Dias úteis do mês</span>
            <span className={statValueCls}>{goals.businessDays}</span>
          </div>
          <div className={statCls}>
            <span className="text-xs text-muted-foreground">Dias/técnico (total · disp.)</span>
            <span className={statValueCls}>
              {overview.totalTechDays}
              <span className="text-[13px] font-medium text-muted-foreground">
                {' '}· {overview.totalTechDays - overview.totalJustified}
              </span>
            </span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full', barCls)} style={{ width: `${barPct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">
          Projeção:{' '}
          <strong className={projTextCls}>{projectedPct !== null ? Math.round(projectedPct) + '%' : '–'}</strong>{' '}
          da meta baseada na tendência recente de cada técnico
        </div>
        {gapHtml}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Média Atual</TableHead>
                <TableHead className="text-center">Média Proj.</TableHead>
                <TableHead className="text-center">Quartil Proj.</TableHead>
                <TableHead className="text-center">Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const metaDiaria = MIN_SCORE(params.dayMeta)
                const gapQ1 = pointsAboveMeta(r, metaDiaria, params.quartil.q1, remaining)
                const gapCls =
                  gapQ1 !== null && gapQ1 > 0
                    ? 'bg-warning/15 text-warning-dark'
                    : gapQ1 === 0
                      ? 'bg-success/15 text-success-dark'
                      : 'bg-muted text-muted-foreground'
                const gapLabel = gapQ1 === null ? '—' : gapQ1 === 0 ? '✓' : `+${fmtNum(gapQ1)}`
                const q = quartilOf(r.projectedAvg, params.quartil)
                const variacao =
                  r.currentAvg !== null && r.currentAvg > 0 && r.projectedAvg !== null
                    ? ((r.projectedAvg - r.currentAvg) / r.currentAvg) * 100
                    : null
                return (
                  <TableRow key={r.tech.funci}>
                    <TableCell className="font-semibold">{r.tech.nome}</TableCell>
                    <TableCell className="text-center">{r.currentAvg !== null ? fmtNum(r.currentAvg) : '–'}</TableCell>
                    <TableCell className="text-center">
                      {r.projectedAvg !== null ? (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <span>{fmtNum(r.projectedAvg)}</span>
                          {variacao !== null && (
                            <span
                              className={cn(
                                'inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
                                variacao > 0
                                  ? 'bg-success/15 text-success-dark'
                                  : variacao < 0
                                    ? 'bg-danger/15 text-danger'
                                    : 'bg-muted text-muted-foreground',
                              )}
                              title="Variação em relação à Média Atual"
                            >
                              {variacao > 0 ? '+' : ''}
                              {fmtNum(variacao)}%
                            </span>
                          )}
                        </span>
                      ) : (
                        '–'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', quartilBadgeClass(q))}>
                        {q ? `${q}º` : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', gapCls)}>
                        {gapLabel}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
