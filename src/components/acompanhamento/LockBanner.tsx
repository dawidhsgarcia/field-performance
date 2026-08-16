import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ALL_REGION } from '@/lib/constants'
import { unlockRegion } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { ConfirmDialog } from '@/components/parametros/ConfirmDialog'
import type { Region } from '@/types'

export function LockBanner({ region }: { region: Region }) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const [open, setOpen] = useState(false)

  if (!data) return null

  if (!can('editarMatriz')) {
    return (
      <div className="lock-banner-inner">
        🔒 Perfil de <strong>leitura</strong> — somente visualização. Altere o perfil em Parâmetros
        para editar.
      </div>
    )
  }

  if (data.currentRegion === ALL_REGION) {
    return (
      <div className="lock-banner-inner">
        🔒 Visualização de <strong>todas as regiões</strong> — somente leitura. Selecione uma região
        específica para editar.
      </div>
    )
  }

  if (!region.locked) return null

  return (
    <>
      <div className="lock-banner-inner">
        🔒 Os dados desta região vêm do relatório importado — a digitação manual está desativada para
        evitar divergência com a fonte oficial.
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Habilitar edição manual
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title="Habilitar edição manual"
        description="Isso permite digitar valores manualmente nesta região. Se você importar o relatório de novo depois, a tabela volta a ficar bloqueada. Continuar?"
        confirmLabel="Continuar"
        onConfirm={() => {
          commit((s) => unlockRegion(s))
          setOpen(false)
        }}
        onOpenChange={setOpen}
      />
    </>
  )
}
