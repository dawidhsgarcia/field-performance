import { describe, expect, it } from 'vitest'
import {
  applyBhReport,
  bhBaseEntry,
  bhCalRange,
  bhCompensated,
  bhScheduledDays,
  bhToggleFolga,
} from './bhReport'
import { seedState } from '@/lib/seed'
import type { BhState } from '@/types'

function bhFixture(folgas: Record<string, string[]> = {}): BhState {
  return { base: [], folgas, period: '2026-08' }
}

const b = {
  funci: 'B1',
  nome: 'BEN 1',
  bu: '',
  subBu: '',
  limiteComp: '2026-08-14',
  horas: 1260,
  valor: 1234.56,
  dias: 3,
}

describe('applyBhReport', () => {
  it('importa a base e preserva as folgas existentes', () => {
    const state = seedState()
    state.bh.folgas = { B1: ['2026-07-20'] }
    const out = applyBhReport(
      [
        {
          funcid: 'B1',
          nome: 'BEN 1',
          limitecomp: '14/08/2026',
          horas: '21:00',
          vlr: '1.234,56',
          dias: '3',
        },
      ],
      state,
    )
    expect(out.newState).not.toBeNull()
    const next = out.newState!
    expect(next.bh.base).toHaveLength(1)
    expect(next.bh.base[0].limiteComp).toBe('2026-08-14')
    expect(next.bh.base[0].horas).toBe(1260)
    expect(next.bh.base[0].valor).toBe(1234.56)
    expect(next.bh.base[0].dias).toBe(3)
    expect(next.bh.period).toBe('2026-08')
    expect(next.bh.folgas['B1']).toEqual(['2026-07-20'])
    expect(out.summary!.totalHorasMin).toBe(1260)
  })

  it('falha sem linhas válidas', () => {
    const state = seedState()
    const out = applyBhReport([{ funcid: 'X', limitecomp: 'inválido' }], state)
    expect(out.newState).toBeNull()
    expect(out.message).toContain('Nenhuma linha válida')
  })
})

describe('bhCalRange', () => {
  it('range 15 do mês anterior até o dia 14 (end exclusivo dia 15)', () => {
    const r = bhCalRange(b)
    expect(r.start.getFullYear()).toBe(2026)
    expect(r.start.getMonth()).toBe(6)
    expect(r.start.getDate()).toBe(15)
    expect(r.end.getDate()).toBe(15)
    expect(r.end.getMonth()).toBe(7)
  })
})

describe('bhCompensated', () => {
  it('8h em dia útil, 4h no sábado, domingo fora', () => {
    const bh = bhFixture({ B1: ['2026-07-20', '2026-07-25', '2026-07-26'] })
    const res = bhCompensated(b, bh)
    expect(res.count).toBe(2)
    expect(res.min).toBe(480 + 240)
  })

  it('ignora folgas fora do range', () => {
    const bh = bhFixture({ B1: ['2026-06-01', '2026-08-16'] })
    const res = bhCompensated(b, bh)
    expect(res.count).toBe(0)
  })
})

describe('bhScheduledDays', () => {
  it('lista apenas folgas dentro do período, em ordem', () => {
    const bh = bhFixture({ B1: ['2026-08-10', '2026-07-20', '2026-06-01'] })
    expect(bhScheduledDays(b, bh)).toEqual(['2026-07-20', '2026-08-10'])
  })
})

describe('bhToggleFolga', () => {
  it('marca e desmarca dia válido', () => {
    const bh = bhFixture()
    const add = bhToggleFolga(b, bh, 'B1', '2026-07-20')
    expect(add.added).toBe(true)
    expect(add.next.folgas['B1']).toContain('2026-07-20')
    const rm = bhToggleFolga(b, add.next, 'B1', '2026-07-20')
    expect(rm.added).toBe(false)
    expect(rm.next.folgas['B1']).not.toContain('2026-07-20')
  })

  it('bloqueia domingo', () => {
    const bh = bhFixture()
    const res = bhToggleFolga(b, bh, 'B1', '2026-07-26')
    expect(res.added).toBe(false)
  })

  it('respeita o máximo de dias', () => {
    const bh = bhFixture({ B1: ['2026-07-20', '2026-07-21', '2026-07-22'] })
    const res = bhToggleFolga(b, bh, 'B1', '2026-07-23')
    expect(res.added).toBe(false)
  })

  it('bloqueia fora do range', () => {
    const bh = bhFixture()
    const res = bhToggleFolga(b, bh, 'B1', '2026-06-01')
    expect(res.added).toBe(false)
  })
})

describe('bhBaseEntry', () => {
  it('filtra por período quando informado', () => {
    const bh: BhState = {
      base: [
        { ...b, limiteComp: '2026-07-14' },
        { ...b, limiteComp: '2026-08-14' },
      ],
      folgas: {},
      period: '2026-08',
    }
    expect(bhBaseEntry(bh, 'B1', '2026-08')?.limiteComp).toBe('2026-08-14')
    expect(bhBaseEntry(bh, 'B1', '2026-07')?.limiteComp).toBe('2026-07-14')
    expect(bhBaseEntry(bh, 'B1')?.limiteComp).toBe('2026-07-14')
  })
})
