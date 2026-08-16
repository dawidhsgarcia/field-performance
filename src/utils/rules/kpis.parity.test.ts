import { describe, expect, it } from 'vitest'
import { computeAlerts, computeDashboardKpis } from './kpis'
import { buildWeeks } from '@/utils/date'
import { DEFAULT_PARAMS } from '@/lib/constants'
import type { EntryValue, Region } from '@/types'

function makeRegion(entries: Record<string, EntryValue>): Region {
  return {
    name: 'TESTE',
    technicians: [{ funci: 'T1', nome: 'TEC 1', imported: true }],
    entries: { '2026-07': { T1: entries } },
    locked: true,
    sla: {
      '2026-07': {
        activitySla: {},
        slaCounts: { evaluated: 10, onTime: 8 },
        totalOS: 12,
        techSla: { T1: { totalOS: 12, evaluated: 10, onTime: 8 } },
      },
    },
  }
}

const weeks = buildWeeks(2026, 6)
const today = new Date(2026, 6, 15)
today.setHours(0, 0, 0, 0)

describe('computeDashboardKpis (paridade com o legado)', () => {
  it('calcula SLA, totalOS, média, pontos, indisponibilidade e quartis', () => {
    const region = makeRegion({ '2026-07-01': 4, '2026-07-02': 4, '2026-07-03': 4 })
    const kpis = computeDashboardKpis(region, weeks, DEFAULT_PARAMS, today)

    expect(kpis.slaPct).toBe(80)
    expect(kpis.slaEval).toBe(10)
    expect(kpis.slaOn).toBe(8)
    expect(kpis.totalOS).toBe(12)
    expect(kpis.teamAvg).toBeCloseTo(1.2, 5)
    expect(kpis.totalPts).toBe(12)
    expect(kpis.totalJustified).toBe(0)
    expect(kpis.unavailPct).toBe(0)
    expect(kpis.quartilCounts).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0 })
  })

  it('justificativa não conta na média nem na indisponibilidade', () => {
    const region = makeRegion({ '2026-07-01': 4, '2026-07-02': 'BH' })
    const kpis = computeDashboardKpis(region, weeks, DEFAULT_PARAMS, today)
    expect(kpis.totalJustified).toBe(1)
    expect(kpis.teamAvg).toBeCloseTo(4 / 9, 5)
  })
})

describe('computeAlerts (paridade com o legado)', () => {
  it('regra 3: projeção abaixo da meta (sem produção)', () => {
    const region = makeRegion({})
    const alerts = computeAlerts(region, weeks, DEFAULT_PARAMS, today)
    const titles = alerts.map((a) => a.title)
    expect(titles).toContain('Projeção abaixo da meta')
    expect(titles).not.toContain('Técnico abaixo da meta')
  })

  it('regra 1: técnico abaixo da meta por dias consecutivos', () => {
    const region = makeRegion({
      '2026-07-08': 1,
      '2026-07-09': 1,
      '2026-07-10': 1,
      '2026-07-13': 1,
      '2026-07-14': 1,
    })
    const alerts = computeAlerts(region, weeks, DEFAULT_PARAMS, today)
    const tech = alerts.find((a) => a.title === 'Técnico abaixo da meta')
    expect(tech).toBeDefined()
    expect(tech!.type).toBe('critical')
  })

  it('regra 1/2 ausentes com produção acima da meta', () => {
    const region = makeRegion({
      '2026-07-01': 4,
      '2026-07-02': 4,
      '2026-07-03': 4,
      '2026-07-06': 4,
      '2026-07-07': 4,
      '2026-07-08': 4,
      '2026-07-09': 4,
      '2026-07-10': 4,
      '2026-07-13': 4,
      '2026-07-14': 4,
    })
    const alerts = computeAlerts(region, weeks, DEFAULT_PARAMS, today)
    const titles = alerts.map((a) => a.title)
    expect(titles).not.toContain('Técnico abaixo da meta')
    expect(titles).not.toContain('Equipe abaixo da meta')
  })
})
