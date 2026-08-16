import type { Week } from '@/types'

export const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

export function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export function periodKey(year: number, month: number): string {
  return `${year}-${pad(month + 1)}`
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isoWeekOf(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function buildWeeks(year: number, month: number): Week[] {
  const days = daysInMonth(year, month)
  const weeks: Week[] = []
  let current: Week[number][] = []
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow === 1 && current.length > 0) {
      weeks.push(current)
      current = []
    }
    current.push({ day: d, dow, iso: isoDate(year, month, d) })
  }
  if (current.length) weeks.push(current)
  return weeks
}

export function parseUsDateTime(s: unknown): Date | null {
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?$/)
  if (!m) return null
  let h = +m[4]
  if (m[7] && /pm/i.test(m[7]) && h !== 12) h += 12
  if (m[7] && /am/i.test(m[7]) && h === 12) h = 0
  const d = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], h, +m[5], +(m[6] || 0)))
  return isNaN(d.getTime()) ? null : d
}

export function excelSerialToDate(v: unknown): Date | null {
  if (v instanceof Date) return v
  if (typeof v === 'number') {
    const utcDays = Math.floor(v - 25569)
    return new Date(utcDays * 86400 * 1000)
  }
  if (typeof v === 'string') {
    const us = parseUsDateTime(v)
    if (us) {
      return new Date(Date.UTC(us.getUTCFullYear(), us.getUTCMonth(), us.getUTCDate()))
    }
  }
  const parsed = new Date(v as string | number)
  if (isNaN(parsed.getTime())) return null
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
}

export function excelSerialToDateTime(v: unknown): Date | null {
  if (typeof v === 'string') {
    const us = parseUsDateTime(v)
    if (us) return us
  }
  let y: number, mo: number, d: number, h: number, mi: number, s: number
  if (typeof v === 'number') {
    const base = new Date((v - 25569) * 86400 * 1000)
    y = base.getUTCFullYear()
    mo = base.getUTCMonth()
    d = base.getUTCDate()
    h = base.getUTCHours()
    mi = base.getUTCMinutes()
    s = base.getUTCSeconds()
  } else {
    const base = v instanceof Date ? v : new Date(v as string | number)
    if (isNaN(base.getTime())) return null
    y = base.getFullYear()
    mo = base.getMonth()
    d = base.getDate()
    h = base.getHours()
    mi = base.getMinutes()
    s = base.getSeconds()
  }
  if (isNaN(new Date(y, mo, d).getTime())) return null
  return new Date(Date.UTC(y, mo, d, h, mi, s))
}

export function fmtDateTime(dt: Date | null | undefined): string {
  if (!dt || isNaN(dt.getTime())) return ''
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`
}

export function parseFleetDate(v: unknown): Date | null {
  if (!v) return null
  const m = String(v).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ \t]+(\d{2}):(\d{2}))?/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), 0)
}

export function bhParseDate(v: unknown): Date | null {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()))
  if (typeof v === 'number') return excelSerialToDate(v)
  if (typeof v === 'string') {
    const s = String(v).trim()
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const d = +m[1]
      const mo = +m[2]
      const y = +m[3]
      if (mo >= 1 && mo <= 12) return new Date(Date.UTC(y, mo - 1, d))
      if (d >= 1 && d <= 12) return new Date(Date.UTC(y, d - 1, mo))
      return null
    }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  }
  return null
}

export function bhPeriodOf(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = d.getDate()
  if (day <= 14) return `${y}-${pad(m + 1)}`
  const nd = new Date(y, m + 1, 14)
  return `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`
}

export function bhPeriodStart(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 2, 15)
}

export function bhPeriodEnd(period: string): Date {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 14)
}

export function bhPeriodLabel(period: string): string {
  const s = bhPeriodStart(period)
  const e = bhPeriodEnd(period)
  const f = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${f(s)} – ${f(e)}/${e.getFullYear()}`
}

export function bhPeriodDays(period: string): Week {
  const start = bhPeriodStart(period)
  const end = bhPeriodEnd(period)
  const days: Week = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push({
      day: cur.getDate(),
      dow: cur.getDay(),
      iso: `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function osDurationMin(
  r: { dataAbertura?: string | null; dataFechamento?: string | null } | null | undefined,
): number | null {
  if (!r || !r.dataAbertura || !r.dataFechamento) return null
  const parse = (s: string) => {
    const [d, t] = String(s).trim().split(/\s+/)
    const dp = (d || '').split('-').map(Number)
    if (dp.length < 3 || dp.some((n) => isNaN(n))) return null
    const tp = (t || '0:0').split(':').map(Number)
    return Date.UTC(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0)
  }
  const a = parse(r.dataAbertura)
  const f = parse(r.dataFechamento)
  if (a == null || f == null) return null
  const min = Math.round((f - a) / 60000)
  return min > 0 ? min : null
}
