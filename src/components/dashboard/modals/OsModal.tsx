import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtNum } from '@/utils/format'
import { useSortableRows } from '@/hooks/useSortableRows'
import { OsTable } from './OsTable'
import { type OsRow, type OsSortableKey } from './osHelpers'
import type { Region } from '@/types'

interface OsModalProps {
  region: Region
  pk: string
  funci: string
  onOpenChange: (open: boolean) => void
}

export function OsModal({ region, pk, funci, onOpenChange }: OsModalProps) {
  const all = useMemo(() => (region.report?.[pk]?.[funci] || []).slice(), [region, pk, funci])
  const rows = useMemo(() => all.filter((r) => r.avaliada), [all])
  const tech = region.technicians.find((t) => t.funci === funci)
  const [prazo, setPrazo] = useState('all')
  const { sortKey, sortDir, toggleSort } = useSortableRows<OsSortableKey>('dataFechamento', -1)

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (prazo === 'in' && !r.noPrazo) return false
        if (prazo === 'out' && r.noPrazo) return false
        return true
      }),
    [rows, prazo],
  )

  const osRows: OsRow[] = filtered.map((r) => ({ ...r, funci, tecnico: tech?.nome ?? funci }))

  const totalOS = rows.length
  const totalPts = rows.reduce((s, r) => s + (Number(r.baremo) || 0), 0)
  const onTime = rows.filter((r) => r.noPrazo).length
  const slaPct = totalOS > 0 ? Math.round((onTime / totalOS) * 100) : null

  const emptyMessage =
    all.length === 0
      ? 'Sem detalhes de OS para este técnico. Reimporte o relatório para habilitar esta visualização.'
      : rows.length === 0
        ? 'Nenhuma OS com avaliação de prazo neste período.'
        : 'Nenhuma OS corresponde aos filtros.'

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="inset-x-0 mx-auto translate-x-0">
        <DialogHeader>
          <DialogTitle>OS executadas — {tech?.nome ?? funci}</DialogTitle>
        </DialogHeader>
        <Select value={prazo} onValueChange={setPrazo}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Prazo: Todos</SelectItem>
            <SelectItem value="in">Prazo: Dentro do prazo</SelectItem>
            <SelectItem value="out">Prazo: Fora do prazo</SelectItem>
          </SelectContent>
        </Select>
        <OsTable
          rows={osRows}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k) => toggleSort(k as OsSortableKey)}
          emptyMessage={emptyMessage}
          atividadeNowrap
        />
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <span>
            <b>{fmtNum(totalOS)}</b> OS
          </span>
          <span>
            <b>{fmtNum(totalPts)}</b> pts
          </span>
          <span>
            <b>{slaPct !== null ? slaPct + '%' : '–'}</b> no prazo ({onTime}/{totalOS})
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
