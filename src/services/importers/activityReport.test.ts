import { describe, expect, it } from 'vitest'
import { applyActivityReport } from './activityReport'
import { seedState } from '@/lib/seed'

function rows() {
  return [
    {
      funcid: 'T1',
      tecnico: 'TEC 1',
      baremo: '2.5',
      expurgo_dupla: 0,
      data_fechamento: '7/6/2026 4:43:00 PM',
      data_abertura: '7/6/2026 8:00:00 AM',
      codigo_os: 'OS1',
      atividade: 'INSTALACAO',
      avalia_prazo: 1,
      realizado_no_prazo: 1,
    },
    {
      funcid: 'T1',
      tecnico: 'TEC 1',
      baremo: '1.5',
      expurgo_dupla: 0,
      data_fechamento: '7/6/2026 4:50:00 PM',
      data_abertura: '7/6/2026 9:00:00 AM',
      codigo_os: 'OS2',
      atividade: 'APOIO',
      avalia_prazo: 1,
      realizado_no_prazo: 0,
    },
    {
      funcid: 'T1',
      tecnico: 'TEC 1',
      baremo: '5',
      expurgo_dupla: 1,
      data_fechamento: '7/7/2026 4:00:00 PM',
      data_abertura: '7/7/2026 8:00:00 AM',
      codigo_os: 'OS3',
      atividade: 'INSTALACAO',
      avalia_prazo: 1,
      realizado_no_prazo: 1,
    },
  ]
}

describe('applyActivityReport', () => {
  it('bloqueia em "Todas as regiões"', () => {
    const state = seedState()
    state.currentRegion = '__all__'
    const out = applyActivityReport(rows(), null, state)
    expect(out.newState).toBeNull()
    expect(out.message).toContain('Selecione uma região')
  })

  it('agrega baremo, SLA e report preservando as regras do legado', () => {
    const state = seedState()
    const out = applyActivityReport(rows(), 'norte', state)
    expect(out.newState).not.toBeNull()
    const next = out.newState!
    const region = next.regions.norte

    expect(out.summary!.validRows).toBe(2)
    expect(out.summary!.skippedRows).toBe(1)
    expect(out.summary!.newTechs).toBe(1)
    expect(out.summary!.updatedDays).toBe(1)
    expect(out.summary!.bestPeriod).toBe('2026-07')

    expect(region.entries['2026-07']['T1']['2026-07-06']).toBe(4)

    const sla = region.sla!['2026-07']
    expect(sla.totalOS).toBe(2)
    expect(sla.slaCounts.evaluated).toBe(2)
    expect(sla.slaCounts.onTime).toBe(1)
    expect(sla.techSla['T1'].totalOS).toBe(2)
    expect(sla.activitySla['INSTALACAO']).toEqual({ total: 1, evaluated: 1, onTime: 1 })
    expect(sla.activitySla['APOIO']).toBeUndefined()

    expect(region.report!['2026-07']['T1']).toHaveLength(2)
    expect(region.report!['2026-07']['T1'][0].os).toBe('OS1')
    expect(region.report!['2026-07']['T1'][0].avaliada).toBe(true)
    expect(region.report!['2026-07']['T1'][1].atividade).toBe('APOIO')

    expect(region.locked).toBe(true)
    expect(next.currentYear).toBe(2026)
    expect(next.currentMonth).toBe(6)
    expect(next.colaboradores['T1']).toBeDefined()
  })

  it('retorna erro quando não há linhas válidas', () => {
    const state = seedState()
    const out = applyActivityReport([{ funcid: 'X', baremo: 'abc' }], 'norte', state)
    expect(out.newState).toBeNull()
    expect(out.message).toContain('Nenhuma linha válida')
  })
})
