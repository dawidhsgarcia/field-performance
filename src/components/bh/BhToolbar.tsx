import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RegionFilter } from '@/components/shared/RegionFilter'
import { ALL_REGION } from '@/lib/constants'
import { decodeActivityText, parseBhCsv } from '@/utils/csv'
import { readSheetRows } from '@/services/importers/xlsx'
import { bhPeriodLabel } from '@/utils/date'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'

interface BhToolbarProps {
  periods: string[]
  period: string
  importing?: boolean
  onPeriodChange: (period: string) => void
  onImport: (rows: Array<Record<string, unknown>>) => void
}

export function BhToolbar({ periods, period, importing = false, onPeriodChange, onImport }: BhToolbarProps) {
  const data = useStateStore((s) => s.data)
  const can = useAuthStore((s) => s.can)
  const inputRef = useRef<HTMLInputElement | null>(null)

  if (!data) return null

  const importDisabled = data.currentRegion === ALL_REGION || !can('importar')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (data.currentRegion === ALL_REGION) {
      toast.error('Selecione uma região específica para importar a base de BH.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const bytes = new Uint8Array(reader.result as ArrayBuffer)
        const rows = /\.xlsx?$/i.test(file.name)
          ? readSheetRows(bytes)
          : parseBhCsv(decodeActivityText(bytes))
        onImport(rows)
      } catch (err) {
        toast.error(
          'Não foi possível ler a base de Banco de Horas. Verifique se é um .xlsx ou .csv no formato esperado (colunas: FUNCID, NOME, BU, SUB BU, LIMITE COMP., HORAS, VLR., DIAS).',
        )
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RegionFilter />
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p} value={p}>
              {p} · {bhPeriodLabel(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={importDisabled || importing}
        title={
          importDisabled
            ? 'Somente leitura — selecione uma região específica'
            : 'Importar base de Banco de Horas (colunas: FUNCID, NOME, BU, SUB BU, LIMITE COMP., HORAS, VLR., DIAS)'
        }
        onClick={() => {
          if (!can('importar')) {
            toast.error('Você não tem permissão para importar base de BH.')
            return
          }
          inputRef.current?.click()
        }}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Importar base de BH
      </Button>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFile} />
    </div>
  )
}
