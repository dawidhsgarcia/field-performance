import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/parametros/ConfirmDialog'
import { useStateStore } from '@/stores/state.store'

/**
 * Ponte entre o confirmDiscard imperativo do store e um diálogo real.
 *
 * Antes, confirmDiscard era () => false e setConfirmDiscard nunca era chamado:
 * com mais de um usuário editando, toda atualização remota que chegasse no meio
 * de uma edição era descartada em silêncio, e o ConflictError seguinte fazia
 * o save falhar sem aviso. Agora o usuário decide explicitamente.
 */
export function ConflictDiscardPrompt() {
  const [open, setOpen] = useState(false)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const setConfirmDiscard = useStateStore((s) => s.setConfirmDiscard)

  const confirm = useCallback(
    (value: boolean) => {
      setOpen(false)
      const r = resolver.current
      resolver.current = null
      r?.(value)
    },
    [],
  )

  useEffect(() => {
    setConfirmDiscard(() => {
      setOpen(true)
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve
      })
    })
    return () => setConfirmDiscard(() => false)
  }, [setConfirmDiscard])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') confirm(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, confirm])

  return (
    <ConfirmDialog
      open={open}
      title="Outro usuário salvou alterações"
      description="Você tem alterações que ainda não foram salvas no banco, e outro usuário acabou de salvar. Se você continuar, as alterações dele serão substituídas pelas suas. Se cancelar, o app carregará a versão salva por ele e o que você digitou será descartado."
      confirmLabel="Manter as minhas"
      onConfirm={() => confirm(true)}
      onOpenChange={(o) => {
        if (!o) confirm(false)
      }}
    />
  )
}
