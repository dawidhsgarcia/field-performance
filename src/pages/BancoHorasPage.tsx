import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BhToolbar } from '@/components/bh/BhToolbar'
import { BhKpis } from '@/components/bh/BhKpis'
import { BhAlerts } from '@/components/bh/BhAlerts'
import { BhTable } from '@/components/bh/BhTable'
import { BhModal } from '@/components/bh/BhModal'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { ALL_REGION } from '@/lib/constants'
import { setBhPeriod } from '@/services/state'
import { bhBaseEntry, bhScheduledDays } from '@/services/importers/bhReport'
import { bhPeriodLabel, bhPeriodOf } from '@/utils/date'
import { computeBhAlerts, computeBhKpis, bhWaMessage, bhWaPhone, filterBhBase } from '@/utils/rules/bh'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'

export function BancoHorasPage() {
  const status = useStateStore((s) => s.status)
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const importBh = useStateStore((s) => s.importBh)
  const can = useAuthStore((s) => s.can)

  const [modalFunci, setModalFunci] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ title: string; message: string } | null>(null)

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
        <h1 className="font-display text-2xl font-semibold tracking-tight">Banco de Horas</h1>
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum dado carregado.</div>
        </div>
      </div>
    )
  }

  const bh = data.bh || { base: [], folgas: {}, period: null }
  const periods = [...new Set((bh.base || []).filter((b) => b.limiteComp).map((b) => b.limiteComp.slice(0, 7)))].sort().reverse()
  let period = typeof bh.period === 'string' && /^\d{4}-\d{2}$/.test(bh.period) ? bh.period : bhPeriodOf(new Date())
  if (!periods.includes(period)) period = periods[0] || bhPeriodOf(new Date())

  const allMode = data.currentRegion === ALL_REGION || !can('programarFolga')
  const filtered = filterBhBase(bh.base || [], period, data, allMode)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const kpis = computeBhKpis(filtered, bh)
  const alerts = computeBhAlerts(filtered, bh, data, period, hoje)

  const regName = allMode
    ? 'Todas as regiões'
    : data.regions[data.currentRegion]?.name ?? data.currentRegion

  const emptyFiltered = allMode
    ? `Nenhum técnico da base de BH com vencimento no período ${bhPeriodLabel(period)}`
    : `Nenhum técnico da base de BH da ${regName} com vencimento no período ${bhPeriodLabel(
        period,
      )}. Confira o cadastro de colaboradores em Parâmetros`

  async function handleImport(rows: Array<Record<string, unknown>>) {
    const st = useStateStore.getState().data
    if (!st) return
    if (st.currentRegion === ALL_REGION) {
      toast.error('Selecione uma região específica para importar a base de BH.')
      return
    }
    setImporting(true)
    const res = await importBh(rows)
    setImporting(false)
    if (res.ok) {
      setResult({ title: 'Base de Banco de Horas importada', message: res.message ?? '' })
    } else if (res.message) {
      toast.error(res.message)
    }
  }

  function handleWhatsApp(funci: string) {
    const st = useStateStore.getState().data
    if (!st || !st.bh) return
    if (st.currentRegion === ALL_REGION || !can('programarFolga')) return
    const b = bhBaseEntry(st.bh, funci, st.bh.period)
    if (!b) return
    const phone = bhWaPhone(st, funci)
    if (!phone) {
      toast.error(
        'Este técnico não tem telefone cadastrado. Informe o WhatsApp em Parâmetros → Cadastro de Colaboradores.',
      )
      return
    }
    const dias = bhScheduledDays(b, st.bh)
    if (dias.length === 0) {
      toast.error('Este técnico ainda não tem folgas programadas no período.')
      return
    }
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(bhWaMessage(b, st.bh))
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Banco de Horas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhamento de folgas e compensações por período (15 → 14).
        </p>
      </div>

      <BhToolbar
        periods={periods}
        period={period}
        importing={importing}
        onPeriodChange={(p) => commit((s) => setBhPeriod(s, p))}
        onImport={(rows) => void handleImport(rows)}
      />

      {!bh.base || bh.base.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">
            Nenhuma base de Banco de Horas importada — use <strong>Importar base de BH</strong> acima.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">{emptyFiltered}</div>
        </div>
      ) : (
        <>
          <BhKpis kpis={kpis} />
          <BhAlerts alerts={alerts} />
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Resumo do período {period} · {bhPeriodLabel(period)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BhTable
                base={filtered}
                bh={bh}
                allMode={allMode}
                onOpenModal={setModalFunci}
                onWhatsApp={handleWhatsApp}
              />
            </CardContent>
          </Card>
        </>
      )}

      <div className="text-xs text-muted-foreground">
        A tabela mostra o período selecionado (do dia 15 ao dia 14). Use o botão <strong>Programar Folga</strong> de
        cada técnico para agendar os dias no calendário. Cada folga compensa 8h (segunda a sexta) ou 4h (sábado);
        domingo não compensa.
      </div>

      {modalFunci && (
        <BhModal funci={modalFunci} onOpenChange={(o) => { if (!o) setModalFunci(null) }} />
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
