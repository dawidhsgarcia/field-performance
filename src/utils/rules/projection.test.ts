import { describe, expect, it } from 'vitest'
import { pointsAboveMeta } from './projection'
import type { ProjectionRow } from '@/types'

function makeRow(overrides: Partial<ProjectionRow>): ProjectionRow {
  return {
    tech: { funci: 'T1', nome: 'TEC 1' },
    sum: 0,
    days: 0,
    currentAvg: null,
    currentQuartil: null,
    trendAvg: null,
    trendCount: 0,
    projectedSum: 0,
    projectedDays: 0,
    projectedAvg: null,
    projectedQuartil: null,
    ...overrides,
  }
}

describe('pointsAboveMeta', () => {
  const meta = 4
  const q1 = 3.5

  it('retorna null sem dias restantes', () => {
    const row = makeRow({ sum: 30, days: 10, currentAvg: 3, currentQuartil: 4 })
    expect(pointsAboveMeta(row, meta, q1, 0)).toBeNull()
  })

  it('retorna null sem dias passados ou média', () => {
    const row = makeRow({ sum: 0, days: 0, currentAvg: null })
    expect(pointsAboveMeta(row, meta, q1, 5)).toBeNull()
  })

  it('retorna 0 quando já está no Q1 (meta atingida)', () => {
    const row = makeRow({ sum: 40, days: 10, currentAvg: 4, currentQuartil: 1 })
    expect(pointsAboveMeta(row, meta, q1, 5)).toBe(0)
  })

  it('calcula pontos acima da meta diária sem arredondar', () => {
    const row = makeRow({ sum: 30, days: 10, currentAvg: 3, currentQuartil: 4 })
    // média atual = 3.0. Total dias = 10 + 5 = 15. Para média final > 3.5:
    // needQ1 = (3.5*15 - 30)/5 = (52.5-30)/5 = 4.5. above = 4.5 - 4 = 0.5
    expect(pointsAboveMeta(row, meta, q1, 5)).toBeCloseTo(0.5)
  })

  it('retorna 0 quando a necessidade é menor ou igual à meta', () => {
    const row = makeRow({ sum: 40, days: 10, currentAvg: 4, currentQuartil: 3 })
    // needQ1 = (3.5*15 - 40)/5 = (52.5-40)/5 = 2.5. above = 2.5 - 4 = -1.5 => 0 (meta atingida)
    expect(pointsAboveMeta(row, meta, q1, 5)).toBe(0)
  })
})
