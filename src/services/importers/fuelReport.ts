import { produce } from '@/lib/immutable'
import { FUEL_KM_MAX_FACTOR } from '@/lib/constants'
import type { AppState, FuelByDriver, FuelDaily, FuelPeriod, FuelSummary, FuelVehicle } from '@/types'
import type { FuelImportSummary, ImportOutcome } from '@/types/imports'
import { fuelNormKey, parseNumber } from '@/utils/numbers'
import { fmtNum } from '@/utils/format'
import { isoDate, pad, parseFleetDate } from '@/utils/date'
import { parseFleetCsv } from '@/utils/csv'
import { MONTHS } from '@/utils/date'

function newFuelPeriod(): FuelPeriod {
  return {
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
    vehicles: {},
    daily: {},
    byDriver: {},
  }
}

export function applyFuelReport(text: string, state: AppState): ImportOutcome<FuelImportSummary> {
  const parsed = parseFleetCsv(text)
  if (!parsed) {
    return {
      newState: null,
      summary: null,
      message:
        'Não foi possível ler o arquivo CSV. Verifique se é o relatório de abastecimento exportado do sistema de frota.',
    }
  }

  const need = [
    'placa',
    'perfildeuso',
    'nomeveiculo',
    'modeloveiculo',
    'tipodefrota',
    'nomemotorista',
    'matriculamotorista',
    'datahoratransacao',
    'mercadoria',
    'qtdmercadoria',
    'valorunitmercadoria',
    'valortotalcomdesconto',
    'valortotaloriginal',
    'kmhrpercorrido',
    'mediaefetivakmhr',
    'custokmhrpercorrido',
    'descricaodesvionatransacao',
  ]
  const idx: Record<string, number> = {}
  need.forEach((key) => {
    idx[key] = parsed.cols.indexOf(key)
  })

  const fuel: Record<string, FuelPeriod> = {}
  const placaSet = new Set<string>()
  let validRows = 0
  let ignoredRows = 0
  let kmIgnoredRows = 0

  parsed.rows.forEach((cells) => {
    const get = (key: string, dflt = ''): string => {
      const i = idx[key]
      if (i === -1) return dflt
      const c = cells[i]
      return c === undefined || c === null ? dflt : String(c).trim()
    }

    const mercadoria = get('mercadoria')
    const perfil = get('perfildeuso')
    if (fuelNormKey(mercadoria) === 'lavarapido' || fuelNormKey(perfil) === 'equipamentos') {
      ignoredRows++
      return
    }

    const placa = get('placa').toUpperCase()
    const qtd = parseNumber(get('qtdmercadoria'))
    const dataHora = parseFleetDate(get('datahoratransacao'))
    if (!placa || qtd === null || qtd <= 0 || !dataHora) {
      ignoredRows++
      return
    }
    validRows++

    const period = `${dataHora.getFullYear()}-${pad(dataHora.getMonth() + 1)}`
    const iso = isoDate(dataHora.getFullYear(), dataHora.getMonth(), dataHora.getDate())

    const custo = parseNumber(get('valortotalcomdesconto')) ?? parseNumber(get('valortotaloriginal')) ?? 0
    const km = parseNumber(get('kmhrpercorrido'))
    const kmOk = km !== null && km > 0 && km <= FUEL_KM_MAX_FACTOR * qtd
    const desvioDesc = get('descricaodesvionatransacao')
    const desvioNorm = fuelNormKey(desvioDesc)

    if (!fuel[period]) fuel[period] = newFuelPeriod()
    const per = fuel[period]

    per.summary.abastecimentos++
    per.summary.litros += qtd
    per.summary.custo += custo
    if (kmOk) per.summary.km += km
    else if (km !== null && km > 0) kmIgnoredRows++
    if (desvioNorm.includes('acima')) per.summary.desvioAcima++
    if (desvioNorm.includes('abaixo')) per.summary.desvioAbaixo++

    let v = per.vehicles[placa]
    if (!v) {
      v = {
        placa,
        modelo: get('modeloveiculo') || get('nomeveiculo'),
        perfil,
        tipoFrota: get('tipodefrota'),
        motorista: get('nomemotorista'),
        matricula: get('matriculamotorista'),
        abastecimentos: 0,
        litros: 0,
        custo: 0,
        km: 0,
        kmPorLitro: null,
        custoKm: null,
        desvioAcima: 0,
        desvioAbaixo: 0,
        mercadorias: {},
      }
      per.vehicles[placa] = v
      placaSet.add(placa)
    }
    v.abastecimentos++
    v.litros += qtd
    v.custo += custo
    if (kmOk) v.km += km
    if (desvioNorm.includes('acima')) v.desvioAcima++
    if (desvioNorm.includes('abaixo')) v.desvioAbaixo++

    const mercKey = fuelNormKey(mercadoria)
    if (!v.mercadorias[mercKey]) {
      v.mercadorias[mercKey] = { label: mercadoria, litros: 0, custo: 0, abastecimentos: 0 }
    }
    const m = v.mercadorias[mercKey]
    m.abastecimentos++
    m.litros += qtd
    m.custo += custo

    if (!per.daily[iso]) per.daily[iso] = { abastecimentos: 0, litros: 0, custo: 0, km: 0 }
    const dy: FuelDaily = per.daily[iso]
    dy.abastecimentos++
    dy.litros += qtd
    dy.custo += custo
    if (kmOk) dy.km += km

    const motorista = get('nomemotorista')
    if (motorista) {
      const key = motorista.toUpperCase().trim()
      if (!per.byDriver[key]) {
        per.byDriver[key] = { nome: motorista, abastecimentos: 0, litros: 0, custo: 0, km: 0, kmPorLitro: null }
      }
      const bd: FuelByDriver = per.byDriver[key]
      bd.abastecimentos++
      bd.litros += qtd
      bd.custo += custo
      if (kmOk) bd.km += km
    }
  })

  if (validRows === 0) {
    return {
      newState: null,
      summary: null,
      message:
        'Nenhuma linha de abastecimento válida encontrada. Confira as colunas do CSV (Placa, Mercadoria, Qtd Mercadoria, Data/ Hora transação).',
    }
  }

  Object.keys(fuel).forEach((period) => {
    const per = fuel[period]
    const s: FuelSummary = per.summary
    s.precoMedio = s.litros > 0 ? s.custo / s.litros : null
    s.custoKm = s.km > 0 ? s.custo / s.km : null
    s.kmPorLitro = s.litros > 0 ? s.km / s.litros : null
    Object.keys(per.vehicles).forEach((placa) => {
      const ve: FuelVehicle = per.vehicles[placa]
      ve.kmPorLitro = ve.litros > 0 ? ve.km / ve.litros : null
      ve.custoKm = ve.km > 0 ? ve.custo / ve.km : null
    })
    Object.keys(per.byDriver).forEach((k) => {
      const bd = per.byDriver[k]
      bd.kmPorLitro = bd.litros > 0 ? bd.km / bd.litros : null
    })
  })

  const newState = produce(state, (draft) => {
    Object.keys(fuel).forEach((period) => {
      draft.fuel[period] = fuel[period]
    })
  })

  const periods = Object.keys(fuel).sort()
  const sum = fuel[periods[periods.length - 1]].summary
  const periodLabel = periods
    .map((p) => {
      const [y, m] = p.split('-').map(Number)
      return MONTHS[m - 1] + '/' + y
    })
    .join(', ')

  const message =
    `Relatório de combustível importado:\n` +
    `• ${validRows} abastecimento(s) válido(s), ${ignoredRows} linha(s) ignorada(s) (Lava-Rápido, equipamentos ou sem dados)\n` +
    `• ${kmIgnoredRows} abastecimento(s) com km descartado (odômetro com erro, > ${FUEL_KM_MAX_FACTOR} km/L)\n` +
    `• ${placaSet.size} veículo(s) detectado(s)\n` +
    `• Período(s): ${periodLabel}\n` +
    `• Litros: ${fmtNum(sum.litros)} · Custo: R$ ${fmtNum(sum.custo)} · KM/L: ${
      sum.kmPorLitro !== null ? fmtNum(sum.kmPorLitro) : '–'
    }\n\n` +
    `Dica: vincule as placas aos técnicos e regiões na aba Parâmetros → Cadastro de Veículos.`

  return {
    newState,
    summary: {
      validRows,
      ignoredRows,
      kmIgnoredRows,
      vehiclesDetected: placaSet.size,
      periodLabel,
      litros: sum.litros,
      custo: sum.custo,
      kmPorLitro: sum.kmPorLitro,
      message,
    },
  }
}
