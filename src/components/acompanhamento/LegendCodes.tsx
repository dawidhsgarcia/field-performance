import { JUSTIFICATION_CODES, JUSTIFICATION_COLORS, JUSTIFICATION_LABELS } from '@/lib/constants'

export function LegendCodes() {
  return (
    <div className="acomp-legend">
      {JUSTIFICATION_CODES.map((c) => (
        <span key={c}>
          <span
            className="swatch"
            style={{ background: JUSTIFICATION_COLORS[c].bg, border: `1px solid ${JUSTIFICATION_COLORS[c].text}55` }}
          />
          <strong>{c}</strong> {JUSTIFICATION_LABELS[c]}
        </span>
      ))}
      <span>
        <span className="swatch swatch-sba" />
        <strong>SBA</strong> Sobreaviso
      </span>
    </div>
  )
}
