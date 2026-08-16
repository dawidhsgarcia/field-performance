import { useEffect, useState } from 'react'
import { ALL_REGION } from '@/lib/constants'
import { entryOf, periodKeyOf, sobreavisoIsOn } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { useMatrixFocus } from '@/hooks/useMatrixFocus'
import { DOW, isoWeekOf, pad } from '@/utils/date'
import { DayCell } from './DayCell'
import type { Region, Technician, Week } from '@/types'

interface MatrixTableProps {
  region: Region
  weeks: Week[]
  techs: Technician[]
  currentYear: number
  currentMonth: number
  onOpenSba: (funci: string) => void
  onRemoveTech: (tech: Technician) => void
}

export function MatrixTable({
  region,
  weeks,
  techs,
  currentYear,
  currentMonth,
  onOpenSba,
  onRemoveTech,
}: MatrixTableProps) {
  const data = useStateStore((s) => s.data)
  const can = useAuthStore((s) => s.can)
  const { wrapRef, focusCell } = useMatrixFocus()
  const [focusTarget, setFocusTarget] = useState<{ funci: string; iso: string } | null>(null)

  useEffect(() => {
    if (focusTarget) {
      focusCell(focusTarget.funci, focusTarget.iso)
      setFocusTarget(null)
    }
  }, [focusTarget, focusCell, data])

  if (!data) return null
  const pk = periodKeyOf(data)
  const sbaDisabled = data.currentRegion === ALL_REGION || !can('programarSobreaviso')

  return (
    <div className="matrix-wrap" ref={wrapRef}>
      <table>
        <thead>
          <tr className="week-row">
            <th className="col-nome" rowSpan={2} />
            {weeks.map((w) => {
              const first = w[0]
              const last = w[w.length - 1]
              const iso = isoWeekOf(new Date(currentYear, currentMonth, first.day))
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
          {techs.map((tech) => (
            <tr key={tech.funci}>
              <td className="col-nome">
                <span className="tech-name-row">
                  <span className="tech-name">{tech.nome}</span>
                  <button
                    type="button"
                    className="sba-open"
                    disabled={sbaDisabled}
                    title="Programar sobreaviso"
                    onClick={() => onOpenSba(tech.funci)}
                  >
                    SBA
                  </button>
                </span>
                <span className="tech-funci">{tech.funci}</span>
                <button
                  type="button"
                  className="tech-remove"
                  title="Remover técnico"
                  onClick={() => onRemoveTech(tech)}
                >
                  ✕
                </button>
              </td>
              {weeks.map((w) =>
                w.map((d) => (
                  <DayCell
                    key={d.iso}
                    funci={tech.funci}
                    iso={d.iso}
                    value={entryOf(region, pk, tech.funci, d.iso)}
                    weekend={d.dow === 0 || d.dow === 6}
                    regionLocked={region.locked}
                    sbaOn={sobreavisoIsOn(data, tech.funci, d.iso)}
                    onFocusRequest={(f, i) => setFocusTarget({ funci: f, iso: i })}
                  />
                )),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
