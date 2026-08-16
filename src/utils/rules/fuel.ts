import { FUEL_KM_L_ALERT } from '@/lib/constants'
import { getVeiculo, importedTechs, periodKeyOf } from '@/services/state'
import { buildWeeks } from '@/utils/date'
import { computeRanking } from './ranking'
import type {
  AppState,
  FuelKpis,
  FuelPeriod,
  FuelProductivityRow,
  FuelSortKey,
  FuelStatus,
  FuelVehicle,
} from '@/types'

export function vehicleRegiao(
  state: AppState,
  placa: string,
  motoristaNome: string | null,
): string | null {
  const v = getVeiculo(state, placa)
  if (v && v.regiao && state.regions[v.regiao]) return v.regiao
  if (motoristaNome) {
    const n = motoristaNome.trim().toUpperCase()
    const rids = Object.keys(state.regions)
    for (let i = 0; i < rids.length; i++) {
      const rid = rids[i]
      if (importedTechs(state.regions[rid]).some((t) => String(t.nome).trim().toUpperCase() === n)) {
        return rid
      }
    }
  }
  return null
}

export function vehicleFunci(
  state: AppState,
  placa: string,
  motoristaNome: string | null,
  regiaoAtiva: string | null,
): string | null {
  const v = getVeiculo(state, placa)
  if (v && v.motorista) return v.motorista
  if (motoristaNome) {
    const n = motoristaNome.trim().toUpperCase()
    const rids = regiaoAtiva ? [regiaoAtiva] : Object.keys(state.regions)
    for (let i = 0; i < rids.length; i++) {
      const rid = rids[i]
      if (!state.regions[rid]) continue
      const tech = importedTechs(state.regions[rid]).find(
        (t) => String(t.nome).trim().toUpperCase() === n,
      )
      if (tech) return tech.funci
    }
    if (regiaoAtiva) {
      for (const rid of Object.keys(state.regions)) {
        const tech = importedTechs(state.regions[rid]).find(
          (t) => String(t.nome).trim().toUpperCase() === n,
        )
        if (tech) return tech.funci
      }
    }
  }
  return null
}

export function fuelVehicles(per: FuelPeriod, state: AppState): FuelVehicle[] {
  return Object.values(per.vehicles).filter((v) => getVeiculo(state, v.placa))
}

export function filterFuelByRegion(
  vehicles: FuelVehicle[],
  state: AppState,
  allMode: boolean,
): FuelVehicle[] {
  if (allMode) return vehicles
  return vehicles.filter((v) => vehicleRegiao(state, v.placa, v.motorista) === state.currentRegion)
}

export function computeFuelKpis(
  vehicles: FuelVehicle[],
  state: AppState,
  allMode: boolean,
  pk: string,
): FuelKpis {
  const totAbast = vehicles.reduce((s, v) => s + v.abastecimentos, 0)
  const totLitros = vehicles.reduce((s, v) => s + v.litros, 0)
  const totCusto = vehicles.reduce((s, v) => s + v.custo, 0)
  const totKm = vehicles.reduce((s, v) => s + v.km, 0)
  const custoKm = totKm > 0 ? totCusto / totKm : null
  const kmPorLitro = totLitros > 0 ? totKm / totLitros : null

  let totOrcamento = 0
  vehicles.forEach((v) => {
    const ve = getVeiculo(state, v.placa)
    if (ve && ve.orcamento && !isNaN(ve.orcamento)) totOrcamento += ve.orcamento
  })
  const orcPct = totOrcamento > 0 ? (totCusto / totOrcamento) * 100 : null
  const orcStatus: FuelStatus =
    orcPct === null ? '' : orcPct > 100 ? 'danger' : orcPct >= 90 ? 'warning' : 'success'
  const kmlStatus: FuelStatus =
    kmPorLitro !== null && kmPorLitro >= 10
      ? 'success'
      : kmPorLitro !== null && kmPorLitro < FUEL_KM_L_ALERT
        ? 'danger'
        : 'warning'

  let totalOS = 0
  if (allMode) {
    Object.values(state.regions).forEach((r) => {
      totalOS += r.sla?.[pk]?.totalOS || 0
    })
  } else {
    totalOS = state.regions[state.currentRegion]?.sla?.[pk]?.totalOS || 0
  }
  const custoPorOS = totCusto > 0 && totalOS > 0 ? totCusto / totalOS : null

  return {
    totCusto,
    totLitros,
    totKm,
    totAbast,
    custoKm,
    kmPorLitro,
    totOrcamento,
    orcPct,
    orcStatus,
    kmlStatus,
    custoPorOS,
  }
}

