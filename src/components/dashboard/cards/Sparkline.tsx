import { getCSSVar } from '@/utils/theme'

interface SparklineProps {
  values: number[]
  quartil: number
  maxScore: number
}

export function Sparkline({ values, quartil, maxScore }: SparklineProps) {
  const sparkW = 100
  const sparkH = 28

  const palette: Record<number, string> = {
    1: getCSSVar('--success-dark') || '#4c8a78',
    2: getCSSVar('--q2') || '#9fadc7',
    3: getCSSVar('--warning') || '#FFC107',
    4: getCSSVar('--danger') || '#DC3545',
  }
  const lineColor = palette[quartil] ?? '#9CA3AF'
  const fillColor = `color-mix(in srgb, ${lineColor} 10%, transparent)`

  if (values.length >= 2) {
    const maxVal = Math.max(...values, maxScore)
    const range = maxVal || 1
    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * sparkW
        const y = sparkH - ((v - 0) / range) * (sparkH - 4) - 2
        return `${Math.round(x)},${Math.round(y)}`
      })
      .join(' ')
    const fillPoints = `0,${sparkH} ${points} ${sparkW},${sparkH}`
    return (
      <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
        <polygon points={fillPoints} fill={fillColor} />
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (values.length === 1) {
    const y = sparkH / 2
    return (
      <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="h-7 w-full" aria-hidden="true">
        <circle cx={sparkW / 2} cy={y} r={3} fill={lineColor} />
      </svg>
    )
  }

  return (
    <div className="text-center text-[9px] leading-7 text-muted-foreground">sem dados</div>
  )
}
