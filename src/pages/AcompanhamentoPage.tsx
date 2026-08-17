import { useState } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { AcompanhamentoToolbar } from '@/components/acompanhamento/AcompanhamentoToolbar'
import { MatrixTable } from '@/components/acompanhamento/MatrixTable'
import { GoalsTable } from '@/components/acompanhamento/GoalsTable'
import { LockBanner } from '@/components/acompanhamento/LockBanner'
import { LegendCodes } from '@/components/acompanhamento/LegendCodes'
import { SbaDialog } from '@/components/acompanhamento/SbaDialog'
import { DayIndisModal } from '@/components/acompanhamento/DayIndisModal'
import { ImportResultDialog } from '@/components/shared/ImportResultDialog'
import { ConfirmDialog } from '@/components/parametros/ConfirmDialog'
import { ALL_REGION } from '@/lib/constants'
import { removeColaborador, periodKeyOf } from '@/services/state'
import { useAcompanhamentoData } from '@/hooks/useAcompanhamentoData'
import { useStateStore } from '@/stores/state.store'
import { MONTHS } from '@/utils/date'
import type { ActivityReportSummary } from '@/types/imports'
import type { Technician } from '@/types'

export function AcompanhamentoPage() {
  const status = useStateStore((s) => s.status)
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const importActivityReport = useStateStore((s) => s.importActivityReport)
  const { region, weeks, techs, currentYear, currentMonth } = useAcompanhamentoData()

  const [sbaFunci, setSbaFunci] = useState<string | null>(null)
  const [dayIso, setDayIso] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Technician | null>(null)
  const [importResult, setImportResult] = useState<{ title: string; message: string } | null>(null)
  const [importing, setImporting] = useState(false)

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!data || !region) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <div className="acomp-empty">Nenhum dado carregado.</div>
      </div>
    )
  }

  function buildVerified(summary: ActivityReportSummary): string | null {
    const st = useStateStore.getState().data
    const reg = st?.regions[summary.regionId]
    const s = summary.bestPeriod ? reg?.sla?.[summary.bestPeriod] : null
    if (s && s.slaCounts) {
      return `\n• Confirmado na nuvem: ${summary.bestPeriod} → ${s.totalOS || 0} OS, ${s.slaCounts.evaluated || 0} com avaliação de prazo, ${s.slaCounts.onTime || 0} no prazo.`
    }
    return null
  }

  async function handleImport(rows: Array<Record<string, unknown>>) {
    const st = useStateStore.getState().data
    if (!st) return
    if (st.currentRegion === ALL_REGION) {
      toast.error('Selecione uma região específica para importar o relatório.')
      return
    }
    setImporting(true)
    try {
      const res = await importActivityReport(rows, st.currentRegion)
      if (!res.ok) {
        if (res.message) toast.error(res.message)
        return
      }
      const summary = res.summary
      if (!summary) return
      const current = useStateStore.getState().data
      if (res.savedToCloud) {
        const verified = buildVerified(summary)
        setImportResult({
          title: 'Relatório importado',
          message:
            `Relatório importado para "${summary.regionName}":\n` +
            `• ${summary.updatedTechs} técnico(s) atualizado(s) (${summary.newTechs} novo(s) cadastrado(s) automaticamente)\n` +
            `• ${summary.updatedDays} dia(s) de produção preenchidos\n` +
            `• ${summary.validRows} linha(s) consideradas, ${summary.skippedRows} ignorada(s) (rodapé, sem baremo ou expurgadas)\n` +
            `A tela foi ajustada para o período com mais dados: ${MONTHS[current?.currentMonth ?? 0]} de ${current?.currentYear ?? 0}.\n` +
            `A digitação manual nesta região foi bloqueada (os dados agora vêm do relatório oficial).` +
            (verified ?? ''),
        })
      } else {
        setImportResult({
          title: 'Atenção',
          message:
            'O relatório foi processado, mas NÃO foi possível salvar na nuvem. ' +
            'Os dados ficaram apenas neste navegador e os outros usuários não os verão.\n' +
            'Verifique a conexão com a internet e tente importar novamente. ' +
            'Se o problema persistir, exporte um Backup (.json) como precaução.',
        })
      }
    } catch (err) {
      toast.error(
        'Não foi possível ler este relatório. Verifique se é um .csv (separado por ;) ou .xlsx no formato esperado (aba "Export" com as colunas funcid, tecnico, data_fechamento, baremo etc.).',
      )
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  function handleRemoveTech() {
    if (!removeTarget) return
    commit((s) => removeColaborador(s, removeTarget.funci))
    setRemoveTarget(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matriz de apontamentos, metas diárias da equipe e programação de sobreaviso por técnico.
        </p>
      </div>

      <AcompanhamentoToolbar importing={importing} onImportReport={(rows) => void handleImport(rows)} />

      <LockBanner region={region} />

      {techs.length === 0 ? (
        <div className="acomp-empty">
          Nenhum técnico importado do relatório nesta região ainda.
        </div>
      ) : (
        <>
          <MatrixTable
            region={region}
            weeks={weeks}
            techs={techs}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onOpenSba={setSbaFunci}
            onRemoveTech={setRemoveTarget}
          />
          <p className="acomp-hint">
            Clique numa célula em branco para escolher uma justificativa na lista, ou selecione{" "}
            "✏️ Pontuação" para digitar a nota do dia. Justificativas não entram na soma dos totais.
          </p>
          <LegendCodes />
          <GoalsTable region={region} weeks={weeks} onOpenDay={setDayIso} />
        </>
      )}

      {sbaFunci && <SbaDialog funci={sbaFunci} onOpenChange={(o) => { if (!o) setSbaFunci(null) }} />}

      {dayIso && (
        <DayIndisModal
          region={region}
          pk={periodKeyOf(data)}
          iso={dayIso}
          onOpenChange={(o) => {
            if (!o) setDayIso(null)
          }}
        />
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remover técnico"
        description={
          removeTarget
            ? `Remover ${removeTarget.nome} (${removeTarget.funci}) desta região? Os apontamentos deste técnico serão mantidos no histórico.`
            : ''
        }
        onConfirm={handleRemoveTech}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
      />

      {importResult && (
        <ImportResultDialog
          title={importResult.title}
          message={importResult.message}
          onOpenChange={(o) => {
            if (!o) setImportResult(null)
          }}
        />
      )}
    </div>
  )
}
