import { useState, type FocusEvent } from 'react'
import { toast } from 'sonner'
import { ALL_REGION, JUSTIFICATION_CODES } from '@/lib/constants'
import { mutateEntry } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { JustificationSelect } from './JustificationSelect'
import type { EntryValue } from '@/types'

interface DayCellProps {
  funci: string
  iso: string
  value: EntryValue | null
  weekend: boolean
  regionLocked: boolean
  sbaOn: boolean
  onFocusRequest: (funci: string, iso: string) => void
}

export function DayCell({
  funci,
  iso,
  value,
  weekend,
  regionLocked,
  sbaOn,
  onFocusRequest,
}: DayCellProps) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const [scoreMode, setScoreMode] = useState(false)

  const allDisabled = !data || data.currentRegion === ALL_REGION || !can('editarMatriz')
  const scoreDisabled = regionLocked || allDisabled
  const showInput = scoreMode || typeof value === 'number'

  function commitValue(next: EntryValue | null) {
    if (!data || data.currentRegion === ALL_REGION || !can('editarMatriz')) return
    commit((s) => mutateEntry(s, funci, iso, next))
    if (next === null) setScoreMode(false)
    onFocusRequest(funci, iso)
  }

  function handleInputCommit(e: FocusEvent<HTMLInputElement>) {
    const el = e.currentTarget
    const raw = el.value.trim()
    const previous = typeof value === 'number' ? String(value) : ''

    if (raw === '') {
      commitValue(null)
      return
    }
    const code = raw.toUpperCase()
    if ((JUSTIFICATION_CODES as readonly string[]).includes(code)) {
      commitValue(code)
      return
    }
    const num = parseFloat(raw.replace(',', '.'))
    if (isNaN(num)) {
      toast.error(
        `Valor inválido. Digite uma pontuação (número) ou uma justificativa: ${JUSTIFICATION_CODES.join(', ')}.`,
      )
      el.value = previous
      return
    }
    if (regionLocked) {
      toast.error(
        `Esta região está com a pontuação bloqueada (os dados vêm do relatório importado). Você ainda pode digitar uma justificativa (${JUSTIFICATION_CODES.join(', ')}) em dias sem produção.`,
      )
      el.value = previous
      return
    }
    commitValue(num)
  }

  const cellClass = ['day-cell', weekend && 'weekend', sbaOn && 'sba-on'].filter(Boolean).join(' ')

  return (
    <td className={cellClass} title={sbaOn ? 'Sobreaviso' : undefined}>
      {showInput ? (
        <input
          type="text"
          maxLength={6}
          placeholder="–"
          data-funci={funci}
          data-iso={iso}
          defaultValue={typeof value === 'number' ? String(value) : ''}
          disabled={regionLocked}
          title={regionLocked ? 'Pontuação vinda do relatório importado' : undefined}
          onBlur={handleInputCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
      ) : (
        <JustificationSelect
          funci={funci}
          iso={iso}
          currentCode={typeof value === 'string' ? value : null}
          allDisabled={allDisabled}
          scoreDisabled={scoreDisabled}
          onChange={(v) => {
            if (v === '__SCORE__') {
              setScoreMode(true)
              onFocusRequest(funci, iso)
              return
            }
            commitValue(v === '' ? null : v)
          }}
        />
      )}
      {sbaOn && <i className="sba-dot" />}
    </td>
  )
}
