export function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  Object.keys(row).forEach((k) => {
    const key = String(k)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u00a0\u00ad]/g, '')
      .replace(/[^a-z0-9_]/g, '')
    out[key] = row[k]
  })
  return out
}

export function fuelNormKey(k: unknown): string {
  return String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function parseYesNo(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === 'number') return v === 1
  const s = String(v).trim().toLowerCase()
  if (
    s === '1' ||
    s === 'true' ||
    s === 'sim' ||
    s === 's' ||
    s === 'yes' ||
    s === 'y' ||
    s === 'x' ||
    s === 'v' ||
    s === 'ok' ||
    s === '✓' ||
    s === 'check'
  ) {
    return true
  }
  return false
}

export function parseBaremo(v: unknown): number {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).trim().replace(',', '.'))
  return isNaN(n) ? NaN : n
}

export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim().replace(/\./g, '').replace(',', '.')
  if (s === '') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function bhParseHoras(v: unknown): number | null {
  const s = String(v).trim()
  const m = s.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/)
  if (m) return +m[1] * 60 + +m[2]
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? null : Math.round(n * 60)
}

export function bhParseVlr(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const s = String(v).trim().replace(/\./g, '').replace(',', '.')
  if (s === '') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}
