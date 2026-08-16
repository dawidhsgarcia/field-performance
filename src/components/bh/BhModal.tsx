import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MONTHS, pad } from '@/utils/date'
import { bhFmtDate, bhFmtMin } from '@/utils/format'
import { bhBaseEntry, bhCalRange, bhCompensated, bhIsMarked, bhToggleFolga } from '@/services/importers/bhReport'
import { sobreavisoIsOn } from '@/services/state'
import { bhFolgaWarnings } from '@/utils/rules/bh'
import { useStateStore } from '@/stores/state.store'
import type { ReactNode } from 'react'

const DOW_HEADER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

interface BhModalProps {
  funci: string
  onOpenChange: (open: boolean) => void
}

export function BhModal({ funci, onOpenChange }: BhModalProps) {
  const data = useStateStore((s) => s.data)
  const applyMutation = useStateStore((s) => s.applyMutation)

  if (!data || !data.bh) return null
  const bh = data.bh
  const b = bhBaseEntry(bh, funci, bh.period)
  if (!b) return null

  const comp = bhCompensated(b, bh)
  const period = b.limiteComp.slice(0, 7)
  const limite = `${period}-14`
  const r = bhCalRange(b)
  const months = [
    { y: r.start.getFullYear(), m: r.start.getMonth() },
    { y: r.end.getFullYear(), m: r.end.getMonth() },
  ]

  function handleToggle(iso: string) {
    const st = useStateStore.getState().data
    if (!st || !st.bh) return
    const cur = st.bh
    const entry = bhBaseEntry(cur, funci, cur.period)
    if (!entry) return
    const result = bhToggleFolga(entry, cur, funci, iso)
    if (result.added) {
      const warnings = bhFolgaWarnings(st, entry, funci, iso)
      if (warnings.length) toast.warning(warnings.join('\n\n'))
    }
    applyMutation((d) => {
      d.bh = result.next
    })
  }

  const cells: ReactNode[] = []
  months.forEach((mm) => {
    const daysInMonth = new Date(mm.y, mm.m + 1, 0).getDate()
    const offset = (new Date(mm.y, mm.m, 1).getDay() + 6) % 7
    cells.push(
      <div key={`${mm.y}-${mm.m}`}>
        <div className="cal-month-title">
          {MONTHS[mm.m].charAt(0).toUpperCase()}
          {MONTHS[mm.m].slice(1)} de {mm.y}
        </div>
        <div className="cal-dow">
          {DOW_HEADER.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: offset }).map((_, i) => (
            <span key={`e${mm.y}-${mm.m}-${i}`} className="cal-day cal-empty" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const d = new Date(mm.y, mm.m, day)
            const dow = d.getDay()
            const iso = `${mm.y}-${pad(mm.m + 1)}-${pad(day)}`
            const inRange = d >= r.start && d < r.end
            const isSun = dow === 0
            const marked = bhIsMarked(bh, funci, iso)
            const sba = sobreavisoIsOn(data, funci, iso)
            const sbaTip = sba ? ' · Sobreaviso' : ''
            let cls = 'cal-day'
            let title: string
            let clickable = false
            if (marked) {
              cls += ' cal-marked'
              title = `Folga programada — ${dow === 6 ? '4h' : '8h'}${sbaTip}`
              clickable = true
            } else if (inRange && !isSun && comp.count < (b.dias || 1)) {
              title = `${dow === 6 ? 'Sábado — 4h' : 'Dia útil — 8h'}${sbaTip}`
              clickable = true
            } else {
              cls += ' cal-off'
              title = (isSun ? 'Domingo — sem compensação' : !inRange ? 'Fora do período de BH' : 'Máximo de folgas atingido') + sbaTip
            }
            return (
              <button
                key={iso}
                type="button"
                className={cls}
                title={title}
                disabled={!clickable}
                onClick={clickable ? () => handleToggle(iso) : undefined}
              >
                {day}
                {sba && <i className="sba-cal-dot" />}
              </button>
            )
          })}
        </div>
      </div>,
    )
  })

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{b.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Folgas agendadas: <strong>{comp.count}/{b.dias}</strong> · Compensado:{' '}
          <strong>{bhFmtMin(comp.min)}</strong> de <strong>{bhFmtMin(b.horas)}</strong> — limite em{' '}
          {bhFmtDate(limite)}
        </p>
        <div className="acomp-cal cal-primary">
          <div className="cal-months">{cells}</div>
          <div className="cal-legend">
            <span>
              <span className="cal-legend-dot marked" /> Folga programada
            </span>
            <span>
              <span className="cal-legend-dot" style={{ background: 'var(--surface-3)' }} /> Fora do período /
              domingo
            </span>
            <span>
              <span className="cal-legend-dot" style={{ background: 'var(--sba)' }} /> Sobreaviso
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
