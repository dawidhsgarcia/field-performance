import { JUSTIFICATION_CODES, JUSTIFICATION_COLORS, JUSTIFICATION_LABELS } from '@/lib/constants'

interface JustificationSelectProps {
  funci: string
  iso: string
  currentCode: string | null
  allDisabled: boolean
  scoreDisabled: boolean
  onChange: (value: string) => void
}

export function JustificationSelect({
  funci,
  iso,
  currentCode,
  allDisabled,
  scoreDisabled,
  onChange,
}: JustificationSelectProps) {
  const active = currentCode ? JUSTIFICATION_COLORS[currentCode] : null
  const title = currentCode ? JUSTIFICATION_LABELS[currentCode] : 'Escolha uma justificativa'

  return (
    <select
      className="day-select"
      data-funci={funci}
      data-iso={iso}
      style={active ? { background: active.bg, color: active.text } : undefined}
      title={title}
      disabled={allDisabled}
      defaultValue={currentCode ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">–</option>
      <option value="__SCORE__" disabled={scoreDisabled}>
        ✏️ Pontuação
      </option>
      {JUSTIFICATION_CODES.map((code) => {
        const c = JUSTIFICATION_COLORS[code]
        return (
          <option key={code} value={code} style={{ background: c.bg, color: c.text }}>
            {code}
          </option>
        )
      })}
    </select>
  )
}
