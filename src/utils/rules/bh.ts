import { FUNCAO_DEFAULT } from '@/lib/constants'
import { sobreavisoIsOn } from '@/services/state'
import { bhFmtMin, bhFmtDate } from '@/utils/format'
import { DOW, bhPeriodLabel } from '@/utils/date'
import { bhCompensated, bhScheduledDays } from '@/services/importers/bhReport'
import type { AlertItem, AppState, BhBaseEntry, BhState } from '@/types'

export function filterBhBase(  base: BhBaseEntry[],
  period: string,
  state: AppState,
  allMode: boolean,
): BhBaseEntry[] {
  return base
    .filter((b) => {
      if (!b.limiteComp || b.limiteComp.slice(0, 7) !== period) return false
      const colab = state.colaboradores ? state.colaboradores[b.funci] : undefined
      return allMode ? Boolean(colab) : colab?.regiao === state.currentRegion
    })
    .sort((a, b) => (b.horas || 0) - (a.horas || 0))
}

export interface BhKpis {
  count: number
  totHoras: number
  totVlr: number
  totDias: number
  totComp: number
  compensado: boolean
}

export function computeBhKpis(base: BhBaseEntry[], bh: BhState): BhKpis {
  const totHoras = base.reduce((s, b) => s + (b.horas || 0), 0)
  const totVlr = base.reduce((s, b) => s + (b.valor || 0), 0)
  const totDias = base.reduce((s, b) => s + (b.dias || 0), 0)
  const totComp = base.reduce((s, b) => s + bhCompensated(b, bh).min, 0)
  return {
    count: base.length,
    totHoras,
    totVlr,
    totDias,
    totComp,
    compensado: totHoras > 0 && totComp >= totHoras,
  }
}

export function computeBhAlerts(
  base: BhBaseEntry[],
  bh: BhState,
  state: AppState,
  period: string,
  hoje: Date,
): AlertItem[] {
  const alerts: AlertItem[] = []
  const limite = new Date(+period.slice(0, 4), +period.slice(5, 7) - 1, 14)
  const daysLeft = Math.round((limite.getTime() - hoje.getTime()) / 86400000)
  const pendentes = base.filter((b) => (b.dias || 0) > 0 && bhCompensated(b, bh).count < (b.dias || 0))

  if (pendentes.length && daysLeft >= 0 && daysLeft <= 5) {
    alerts.push({
      type: 'critical',
      icon: 'warning',
      title: 'Período de BH fecha em breve',
      desc: `${bhFmtDate(period + '-14')} — ${pendentes.length} técnico(s) ainda com folgas a programar`,
    })
  }

  const porDia: Record<string, string[]> = {}
  base.forEach((b) => {
    const colab = state.colaboradores ? state.colaboradores[b.funci] : null
    if (colab && colab.funcao === FUNCAO_DEFAULT) {
      bhScheduledDays(b, bh).forEach((iso) => {
        if (!porDia[iso]) porDia[iso] = []
        porDia[iso].push(b.nome)
      })
    }
  })
  Object.keys(porDia)
    .sort()
    .forEach((iso) => {
      if (porDia[iso].length >= 2) {
        alerts.push({
          type: 'critical',
          icon: 'error',
          title: 'Conflito de escala',
          desc: `${bhFmtDate(iso)}: ${porDia[iso].join(', ')}`,
        })
      }
    })

  pendentes.forEach((b) => {
    const comp = bhCompensated(b, bh)
    alerts.push({
      type: 'warning',
      icon: 'event_busy',
      title: 'Folgas a programar',
      desc: `${b.nome}: ${comp.count}/${b.dias} folga(s) programadas`,
    })
  })

  base.forEach((b) => {
    bhScheduledDays(b, bh).forEach((iso) => {
      if (sobreavisoIsOn(state, b.funci, iso)) {
        alerts.push({
          type: 'warning',
          icon: 'phone_in_talk',
          title: 'Folga em dia de sobreaviso',
          desc: `${b.nome}: folga em ${bhFmtDate(iso)} também está de sobreaviso`,
        })
      }
    })
  })

  if (alerts.length === 0) {
    alerts.push({
      type: 'empty',
      icon: 'check_circle',
      title: 'Tudo certo!',
      desc: 'Nenhum alerta no momento',
    })
  }

  return alerts
}

export function bhWaPhone(state: AppState, funci: string): string | null {
  const colab = state.colaboradores ? state.colaboradores[funci] : null
  let d = colab && colab.telefone ? String(colab.telefone).replace(/\D/g, '') : ''
  if (!d) return null
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (!/^\d{10,15}$/.test(d)) return null
  return d
}

export function bhWaMessage(b: BhBaseEntry, bh: BhState): string {
  const dias = bhScheduledDays(b, bh)
  const linhas = dias
    .map((iso) => {
      const d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
      const dowLabel = DOW[d.getDay()].charAt(0).toUpperCase() + DOW[d.getDay()].slice(1)
      const hrs = d.getDay() === 6 ? '4h' : '8h'
      return `• ${dowLabel} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} — ${hrs}`
    })
    .join('\n')
  const comp = bhCompensated(b, bh)
  const periodo = b.limiteComp ? bhPeriodLabel(b.limiteComp.slice(0, 7)) : ''
  return (
    `Olá, ${b.nome}!\n\n` +
    `Sua programação de folgas (Banco de Horas) do período ${periodo}:\n\n` +
    linhas +
    '\n\n' +
    `Total: ${comp.count} folga(s) · ${bhFmtMin(comp.min)} compensadas.\n\n` +
    `_Mensagem enviada via Field Performance_`
  )
}

export function bhFolgaWarnings(
  state: AppState,
  b: BhBaseEntry,
  funci: string,
  iso: string,
): string[] {
  const warnings: string[] = []
  const colab = state.colaboradores ? state.colaboradores[funci] : null
  if (colab && colab.funcao === FUNCAO_DEFAULT) {
    const nomes = Object.keys(state.bh?.folgas || {})
      .filter(
        (f) =>
          f !== funci &&
          state.bh?.folgas?.[f]?.includes(iso) &&
          state.colaboradores?.[f]?.funcao === FUNCAO_DEFAULT,
      )
      .map((f) => {
        const outro = (state.bh?.base || []).find((x) => x.funci === f)
        return outro ? outro.nome : state.colaboradores?.[f]?.nome || f
      })
    if (nomes.length) {
      warnings.push(
        `⚠️ Atenção: ${nomes.join(', ')} já tem folga programada para ${bhFmtDate(iso)}.\nProgramar a folga de ${b.nome} no mesmo dia pode gerar conflito de escala.`,
      )
    }
  }
  if (sobreavisoIsOn(state, funci, iso)) {
    warnings.push(
      `⚠️ ${b.nome} está de sobreaviso em ${bhFmtDate(iso)}.\nProgramar folga neste dia pode conflitar com a escala de sobreaviso.`,
    )
  }
  return warnings
}
