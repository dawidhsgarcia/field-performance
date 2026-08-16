import type {
  AlertItem,
  DashboardKpis,
  MomStats,
  Params,
  Region,
  TeamGoalsSummary,
  TeamOverview,
  Week,
} from '@/types'
import { buildWeeks, isoToDate, osDurationMin, pad } from '@/utils/date'
import { fmtHrs, fmtNum } from '@/utils/format'
import { importedTechs } from '@/services/state'
import { minScoreForDow, quartilOf } from './quartis'
import { computeRanking } from './ranking'
import { computeTeamGoalsSummary, computeTeamOverview } from './goals'
import { computeProjection } from './projection'

function flatten(weeks: Week[]): Week[number][] {
  const all: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => all.push(d)))
  return all
}

export function computeDashboardKpis(
  region: Region,
  weeks: Week[],
  params: Params,
  today: Date,
): DashboardKpis {
  const rankingRows = computeRanking(region, weeks, params, today)
  const goals = computeTeamGoalsSummary(region, weeks, params, today)
  const overview = computeTeamOverview(region, weeks, today)
  const pk = weeks[0][0].iso.slice(0, 7)

  const totalSum = rankingRows.reduce((s, r) => s + (r.sum || 0), 0)
  const totalDays = rankingRows.reduce((s, r) => s + (r.days || 0), 0)
  const teamAvg = totalDays > 0 ? totalSum / totalDays : null
  const totalPts = goals.totalAchieved
  const quartilCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  rankingRows.forEach((r) => {
    if (r.quartil) quartilCounts[r.quartil]++
  })

  const slaPeriod = region.sla?.[pk]
  const totalOS = slaPeriod?.totalOS || 0
  const slaCounts = slaPeriod?.slaCounts || { evaluated: 0, onTime: 0 }
  const slaPct = slaCounts.evaluated > 0 ? Math.round((slaCounts.onTime / slaCounts.evaluated) * 100) : null

  return {
    slaPct,
    slaOn: slaCounts.onTime,
    slaEval: slaCounts.evaluated,
    totalOS,
    teamAvg,
    totalPts,
    totalJustified: overview.totalJustified,
    unavailPct: overview.unavailPct,
    quartilCounts,
  }
}

export function computeAlerts(region: Region, weeks: Week[], params: Params, today: Date): AlertItem[] {
  const allDays = flatten(weeks)
  const pk = weeks[0][0].iso.slice(0, 7)
  const businessDaysPast = allDays.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)
  const alerts: AlertItem[] = []

  const atb = params.alertTech
  importedTechs(region).forEach((tech) => {
    let consecutiveLow = 0
    for (let i = businessDaysPast.length - 1; i >= 0; i--) {
      const raw = region.entries?.[pk]?.[tech.funci]?.[businessDaysPast[i].iso]
      if (typeof raw === 'number' && raw < atb.below) {
        consecutiveLow++
      } else {
        break
      }
    }
    if (consecutiveLow >= atb.streak) {
      alerts.push({
        type: 'critical',
        icon: 'error',
        title: 'Técnico abaixo da meta',
        desc: `${tech.nome}: ${fmtNum(consecutiveLow)} dia(s) consecutivo(s) abaixo de ${fmtNum(atb.below)} pts`,
      })
    }
  })

  const atm = params.alertTeam
  let teamLowStreak = 0
  businessDaysPast.forEach((d) => {
    let dayAvail = 0
    let dayAch = 0
    let dayHasEntry = false
    importedTechs(region).forEach((tech) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso] ?? null
      if (raw !== null) dayHasEntry = true
      if (typeof raw !== 'string') {
        dayAvail++
        if (typeof raw === 'number') dayAch += raw
      }
    })
    if (!dayHasEntry) return
    const dayPct = dayAvail > 0 ? (dayAch / (dayAvail * minScoreForDow(d.dow, params.dayMeta))) * 100 : null
    if (dayPct !== null && dayPct < atm.belowPct) {
      teamLowStreak++
    } else {
      teamLowStreak = 0
    }
  })
  if (teamLowStreak >= atm.streak) {
    alerts.push({
      type: 'warning',
      icon: 'warning',
      title: 'Equipe abaixo da meta',
      desc: `${teamLowStreak} dia(s) consecutivo(s) com < ${atm.belowPct}% da meta`,
    })
  }

  const apj = params.alertProjection
  const goals: TeamGoalsSummary = computeTeamGoalsSummary(region, weeks, params, today)
  const overview: TeamOverview = computeTeamOverview(region, weeks, today)
  const { rows: projRows, remaining } = computeProjection(region, weeks, params, today)
  if (goals.totalExpected > 0 && remaining > 0) {
    const teamProjectedSum = projRows.reduce((s, r) => s + (r.projectedSum || 0), 0)
    const projectedPct = (teamProjectedSum / goals.totalExpected) * 100
    if (projectedPct < apj.belowPct) {
      alerts.push({
        type: 'warning',
        icon: 'trending_down',
        title: 'Projeção abaixo da meta',
        desc: `Se a tendência continuar, equipe fecha com ${Math.round(projectedPct)}% da meta`,
      })
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'empty',
      icon: 'check_circle',
      title: 'Tudo certo!',
      desc: 'Nenhum alerta no momento',
    })
  }

  void overview
  return alerts
}

