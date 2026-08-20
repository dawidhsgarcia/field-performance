import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { activitySlaSummary, type ActivitySlaRow } from '@/utils/rules/kpis'

export function ActivitySlaTable({ rows }: { rows: ActivitySlaRow[] }) {
  const summary = activitySlaSummary(rows)

  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-[13px] text-muted-foreground">
        Nenhuma atividade encontrada. Importe um relatório com dados de OS.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
        <span>
          <strong>{summary.count}</strong> tipos de atividade
        </span>
        <span>
          <strong>{summary.onTime}</strong> de <strong>{summary.evaluated}</strong> OS no prazo (
          {summary.pct ?? 0}%)
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atividade</TableHead>
              <TableHead className="text-center">Total OS</TableHead>
              <TableHead className="text-center">Avaliadas</TableHead>
              <TableHead className="text-center">No Prazo</TableHead>
              <TableHead className="text-center">SLA %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const badge = r.cls === 'ok' ? 'bg-success/10 text-success-dark' : r.cls === 'warn' ? 'bg-warning/10 text-warning-dark' : 'bg-danger/10 text-danger'
              return (
                <TableRow key={r.atividade}>
                  <TableCell className="min-w-40 whitespace-normal font-semibold">{r.atividade}</TableCell>
                  <TableCell className="text-center font-bold">{r.total}</TableCell>
                  <TableCell className="text-center">{r.evaluated}</TableCell>
                  <TableCell className="text-center">{r.onTime}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-semibold', badge)}>
                      {r.pct !== null ? r.pct + '%' : '–'}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
