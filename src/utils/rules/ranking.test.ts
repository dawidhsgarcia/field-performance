import { describe, expect, it } from 'vitest'
import { computeRanking } from './ranking'
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

describe('computeRanking', () => {
  const weeks = buildWeeks(2026, 6)
  const today = new Date(2026, 6, 15)

  it('exclui o dia atual (regra D-1): só dias com pontuação de 01–14/07/2026 contam', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-15': 8 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].sum).toBe(4)
    expect(rows[0].days).toBe(1)
  })

  it('dia com justificativa não entra no denominador', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-02': 'BH' } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].days).toBe(1)
    expect(rows[0].sum).toBe(4)
  })

  it('média = soma ÷ dias com pontuação (celas em branco não contam no denominador)', () => {
    const region = makeRegion({ T1: { '2026-07-01': 3, '2026-07-02': 5 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].sum).toBe(8)
    expect(rows[0].days).toBe(2)
    expect(rows[0].avg).toBe(4)
  })

  it('fim de semana com pontuação entra na média; fim de semana sem produção não conta', () => {
    const region = makeRegion({
      T1: { '2026-07-01': 3, '2026-07-04': 8, '2026-07-05': 2 },
    })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].days).toBe(3)
    expect(rows[0].sum).toBe(13)
    expect(rows[0].avg).toBeCloseTo(13 / 3, 5)
  })

  it('ordena por média decrescente (sem pontuação fica null por último)', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4 }, T2: {} })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].tech.funci).toBe('T1')
    expect(rows[0].avg).toBe(4)
    expect(rows[1].avg).toBeNull()
  })

  it('calcula quartil pela média', () => {
    const region = makeRegion({ T1: { '2026-07-01': 40 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].quartil).toBe(1)
  })
})
