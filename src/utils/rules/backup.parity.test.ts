import { describe, expect, it } from 'vitest'
import { migrateState } from '@/lib/migrateState'
import { readBackupFixture } from '@/test/fixtures'
import { buildWeeks, periodKey } from '@/utils/date'
import { currentRegion } from '@/services/state'
import { computeDashboardKpis } from './kpis'
import { computeTeamGoalsSummary } from './goals'
import { computeRanking } from './ranking'

describe('Paridade com backup real (somente leitura)', () => {
  const backup = readBackupFixture()

  it.skipIf(backup === null)('KPIs do Dashboard são consistentes com os dados do backup', () => {
    const state = migrateState(backup)
    expect(state).not.toBeNull()
    if (!state) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weeks = buildWeeks(state.currentYear, state.currentMonth)
    const region = currentRegion(state)
    const pk = periodKey(state.currentYear, state.currentMonth)

    const kpis = computeDashboardKpis(region, weeks, state.params, today)
    const goals = computeTeamGoalsSummary(region, weeks, state.params, today)
    const ranking = computeRanking(region, weeks, state.params, today)
    const sla = region.sla?.[pk]

    expect(kpis.totalPts).toBe(goals.totalAchieved)
    expect(kpis.totalOS).toBe(sla?.totalOS || 0)

    if (sla?.slaCounts && sla.slaCounts.evaluated > 0) {
      expect(kpis.slaPct).toBeCloseTo(
        (sla.slaCounts.onTime / sla.slaCounts.evaluated) * 100,
        5,
      )
    }

    const avgs = ranking.map((r) => r.avg).filter((a): a is number => a !== null)
    if (avgs.length > 0) {
      const mean = avgs.reduce((s, a) => s + a, 0) / avgs.length
      expect(kpis.teamAvg).toBeCloseTo(mean, 5)
    }
  })
})
