import { describe, expect, it } from 'vitest'
import { pointsToQ1 } from './projection'
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

describe('pointsToQ1', () => {
  const q1 = 3.5

  it('retorna null sem dias restantes', () => {
    const row = makeRow({ sum: 30, days: 10, currentAvg: 3, currentQuartil: 4 })
    expect(pointsToQ1(row, q1, 0)).toBeNull()
  })

  it('retorna null sem dias passados ou média', () => {
    const row = makeRow({ sum: 0, days: 0, currentAvg: null })
    expect(pointsToQ1(row, q1, 5)).toBeNull()
  })

  it('retorna 0 quando já está no Q1', () => {
    const row = makeRow({ sum: 40, days: 10, currentAvg: 4, currentQuartil: 1 })
    expect(pointsToQ1(row, q1, 5)).toBe(0)
  })

  it('calcula quantos pts/dia precisa nos dias restantes para atingir o Q1', () => {
    const row = makeRow({ sum: 30, days: 10, currentAvg: 3, currentQuartil: 4 })
    // média atual = 3.0. Total dias = 10 + 5 = 15. Para média final > 3.5:
    // (30 + X*5)/15 > 3.5 => 30 + 5X > 52.5 => 5X > 22.5 => X > 4.5 => ceil = 5
    expect(pointsToQ1(row, q1, 5)).toBe(5)
  })

  it('nunca retorna menos que 1 quando precisa', () => {
    const row = makeRow({ sum: 30, days: 10, currentAvg: 3, currentQuartil: 4 })
    const result = pointsToQ1(row, q1, 100)
    expect(result).not.toBeNull()
    expect(result!).toBeGreaterThanOrEqual(1)
  })
})
