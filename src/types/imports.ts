import type { AppState } from './state'

export interface ActivityReportSummary {
  regionId: string
  regionName: string
  updatedTechs: number
  newTechs: number
  updatedDays: number
  validRows: number
  skippedRows: number
  bestPeriod: string | null
}

export interface FuelImportSummary {
  validRows: number
  ignoredRows: number
  kmIgnoredRows: number
  vehiclesDetected: number
  periodLabel: string
  litros: number
  custo: number
  kmPorLitro: number | null
  message: string
}

export interface BhImportSummary {
  total: number
  skipped: number
  period: string
  periodLabel: string
  totalHorasMin: number
  totalVlr: number
  totalDias: number
  message: string
}

export interface ImportOutcome<T> {
  newState: AppState | null
  summary: T | null
  message?: string
}
