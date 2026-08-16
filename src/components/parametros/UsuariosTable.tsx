import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { ADMIN_BOOTSTRAP_EMAIL, PERFIS_LIST } from '@/lib/constants'
import { removeUsuario } from '@/services/auth/users'
import { useAuthStore } from '@/stores/auth.store'
import { ConfirmDialog } from './ConfirmDialog'
import type { CadKind } from './CadastroDialog'

interface UsuariosTableProps {
  onOpenCadastro: (kind: CadKind, key: string | null) => void
}

export function UsuariosTable({ onOpenCadastro }: UsuariosTableProps) {
  const usuarios = useAuthStore((s) => s.usuarios)
  const user = useAuthStore((s) => s.user)
  const [del, setDel] = useState<{ uid: string; nome: string } | null>(null)

  const list = useMemo(
    () =>
      Object.values(usuarios).sort((a, b) =>
        (a.nome || a.email || '').localeCompare(b.nome || b.email || ''),
      ),
    [usuarios],
  )

  async function confirmDelete() {
    if (!del) return
    if (user?.uid === del.uid) {
      toast.error('Você não pode remover o próprio usuário.')
      setDel(null)
      return
    }
    const res = await removeUsuario(del.uid)
    if (!res.ok) {
      toast.error(res.msg)
      setDel(null)
      return
    }
    toast.success('Usuário removido!')
    setDel(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">Usuários e Permissões</CardTitle>
        <CardDescription>
          Cadastre os usuários do sistema e defina o perfil de acesso: Admin (tudo), Gestor (edita
          dados e importa, sem gerenciar usuários/regiões/backup) ou Leitura (somente visualização).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenCadastro('usuario', null)}>
          <Plus className="size-4" />
          Adicionar
        </Button>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum usuário cadastrado. Clique em + Adicionar.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((u) => {
                  const isSelf = user?.email === u.email
                  const isBootstrap = (u.email || '').toLowerCase() === ADMIN_BOOTSTRAP_EMAIL
                  const perfilLabel = PERFIS_LIST.find((p) => p.value === u.perfil)?.label ?? u.perfil ?? '—'
                  return (
                    <TableRow key={u.uid}>
                      <TableCell>
                        <span className="font-semibold">{u.nome || u.email}</span>
                        {isSelf && <span className="text-muted-foreground"> (você)</span>}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{perfilLabel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar perfil ${u.nome || u.email}`}
                            onClick={() => onOpenCadastro('usuario', u.uid)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {!isBootstrap && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover usuário ${u.nome || u.email}`}
                              onClick={() => setDel({ uid: u.uid, nome: u.nome || u.email })}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
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
        title="Remover usuário"
        description={del ? `Remover o usuário "${del.nome}"?` : ''}
        onConfirm={() => void confirmDelete()}
        onOpenChange={(open) => {
          if (!open) setDel(null)
        }}
      />
    </Card>
  )
}
