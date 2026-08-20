import { useMemo } from 'react'
import { useStateStore } from '@/stores/state.store'
import { currentRegion, importedTechsCadastrados } from '@/services/state'
import { buildWeeks } from '@/utils/date'
import type { Region, Technician, Week } from '@/types'

export interface AcompanhamentoData {
  region: Region | null
  weeks: Week[]
  techs: Technician[]
  currentYear: number
  currentMonth: number
}

export function useAcompanhamentoData(): AcompanhamentoData {
  const data = useStateStore((s) => s.data)
  return useMemo<AcompanhamentoData>(() => {
    if (!data) return { region: null, weeks: [], techs: [], currentYear: 0, currentMonth: 0 }
    const region = currentRegion(data)
    const weeks = buildWeeks(data.currentYear, data.currentMonth)
    const techs = importedTechsCadastrados(region, data.colaboradores).sort((a, b) =>
      a.nome.localeCompare(b.nome),
    )
    return { region, weeks, techs, currentYear: data.currentYear, currentMonth: data.currentMonth }
  }, [data])
}
