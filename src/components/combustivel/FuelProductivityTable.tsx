import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtNum } from '@/utils/format'
import type { FuelProductivityRow } from '@/types'

interface FuelProductivityTableProps {
  rows: FuelProductivityRow[]
  allMode: boolean
}

function orcColor(pct: number): string {
  if (pct > 100) return 'var(--danger-dark)'
  if (pct >= 90) return 'var(--warning-dark)'
  return 'var(--success-dark)'
}

export function FuelProductivityTable({ rows, allMode }: FuelProductivityTableProps) {
  if (rows.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Nenhum técnico importado{allMode ? '' : ' nesta região'}.
      </div>
    )
  }

  const label = allMode ? 'Todas as regiões' : rows[0].region

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-6 px-1 text-xs text-muted-foreground">
        <span>Consumo atribuído por vínculo (cadastro de veículos) ou nome do motorista</span>
        <span>
          <strong>{label}</strong>
          {allMode ? ` · ${rows.length} técnico(s)` : ''}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {allMode && <TableHead className="pl-5 text-left">Região</TableHead>}
              <TableHead className="pl-5">Técnico</TableHead>
              <TableHead className="text-center">Média pts/dia</TableHead>
              <TableHead className="text-center">Abast.</TableHead>
              <TableHead className="text-center">Litros</TableHead>
              <TableHead className="text-center">Custo</TableHead>
              <TableHead className="text-center">Orçamento</TableHead>
              <TableHead className="text-center">% Orçamento</TableHead>
              <TableHead className="text-center">Km</TableHead>
              <TableHead className="text-center">KM/L</TableHead>
              <TableHead className="text-center">Pontos/L</TableHead>
              <TableHead className="text-center">Litro/OS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.funci}>
                {allMode && <TableCell className="pl-5 font-semibold">{r.region}</TableCell>}
                <TableCell className="pl-5">
                  <div className="font-semibold">{r.nome}</div>
                  <div className="text-xs text-muted-foreground">{r.funci}</div>
                </TableCell>
                <TableCell className="text-center">{r.avg !== null ? fmtNum(r.avg) : '—'}</TableCell>
                <TableCell className="text-center">{r.abast > 0 ? r.abast : '—'}</TableCell>
                <TableCell className="text-center">{r.litros > 0 ? fmtNum(r.litros) : '—'}</TableCell>
                <TableCell className="text-center">{r.custo > 0 ? `R$ ${fmtNum(r.custo)}` : '—'}</TableCell>
                <TableCell className="text-center">{r.orcamento > 0 ? `R$ ${fmtNum(r.orcamento)}` : '—'}</TableCell>
                <TableCell className="text-center">
                  {r.orcPct !== null ? (
                    <strong style={{ color: orcColor(r.orcPct) }}>{fmtNum(r.orcPct)}%</strong>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-center">{r.km > 0 ? fmtNum(r.km) : '—'}</TableCell>
                <TableCell className="text-center">{r.kmPorLitro !== null ? fmtNum(r.kmPorLitro) : '—'}</TableCell>
                <TableCell className="text-center">
                  <strong style={{ color: 'var(--primary)' }}>
                    {r.ptsPerLitro !== null ? fmtNum(r.ptsPerLitro) : '—'}
                  </strong>
                </TableCell>
                <TableCell className="text-center">{r.litroOs !== null ? fmtNum(r.litroOs) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
