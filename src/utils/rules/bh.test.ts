import { describe, expect, it } from 'vitest'
import {
  bhFolgaWarnings,
  bhWaMessage,
  bhWaPhone,
  computeBhAlerts,
  computeBhKpis,
  filterBhBase,
} from './bh'
import { seedState } from '@/lib/seed'
import type { AppState, BhBaseEntry, BhState } from '@/types'

function makeBase(overrides: Partial<BhBaseEntry>): BhBaseEntry {
  return {
    funci: 'B1',
    nome: 'BEN 1',
    bu: '',
    subBu: '',
    limiteComp: '2026-08-14',
    horas: 1260,
    valor: 1234.56,
    dias: 3,
    ...overrides,
  }
}

function makeBh(folgas: Record<string, string[]> = {}): BhState {
  return { base: [], folgas, period: '2026-08' }
}

describe('filterBhBase', () => {
  it('filtra por período e região (colaboradores)', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.colaboradores['B2'] = { funci: 'B2', nome: 'BEN 2', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    const base = [
      makeBase({ funci: 'B1' }),
      makeBase({ funci: 'B2', limiteComp: '2026-07-14' }),
    ]
    const filtered = filterBhBase(base, '2026-08', state, false)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].funci).toBe('B1')
  })

  it('allMode exige cadastro em colaboradores', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    const base = [makeBase({ funci: 'B1' })]
    expect(filterBhBase(base, '2026-08', state, true)).toHaveLength(1)
  })

  it('allMode oculta técnico não cadastrado', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    const base = [
      makeBase({ funci: 'B1' }),
      makeBase({ funci: 'B2' }),
      makeBase({ funci: 'B3' }),
    ]
    const filtered = filterBhBase(base, '2026-08', state, true)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].funci).toBe('B1')
  })

  it('ordena por horas desc', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.colaboradores['B2'] = { funci: 'B2', nome: 'BEN 2', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    const base = [
      makeBase({ funci: 'B1', horas: 600 }),
      makeBase({ funci: 'B2', horas: 1200 }),
    ]
    const filtered = filterBhBase(base, '2026-08', state, true)
    expect(filtered[0].funci).toBe('B2')
  })
})

describe('computeBhKpis', () => {
  it('soma horas, valor, dias e compensação', () => {
    const base = [
      makeBase({ funci: 'B1', horas: 1260, valor: 1000, dias: 3 }),
      makeBase({ funci: 'B2', horas: 480, valor: 500, dias: 2 }),
    ]
    const kpis = computeBhKpis(base, makeBh({ B1: ['2026-07-20'] }))
    expect(kpis.count).toBe(2)
    expect(kpis.totHoras).toBe(1740)
    expect(kpis.totVlr).toBe(1500)
    expect(kpis.totDias).toBe(5)
    expect(kpis.totComp).toBe(480)
    expect(kpis.compensado).toBe(false)
  })
})

describe('computeBhAlerts', () => {
  const hoje = new Date(2026, 7, 10)
  hoje.setHours(0, 0, 0, 0)

  function stateWithColabs(): AppState {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.colaboradores['B2'] = { funci: 'B2', nome: 'BEN 2', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.colaboradores['B3'] = { funci: 'B3', nome: 'OFICIAL', regiao: 'norte', funcao: 'OFICIAL DE REDE', telefone: null }
    return state
  }

  it('período fecha em breve quando há pendentes', () => {
    const state = stateWithColabs()
    const base = [makeBase({ funci: 'B1', dias: 3 })]
    const alerts = computeBhAlerts(base, makeBh(), state, '2026-08', hoje)
    const periodAlert = alerts.find((a) => a.title === 'Período de BH fecha em breve')
    expect(periodAlert).toBeDefined()
    expect(periodAlert!.type).toBe('critical')
    expect(periodAlert!.desc).toContain('14/08/2026')
  })

  it('conflito de escala só entre TÉCNICO DE FIBRA', () => {
    const state = stateWithColabs()
    const bh = makeBh({ B1: ['2026-08-01'], B2: ['2026-08-01'], B3: ['2026-08-01'] })
    const base = [
      makeBase({ funci: 'B1' }),
      makeBase({ funci: 'B2' }),
      makeBase({ funci: 'B3', dias: 0 }),
    ]
    const alerts = computeBhAlerts(base, bh, state, '2026-08', hoje)
    const conflito = alerts.find((a) => a.title === 'Conflito de escala')
    expect(conflito).toBeDefined()
    expect(conflito!.desc).toContain('BEN 1')
    expect(conflito!.desc).not.toContain('OFICIAL')
  })

  it('folga em dia de sobreaviso', () => {
    const state = stateWithColabs()
    state.sobreaviso['B1'] = ['2026-08-01']
    const bh = makeBh({ B1: ['2026-08-01'] })
    const base = [makeBase({ funci: 'B1', dias: 1 })]
    const alerts = computeBhAlerts(base, bh, state, '2026-08', hoje)
    const sba = alerts.find((a) => a.title === 'Folga em dia de sobreaviso')
    expect(sba).toBeDefined()
    expect(sba!.desc).toContain('BEN 1')
  })

  it('tudo certo quando sem alertas', () => {
    const state = stateWithColabs()
    const bh = makeBh({ B1: ['2026-07-20', '2026-07-21', '2026-07-22'] })
    const base = [makeBase({ funci: 'B1', dias: 3 })]
    const alerts = computeBhAlerts(base, bh, state, '2026-08', hoje)
    expect(alerts[0].title).toBe('Tudo certo!')
  })
})

describe('bhWaPhone / bhWaMessage / bhFolgaWarnings', () => {
  it('normaliza telefone com prefixo 55', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: '11999999999' }
    expect(bhWaPhone(state, 'B1')).toBe('5511999999999')
    expect(bhWaPhone(state, 'B2')).toBeNull()
  })

  it('monta a mensagem do WhatsApp', () => {
    const bh = makeBh({ B1: ['2026-07-20'] })
    const b = makeBase({ funci: 'B1', nome: 'BEN 1' })
    const msg = bhWaMessage(b, bh)
    expect(msg).toContain('Olá, BEN 1!')
    expect(msg).toContain('do período 15/07 – 14/08/2026')
    expect(msg).toContain('• Seg 20/07/2026 — 8h')
    expect(msg).toContain('Total: 1 folga(s) · 08:00 compensadas.')
    expect(msg).toContain('_Mensagem enviada via Field Performance_')
  })

  it('gera avisos de conflito e sobreaviso', () => {
    const state = seedState()
    state.colaboradores['B1'] = { funci: 'B1', nome: 'BEN 1', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.colaboradores['B2'] = { funci: 'B2', nome: 'BEN 2', regiao: 'norte', funcao: 'TÉCNICO DE FIBRA', telefone: null }
    state.bh.folgas['B2'] = ['2026-08-01']
    state.sobreaviso['B1'] = ['2026-08-01']
    const b = makeBase({ funci: 'B1' })
    const warnings = bhFolgaWarnings(state, b, 'B1', '2026-08-01')
    expect(warnings.length).toBe(2)
    expect(warnings[0]).toContain('BEN 2 já tem folga programada para 01/08/2026')
    expect(warnings[1]).toContain('BEN 1 está de sobreaviso em 01/08/2026')
  })
})
