import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CombustivelToolbar } from '@/components/combustivel/CombustivelToolbar'
import { FuelKpis } from '@/components/combustivel/FuelKpis'
import { FuelProductivityTable } from '@/components/combustivel/FuelProductivityTable'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { ALL_REGION } from '@/lib/constants'
import { periodKeyOf } from '@/services/state'
import { computeFuelKpis, computeFuelProductivityRows, filterFuelByRegion, fuelVehicles, sortFuelProductivity } from '@/utils/rules/fuel'
import { useStateStore } from '@/stores/state.store'
import type { FuelSortKey } from '@/types'

export function CombustivelPage() {
  const status = useStateStore((s) => s.status)
  const data = useStateStore((s) => s.data)
  const importFuel = useStateStore((s) => s.importFuel)

  const [sort, setSort] = useState<FuelSortKey>('orcPct')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ title: string; message: string } | null>(null)

  const rows = useMemo(() => {
    if (!data) return []
    const pk = periodKeyOf(data)
    const per = data.fuel?.[pk]
    if (!per) return []
    const allMode = data.currentRegion === ALL_REGION
    return sortFuelProductivity(
      computeFuelProductivityRows(per, data, allMode ? null : data.currentRegion),
      sort,
    )
  }, [data, sort])

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Combustível</h1>
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum dado carregado.</div>
        </div>
      </div>
    )
  }

  const pk = periodKeyOf(data)
  const per = data.fuel?.[pk]
  const allMode = data.currentRegion === ALL_REGION
  const kpis = per
    ? computeFuelKpis(filterFuelByRegion(fuelVehicles(per, data), data, allMode), data, allMode, pk)
    : null

  async function handleImport(text: string) {
    const st = useStateStore.getState().data
    if (!st) return
    if (st.currentRegion === ALL_REGION) {
      toast.error('Selecione uma região específica para importar o consumo.')
      return
    }
    setImporting(true)
    const res = await importFuel(text)
    setImporting(false)
    if (res.ok) {
      setResult({ title: 'Relatório de combustível importado', message: res.message ?? '' })
    } else if (res.message) {
      toast.error(res.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Combustível</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consumo de combustível por veículo e técnico, com KPIs de custo e eficiência.
        </p>
      </div>

      <CombustivelToolbar importing={importing} sort={sort} onSortChange={setSort} onImport={(t) => void handleImport(t)} />

      {!per ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">
            Nenhum dado de consumo neste período — use <strong>Importar Consumo</strong> acima.
          </div>
        </div>
      ) : (
        <>
          {kpis && <FuelKpis kpis={kpis} />}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Produtividade × Consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <FuelProductivityTable rows={rows} allMode={allMode} />
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <ImportResultDialog
          title={result.title}
          message={result.message}
          onOpenChange={(o) => {
            if (!o) setResult(null)
          }}
        />
      )}
    </div>
  )
}
