import type { Params, Region, TeamGoalsSummary, TeamOverview, Week, UnproductiveTech } from '@/types'
import { isoToDate } from '@/utils/date'
import { importedTechs } from '@/services/state'
import { minScoreForDow } from './quartis'
import { JUSTIFICATION_CODES } from '@/lib/constants'

export function computeTeamGoalsSummary(
  region: Region,
  weeks: Week[],
  params: Params,
  today: Date,
): TeamGoalsSummary {
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const pk = weeks[0][0].iso.slice(0, 7)

  let totalExpected = 0
  let totalExpectedPast = 0
  let totalAchieved = 0
  allDays.forEach((d) => {
    let available = 0
    let achieved = 0
    importedTechs(region).forEach((tech) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw === 'string') return
      available++
      if (typeof raw === 'number') achieved += raw
    })
    const expected = available * minScoreForDow(d.dow, params.dayMeta)
    totalExpected += expected
    if (isoToDate(d.iso) < today) totalExpectedPast += expected
    if (isoToDate(d.iso) < today) totalAchieved += achieved
  })

  const pct = totalExpectedPast > 0 ? (totalAchieved / totalExpectedPast) * 100 : null
  const businessDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6).length
  return { pct, totalAchieved, totalExpected, totalExpectedPast, businessDays }
}

export function teamDailyTrend(region: Region, days: Week, params: Params): number | null {
  const pk = days[0]?.iso.slice(0, 7) ?? ''
  const trendWindow = params.trendWindow
  const vals: number[] = []
  for (let i = days.length - 1; i >= 0 && vals.length < trendWindow; i--) {
    const d = days[i]
    let dayPts = 0
    let dayAvail = 0
    importedTechs(region).forEach((tech) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw !== 'string') {
        dayAvail++
        if (typeof raw === 'number') dayPts += raw
      }
    })
    if (dayAvail > 0) vals.push(dayPts / dayAvail)
  }
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export function computeTeamOverview(region: Region, weeks: Week[], today: Date): TeamOverview {
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const pk = weeks[0][0].iso.slice(0, 7)
  const businessDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6)
  const pastBusinessDays = businessDays.filter((d) => isoToDate(d.iso) < today)

  const techCount = importedTechs(region).length
  const totalTechDays = techCount * businessDays.length
  const totalTechDaysPast = techCount * pastBusinessDays.length

  const justCounts: Record<string, number> = {}
  JUSTIFICATION_CODES.forEach((c) => {
    justCounts[c] = 0
  })
  let totalJustified = 0
  let unproductiveDays = 0
  const unproductiveByTech: UnproductiveTech[] = []

  importedTechs(region).forEach((tech) => {
    businessDays.forEach((d) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw === 'string') {
        if (Object.prototype.hasOwnProperty.call(justCounts, raw)) justCounts[raw]++
        totalJustified++
      }
    })
    let techUnproductive = 0
    let techNoEntry = 0
    pastBusinessDays.forEach((d) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (raw === null || raw === undefined) {
        techNoEntry++
        techUnproductive++
        unproductiveDays++
      } else if (typeof raw === 'number' && raw === 0) {
        techUnproductive++
        unproductiveDays++
      }
    })
    const techPct = pastBusinessDays.length > 0 ? (techUnproductive / pastBusinessDays.length) * 100 : null
    unproductiveByTech.push({ tech, count: techUnproductive, noEntry: techNoEntry, pct: techPct })
  })

  unproductiveByTech.sort((a, b) => b.count - a.count)

  const unavailPct = totalTechDays > 0 ? (totalJustified / totalTechDays) * 100 : null
  const unproductivePct = totalTechDaysPast > 0 ? (unproductiveDays / totalTechDaysPast) * 100 : null

  return {
    techCount,
    businessDaysCount: businessDays.length,
    totalTechDays,
    totalJustified,
    unavailPct,
    justCounts,
    unproductiveDays,
    totalTechDaysPast,
    unproductivePct,
    unproductiveByTech,
    pastBusinessDaysCount: pastBusinessDays.length,
  }
}
