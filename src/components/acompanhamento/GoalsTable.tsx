import { importedTechs, periodKeyOf } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { minScoreForDow } from '@/utils/rules/quartis'
import { DOW, isoWeekOf, pad } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import type { Region, Week } from '@/types'

interface GoalsTableProps {
  region: Region
  weeks: Week[]
}

export function GoalsTable({ region, weeks }: GoalsTableProps) {
  const data = useStateStore((s) => s.data)
  if (!data) return null

  const pk = periodKeyOf(data)
  const techCount = importedTechs(region).length
  const allDays = weeks.flat()
  const dayMeta = data.params.dayMeta
  const alertBelowPct = data.params.alertTeam.belowPct

  const perDay = allDays.map((d) => {
    let available = 0
    let achieved = 0
    importedTechs(region).forEach((tech) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw === 'string') return
      available++
      if (typeof raw === 'number') achieved += raw
    })
    const expected = available * minScoreForDow(d.dow, dayMeta)
    const pct = expected > 0 ? (achieved / expected) * 100 : null
    const disp = techCount > 0 ? (available / techCount) * 100 : null
    return { d, available, expected, achieved, pct, disp }
  })

  const dayCellClass = (d: (typeof perDay)[number]) =>
    d.d.dow === 0 || d.d.dow === 6 ? 'day-cell weekend' : 'day-cell'

  const simpleCells = (render: (p: (typeof perDay)[number]) => string) =>
    perDay.map((p) => (
      <td key={p.d.iso} className={dayCellClass(p)}>
        <span className="goal-value">{render(p)}</span>
      </td>
    ))

  return (
    <div className="mt-2">
      <h2 className="acomp-section-title">Meta diária da equipe</h2>
      <p className="acomp-hint">
        Meta esperada = técnicos disponíveis × pontos configurados para o dia da semana (ver aba
        Parâmetros). Técnicos com justificativa no dia não contam como disponíveis. Disponibilidade
        técnica = técnicos disponíveis ÷ total do time, por dia.
      </p>
      <div className="matrix-wrap mt-2">
        <table>
          <thead>
            <tr className="week-row">
              <th className="col-nome" rowSpan={2} />
              {weeks.map((w) => {
                const first = w[0]
                const last = w[w.length - 1]
                const iso = isoWeekOf(new Date(data.currentYear, data.currentMonth, first.day))
                return (
                  <th key={first.iso} className="week-head" colSpan={w.length}>
                    Semana {iso} · {first.day}–{last.day}
                  </th>
                )
              })}
            </tr>
            <tr className="day-row">
              {weeks.map((w) =>
                w.map((d) => {
                  const weekend = d.dow === 0 || d.dow === 6
                  return (
                    <th key={d.iso} className={weekend ? 'day-head weekend' : 'day-head'}>
                      <span className="dow">{DOW[d.dow]}</span>
                      <span className="dnum">{pad(d.day)}</span>
                    </th>
                  )
                }),
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="col-nome">Técnicos disponíveis</td>
              {simpleCells((p) => String(p.available))}
            </tr>
            <tr>
              <td className="col-nome">Disponibilidade técnica</td>
              {simpleCells((p) => (p.disp === null ? '–' : `${Math.round(p.disp)}%`))}
            </tr>
            <tr>
              <td className="col-nome">Meta esperada (pontos/dia)</td>
              {simpleCells((p) => fmtNum(p.expected) || '0')}
            </tr>
            <tr>
              <td className="col-nome">Pontuação realizada</td>
              {simpleCells((p) => fmtNum(p.achieved) || '0')}
            </tr>
            <tr>
              <td className="col-nome">% Atingimento da meta</td>
              {perDay.map((p) => {
                if (p.pct === null) {
                  return (
                    <td key={p.d.iso} className={dayCellClass(p)}>
                      <span className="goal-value">–</span>
                    </td>
                  )
                }
                const pctCls =
                  p.pct >= 100 ? 'pct-good' : p.pct >= alertBelowPct ? 'pct-warn' : 'pct-bad'
                return (
                  <td key={p.d.iso} className={dayCellClass(p)}>
                    <span className={`goal-value ${pctCls}`}>{Math.round(p.pct)}%</span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
