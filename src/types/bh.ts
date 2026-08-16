export interface BhBaseEntry {
  funci: string
  nome: string
  bu: string
  subBu: string
  limiteComp: string
  horas: number | null
  valor: number | null
  dias: number
}

export interface BhState {
  base: BhBaseEntry[]
  folgas: Record<string, string[]>
  period: string | null
}

export interface BhCompensated {
  min: number
  count: number
}
