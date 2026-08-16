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

  it('exclui o dia atual (regra D-1): dias úteis de 01–14/07/2026 = 10', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-15': 8 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].sum).toBe(4)
    expect(rows[0].days).toBe(10)
  })

  it('dia com justificativa não entra no denominador', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4, '2026-07-02': 'BH' } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].days).toBe(9)
    expect(rows[0].sum).toBe(4)
  })

  it('média = soma ÷ dias úteis decorridos (celas em branco contam no denominador)', () => {
    const region = makeRegion({ T1: { '2026-07-01': 3, '2026-07-02': 5 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].sum).toBe(8)
    expect(rows[0].days).toBe(10)
    expect(rows[0].avg).toBe(0.8)
  })

  it('ordena por média decrescente', () => {
    const region = makeRegion({ T1: { '2026-07-01': 4 }, T2: {} })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].tech.funci).toBe('T1')
    expect(rows[0].avg).toBe(0.4)
    expect(rows[1].avg).toBe(0)
  })

  it('calcula quartil pela média', () => {
    const region = makeRegion({ T1: { '2026-07-01': 40 } })
    const rows = computeRanking(region, weeks, DEFAULT_PARAMS, today)
    expect(rows[0].quartil).toBe(1)
  })
})
