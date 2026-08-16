import { describe, expect, it } from 'vitest'
import {
  computeFuelKpis,
  computeFuelProductivityRows,
  sortFuelProductivity,
  vehicleFunci,
  vehicleRegiao,
} from './fuel'
import { seedState } from '@/lib/seed'
import type { FuelPeriod, FuelVehicle } from '@/types'

function makeVehicle(overrides: Partial<FuelVehicle>): FuelVehicle {
  return {
    placa: 'ABC1234',
    modelo: 'GOL',
    perfil: 'FROTA',
    tipoFrota: 'LEVE',
    motorista: 'MARIA',
    matricula: 'M1',
    abastecimentos: 3,
    litros: 10,
    custo: 100,
    km: 250,
    kmPorLitro: 25,
    custoKm: 0.4,
    desvioAcima: 0,
    desvioAbaixo: 0,
    mercadorias: {},
    ...overrides,
  }
}

describe('vehicleRegiao / vehicleFunci', () => {
  it('prioriza o cadastro de veículos', () => {
    const state = seedState()
    state.veiculos['ABC1234'] = { placa: 'ABC1234', motorista: 'T1', regiao: 'norte', orcamento: null }
    expect(vehicleFunci(state, 'ABC1234', 'OUTRO', 'norte')).toBe('T1')
    expect(vehicleRegiao(state, 'ABC1234', 'OUTRO')).toBe('norte')
  })

  it('usa o nome do motorista como fallback', () => {
    const state = seedState()
    state.veiculos['XYZ9999'] = { placa: 'XYZ9999', motorista: null, regiao: null, orcamento: null }
    state.regions.norte.technicians.push({ funci: 'T8', nome: 'MARIA SILVA', imported: true })
    expect(vehicleFunci(state, 'XYZ9999', 'MARIA SILVA', 'norte')).toBe('T8')
    expect(vehicleRegiao(state, 'XYZ9999', 'MARIA SILVA')).toBe('norte')
  })
})

describe('computeFuelKpis', () => {
  it('calcula totais, orçamento % e KM/L com status', () => {
    const state = seedState()
    state.currentRegion = 'norte'
    state.currentYear = 2026
    state.currentMonth = 6
    state.veiculos['ABC1234'] = { placa: 'ABC1234', motorista: 'T1', regiao: 'norte', orcamento: 500 }
    state.regions.norte.sla = { '2026-07': { activitySla: {}, slaCounts: { evaluated: 0, onTime: 0 }, totalOS: 10, techSla: {} } }

    const kpis = computeFuelKpis([makeVehicle({})], state, false, '2026-07')
    expect(kpis.totCusto).toBe(100)
    expect(kpis.totLitros).toBe(10)
    expect(kpis.totKm).toBe(250)
    expect(kpis.kmPorLitro).toBe(25)
    expect(kpis.kmlStatus).toBe('success')
    expect(kpis.totOrcamento).toBe(500)
    expect(kpis.orcPct).toBe(20)
    expect(kpis.orcStatus).toBe('success')
    expect(kpis.custoPorOS).toBe(10)
  })

  it('KM/L abaixo do limite fica danger e orçamento acima de 100 fica danger', () => {
    const state = seedState()
    state.veiculos['ABC1234'] = { placa: 'ABC1234', motorista: 'T1', regiao: 'norte', orcamento: 50 }
    const kpis = computeFuelKpis([makeVehicle({ km: 40, kmPorLitro: 4 })], state, false, '2026-07')
    expect(kpis.kmlStatus).toBe('danger')
    expect(kpis.orcPct).toBe(200)
    expect(kpis.orcStatus).toBe('danger')
  })
})

describe('computeFuelProductivityRows / sortFuelProductivity', () => {
  it('atribui consumo ao técnico e ordena por orcPct decrescente', () => {
    const state = seedState()
    state.currentRegion = 'norte'
    state.currentYear = 2026
    state.currentMonth = 6
    state.regions.norte.technicians = [
      { funci: 'T1', nome: 'TEC 1', imported: true },
      { funci: 'T2', nome: 'TEC 2', imported: true },
    ]
    state.regions.norte.sla = {
      '2026-07': {
        activitySla: {},
        slaCounts: { evaluated: 0, onTime: 0 },
        totalOS: 0,
        techSla: { T1: { totalOS: 5, evaluated: 0, onTime: 0 } },
      },
    }
    const v1 = makeVehicle({ placa: 'AAA', motorista: 'TEC 1', custo: 100 })
    const v2 = makeVehicle({ placa: 'BBB', motorista: 'TEC 2', custo: 40 })
    state.veiculos.AAA = { placa: 'AAA', motorista: 'T1', regiao: 'norte', orcamento: 100 }
    state.veiculos.BBB = { placa: 'BBB', motorista: 'T2', regiao: 'norte', orcamento: 80 }
    const per: FuelPeriod = {
      summary: {
        abastecimentos: 0,
        litros: 0,
        custo: 0,
        km: 0,
        precoMedio: null,
        custoKm: null,
        kmPorLitro: null,
        desvioAcima: 0,
        desvioAbaixo: 0,
      },
      vehicles: { AAA: v1, BBB: v2 },
      daily: {},
      byDriver: {},
    }

    const rows = computeFuelProductivityRows(per, state, 'norte')
    expect(rows).toHaveLength(2)
    const t1 = rows.find((r) => r.funci === 'T1')
    const t2 = rows.find((r) => r.funci === 'T2')
    expect(t1?.custo).toBe(100)
    expect(t1?.orcPct).toBe(100)
    expect(t2?.orcPct).toBe(50)

    const sorted = sortFuelProductivity(rows, 'orcPct')
    expect(sorted[0].funci).toBe('T1')
  })
})
