export function fmtNum(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function fmtHrs(min: number | null | undefined): string {
  if (min == null || !isFinite(min)) return '—'
  const h = Math.round((min / 60) * 10) / 10
  return String(h).replace('.', ',') + 'h'
}

export function bhFmtMin(min: number | null | undefined): string {
  if (min === null || min === undefined || isNaN(min)) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function bhFmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export function esc(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
