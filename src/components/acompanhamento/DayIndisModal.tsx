import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { JUSTIFICATION_CODES, JUSTIFICATION_COLORS, JUSTIFICATION_LABELS } from '@/lib/constants'
import { computeDayOverview } from '@/utils/rules/goals'
import { DOW, isoToDate } from '@/utils/date'
import { bhFmtDate } from '@/utils/format'
import type { Region, Technician } from '@/types'

interface DayIndisModalProps {
  region: Region
  pk: string
  iso: string
  techs?: Technician[]
  onOpenChange: (open: boolean) => void
}

export function DayIndisModal({ region, pk, iso, techs, onOpenChange }: DayIndisModalProps) {
  const overview = computeDayOverview(region, pk, iso, techs)
  const dow = DOW[isoToDate(iso).getDay()]
  const title = `Disponibilidade Técnica — ${bhFmtDate(iso)} (${dow})`

  const justCodes = JUSTIFICATION_CODES.filter((c) => (overview.justCounts[c] || 0) > 0).sort(
    (a, b) => (overview.justCounts[b] || 0) - (overview.justCounts[a] || 0),
  )

  const available = overview.techCount - overview.totalJustified
  const availPct = overview.unavailPct !== null ? 100 - overview.unavailPct : null
  const pctLabel = availPct !== null ? Math.round(availPct) + '%' : '–'
  const pctBadge =
    availPct === null
      ? 'bg-muted text-muted-foreground'
      : availPct >= 90
        ? 'bg-success/10 text-success-dark'
        : availPct >= 80
          ? 'bg-warning/10 text-warning-dark'
          : 'bg-danger/10 text-danger'

  const statCards = [
    {
      label: 'Total',
      value: String(overview.techCount),
      valueClass: 'text-muted-foreground',
    },
    {
      label: 'Disponíveis',
      value: String(available),
      valueClass: 'text-success-dark',
    },
    {
      label: 'Indisponíveis',
      value: String(overview.totalJustified),
      valueClass: 'text-danger',
    },
  ]

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Resumo do dia</h4>
          <div className="grid grid-cols-3 gap-2">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-lg border bg-card p-3 text-center">
                <div className={cn('font-display text-2xl font-bold tabular-nums', card.valueClass)}>
                  {card.value}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{card.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Disponibilidade do dia</span>
            <span className={cn('inline-flex rounded-md px-2 py-0.5 text-sm font-bold', pctBadge)}>{pctLabel}</span>
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
                    <TableHead className="text-right">Técnicos</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {justCodes.map((c) => {
                    const count = overview.justCounts[c]
                    const pct = overview.totalJustified > 0 ? Math.round((count / overview.totalJustified) * 100) : 0
                    const color = JUSTIFICATION_COLORS[c]
                    const pctCls =
                      pct >= 50
                        ? 'bg-danger/10 text-danger'
                        : pct >= 30
                          ? 'bg-warning/10 text-warning-dark'
                          : 'bg-success/10 text-success-dark'
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
          {justCodes.length > 0 && (
            <div className="pt-2">
              <h4 className="mb-2 text-sm font-semibold">Técnicos indisponíveis</h4>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.techs.map((t) => {
                      const color = JUSTIFICATION_COLORS[t.code]
                      return (
                        <TableRow key={t.funci}>
                          <TableCell className="font-semibold">{t.nome}</TableCell>
                          <TableCell>
                            <span
                              className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle"
                              style={{ background: color.bg, border: `1px solid ${color.text}55` }}
                            />
                            {t.code} — {JUSTIFICATION_LABELS[t.code] || ''}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}