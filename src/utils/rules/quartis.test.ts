import { describe, expect, it } from 'vitest'
import { quartilOf } from './quartis'
import type { Params } from '@/types'

const quartil: Params['quartil'] = { q1: 3.5, q2: 2.5, q3: 1.0 }

describe('quartilOf', () => {
  it('retorna null para média nula', () => {
    expect(quartilOf(null, quartil)).toBeNull()
  })

  it('Q1 acima de q1', () => {
    expect(quartilOf(3.6, quartil)).toBe(1)
  })

  it('Q2 acima de q2', () => {
    expect(quartilOf(3.0, quartil)).toBe(2)
  })

  it('Q3 maior ou igual a q3', () => {
    expect(quartilOf(1.0, quartil)).toBe(3)
    expect(quartilOf(2.4, quartil)).toBe(3)
  })

  it('Q4 abaixo de q3', () => {
    expect(quartilOf(0.9, quartil)).toBe(4)
  })
})
