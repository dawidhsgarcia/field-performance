import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RegionMonthFilter } from '@/components/shared/RegionMonthFilter'
import { ALL_REGION } from '@/lib/constants'
import { parseActivityCsv } from '@/utils/csv'
import { readSheetRows } from '@/services/importers/xlsx'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'

interface AcompanhamentoToolbarProps {
  importing?: boolean
  onImportReport: (rows: Array<Record<string, unknown>>, fileName: string) => void
}

export function AcompanhamentoToolbar({ importing = false, onImportReport }: AcompanhamentoToolbarProps) {
  const data = useStateStore((s) => s.data)
  const can = useAuthStore((s) => s.can)
  const inputRef = useRef<HTMLInputElement | null>(null)

  if (!data) return null

  const importDisabled = data.currentRegion === ALL_REGION || !can('importar')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const bytes = new Uint8Array(reader.result as ArrayBuffer)
        const rows = /\.csv$/i.test(file.name) ? parseActivityCsv(bytes) : readSheetRows(bytes)
        onImportReport(rows, file.name)
      } catch (err) {
        toast.error(
          'Não foi possível ler este relatório. Verifique se é um .csv (separado por ;) ou .xlsx no formato esperado (aba "Export" com as colunas funcid, tecnico, data_fechamento, baremo etc.).',
        )
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RegionMonthFilter />
      <div className="flex-1" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={importDisabled || importing}
        title={
          importDisabled
            ? 'Somente leitura — selecione uma região específica'
            : 'Importar relatório de atividades (.xlsx)'
        }
        onClick={() => inputRef.current?.click()}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Importar relatório
      </Button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
    </div>
  )
}
