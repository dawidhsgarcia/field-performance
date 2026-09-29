import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CloudOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStateStore } from '@/stores/state.store'

const SAVED_VISIBLE_MS = 2000

/**
 * Indicador de persistência.
 *
 * O estado saveStatus já existia no store desde a migração da camada de
 * dados, mas nunca foi renderizado — foi por isso que falhas de gravação
 * ficaram invisíveis por semanas enquanto a UI mostrava "salvo com sucesso".
 *
 * Regra: 'error' é persistente e exige ação. 'saved' some sozinho.
 */
export function SaveStatusIndicator() {
  const saveStatus = useStateStore((s) => s.saveStatus)
  const saveError = useStateStore((s) => s.saveError)
  const retrySave = useStateStore((s) => s.retrySave)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (saveStatus !== 'saved') {
      setShowSaved(false)
      return
    }
    setShowSaved(true)
    const t = setTimeout(() => setShowSaved(false), SAVED_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [saveStatus])

  if (saveStatus === 'idle') return null

  if (saveStatus === 'saving') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
        title="Salvando no banco…"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        <span className="hidden sm:inline">Salvando…</span>
      </span>
    )
  }

  if (saveStatus === 'error') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-destructive"
        role="alert"
        aria-live="assertive"
      >
        {saveError?.toLowerCase().includes('firestore') ? (
          <CloudOff className="size-3.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="size-3.5" aria-hidden="true" />
        )}
        <span className="hidden md:inline" title={saveError ?? undefined}>
          Não salvo no banco
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={retrySave}
        >
          Tentar novamente
        </Button>
      </span>
    )
  }

  if (showSaved) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Check className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Salvo</span>
      </span>
    )
  }

  return null
}
