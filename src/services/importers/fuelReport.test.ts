import { describe, expect, it } from 'vitest'
import { applyFuelReport } from './fuelReport'
import { seedState } from '@/lib/seed'

const csv = [
  'Placa;Perfil de Uso;Nome Veículo;Modelo Veículo;Tipo de Frota;Nome Motorista;Matrícula Motorista;Data/Hora Transação;Mercadoria;Qtd Mercadoria;Valor Unit Mercadoria;Valor Total com Desconto;Valor Total Original;KM/Hr Percorrido;Média Efetiva KM/Hr;Custo KM/Hr Percorrido;Descrição Desvio na Transação',
  'ABC1234;FROTA;VAN;GOL;LEVE;MARIA;M1;15/07/2026 10:30:00;GASOLINA;10;6,00;60,00;60,00;250;25;0,24;',
  'ABC1234;FROTA;VAN;GOL;LEVE;MARIA;M1;15/07/2026 11:00:00;LAVA-RÁPIDO;1;50,00;50,00;50,00;0;0;0;',
  'XYZ9999;EQUIPAMENTOS;GERADOR;GER;PESADO;JOAO;J1;15/07/2026 12:00:00;DIESEL;20;6,00;120,00;120,00;500;25;0,24;',
].join('\n')

describe('applyFuelReport', () => {
  it('agrega consumo ignorando Lava-Rápido e equipamentos', () => {
    const state = seedState()
    const out = applyFuelReport(csv, state)
    expect(out.newState).not.toBeNull()
    const fuel = out.newState!.fuel['2026-07']
    expect(fuel).toBeDefined()

    expect(out.summary!.validRows).toBe(1)
    expect(out.summary!.ignoredRows).toBe(2)
    expect(out.summary!.vehiclesDetected).toBe(1)

    const s = fuel.summary
    expect(s.abastecimentos).toBe(1)
    expect(s.litros).toBe(10)
    expect(s.custo).toBe(60)
    expect(s.km).toBe(250)
    expect(s.kmPorLitro).toBe(25)

    expect(fuel.vehicles['ABC1234']).toBeDefined()
    expect(fuel.vehicles['ABC1234'].motorista).toBe('MARIA')
    expect(fuel.byDriver['MARIA']).toBeDefined()
    expect(fuel.byDriver['MARIA'].kmPorLitro).toBe(25)
  })

  it('descarta km não plausível (> 30 × litros)', () => {
    const csvWithBadKm = [
      'Placa;Data/Hora Transação;Mercadoria;Qtd Mercadoria;Valor Total com Desconto;KM/Hr Percorrido',
      'ABC1;15/07/2026 10:30:00;GASOLINA;10;60,00;999',
    ].join('\n')
    const state = seedState()
    const out = applyFuelReport(csvWithBadKm, state)
    expect(out.summary!.kmIgnoredRows).toBe(1)
    expect(out.newState!.fuel['2026-07'].summary.km).toBe(0)
  })

  it('falha com CSV sem linhas válidas', () => {
    const state = seedState()
    const out = applyFuelReport('placa;x\n', state)
    expect(out.newState).toBeNull()
    expect(out.message).toContain('CSV')
  })
})
