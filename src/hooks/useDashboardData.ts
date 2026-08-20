import { useMemo } from 'react'
import { useStateStore } from '@/stores/state.store'
import { currentRegion, importedTechs, periodKeyOf } from '@/services/state'
import { buildWeeks, isoToDate, MONTHS } from '@/utils/date'
import { computeAlerts, computeDashboardKpis } from '@/utils/rules/kpis'
import { computeRanking } from '@/utils/rules/ranking'
import { computeTeamGoalsSummary, computeTeamOverview } from '@/utils/rules/goals'
import type { DayInfo } from '@/types'

export function useDashboardData() {
  const data = useStateStore((s) => s.data)
  return useMemo(() => {
    if (!data) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const region = currentRegion(data)
    const weeks = buildWeeks(data.currentYear, data.currentMonth)
    const params = data.params
    const colaboradores = data.colaboradores
    const techs = importedTechs(region, colaboradores)
    const allDays = weeks.flat() as DayInfo[]
    const businessDaysPast = allDays.filter(
      (d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today,
    )
    const rankingRows = computeRanking(region, weeks, params, today, colaboradores)
    const goals = computeTeamGoalsSummary(region, weeks, params, today, techs)
    const overview = computeTeamOverview(region, weeks, today, techs)
    const kpis = computeDashboardKpis(region, weeks, params, today, colaboradores)
    const alerts = computeAlerts(region, weeks, params, today, colaboradores)
    const pk = periodKeyOf(data)
    const monthLabel = `${MONTHS[data.currentMonth].charAt(0).toUpperCase()}${MONTHS[
      data.currentMonth
    ].slice(1)}/${data.currentYear}`
    return {
      region,
      weeks,
      params,
      techs,
      colaboradores,
      today,
      businessDaysPast,
      rankingRows,
      goals,
      overview,
      kpis,
      alerts,
      pk,
      monthLabel,
      currentYear: data.currentYear,
      currentMonth: data.currentMonth,
    }
  }, [data])
}

export type DashboardData = NonNullable<ReturnType<typeof useDashboardData>>
