import { produce } from '@/lib/immutable'
import { ALL_REGION, FUNCAO_DEFAULT, FUNCOES } from '@/lib/constants'
import type { AppState, Colaborador, EntryValue, Params, Region, Technician, Veiculo } from '@/types'
import { periodKey } from '@/utils/date'

export function importedTechs(
  region: Region | null | undefined,
  colaboradores?: AppState['colaboradores'] | undefined,
): Technician[] {
  const techs = (region && region.technicians ? region.technicians : []).filter(
    (t) => t && t.imported === true,
  )
  return colaboradores ? techs.filter((t) => colaboradores[t.funci]) : techs
}

export function importedTechsCadastrados(
  region: Region | null | undefined,
  colaboradores: AppState['colaboradores'] | undefined,
): Technician[] {
  return importedTechs(region, colaboradores)
}

export function getVeiculo(state: AppState, placa: string | null | undefined): Veiculo | null {
  if (!placa) return null
  return state.veiculos[String(placa).trim().toUpperCase()] || null
}

export function buildAllRegion(state: AppState): Region {
  const technicians: Technician[] = []
  const seen: Record<string, boolean> = {}
  const entries: Region['entries'] = {}
  const sla: NonNullable<Region['sla']> = {}
  const report: NonNullable<Region['report']> = {}

  Object.keys(state.regions).forEach((rid) => {
    const r = state.regions[rid]
    ;(r.technicians || []).forEach((t) => {
      if (t && t.imported && !seen[t.funci]) {
        seen[t.funci] = true
        technicians.push(t)
      }
    })
    Object.keys(r.entries || {}).forEach((pk) => {
      if (!entries[pk]) entries[pk] = {}
      Object.keys(r.entries[pk] || {}).forEach((funci) => {
        if (!entries[pk][funci]) entries[pk][funci] = {}
        Object.assign(entries[pk][funci], r.entries[pk][funci] || {})
      })
    })
    Object.keys(r.sla || {}).forEach((pk) => {
      if (!sla[pk]) {
        sla[pk] = { activitySla: {}, slaCounts: { evaluated: 0, onTime: 0 }, totalOS: 0, techSla: {} }
      }
      const s = r.sla![pk]
      const d = sla[pk]
      d.totalOS += s.totalOS || 0
      d.slaCounts.evaluated += s.slaCounts?.evaluated || 0
      d.slaCounts.onTime += s.slaCounts?.onTime || 0
      Object.keys(s.activitySla || {}).forEach((atv) => {
        const a = s.activitySla[atv]
        const da = (d.activitySla[atv] = d.activitySla[atv] || { total: 0, evaluated: 0, onTime: 0 })
        da.total += a.total || 0
        da.evaluated += a.evaluated || 0
        da.onTime += a.onTime || 0
      })
      Object.keys(s.techSla || {}).forEach((funci) => {
        const t = s.techSla[funci]
        const dt = (d.techSla[funci] = d.techSla[funci] || { totalOS: 0, evaluated: 0, onTime: 0 })
        dt.totalOS += t.totalOS || 0
        dt.evaluated += t.evaluated || 0
        dt.onTime += t.onTime || 0
      })
    })
    Object.keys(r.report || {}).forEach((pk) => {
      if (!report[pk]) report[pk] = {}
      const repPk = r.report?.[pk] || {}
      Object.keys(repPk).forEach((funci) => {
        if (!report[pk][funci]) report[pk][funci] = []
        report[pk][funci] = report[pk][funci].concat(repPk[funci] || [])
      })
    })
  })

  return { name: 'Todas as regiões', technicians, entries, sla, report, locked: true }
}

export function currentRegion(state: AppState): Region {
  if (state.currentRegion === ALL_REGION) return buildAllRegion(state)
  return state.regions[state.currentRegion]
}

export function periodKeyOf(state: AppState): string {
  return periodKey(state.currentYear, state.currentMonth)
}

export function entryOf(region: Region, pk: string, funci: string, iso: string): EntryValue | null {
  return region.entries?.[pk]?.[funci]?.[iso] ?? null
}

export function getEntry(state: AppState, funci: string, iso: string): EntryValue | null {
  return entryOf(currentRegion(state), periodKeyOf(state), funci, iso)
}

export function getEntryScore(state: AppState, funci: string, iso: string): number | null {
  const val = getEntry(state, funci, iso)
  return typeof val === 'number' ? val : null
}

export function sobreavisoDays(state: AppState, funci: string): string[] {
  if (!state.sobreaviso) return []
  return Array.isArray(state.sobreaviso[funci]) ? state.sobreaviso[funci] : []
}

export function sobreavisoIsOn(state: AppState, funci: string, iso: string): boolean {
  return sobreavisoDays(state, funci).includes(iso)
}

export function toggleSobreaviso(state: AppState, funci: string, iso: string): AppState {
  return produce(state, (draft) => {
    if (!draft.sobreaviso) draft.sobreaviso = {}
    const list = Array.isArray(draft.sobreaviso[funci]) ? [...draft.sobreaviso[funci]] : []
    const idx = list.indexOf(iso)
    if (idx === -1) list.push(iso)
    else list.splice(idx, 1)
    draft.sobreaviso[funci] = list
  })
}

export function setBhPeriod(state: AppState, period: string | null): AppState {
  return produce(state, (draft) => {
    if (!draft.bh) draft.bh = { base: [], folgas: {}, period: null }
    draft.bh.period = period
  })
}

export function serializeState(state: AppState): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(state)) as AppState
  const asRecord = next as unknown as Record<string, unknown>
  delete asRecord.currentYear
  delete asRecord.currentMonth
  return asRecord
}

