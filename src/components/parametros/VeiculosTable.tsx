import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtNum } from '@/utils/format'
import { removeVeiculo } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { ConfirmDialog } from './ConfirmDialog'
import type { CadKind } from './CadastroDialog'

interface VeiculosTableProps {
  onOpenCadastro: (kind: CadKind, key: string | null) => void
}

export function VeiculosTable({ onOpenCadastro }: VeiculosTableProps) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const [del, setDel] = useState<string | null>(null)

  const regions = data?.regions ?? {}
  const list = Object.values(data?.veiculos ?? {})

  function confirmDelete() {
    if (!del) return
    commit((s) => removeVeiculo(s, del))
    setDel(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Cadastro de Veículos</CardTitle>
        <CardDescription>
          Vincule cada placa a um motorista (técnico) e à região. Usado para atribuir o consumo de
          combustível e o orçamento mensal (R$) do relatório de frota.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {can('gerenciarVeiculos') && (
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenCadastro('veiculo', null)}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        )}
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead className="text-right">Orçamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum veículo cadastrado. Clique em + Adicionar.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((v) => {
                  const reg = v.regiao ? regions[v.regiao] : undefined
                  const regLabel = reg ? reg.name : '(região removida)'
                  const tech = reg ? reg.technicians.find((t) => t.funci === v.motorista) : null
                  const techLabel = tech ? `${tech.nome} (${tech.funci})` : '(técnico removido)'
                  const orcamento =
                    v.orcamento !== null && v.orcamento !== undefined && !isNaN(v.orcamento)
                      ? `R$ ${fmtNum(v.orcamento)}`
                      : '—'
                  return (
                    <TableRow key={v.placa}>
                      <TableCell className="font-semibold">{v.placa}</TableCell>
                      <TableCell>{regLabel}</TableCell>
                      <TableCell>{techLabel}</TableCell>
                      <TableCell className="text-right">{orcamento}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar vínculo ${v.placa}`}
                            onClick={() => onOpenCadastro('veiculo', v.placa)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover vínculo ${v.placa}`}
                            onClick={() => setDel(v.placa)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <ConfirmDialog
        open={del !== null}
        title="Remover vínculo"
        description={del ? `Remover o vínculo do veículo ${del}?` : ''}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setDel(null)
        }}
      />
    </Card>
  )
}
