import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { JUSTIFICATION_CODES, JUSTIFICATION_COLORS, JUSTIFICATION_LABELS } from '@/lib/constants'
import type { TeamOverview } from '@/types'

export function IndisTable({ overview }: { overview: TeamOverview }) {
  const justCodes = JUSTIFICATION_CODES.filter((c) => (overview.justCounts[c] || 0) > 0).sort(
    (a, b) => (overview.justCounts[b] || 0) - (overview.justCounts[a] || 0),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
        <span>
          🔴 <strong>{overview.totalJustified}</strong> dias justificados
        </span>
        <span>
          📊{' '}
          <strong>{overview.unavailPct !== null ? Math.round(overview.unavailPct) + '%' : '–'}</strong> de
          indisponibilidade
        </span>
      </div>
      {justCodes.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-muted-foreground">
          Nenhuma justificativa registrada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {justCodes.map((c) => {
                const count = overview.justCounts[c]
                const pct = Math.round((count / overview.totalJustified) * 100)
                const color = JUSTIFICATION_COLORS[c]
                const pctCls = pct >= 20 ? 'bg-danger/10 text-danger' : pct >= 10 ? 'bg-warning/10 text-warning-dark' : 'bg-success/10 text-success-dark'
                return (
                  <TableRow key={c}>
                    <TableCell className="font-semibold">
                      <span
                        className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                        style={{ background: color.bg, border: `1px solid ${color.text}55` }}
                      />
                      {c}
                    </TableCell>
                    <TableCell>{JUSTIFICATION_LABELS[c] || ''}</TableCell>
                    <TableCell className="text-right font-bold">{count}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', pctCls)}>
                        {pct}%
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
