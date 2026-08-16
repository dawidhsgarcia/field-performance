export interface FuelSummary {
  abastecimentos: number
  litros: number
  custo: number
  km: number
  precoMedio: number | null
  custoKm: number | null
  kmPorLitro: number | null
  desvioAcima: number
  desvioAbaixo: number
}

export interface FuelVehicleMercadoria {
  label: string
  litros: number
  custo: number
  abastecimentos: number
}

export interface FuelVehicle {
  placa: string
  modelo: string
  perfil: string
  tipoFrota: string
  motorista: string
  matricula: string
  abastecimentos: number
  litros: number
  custo: number
  km: number
  kmPorLitro: number | null
  custoKm: number | null
  desvioAcima: number
  desvioAbaixo: number
  mercadorias: Record<string, FuelVehicleMercadoria>
}

export interface FuelDaily {
  abastecimentos: number
  litros: number
  custo: number
  km: number
}

export interface FuelByDriver {
  nome: string
  abastecimentos: number
  litros: number
  custo: number
  km: number
  kmPorLitro: number | null
}

export interface FuelPeriod {
  summary: FuelSummary
  vehicles: Record<string, FuelVehicle>
  daily: Record<string, FuelDaily>
  byDriver: Record<string, FuelByDriver>
}

export type FuelStatus = 'success' | 'warning' | 'danger' | ''

export interface FuelKpis {
  totCusto: number
  totLitros: number
  totKm: number
  totAbast: number
  custoKm: number | null
  kmPorLitro: number | null
  totOrcamento: number
  orcPct: number | null
  orcStatus: FuelStatus
  kmlStatus: FuelStatus
  custoPorOS: number | null
}

export interface FuelProductivityRow {
  region: string
  funci: string
  nome: string
  avg: number | null
  abast: number
  litros: number
  custo: number
  km: number
  orcamento: number
  kmPorLitro: number | null
  ptsPerLitro: number | null
  litroOs: number | null
  orcPct: number | null
  avgKey: number
}

export type FuelSortKey = 'pts' | 'pontosL' | 'kml' | 'custo' | 'orcPct'
