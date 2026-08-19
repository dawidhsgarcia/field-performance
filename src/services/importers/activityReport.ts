import { produce } from '@/lib/immutable'
import { ALL_REGION } from '@/lib/constants'
import type { AppState, OsDetail, RegionSla } from '@/types'
import type { ActivityReportSummary, ImportOutcome } from '@/types/imports'
import { normalizeRowKeys, parseBaremo, parseYesNo } from '@/utils/numbers'
import { excelSerialToDate, excelSerialToDateTime, fmtDateTime, isoDate, pad } from '@/utils/date'
import { currentRegion } from '@/services/state'

export function applyActivityReport(
  rawRows: Array<Record<string, unknown>>,
  regionId: string | null,
  state: AppState,
): ImportOutcome<ActivityReportSummary> {
  if ((!regionId || regionId === ALL_REGION) && (!state.currentRegion || state.currentRegion === ALL_REGION)) {
    return {
      newState: null,
      summary: null,
      message: 'Selecione uma região específica para importar o relatório.',
    }
  }

  const agg: Record<string, Record<string, Record<string, number>>> = {}
  const nomes: Record<string, string> = {}
  const slaByPeriod: Record<string, RegionSla> = {}
  const reportByPeriod: Record<string, Record<string, OsDetail[]>> = {}
  let validRows = 0
  let skippedRows = 0

  rawRows.forEach((raw) => {
    const row = normalizeRowKeys(raw)
    const funci = row['funcid'] ? String(row['funcid']).trim() : ''
    const baremo = parseBaremo(row['baremo'])
    const expurgado = parseYesNo(row['expurgo_dupla'])
    const dataFechamento = excelSerialToDate(row['data_fechamento']) || excelSerialToDate(row['data_abertura'])

    if (!funci || isNaN(baremo) || !dataFechamento || expurgado) {
      skippedRows++
      return
    }
    validRows++

    const y = dataFechamento.getUTCFullYear()
    const m = dataFechamento.getUTCMonth()
    const d = dataFechamento.getUTCDate()
    const period = `${y}-${pad(m + 1)}`
    const iso = isoDate(y, m, d)

    const dataAberturaDT = excelSerialToDateTime(row['data_abertura'])
    const dataFechamentoDT = excelSerialToDateTime(row['data_fechamento']) || dataAberturaDT
    const atividade = row['atividade'] ? String(row['atividade']).trim() : null

    if (!reportByPeriod[period]) reportByPeriod[period] = {}
    if (!reportByPeriod[period][funci]) reportByPeriod[period][funci] = []
    reportByPeriod[period][funci].push({
      os: row['codigo_os'] != null ? String(row['codigo_os']).trim() : '',
      atividade: atividade || '',
      dataAbertura: fmtDateTime(dataAberturaDT),
      dataFechamento: fmtDateTime(dataFechamentoDT),
      baremo: parseBaremo(row['baremo']),
      avaliada: parseYesNo(row['avalia_prazo']),
      noPrazo: parseYesNo(row['realizado_no_prazo']),
    })

    if (!slaByPeriod[period]) {
      slaByPeriod[period] = {
        activitySla: {},
        slaCounts: { evaluated: 0, onTime: 0 },
        totalOS: 0,
        techSla: {},
      }
    }
    const pSla = slaByPeriod[period]
    pSla.totalOS++
    if (parseYesNo(row['avalia_prazo'])) pSla.slaCounts.evaluated++
    if (parseYesNo(row['realizado_no_prazo'])) pSla.slaCounts.onTime++
    if (!pSla.techSla[funci]) pSla.techSla[funci] = { totalOS: 0, evaluated: 0, onTime: 0 }
    pSla.techSla[funci].totalOS++
    if (parseYesNo(row['avalia_prazo'])) pSla.techSla[funci].evaluated++
    if (parseYesNo(row['realizado_no_prazo'])) pSla.techSla[funci].onTime++

    if (row['tecnico']) nomes[funci] = String(row['tecnico']).trim().toUpperCase()

    if (atividade && !atividade.toUpperCase().includes('APOIO')) {
      if (!pSla.activitySla[atividade]) pSla.activitySla[atividade] = { total: 0, evaluated: 0, onTime: 0 }
      pSla.activitySla[atividade].total++
      if (parseYesNo(row['avalia_prazo'])) pSla.activitySla[atividade].evaluated++
      if (parseYesNo(row['realizado_no_prazo'])) pSla.activitySla[atividade].onTime++
    }

    if (!agg[period]) agg[period] = {}
    if (!agg[period][funci]) agg[period][funci] = {}
    if (!agg[period][funci][iso]) agg[period][funci][iso] = 0
    agg[period][funci][iso] += baremo
  })

  if (validRows === 0) {
    return {
      newState: null,
      summary: null,
      message:
        'Nenhuma linha válida encontrada nesse arquivo. Confira se as colunas funcid, tecnico, data_fechamento e baremo estão presentes.',
    }
  }

  const targetId = regionId || state.currentRegion
  const targetRegion = state.regions[targetId] || currentRegion(state)

  let newTechs = 0
  const updatedTechs = new Set<string>()
  let updatedDays = 0
  const periodCounts: Record<string, number> = {}
  Object.keys(agg).forEach((period) => {
    periodCounts[period] = 0
    Object.keys(agg[period]).forEach((funci) => {
      const cells = Object.keys(agg[period][funci]).length
      updatedDays += cells
      periodCounts[period] += cells
      updatedTechs.add(funci)
      if (!targetRegion.technicians.find((t) => t.funci === funci)) newTechs++
    })
  })
  let bestPeriod: string | null = null
  let bestPeriodCount = -1
  Object.keys(periodCounts).forEach((p) => {
    if (periodCounts[p] > bestPeriodCount) {
      bestPeriodCount = periodCounts[p]
      bestPeriod = p
    }
  })

  const newState = produce(state, (draft) => {
    const region = draft.regions[targetId]
    if (!region) return
    if (!region.sla) region.sla = {}
    Object.keys(slaByPeriod).forEach((period) => {
      region.sla![period] = slaByPeriod[period]
    })
    Object.keys(reportByPeriod).forEach((period) => {
      if (!region.report) region.report = {}
      if (!region.report[period]) region.report[period] = {}
      Object.keys(reportByPeriod[period]).forEach((funci) => {
        region.report![period][funci] = reportByPeriod[period][funci]
      })
    })
    Object.keys(agg).forEach((period) => {
      Object.keys(agg[period]).forEach((funci) => {
        let tech = region.technicians.find((t) => t.funci === funci)
        if (!tech) {
          tech = { funci, nome: nomes[funci] || funci, imported: true }
          region.technicians.push(tech)
        } else {
          tech.imported = true
        }
        if (!region.entries[period]) region.entries[period] = {}
        if (!region.entries[period][funci]) region.entries[period][funci] = {}
        Object.keys(agg[period][funci]).forEach((iso) => {
          region.entries[period][funci][iso] = Math.round(agg[period][funci][iso] * 100) / 100
        })
      })
    })
    if (bestPeriod) {
      const [y, m] = bestPeriod.split('-').map(Number)
      draft.currentYear = y
      draft.currentMonth = m - 1
    }
    region.locked = true
  })

  return {
    newState,
    summary: {
      regionId: targetId,
      regionName: targetRegion.name,
      updatedTechs: updatedTechs.size,
      newTechs,
      updatedDays,
      validRows,
      skippedRows,
      bestPeriod,
    },
  }
}
