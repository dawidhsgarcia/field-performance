import { describe, expect, it } from 'vitest'
import { sobreavisoDays, sobreavisoIsOn, toggleSobreaviso, toggleSobreavisoMany } from '@/services/state'
import { seedState } from '@/lib/seed'

const FUNCI = '18-00009325'

describe('Sobreaviso (paridade com o legado)', () => {
  it('marca e desmarca um dia', () => {
    let state = seedState()
    expect(sobreavisoIsOn(state, FUNCI, '2026-08-01')).toBe(false)

    state = toggleSobreaviso(state, FUNCI, '2026-08-01')
    expect(sobreavisoIsOn(state, FUNCI, '2026-08-01')).toBe(true)
    expect(sobreavisoDays(state, FUNCI)).toEqual(['2026-08-01'])

    state = toggleSobreaviso(state, FUNCI, '2026-08-01')
    expect(sobreavisoIsOn(state, FUNCI, '2026-08-01')).toBe(false)
    expect(sobreavisoDays(state, FUNCI)).toEqual([])
  })

  it('não altera o estado original (imutável)', () => {
    const state = seedState()
    toggleSobreaviso(state, FUNCI, '2026-08-01')
    expect(sobreavisoIsOn(state, FUNCI, '2026-08-01')).toBe(false)
  })

  it('acumula dias de técnicos distintos', () => {
    let state = seedState()
    state = toggleSobreaviso(state, FUNCI, '2026-08-01')
    state = toggleSobreaviso(state, '18-00009190', '2026-08-02')
    expect(sobreavisoDays(state, FUNCI)).toEqual(['2026-08-01'])
    expect(sobreavisoDays(state, '18-00009190')).toEqual(['2026-08-02'])
  })

  it('marca vários dias de uma vez (lote)', () => {
    let state = seedState()
    state = toggleSobreavisoMany(state, FUNCI, ['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(sobreavisoDays(state, FUNCI)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(sobreavisoIsOn(state, FUNCI, '2026-08-02')).toBe(true)
  })

  it('lote vazio não altera o estado', () => {
    const state = seedState()
    const next = toggleSobreavisoMany(state, FUNCI, [])
    expect(next).toBe(state)
  })
})
