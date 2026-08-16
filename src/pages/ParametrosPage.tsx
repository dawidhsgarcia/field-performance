import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ParamsForm } from '@/components/parametros/ParamsForm'
import { ColaboradoresTable } from '@/components/parametros/ColaboradoresTable'
import { VeiculosTable } from '@/components/parametros/VeiculosTable'
import { UsuariosTable } from '@/components/parametros/UsuariosTable'
import { CadastroDialog, type CadKind } from '@/components/parametros/CadastroDialog'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'

interface CadState {
  kind: CadKind
  key: string | null
}

export function ParametrosPage() {
  const status = useStateStore((s) => s.status)
  const data = useStateStore((s) => s.data)
  const can = useAuthStore((s) => s.can)
  const [cad, setCad] = useState<CadState | null>(null)

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Parâmetros</h1>
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum dado carregado.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Parâmetros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metas por dia da semana, janela de tendência, quartis, alertas e cadastros de
          colaboradores, veículos e usuários.
        </p>
      </div>

      <ParamsForm />
      <ColaboradoresTable onOpenCadastro={(kind, key) => setCad({ kind, key })} />
      <VeiculosTable onOpenCadastro={(kind, key) => setCad({ kind, key })} />
      {can('gerenciarUsuarios') && (
        <UsuariosTable onOpenCadastro={(kind, key) => setCad({ kind, key })} />
      )}

      {cad && (
        <CadastroDialog kind={cad.kind} editKey={cad.key} onOpenChange={() => setCad(null)} />
      )}
    </div>
  )
}