export function computeFuelProductivityRows(
  per: FuelPeriod,
  state: AppState,
  regionFilter: string | null,
): FuelProductivityRow[] {
  const weeks = buildWeeks(state.currentYear, state.currentMonth)
  const pk = periodKeyOf(state)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const regionIds = regionFilter && state.regions[regionFilter] ? [regionFilter] : Object.keys(state.regions)
  const rows: FuelProductivityRow[] = []

  regionIds.forEach((rid) => {
    const region = state.regions[rid]
    if (!importedTechs(region).length) return
    const ranking = computeRanking(region, weeks, state.params, today)
    ;[...importedTechs(region)]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .forEach((tech) => {
        let abast = 0
        let litros = 0
        let custo = 0
        let km = 0
        let orcamento = 0
        Object.values(per.vehicles).forEach((v) => {
          const fu = vehicleFunci(state, v.placa, v.motorista, rid)
          if (fu === tech.funci) {
            abast += v.abastecimentos
            litros += v.litros
            custo += v.custo
            km += v.km
            const ve = getVeiculo(state, v.placa)
            if (ve && ve.orcamento && !isNaN(ve.orcamento)) orcamento += ve.orcamento
          }
        })
        const r = ranking.find((x) => x.tech.funci === tech.funci) || null
        const pts = r ? r.sum : 0
        const kmPorLitro = litros > 0 ? km / litros : null
        const ptsPerLitro = litros > 0 ? pts / litros : null
        const osCount = region.sla?.[pk]?.techSla?.[tech.funci]?.totalOS || 0
        const litroOs = litros > 0 && osCount > 0 ? litros / osCount : null
        rows.push({
          region: region.name,
          funci: tech.funci,
          nome: tech.nome,
          avg: r ? r.avg : null,
          abast,
          litros,
          custo,
          km,
          orcamento,
          kmPorLitro,
          ptsPerLitro,
          litroOs,
          orcPct: orcamento > 0 ? (custo / orcamento) * 100 : null,
          avgKey: r && r.avg !== null ? r.avg : -1,
        })
      })
  })

  return rows
}

function numSort(key: 'avgKey' | 'ptsPerLitro' | 'kmPorLitro' | 'custo' | 'orcPct') {
  return (a: FuelProductivityRow, b: FuelProductivityRow) => {
    const va = (a[key] as number | null) ?? -1
    const vb = (b[key] as number | null) ?? -1
    return vb - va
  }
}

export function sortFuelProductivity(
  rows: FuelProductivityRow[],
  key: FuelSortKey,
): FuelProductivityRow[] {
  const sorted = rows.slice()
  if (key === 'pts') sorted.sort(numSort('avgKey'))
  else if (key === 'pontosL') sorted.sort(numSort('ptsPerLitro'))
  else if (key === 'kml') sorted.sort(numSort('kmPorLitro'))
  else if (key === 'custo') sorted.sort(numSort('custo'))
  else if (key === 'orcPct') sorted.sort(numSort('orcPct'))
  else sorted.sort((a, b) => a.nome.localeCompare(b.nome) || a.region.localeCompare(b.region))
  return sorted
}