export function mutateEntry(state: AppState, funci: string, iso: string, value: EntryValue | null): AppState {
  if (state.currentRegion === ALL_REGION) return state
  return produce(state, (draft) => {
    const pk = periodKeyOf(draft)
    const region = draft.regions[draft.currentRegion]
    if (!region) return
    if (!region.entries[pk]) region.entries[pk] = {}
    if (!region.entries[pk][funci]) region.entries[pk][funci] = {}
    if (value === null) {
      delete region.entries[pk][funci][iso]
    } else {
      region.entries[pk][funci][iso] = value
    }
  })
}

export function mutateEntryInRegion(
  state: AppState,
  regionId: string,
  funci: string,
  period: string,
  iso: string,
  value: EntryValue | null,
): AppState {
  return produce(state, (draft) => {
    const region = draft.regions[regionId]
    if (!region) return
    if (!region.entries[period]) region.entries[period] = {}
    if (!region.entries[period][funci]) region.entries[period][funci] = {}
    if (value === null) {
      delete region.entries[period][funci][iso]
    } else {
      region.entries[period][funci][iso] = value
    }
  })
}

export function setVeiculo(
  state: AppState,
  placa: string,
  motorista: string | null,
  regiao: string | null,
  orcamento: number | string | null | undefined,
): AppState {
  return produce(state, (draft) => {
    const p = String(placa).trim().toUpperCase()
    if (!p) return
    const o =
      orcamento === undefined || orcamento === null || orcamento === '' || isNaN(Number(orcamento))
        ? null
        : Number(orcamento)
    draft.veiculos[p] = { placa: p, motorista, regiao, orcamento: o }
  })
}

export function removeVeiculo(state: AppState, placa: string): AppState {
  return produce(state, (draft) => {
    const p = String(placa).trim().toUpperCase()
    if (draft.veiculos[p]) delete draft.veiculos[p]
  })
}

export function setColaborador(
  state: AppState,
  funci: string,
  nome: string,
  regiao: string,
  funcao: string,
  telefone: string | null,
): AppState {
  return produce(state, (draft) => {
    const f = String(funci || '').trim()
    if (!f || !regiao || !draft.regions[regiao]) return
    const n = String(nome || '').trim().toUpperCase()
    if (!n) return
    const fn = FUNCOES.includes(funcao as (typeof FUNCOES)[number]) ? funcao : FUNCAO_DEFAULT
    const tlf = telefone ? String(telefone).replace(/\D/g, '') : null
    draft.colaboradores[f] = { funci: f, nome: n, regiao, funcao: fn, telefone: tlf }
    let imported = false
    Object.keys(draft.regions).forEach((rid) => {
      const list = draft.regions[rid].technicians
      const idx = list.findIndex((t) => t.funci === f)
      if (idx === -1) return
      if (rid === regiao) {
        list[idx].nome = n
      } else {
        if (list[idx].imported === true) imported = true
        list.splice(idx, 1)
      }
    })
    const dest = draft.regions[regiao].technicians
    if (!dest.some((t) => t.funci === f)) {
      const novo: Technician = { funci: f, nome: n }
      if (imported) novo.imported = true
      dest.push(novo)
    }
  })
}

export function removeColaborador(state: AppState, funci: string): AppState {
  return produce(state, (draft) => {
    const f = String(funci || '').trim()
    if (!f || !draft.colaboradores[f]) return
    delete draft.colaboradores[f]
    Object.keys(draft.regions).forEach((rid) => {
      draft.regions[rid].technicians = draft.regions[rid].technicians.filter((t) => t.funci !== f)
    })
    Object.keys(draft.veiculos).forEach((placa) => {
      if (draft.veiculos[placa].motorista === f) delete draft.veiculos[placa]
    })
    if (draft.sobreaviso) delete draft.sobreaviso[f]
  })
}

export function createRegion(state: AppState, name: string): AppState {
  return produce(state, (draft) => {
    const id = `r_${Date.now()}`
    draft.regions[id] = {
      name: name.trim().toUpperCase(),
      technicians: [],
      entries: {},
      locked: false,
    }
    draft.currentRegion = id
  })
}

export function removeRegion(state: AppState, regionId: string): AppState {
  return produce(state, (draft) => {
    if (Object.keys(draft.regions).length <= 1) return
    Object.keys(draft.veiculos).forEach((placa) => {
      if (draft.veiculos[placa].regiao === regionId) delete draft.veiculos[placa]
    })
    Object.keys(draft.colaboradores).forEach((f) => {
      if (draft.colaboradores[f].regiao === regionId) delete draft.colaboradores[f]
    })
    delete draft.regions[regionId]
    draft.currentRegion = Object.keys(draft.regions)[0]
  })
}

export function mutateParams(state: AppState, params: Params): AppState {
  return produce(state, (draft) => {
    draft.params = JSON.parse(JSON.stringify(params)) as Params
  })
}

export function unlockRegion(state: AppState): AppState {
  if (state.currentRegion === ALL_REGION) return state
  return produce(state, (draft) => {
    const region = draft.regions[draft.currentRegion]
    if (region) region.locked = false
  })
}

export function replaceMeta(state: AppState, meta: AppState['_meta']): AppState {
  return produce(state, (draft) => {
    draft._meta = meta
  })
}

export function ensureColaborador(
  state: AppState,
  funci: string,
  nome: string,
  regiao: string,
): AppState {
  return produce(state, (draft) => {
    const f = String(funci || '').trim()
    if (!f || !regiao) return
    const colab: Colaborador = {
      funci: f,
      nome: nome || f,
      regiao,
      funcao: FUNCAO_DEFAULT,
      telefone: null,
    }
    if (!draft.colaboradores[f]) draft.colaboradores[f] = colab
  })
}
