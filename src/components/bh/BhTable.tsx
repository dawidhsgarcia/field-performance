import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { bhFmtMin, fmtNum } from '@/utils/format'
import { bhCompensated, bhScheduledDays } from '@/services/importers/bhReport'
import { useStateStore } from '@/stores/state.store'
import type { BhBaseEntry, BhState } from '@/types'

interface BhTableProps {
  base: BhBaseEntry[]
  bh: BhState
  allMode: boolean
  onOpenModal: (funci: string) => void
  onWhatsApp: (funci: string) => void
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export function BhTable({ base, bh, allMode, onOpenModal, onWhatsApp }: BhTableProps) {
  const data = useStateStore((s) => s.data)

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-56">Técnico</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Região</TableHead>
            <TableHead className="text-center">Total de horas</TableHead>
            <TableHead className="text-center">Compensação</TableHead>
            <TableHead className="text-center">Valor</TableHead>
            <TableHead className="text-center">Dias a programar</TableHead>
            <TableHead className="text-center">Folgas programadas</TableHead>
            {!allMode && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {base.map((b) => {
            const comp = bhCompensated(b, bh)
            const colab = data?.colaboradores ? data.colaboradores[b.funci] : null
            const funcao = colab?.funcao || null
            let regLabel: string | null = null
            if (colab && colab.regiao) {
              const r = data?.regions ? data.regions[colab.regiao] : null
              regLabel = r ? r.name : '(região removida)'
            }
            const scheduled = bhScheduledDays(b, bh)
              .map((iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7))
              .join(', ')
            return (
              <TableRow key={b.funci}>
                <TableCell className="w-56">
                  <div className="font-semibold">{b.nome}</div>
                  <div className="text-xs text-muted-foreground">{b.funci}</div>
                </TableCell>
                <TableCell>{funcao ? funcao : '—'}</TableCell>
                <TableCell>{regLabel ? regLabel : '—'}</TableCell>
                <TableCell className="text-center font-bold">{bhFmtMin(b.horas)}</TableCell>
                <TableCell className="text-center">
                  {comp.count}/{b.dias} folga(s) · {bhFmtMin(comp.min)}
                </TableCell>
                <TableCell className="text-center">R$ {fmtNum(b.valor)}</TableCell>
                <TableCell className="text-center font-bold">{b.dias}</TableCell>
                <TableCell className="text-center">
                  <span className="whitespace-nowrap">{scheduled || '—'}</span>
                </TableCell>
                {!allMode && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onOpenModal(b.funci)}>
                        Programar Folga
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-wa hover:text-wa"
                        title="Enviar programação de folgas no WhatsApp"
                        aria-label="Enviar no WhatsApp"
                        onClick={() => onWhatsApp(b.funci)}
                      >
                        <WaIcon />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
