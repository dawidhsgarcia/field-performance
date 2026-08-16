import { describe, expect, it } from 'vitest'
import { fmtNum } from './format'

describe('fmtNum', () => {
  it('formata números no padrão pt-BR', () => {
    expect(fmtNum(1234.567)).toBe('1.234,57')
  })

  it('retorna string vazia para null', () => {
    expect(fmtNum(null)).toBe('')
  })

  it('retorna string vazia para undefined', () => {
    expect(fmtNum(undefined)).toBe('')
  })

  it('retorna string vazia para NaN', () => {
    expect(fmtNum(Number.NaN)).toBe('')
  })
})
