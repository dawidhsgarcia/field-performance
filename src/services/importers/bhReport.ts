import { produce } from '@/lib/immutable'
import { BH_WORK_MIN } from '@/lib/constants'
import type { AppState, BhBaseEntry, BhCompensated, BhState } from '@/types'
import type { BhImportSummary, ImportOutcome } from '@/types/imports'
import { normalizeRowKeys, bhParseHoras, bhParseVlr } from '@/utils/numbers'
import { bhFmtMin, fmtNum } from '@/utils/format'
import { bhParseDate, bhPeriodLabel, bhPeriodOf, pad } from '@/utils/date'
import { parseBhCsv } from '@/utils/csv'

export function applyBhReport(
  rawRows: Array<Record<string, unknown>>,
  state: AppState,
): ImportOutcome<BhImportSummary> {
  const base: BhBaseEntry[] = []
  let skipped = 0
  rawRows.forEach((raw) => {
    const row = normalizeRowKeys(raw)
    const funci = row['funcid'] ? String(row['funcid']).trim() : ''
    const limite = bhParseDate(row['limitecomp'])
    if (!funci || !limite) {
      skipped++
      return
    }
    const horas = bhParseHoras(row['horas'])
    const valor = bhParseVlr(row['vlr'])
    const dias = parseInt(String(row['dias'] ?? ''), 10)
    base.push({
      funci,
      nome: row['nome'] ? String(row['nome']).trim().toUpperCase() : funci,
      bu: row['bu'] ? String(row['bu']).trim() : '',
      subBu: row['subbu'] ? String(row['subbu']).trim() : '',
      limiteComp: `${limite.getUTCFullYear()}-${pad(limite.getUTCMonth() + 1)}-${pad(limite.getUTCDate())}`,
      horas,
      valor: valor === null || isNaN(valor) ? null : valor,
      dias: isNaN(dias) || dias < 0 ? 0 : dias,
    })
  })

  if (base.length === 0) {
    return {
      newState: null,
      summary: null,
      message:
        'Nenhuma linha válida na base de Banco de Horas. Confira as colunas: FUNCID, NOME, BU, SUB BU, LIMITE COMP., HORAS, VLR., DIAS.',
    }
  }

  const periodCounts: Record<string, number> = {}
  base.forEach((b) => {
    const p = b.limiteComp.slice(0, 7)
    periodCounts[p] = (periodCounts[p] || 0) + 1
  })
  const best = Object.entries(periodCounts).sort((a, b) => b[1] - a[1])[0]
  const bestPeriod = best ? best[0] : bhPeriodOf(new Date())

  const newState = produce(state, (draft) => {
    if (!draft.bh) draft.bh = { base: [], folgas: {}, period: null }
    draft.bh.base = base
    draft.bh.folgas = draft.bh.folgas || {}
    draft.bh.period = bestPeriod
  })

  const totHoras = base.reduce((s, b) => s + (b.horas || 0), 0)
  const totVlr = base.reduce((s, b) => s + (b.valor || 0), 0)
  const totDias = base.reduce((s, b) => s + (b.dias || 0), 0)

  const message =
    `Base de Banco de Horas importada:\n` +
    `• ${base.length} técnico(s) na base (${skipped} linha(s) ignorada(s))\n` +
    `• Total de horas a compensar: ${bhFmtMin(totHoras)}\n` +
    `• Total VLR.: R$ ${fmtNum(totVlr)}\n` +
    `• Total de dias a compensar: ${totDias}\n` +
    `A página foi ajustada para o período ${bhPeriodLabel(bestPeriod)} (BH: dia 15 → dia 14).`

  return {
    newState,
    summary: {
      total: base.length,
      skipped,
      period: bestPeriod,
      periodLabel: bhPeriodLabel(bestPeriod),
      totalHorasMin: totHoras,
      totalVlr: totVlr,
      totalDias: totDias,
      message,
    },
  }
}

export function parseBhText(text: string): Array<Record<string, unknown>> {
  return parseBhCsv(text)
}

export function bhFolgasOf(bh: BhState, funci: string): string[] {
  if (!bh || !Array.isArray(bh.folgas?.[funci])) return []
  return bh.folgas[funci]
}

export function bhIsMarked(bh: BhState, funci: string, iso: string): boolean {
  return bhFolgasOf(bh, funci).includes(iso)
}

export function bhCalRange(b: BhBaseEntry): { start: Date; end: Date } {
  const [ly, lm] = b.limiteComp.split('-').map(Number)
  return { start: new Date(ly, lm - 2, 15), end: new Date(ly, lm - 1, 15) }
}

export function bhCompensated(b: BhBaseEntry, bh: BhState): BhCompensated {
  const r = bhCalRange(b)
  const sIso = `${r.start.getFullYear()}-${pad(r.start.getMonth() + 1)}-${pad(r.start.getDate())}`
  const eIso = `${r.end.getFullYear()}-${pad(r.end.getMonth() + 1)}-${pad(r.end.getDate())}`
  let min = 0
  let count = 0
  bhFolgasOf(bh, b.funci).forEach((iso) => {
    if (iso < sIso || iso >= eIso) return
    const dow = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)).getDay()
    if (dow === 0) return
    min += dow === 6 ? BH_WORK_MIN.saturday : BH_WORK_MIN.weekday
    count++
  })
  return { min, count }
}

export function bhScheduledDays(b: BhBaseEntry, bh: BhState): string[] {
  const folgas = bhFolgasOf(bh, b.funci)
  if (!folgas.length) return []
  const r = bhCalRange(b)
  const sIso = `${r.start.getFullYear()}-${pad(r.start.getMonth() + 1)}-${pad(r.start.getDate())}`
  const eIso = `${r.end.getFullYear()}-${pad(r.end.getMonth() + 1)}-${pad(r.end.getDate())}`
  return folgas.filter((iso) => iso >= sIso && iso < eIso).sort()
}

export function bhBaseEntry(bh: BhState, funci: string, period?: string | null): BhBaseEntry | null {
  if (!bh || !Array.isArray(bh.base)) return null
  if (period) {
    return bh.base.find((x) => x.funci === funci && x.limiteComp && x.limiteComp.slice(0, 7) === period) || null
  }
  return bh.base.find((x) => x.funci === funci) || null
}

export function bhToggleFolga(
  b: BhBaseEntry,
  bh: BhState,
  funci: string,
  iso: string,
): { next: BhState; added: boolean } {
  const r = bhCalRange(b)
  const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  if (d.getDay() === 0 || d < r.start || d >= r.end) return { next: bh, added: false }

  const list = Array.isArray(bh.folgas?.[funci]) ? [...bh.folgas[funci]] : []
  const idx = list.indexOf(iso)
  if (idx === -1) {
    const comp = bhCompensated(b, { ...bh, folgas: { ...bh.folgas, [funci]: list } })
    if (comp.count >= (b.dias || 1)) return { next: bh, added: false }
    list.push(iso)
  } else {
    list.splice(idx, 1)
  }

  return {
    next: { ...bh, folgas: { ...bh.folgas, [funci]: list } },
    added: idx === -1,
  }
}
