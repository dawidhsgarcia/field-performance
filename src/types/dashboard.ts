import type { Technician } from './state'

export interface DayInfo {
  day: number
  dow: number
  iso: string
}

export type Week = DayInfo[]

export interface RankingRow {
  tech: Technician
  sum: number
  days: number
  avg: number | null
  quartil: number | null
}

export interface TeamGoalsSummary {
  pct: number | null
  totalAchieved: number
  totalExpected: number
  totalExpectedPast: number
  businessDays: number
}

export interface UnproductiveTech {
  tech: Technician
  count: number
  noEntry: number
  pct: number | null
}

export interface TeamOverview {
  techCount: number
  businessDaysCount: number
  totalTechDays: number
  totalJustified: number
  unavailPct: number | null
  justCounts: Record<string, number>
  unproductiveDays: number
  totalTechDaysPast: number
  unproductivePct: number | null
  unproductiveByTech: UnproductiveTech[]
  pastBusinessDaysCount: number
}

export interface ProjectionRow {
  tech: Technician
  sum: number
  days: number
  currentAvg: number | null
  currentQuartil: number | null
  trendAvg: number | null
  trendCount: number
  projectedSum: number
  projectedDays: number
  projectedAvg: number | null
  projectedQuartil: number | null
}

export interface ProjectionResult {
  rows: ProjectionRow[]
  remaining: number
}

export type AlertSeverity = 'critical' | 'warning' | 'empty'

export interface AlertItem {
  type: AlertSeverity
  icon: string
  title: string
  desc: string
}

export interface DashboardKpis {
  slaPct: number | null
  slaOn: number
  slaEval: number
  totalOS: number
  teamAvg: number | null
  totalPts: number
  totalJustified: number
  unavailPct: number | null
  quartilCounts: Record<number, number>
}

export interface MomStats {
  pk: string
  avg: number | null
  sum: number
  days: number
  quartil: number | null
  slaPct: number | null
  slaEval: number
  slaOn: number
  mttrMin: number | null
}
