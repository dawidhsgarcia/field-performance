import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtNum } from '@/utils/format'
import { useSortableRows } from '@/hooks/useSortableRows'
import { OsTable } from './OsTable'
import { type OsRow, type OsSortableKey } from './osHelpers'
import type { Region } from '@/types'

interface TotalOsModalProps {
  region: Region
  pk: string
  monthLabel: string
  onOpenChange: (open: boolean) => void
}

export function TotalOsModal({ region, pk, monthLabel, onOpenChange }: TotalOsModalProps) {
  const rows = useMemo(() => {
    const report = region.report?.[pk] || {}
    const nameOf = (f: string) => region.technicians.find((t) => t.funci === f)?.nome || f
    return Object.keys(report).flatMap<OsRow>((funci) =>
      (report[funci] || []).map((r) => ({ ...r, funci, tecnico: nameOf(funci) })),
    )
  }, [region, pk])

  const atividades = useMemo(
    () =>
      [...new Set(rows.map((r) => (r.atividade || '').trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  )

  const [atividade, setAtividade] = useState('all')
  const [prazo, setPrazo] = useState('all')
  const { sortKey, sortDir, toggleSort } = useSortableRows<OsSortableKey>('dataFechamento', -1)

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (atividade !== 'all' && (r.atividade || '').trim() !== atividade) return false
        if (prazo === 'in') return r.avaliada && r.noPrazo
        if (prazo === 'out') return r.avaliada && !r.noPrazo
        if (prazo === 'na') return !r.avaliada
        return true
      }),
    [rows, atividade, prazo],
  )

  const evaluated = rows.filter((r) => r.avaliada)
  const totalOS = filtered.length
  const totalPts = filtered.reduce((s, r) => s + (Number(r.baremo) || 0), 0)
  const onTime = evaluated.filter((r) => r.noPrazo).length
  const slaPct = evaluated.length > 0 ? Math.round((onTime / evaluated.length) * 100) : null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="inset-x-0 mx-auto translate-x-0">
        <DialogHeader>
          <DialogTitle>Total de OS — {monthLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Select value={atividade} onValueChange={setAtividade}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Atividade: Todas</SelectItem>
              {atividades.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prazo} onValueChange={setPrazo}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Prazo: Todos</SelectItem>
              <SelectItem value="in">Prazo: Dentro do prazo</SelectItem>
              <SelectItem value="out">Prazo: Fora do prazo</SelectItem>
              <SelectItem value="na">Prazo: Não avaliada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <OsTable
          rows={filtered}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k) => toggleSort(k as OsSortableKey)}
          showTecnico
        />
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <span>
            <b>{fmtNum(totalOS)}</b> OS
          </span>
          <span>
            <b>{fmtNum(totalPts)}</b> pts
          </span>
          <span>
            <b>{slaPct !== null ? slaPct + '%' : '–'}</b> no prazo ({onTime}/{evaluated.length} avaliadas)
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
