import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ALL_REGION } from '@/lib/constants'
import { currentRegion, importedTechs, sobreavisoDays } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { MONTHS, pad } from '@/utils/date'

interface SbaDialogProps {
  funci: string
  onOpenChange: (open: boolean) => void
}

const DOW_HEADER = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export function SbaDialog({ funci, onOpenChange }: SbaDialogProps) {
  const data = useStateStore((s) => s.data)
  const commitSobreaviso = useStateStore((s) => s.commitSobreaviso)
  const can = useAuthStore((s) => s.can)
  const [pending, setPending] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  if (!data) return null

  const canEdit = data.currentRegion !== ALL_REGION && can('programarSobreaviso')
  const region = currentRegion(data)
  const tech = importedTechs(region).find((t) => t.funci === funci)
  const name = tech ? tech.nome : funci

  const y = data.currentYear
  const m = data.currentMonth
  const list = sobreavisoDays(data, funci)
  const inMonth = list.filter((iso) => iso.slice(0, 7) === `${y}-${pad(m + 1)}`)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const monthLabel = `${MONTHS[m].charAt(0).toUpperCase()}${MONTHS[m].slice(1)} de ${y}`
  const cells: ReactNode[] = []
  for (let i = 0; i < offset; i++) {
    cells.push(<span key={`e${i}`} className="cal-day cal-empty" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${y}-${pad(m + 1)}-${pad(day)}`
    const toggled = pending.includes(iso)
    const marked = saving ? list.includes(iso) || toggled : toggled ? !list.includes(iso) : list.includes(iso)
    const cls = ['cal-day', marked ? 'cal-marked' : '', iso === todayIso ? 'cal-today' : '']
      .filter(Boolean)
      .join(' ')
    cells.push(
      <button
        key={iso}
        type="button"
        className={cls}
        disabled={!canEdit || saving}
        title={marked ? 'Sobreaviso marcado — clique para remover' : 'Clique para marcar sobreaviso'}
        onClick={() =>
          setPending((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]))
        }
      >
        {day}
      </button>,
    )
  }

  async function handleConfirm() {
    setSaving(true)
    await commitSobreaviso(funci, pending)
    setPending([])
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Sobreaviso no mês: <strong>{inMonth.length}</strong> dia(s) · {monthLabel}
        </p>
        <div className="acomp-cal">
          <div className="cal-month-title">{monthLabel}</div>
          <div className="cal-dow">
            {DOW_HEADER.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-grid">{cells}</div>
          <div className="cal-legend">
            <span>
              <span className="cal-legend-dot marked" /> Sobreaviso marcado
            </span>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {saving
              ? 'Salvando…'
              : pending.length > 0
                ? `${pending.length} alteração(ões) pendente(s) — clique em Salvar`
                : 'Clique nos dias e depois em Salvar'}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canEdit || pending.length === 0 || saving}
              onClick={() => void handleConfirm()}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
