import { osDurationMin } from '@/utils/date'
import { fmtHrs } from '@/utils/format'
import type { OsDetail } from '@/types'

export type OsRow = OsDetail & { funci: string; tecnico: string }

export type OsSortableKey =
  | 'tecnico'
  | 'os'
  | 'atividade'
  | 'dataAbertura'
  | 'dataFechamento'
  | 'mttr'
  | 'baremo'
  | 'prazo'

export function osSortValue(r: OsRow, k: OsSortableKey): number | string {
  if (k === 'prazo') return r.avaliada ? (r.noPrazo ? 2 : 1) : 0
  if (k === 'mttr') return osDurationMin(r) ?? 0
  if (k === 'tecnico') return String(r.tecnico || '').toLowerCase()
  const v = (r as unknown as Record<string, unknown>)[k]
  if (k === 'dataAbertura' || k === 'dataFechamento') return String(v || '')
  if (typeof v === 'number') return v
  return String(v || '').toLowerCase()
}

export function fmtOsDate(v: string | null | undefined): string {
  if (!v) return '—'
  let datePart = v
  let timePart = ''
  const sp = v.indexOf(' ')
  if (sp > 0) {
    datePart = v.slice(0, sp)
    timePart = v.slice(sp + 1)
  }
  const [y, m, d] = datePart.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}${timePart ? ' ' + timePart : ''}`
}

export function mttrLabel(r: OsRow): string {
  return fmtHrs(osDurationMin(r))
}
