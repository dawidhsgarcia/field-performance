import { describe, expect, it } from 'vitest'
import {
  bhPeriodLabel,
  bhPeriodOf,
  buildWeeks,
  excelSerialToDate,
  excelSerialToDateTime,
  fmtDateTime,
  isoDate,
  isoWeekOf,
  parseUsDateTime,
} from './date'

describe('parseUsDateTime', () => {
  it('converte data/hora US com AM/PM para Date UTC-naive', () => {
    const d = parseUsDateTime('7/6/2026 4:43:00 PM')
    expect(d).not.toBeNull()
    expect(d!.getUTCFullYear()).toBe(2026)
    expect(d!.getUTCMonth()).toBe(6)
    expect(d!.getUTCDate()).toBe(6)
    expect(d!.getUTCHours()).toBe(16)
    expect(d!.getUTCMinutes()).toBe(43)
  })

  it('lida com AM meia-noite', () => {
    const d = parseUsDateTime('7/6/2026 12:00:00 AM')
    expect(d!.getUTCHours()).toBe(0)
  })

  it('retorna null para formato inválido', () => {
    expect(parseUsDateTime('31/12/2026')).toBeNull()
  })
})

describe('excelSerialToDate', () => {
  it('converte serial do Excel para meia-noite UTC', () => {
    const d = excelSerialToDate(46219)
    expect(d!.getUTCFullYear()).toBe(2026)
    expect(d!.getUTCMonth()).toBe(6)
  })

  it('normaliza string US para meia-noite UTC', () => {
    const d = excelSerialToDate('7/6/2026 4:43:00 PM')
    expect(d!.getUTCHours()).toBe(0)
    expect(d!.getUTCDate()).toBe(6)
  })

  it('retorna null para valor inválido', () => {
    expect(excelSerialToDate('abc')).toBeNull()
  })
})

describe('excelSerialToDateTime', () => {
  it('preserva hora/minuto do serial', () => {
    const d = excelSerialToDateTime('7/6/2026 4:43:00 PM')
    expect(d!.getUTCHours()).toBe(16)
    expect(d!.getUTCMinutes()).toBe(43)
  })
})

describe('fmtDateTime', () => {
  it('formata AAAA-MM-DD HH:MM', () => {
    const d = excelSerialToDateTime('7/6/2026 4:43:00 PM')
    expect(fmtDateTime(d)).toBe('2026-07-06 16:43')
  })
})

describe('isoWeekOf', () => {
  it('retorna a semana ISO 8601', () => {
    expect(isoWeekOf(new Date(2026, 6, 13))).toBe(29)
  })
})

describe('buildWeeks', () => {
  it('agrupa dias em semanas seg–dom dentro do mês', () => {
    const weeks = buildWeeks(2026, 6)
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks[0][0].iso).toBe(isoDate(2026, 6, 1))
    const flat = weeks.flat()
    expect(flat.length).toBe(31)
  })
})

describe('bhPeriodOf', () => {
  it('dias até 14 pertencem ao mês do fechamento', () => {
    expect(bhPeriodOf(new Date(2026, 7, 14))).toBe('2026-08')
  })

  it('dias após 14 pertencem ao mês seguinte', () => {
    expect(bhPeriodOf(new Date(2026, 6, 15))).toBe('2026-08')
  })
})

describe('bhPeriodLabel', () => {
  it('rotula o período 15 → 14', () => {
    expect(bhPeriodLabel('2026-08')).toBe('15/07 – 14/08/2026')
  })
})
