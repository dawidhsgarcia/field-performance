import { useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { fmtNum } from '@/utils/format'
import { fmtOsDate, mttrLabel, osSortValue, type OsRow, type OsSortableKey } from './osHelpers'

interface OsTableProps {
  rows: OsRow[]
  sortKey: OsSortableKey
  sortDir: -1 | 1
  onSort: (key: OsSortableKey) => void
  showTecnico?: boolean
  emptyMessage?: string
  atividadeNowrap?: boolean
}

export function OsTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  showTecnico,
  emptyMessage,
  atividadeNowrap = false,
}: OsTableProps) {
  const sorted = useMemo(
    () =>
      rows.slice().sort((a, b) => {
        const va = osSortValue(a, sortKey)
        const vb = osSortValue(b, sortKey)
        if (va < vb) return -1 * sortDir
        if (va > vb) return 1 * sortDir
        return 0
      }),
    [rows, sortKey, sortDir],
  )

  if (sorted.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? 'Nenhuma OS corresponde aos filtros.'}
      </div>
    )
  }

  const arrow = (k: OsSortableKey) => (k === sortKey ? (sortDir === 1 ? ' ↑' : ' ↓') : '')
  const thClass = 'cursor-pointer select-none whitespace-nowrap'

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showTecnico && (
              <TableHead className={thClass} onClick={() => onSort('tecnico')}>
                Técnico{arrow('tecnico')}
              </TableHead>
            )}
            <TableHead className={thClass} onClick={() => onSort('os')}>
              OS{arrow('os')}
            </TableHead>
            <TableHead className={thClass} onClick={() => onSort('atividade')}>
              Atividade{arrow('atividade')}
            </TableHead>
            <TableHead className={thClass} onClick={() => onSort('dataAbertura')}>
              Data Abertura{arrow('dataAbertura')}
            </TableHead>
            <TableHead className={thClass} onClick={() => onSort('dataFechamento')}>
              Data Fechamento{arrow('dataFechamento')}
            </TableHead>
            <TableHead className={cn(thClass, 'text-right')} onClick={() => onSort('mttr')}>
              MTTR{arrow('mttr')}
            </TableHead>
            <TableHead className={cn(thClass, 'text-right')} onClick={() => onSort('baremo')}>
              Ponto{arrow('baremo')}
            </TableHead>
            <TableHead className={cn(thClass, 'text-right')} onClick={() => onSort('prazo')}>
              Prazo{arrow('prazo')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, i) => (
            <TableRow key={i}>
              {showTecnico && (
                <TableCell className="font-semibold whitespace-nowrap">{r.tecnico || '—'}</TableCell>
              )}
              <TableCell>{r.os || '—'}</TableCell>
              <TableCell
                className={atividadeNowrap ? undefined : 'min-w-40 whitespace-normal'}
              >
                {r.atividade || '—'}
              </TableCell>
              <TableCell>{fmtOsDate(r.dataAbertura)}</TableCell>
              <TableCell>{fmtOsDate(r.dataFechamento)}</TableCell>
              <TableCell className="text-right">{mttrLabel(r)}</TableCell>
              <TableCell className="text-right">{r.baremo != null ? fmtNum(r.baremo) : '—'}</TableCell>
              <TableCell className="text-right">
                {r.avaliada ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
                      r.noPrazo ? 'bg-success/15 text-success-dark' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {r.noPrazo ? '✓ Dentro' : '✗ Fora'}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Não avaliada</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
