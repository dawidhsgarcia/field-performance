import type { FuelPeriod } from './fuel'
import type { BhState } from './bh'

export interface Technician {
  funci: string
  nome: string
  imported?: boolean
}

export type EntryValue = number | string

export interface ActivitySla {
  total: number
  evaluated: number
  onTime: number
}

export interface TechSla {
  totalOS: number
  evaluated: number
  onTime: number
}

export interface RegionSla {
  activitySla: Record<string, ActivitySla>
  slaCounts: {
    evaluated: number
    onTime: number
  }
  totalOS: number
  techSla: Record<string, TechSla>
}

export interface OsDetail {
  os: string
  atividade: string
  dataAbertura: string
  dataFechamento: string
  baremo: number
  avaliada: boolean
  noPrazo: boolean
}

export interface Region {
  name: string
  technicians: Technician[]
  entries: Record<string, Record<string, Record<string, EntryValue>>>
  locked: boolean
  sla?: Record<string, RegionSla>
  report?: Record<string, Record<string, OsDetail[]>>
}

export interface Params {
  dayMeta: number[]
  trendWindow: number
  quartil: {
    q1: number
    q2: number
    q3: number
  }
  alertTech: {
    below: number
    streak: number
  }
  alertTeam: {
    belowPct: number
    streak: number
  }
  alertProjection: {
    belowPct: number
  }
}

export interface Veiculo {
  placa: string
  motorista: string | null
  regiao: string | null
  orcamento: number | null
}

export interface Colaborador {
  funci: string
  nome: string
  regiao: string
  funcao: string
  telefone: string | null
}

export interface StateMeta {
  version: number
  updatedAt: string | null
}

export interface AppState {
  currentRegion: string
  currentYear: number
  currentMonth: number
  _meta: StateMeta
  params: Params
  veiculos: Record<string, Veiculo>
  colaboradores: Record<string, Colaborador>
  fuel: Record<string, FuelPeriod>
  bh: BhState
  sobreaviso: Record<string, string[]>
  regions: Record<string, Region>
}
