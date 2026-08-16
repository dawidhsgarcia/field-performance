import { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RegionMonthFilter } from '@/components/shared/RegionMonthFilter'
import { ALL_REGION } from '@/lib/constants'
import { decodeFleetText } from '@/utils/csv'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import type { FuelSortKey } from '@/types'

const SORT_OPTIONS: Array<{ value: FuelSortKey; label: string }> = [
  { value: 'pts', label: 'Média pts/dia (maior → menor)' },
  { value: 'pontosL', label: 'Pontos/L (maior → menor)' },
  { value: 'kml', label: 'KM/L (maior → menor)' },
  { value: 'custo', label: 'Custo (maior → menor)' },
  { value: 'orcPct', label: '% Orçamento (maior → menor)' },
]

interface CombustivelToolbarProps {
  importing?: boolean
  sort: FuelSortKey
  onSortChange: (key: FuelSortKey) => void
  onImport: (text: string) => void
}

export function CombustivelToolbar({ importing = false, sort, onSortChange, onImport }: CombustivelToolbarProps) {
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
        const text = decodeFleetText(new Uint8Array(reader.result as ArrayBuffer))
        onImport(text)
      } catch (err) {
        toast.error(
          'Não foi possível ler o arquivo CSV. Verifique se é o relatório de abastecimento exportado do sistema de frota.',
        )
        console.error(err)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RegionMonthFilter />
      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
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
            : 'Importar relatório de abastecimento .csv do sistema de frota'
        }
        onClick={() => inputRef.current?.click()}
      >
        {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Importar Consumo
      </Button>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
    </div>
  )
}