export function slaPctOf(sla: { evaluated: number; onTime: number } | null | undefined): number | null {
  if (!sla || sla.evaluated <= 0) return null
  return Math.round((sla.onTime / sla.evaluated) * 100)
}

export interface ActivitySlaRow {
  atividade: string
  total: number
  evaluated: number
  onTime: number
  pct: number | null
  cls: 'ok' | 'warn' | 'urgent' | ''
}

export function activitySlaRows(entries: Array<[string, { total: number; evaluated: number; onTime: number }]>): ActivitySlaRow[] {
  const filtered = (entries || [])
    .filter(([, v]) => v.evaluated > 0)
    .map(([k, v]) => [k, { ...v, total: v.evaluated }] as [string, { total: number; evaluated: number; onTime: number }])
  filtered.sort((a, b) => b[1].total - a[1].total)
  return filtered.map(([atv, d]) => {
    const pct = d.evaluated > 0 ? Math.round((d.onTime / d.evaluated) * 100) : null
    const cls = pct !== null ? (pct >= 90 ? 'ok' : pct >= 70 ? 'warn' : 'urgent') : ''
    return { atividade: atv, total: d.total, evaluated: d.evaluated, onTime: d.onTime, pct, cls }
  })
}

export function activitySlaSummary(rows: ActivitySlaRow[]): {
  count: number
  onTime: number
  evaluated: number
  pct: number | null
} {
  const evaluated = rows.reduce((s, r) => s + r.evaluated, 0)
  const onTime = rows.reduce((s, r) => s + r.onTime, 0)
  return {
    count: rows.length,
    onTime,
    evaluated,
    pct: evaluated > 0 ? Math.round((onTime / evaluated) * 100) : null,
  }
}

export function techActivitySlaRows(
  region: Region,
  funci: string,
  pk: string,
): ActivitySlaRow[] {
  const rows = region.report?.[pk]?.[funci] || []
  const acc: Record<string, { total: number; evaluated: number; onTime: number }> = {}
  rows.forEach((r) => {
    const atv = (r.atividade || '').trim()
    if (!atv || atv.toUpperCase().includes('APOIO')) return
    if (!acc[atv]) acc[atv] = { total: 0, evaluated: 0, onTime: 0 }
    acc[atv].total++
    if (r.avaliada) acc[atv].evaluated++
    if (r.noPrazo) acc[atv].onTime++
  })
  return activitySlaRows(Object.entries(acc))
}

export function techMonthStats(
  region: Region,
  funci: string,
  year: number,
  month: number,
  params: Params,
): MomStats {
  const pk = `${year}-${pad(month + 1)}`
  const weeks = buildWeeks(year, month)
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const bizDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)
  let sum = 0
  let days = 0
  bizDays.forEach((d) => {
    const raw = region.entries?.[pk]?.[funci]?.[d.iso]
    if (typeof raw === 'string') return
    if (typeof raw === 'number') sum += raw
    days++
  })
  const avg = days > 0 ? sum / days : null
  const sla = region.sla?.[pk]?.techSla?.[funci] || null
  const slaPct = sla && sla.evaluated > 0 ? Math.round((sla.onTime / sla.evaluated) * 100) : null
  const mttrList: number[] = []
  ;(region.report?.[pk]?.[funci] || []).forEach((x) => {
    if (!x.avaliada) return
    const m = osDurationMin(x)
    if (m != null) mttrList.push(m)
  })
  const mttrMin = mttrList.length ? mttrList.reduce((s, m) => s + m, 0) / mttrList.length : null
  return {
    pk,
    avg,
    sum,
    days,
    quartil: quartilOf(avg, params.quartil),
    slaPct,
    slaEval: sla ? sla.evaluated : 0,
    slaOn: sla ? sla.onTime : 0,
    mttrMin,
  }
}

