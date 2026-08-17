import { describe, expect, it } from 'vitest'
import { computeProjection } from './projection'
import { computeDayOverview, computeTeamGoalsSummary, computeTeamOverview } from './goals'
import { buildWeeks } from '@/utils/date'
import { DEFAULT_PARAMS } from '@/lib/constants'
import type { EntryValue, Region } from '@/types'

function makeRegion(entriesByTech: Record<string, Record<string, EntryValue>>): Region {
  return {
    name: 'TESTE',
    technicians: Object.keys(entriesByTech).map((funci) => ({ funci, nome: funci, imported: true })),
    entries: { '2026-07': entriesByTech },
    locked: true,
  }
}

describe('computeProjection', () => {
  const weeks = buildWeeks(2026, 6)
  const today = new Date(2026, 6, 15)

  it('considera o dia atual como dia restante (future >= today)', () => {
    const region = makeRegion({ T1: {} })
    const { rows, remaining } = computeProjection(region, weeks, DEFAULT_PARAMS, today)
    expect(remaining).toBeGreaterThan(0)
    const businessDaysAfter = rows[0].projectedDays
    expect(businessDaysAfter).toBeGreaterThan(0)
  })

  it('projeta soma = realizado + tendência × dias restantes', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-02': 4, '2026-07-03': 4 } })
    const { rows, remaining } = computeProjection(region, weeks, DEFAULT_PARAMS, today)
    const r = rows[0]
    expect(r.sum).toBe(12)
    expect(r.trendAvg).toBe(4)
    expect(r.projectedSum).toBe(12 + 4 * remaining)
  })

  it('usa a tendência (últimas pontuações numéricas) e projeta soma', () => {
    const region = makeRegion({ T1: { '2026-07-01': 2 } })
    const { rows, remaining } = computeProjection(region, weeks, DEFAULT_PARAMS, today)
    const r = rows[0]
    expect(r.currentAvg).toBe(0.2)
    expect(r.trendAvg).toBe(2)
    expect(r.projectedSum).toBe(2 + 2 * remaining)
  })

  it('sem nenhum lançamento: tendência nula e projeção nula', () => {
    const region = makeRegion({ T1: {} })
    const { rows, remaining } = computeProjection(region, weeks, DEFAULT_PARAMS, today)
    const r = rows[0]
    expect(r.currentAvg).toBe(0)
    expect(r.trendAvg).toBeNull()
    expect(r.projectedSum).toBe(0)
    expect(remaining).toBeGreaterThan(0)
  })
})

describe('computeTeamGoalsSummary', () => {
  const weeks = buildWeeks(2026, 6)
  const today = new Date(2026, 6, 15)

  it('realizado e esperado somam apenas até D-1', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-15': 8 } })
    const goals = computeTeamGoalsSummary(region, weeks, DEFAULT_PARAMS, today)
    expect(goals.totalAchieved).toBe(4)
  })
})

describe('computeTeamOverview', () => {
  const weeks = buildWeeks(2026, 6)
  const today = new Date(2026, 6, 15)

  it('conta justificativas no mês inteiro (inclusive dias futuros)', () => {
    const region = makeRegion({ T1: { '2026-07-01': 'BH', '2026-07-28': 'DSR' } })
    const overview = computeTeamOverview(region, weeks, today)
    expect(overview.totalJustified).toBe(2)
    expect(overview.justCounts['BH']).toBe(1)
    expect(overview.justCounts['DSR']).toBe(1)
  })

  it('indisponibilidade = dias justificados ÷ dias-técnico do mês', () => {
    const region = makeRegion({ T1: { '2026-07-01': 'BH' } })
    const overview = computeTeamOverview(region, weeks, today)
    const businessDays = weeks.flat().filter((d) => d.dow !== 0 && d.dow !== 6).length
    expect(overview.totalTechDays).toBe(businessDays)
    expect(overview.unavailPct).toBe((1 / businessDays) * 100)
  })
})

describe('computeDayOverview', () => {
  it('conta justificativas de um único dia por código', () => {
    const region = makeRegion({
      T1: { '2026-07-01': 'BH' },
      T2: { '2026-07-01': 'BH' },
      T3: { '2026-07-01': 'DSR' },
    })
    const overview = computeDayOverview(region, '2026-07', '2026-07-01')
    expect(overview.totalJustified).toBe(3)
    expect(overview.justCounts['BH']).toBe(2)
    expect(overview.justCounts['DSR']).toBe(1)
  })

  it('indisponibilidade do dia = justificados ÷ técnicos', () => {
    const region = makeRegion({
      T1: { '2026-07-01': 'FE' },
      T2: {},
      T3: {},
    })
    const overview = computeDayOverview(region, '2026-07', '2026-07-01')
    expect(overview.techCount).toBe(3)
    expect(overview.totalJustified).toBe(1)
    expect(overview.unavailPct).toBe((1 / 3) * 100)
  })

  it('dia sem justificativa: contagem zerada e pct nulo quando sem técnicos', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4 } })
    const overview = computeDayOverview(region, '2026-07', '2026-07-02')
    expect(overview.totalJustified).toBe(0)
    expect(overview.justCounts['BH']).toBe(0)
    expect(overview.techs).toEqual([])
    const empty = makeRegion({})
    const emptyOverview = computeDayOverview(empty, '2026-07', '2026-07-02')
    expect(emptyOverview.techCount).toBe(0)
    expect(emptyOverview.unavailPct).toBeNull()
  })

  it('lista técnicos indisponíveis com código, ordenados por nome', () => {
    const region = makeRegion({
      T1: { '2026-07-01': 'BH' },
      T2: { '2026-07-01': 'DSR' },
      T3: { '2026-07-01': 4 },
    })
    region.technicians = [
      { funci: 'T2', nome: 'BETA', imported: true },
      { funci: 'T1', nome: 'ALFA', imported: true },
      { funci: 'T3', nome: 'GAMA', imported: true },
    ]
    const overview = computeDayOverview(region, '2026-07', '2026-07-01')
    expect(overview.techs).toEqual([
      { funci: 'T1', nome: 'ALFA', code: 'BH' },
      { funci: 'T2', nome: 'BETA', code: 'DSR' },
    ])
  })
})
