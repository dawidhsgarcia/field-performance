import { useMemo, useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FUNCAO_DEFAULT } from '@/lib/constants'
import { removeColaborador } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { ConfirmDialog } from './ConfirmDialog'
import type { CadKind } from './CadastroDialog'

interface ColaboradoresTableProps {
  onOpenCadastro: (kind: CadKind, key: string | null) => void
}

export function ColaboradoresTable({ onOpenCadastro }: ColaboradoresTableProps) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const [filter, setFilter] = useState('all')
  const [del, setDel] = useState<{ funci: string; nome: string } | null>(null)

  const regions = data?.regions ?? {}

  const list = useMemo(
    () =>
      Object.values(data?.colaboradores ?? {})
        .filter((c) => filter === 'all' || c.regiao === filter)
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [data, filter],
  )

  function confirmDelete() {
    if (!del) return
    commit((s) => removeColaborador(s, del.funci))
    setDel(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Cadastro de Colaboradores</CardTitle>
        <CardDescription>
          Cadastre cada colaborador (funcid, nome, função e WhatsApp) e defina a região em que atua.
          Fonte das listas de técnicos do Acompanhamento, Combustível e Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {can('gerenciarColaboradores') && (
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenCadastro('colab', null)}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar por região</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regiões</SelectItem>
                {Object.keys(regions).map((rid) => (
                  <SelectItem key={rid} value={rid}>
                    {regions[rid].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcid</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Região</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum colaborador{filter !== 'all' ? ' nesta região' : ' cadastrado'}. Clique em +
                    Adicionar.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((c) => {
                  const reg = regions[c.regiao]
                  const regLabel = reg ? reg.name : '(região removida)'
                  return (
                    <TableRow key={c.funci}>
                      <TableCell className="font-semibold">{c.funci}</TableCell>
                      <TableCell>{c.nome}</TableCell>
                      <TableCell>{c.funcao || FUNCAO_DEFAULT}</TableCell>
                      <TableCell>{regLabel}</TableCell>
                      <TableCell className={c.telefone ? undefined : 'text-muted-foreground'}>
                        {c.telefone ? c.telefone : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${c.nome}`}
                            onClick={() => onOpenCadastro('colab', c.funci)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover ${c.nome}`}
                            onClick={() => setDel({ funci: c.funci, nome: c.nome })}
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
        title="Remover colaborador"
        description={
          del
            ? `Remover ${del.nome} (${del.funci})? Ele será removido das regiões e os vínculos de veículos serão desfeitos.`
            : ''
        }
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setDel(null)
        }}
      />
    </Card>
  )
}
