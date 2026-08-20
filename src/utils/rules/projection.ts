import type { AppState, Params, ProjectionResult, ProjectionRow, Region, Week } from '@/types'
import { isoToDate } from '@/utils/date'
import { importedTechs } from '@/services/state'
import { quartilOf } from './quartis'

export function pointsAboveMeta(
  row: ProjectionRow,
  meta: number,
  q1: number,
  remaining: number,
): number | null {
  if (remaining <= 0 || row.days <= 0 || row.currentAvg === null) return null
  if (row.currentQuartil === 1) return 0
  const needQ1 = (q1 * (row.days + remaining) - row.sum) / remaining
  const above = needQ1 - meta
  return above > 0 ? above : 0
}

export function computeProjection(
  region: Region,
  weeks: Week[],
  params: Params,
  today: Date,
  colaboradores?: AppState['colaboradores'],
): ProjectionResult {
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const pk = weeks[0][0].iso.slice(0, 7)

  const isBiz = (d: Week[number]) => d.dow !== 0 && d.dow !== 6
  const pastBusinessDays = allDays.filter((d) => isBiz(d) && isoToDate(d.iso) < today)
  const futureBusinessDays = allDays.filter((d) => isBiz(d) && isoToDate(d.iso) >= today)
  const remaining = futureBusinessDays.length
  const trendWindow = params.trendWindow

  const rows = importedTechs(region, colaboradores).map((tech) => {
    let sum = 0
    let days = 0
    pastBusinessDays.forEach((d) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw === 'string') return
      if (typeof raw === 'number') sum += raw
      days++
    })
    const currentAvg = days > 0 ? sum / days : null

    const trendValues: number[] = []
    for (let i = pastBusinessDays.length - 1; i >= 0 && trendValues.length < trendWindow; i--) {
      const raw = region.entries?.[pk]?.[tech.funci]?.[pastBusinessDays[i].iso]
      if (typeof raw === 'number') trendValues.push(raw)
    }
    const trendAvg =
      trendValues.length > 0
        ? trendValues.reduce((a, b) => a + b, 0) / trendValues.length
        : null

    const fallbackAvg = trendAvg !== null ? trendAvg : currentAvg
    const hasBasis = fallbackAvg !== null
    const projectedSum = sum + (hasBasis ? fallbackAvg * remaining : 0)
    const projectedDays = days + remaining
    const projectedAvg =
      projectedDays > 0 && (hasBasis || days > 0) ? projectedSum / projectedDays : null

    return {
      tech,
      sum,
      days,
      currentAvg,
      currentQuartil: quartilOf(currentAvg, params.quartil),
      trendAvg,
      trendCount: trendValues.length,
      projectedSum,
      projectedDays,
      projectedAvg,
      projectedQuartil: quartilOf(projectedAvg, params.quartil),
    }
  })

  rows.sort((a, b) => {
    if (a.projectedAvg === null && b.projectedAvg === null) return 0
    if (a.projectedAvg === null) return 1
    if (b.projectedAvg === null) return -1
    return b.projectedAvg - a.projectedAvg
  })

  return { rows, remaining }
}