export interface TechInsight {
  cls: 'ok' | 'warn' | 'urgent' | 'info'
  html: string
}

export function computeTechInsights(
  region: Region,
  funci: string,
  atual: MomStats,
  anterior: MomStats,
  params: Params,
  today: Date,
): TechInsight[] {
  const y = Number(atual.pk.slice(0, 4))
  const m = Number(atual.pk.slice(5, 7)) - 1
  const weeks = buildWeeks(y, m)
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const isBiz = (d: Week[number]) => d.dow !== 0 && d.dow !== 6
  const businessDays = allDays.filter(isBiz)
  const pastBusinessDays = businessDays.filter((d) => isoToDate(d.iso) < today)
  const projRow = computeProjection(region, weeks, params, today).rows.find(
    (r) => r.tech.funci === funci,
  ) || null

  const items: TechInsight[] = []

  let metDays = 0
  let workDays = 0
  pastBusinessDays.forEach((d) => {
    const raw = region.entries?.[atual.pk]?.[funci]?.[d.iso]
    if (typeof raw !== 'number') return
    workDays++
    if (raw >= minScoreForDow(d.dow, params.dayMeta)) metDays++
  })
  if (workDays > 0) {
    const metPct = Math.round((metDays / workDays) * 100)
    items.push({
      cls: metPct >= 70 ? 'ok' : metPct >= 40 ? 'warn' : 'urgent',
      html: `Atingiu a meta em <b>${metDays}</b> de <b>${workDays}</b> dias úteis (<b>${metPct}%</b>)`,
    })
  } else {
    items.push({ cls: 'info', html: 'Sem dias com produção até D-1' })
  }

  if (projRow && projRow.trendAvg !== null && projRow.currentAvg !== null && projRow.currentAvg > 0) {
    const delta = ((projRow.trendAvg - projRow.currentAvg) / projRow.currentAvg) * 100
    const dir = delta > 1 ? 'subindo' : delta < -1 ? 'caindo' : 'estável'
    const dStr = Math.round(Math.abs(delta))
    items.push({
      cls: dir === 'subindo' ? 'ok' : dir === 'caindo' ? 'urgent' : 'info',
      html:
        `Ritmo dos últimos ${params.trendWindow} dias: <b>${fmtNum(projRow.trendAvg)}</b> pts/dia — <b>${dir}</b>` +
        (dir !== 'estável' ? ` (${delta > 0 ? '+' : '−'}${dStr}%)` : '') +
        ` vs média do mês (<b>${fmtNum(projRow.currentAvg)}</b>)`,
    })
  } else {
    items.push({ cls: 'info', html: 'Sem ritmo recente para comparar' })
  }

  if (projRow && projRow.projectedAvg !== null && projRow.projectedSum !== null) {
    items.push({
      cls: 'info',
      html: `Projeção do mês: <b>${fmtNum(projRow.projectedSum)} pts</b> (média <b>${fmtNum(projRow.projectedAvg)} pts/dia</b>)`,
    })
  } else {
    items.push({ cls: 'info', html: 'Sem base para projetar o fechamento do mês' })
  }

  if (atual.mttrMin !== null) {
    let html = `MTTR: <b>${fmtHrs(atual.mttrMin)}</b>${atual.mttrMin > 360 ? ' — acima do ideal (6h)' : ''}`
    if (anterior.mttrMin !== null && anterior.mttrMin > 0) {
      const dm = ((atual.mttrMin - anterior.mttrMin) / anterior.mttrMin) * 100
      if (Math.abs(dm) >= 1) html += ` · ${dm < 0 ? 'melhorou' : 'piorou'} ${Math.round(Math.abs(dm))}% vs mês anterior`
    }
    items.push({ cls: atual.mttrMin > 360 ? 'urgent' : 'ok', html })
  } else {
    items.push({ cls: 'info', html: 'Sem dados de MTTR no mês' })
  }

  if (atual.slaPct !== null) {
    let html = `SLA no prazo: <b>${atual.slaPct}%</b>`
    if (anterior.slaPct !== null) {
      const dp = atual.slaPct - anterior.slaPct
      if (Math.abs(dp) >= 1) html += ` · ${dp > 0 ? 'subiu' : 'caiu'} ${Math.abs(dp)} p.p. vs mês anterior`
    }
    items.push({ cls: atual.slaPct >= 90 ? 'ok' : atual.slaPct >= 70 ? 'warn' : 'urgent', html })
  } else {
    items.push({ cls: 'info', html: 'Sem avaliação de SLA no mês' })
  }

  return items
}
