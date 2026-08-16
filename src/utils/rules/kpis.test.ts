import { describe, expect, it } from 'vitest'
import {
  activitySlaRows,
  activitySlaSummary,
  computeTechInsights,
  techActivitySlaRows,
  techMonthStats,
} from './kpis'
import { DEFAULT_PARAMS } from '@/lib/constants'
import type { Region } from '@/types'

function makeRegion(): Region {
  return {
    name: 'TESTE',
    technicians: [{ funci: 'T1', nome: 'TEC 1', imported: true }],
    entries: {
      '2026-07': {
        T1: { '2026-07-01': 4, '2026-07-02': 'BH', '2026-07-03': 4 },
      },
    },
    locked: true,
    sla: {
      '2026-07': {
        activitySla: {},
        slaCounts: { evaluated: 4, onTime: 3 },
        totalOS: 5,
        techSla: { T1: { totalOS: 5, evaluated: 4, onTime: 3 } },
      },
    },
    report: {
      '2026-07': {
        T1: [
          {
            os: 'OS1',
            atividade: 'INSTALACAO',
            dataAbertura: '2026-07-01 08:00',
            dataFechamento: '2026-07-01 10:00',
            baremo: 2,
            avaliada: true,
            noPrazo: true,
          },
          {
            os: 'OS2',
            atividade: 'APOIO',
            dataAbertura: '2026-07-01 08:30',
            dataFechamento: '2026-07-01 09:00',
            baremo: 2,
            avaliada: true,
            noPrazo: true,
          },
        ],
      },
    },
  }
}

describe('techMonthStats', () => {
  const region = makeRegion()

  it('calcula média (D-1, justificativa fora do denominador), SLA e MTTR', () => {
    const stats = techMonthStats(region, 'T1', 2026, 6, DEFAULT_PARAMS)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let businessDays = 0
    for (let d = 1; d <= 31; d++) {
      const date = new Date(2026, 6, d)
      if (date.getDay() !== 0 && date.getDay() !== 6 && date < today) businessDays++
    }
    const expectedDays = businessDays - 1
    expect(stats.pk).toBe('2026-07')
    expect(stats.sum).toBe(8)
    expect(stats.days).toBe(expectedDays)
    expect(stats.avg).toBeCloseTo(8 / expectedDays, 5)
    expect(stats.slaPct).toBe(75)
    expect(stats.slaEval).toBe(4)
    expect(stats.slaOn).toBe(3)
    expect(stats.mttrMin).toBe(75)
  })
})

describe('activitySlaRows', () => {
  it('filtra avaliadas, remapeia total=evaluated e ordena por total desc', () => {
    const rows = activitySlaRows([
      ['APOIO', { total: 9, evaluated: 0, onTime: 0 }],
      ['INSTALACAO', { total: 3, evaluated: 3, onTime: 2 }],
      ['MANUTENCAO', { total: 5, evaluated: 5, onTime: 4 }],
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0].atividade).toBe('MANUTENCAO')
    expect(rows[0].total).toBe(5)
    expect(rows[0].pct).toBe(80)
    expect(rows[0].cls).toBe('warn')
    expect(rows[1].atividade).toBe('INSTALACAO')
    expect(rows[1].pct).toBe(67)
  })

  it('calcula o resumo', () => {
    const rows = activitySlaRows([
      ['A', { total: 3, evaluated: 3, onTime: 3 }],
      ['B', { total: 1, evaluated: 1, onTime: 0 }],
    ])
    const summary = activitySlaSummary(rows)
    expect(summary.count).toBe(2)
    expect(summary.evaluated).toBe(4)
    expect(summary.onTime).toBe(3)
    expect(summary.pct).toBe(75)
  })
})

describe('techActivitySlaRows', () => {
  it('exclui atividades APOIO', () => {
    const rows = techActivitySlaRows(makeRegion(), 'T1', '2026-07')
    expect(rows).toHaveLength(1)
    expect(rows[0].atividade).toBe('INSTALACAO')
    expect(rows[0].total).toBe(1)
    expect(rows[0].evaluated).toBe(1)
    expect(rows[0].onTime).toBe(1)
  })
})

describe('computeTechInsights', () => {
  const region = makeRegion()
  const today = new Date(2026, 6, 15)
  today.setHours(0, 0, 0, 0)

  it('aproveitamento da meta em 2 de 2 dias (100%)', () => {
    const atual = techMonthStats(region, 'T1', 2026, 6, DEFAULT_PARAMS)
    const anterior = techMonthStats(region, 'T1', 2026, 5, DEFAULT_PARAMS)
    const insights = computeTechInsights(region, 'T1', atual, anterior, DEFAULT_PARAMS, today)
    expect(insights[0].cls).toBe('ok')
    expect(insights[0].html).toContain('Atingiu a meta em')
    expect(insights[0].html).toContain('<b>2</b> de <b>2</b> dias úteis')
    expect(insights[0].html).toContain('<b>100%</b>')
  })
})
