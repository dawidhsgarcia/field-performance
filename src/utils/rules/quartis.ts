import type { Params } from '@/types'

export function quartilOf(avg: number | null, quartil: Params['quartil']): number | null {
  if (avg === null) return null
  if (avg > quartil.q1) return 1
  if (avg > quartil.q2) return 2
  if (avg >= quartil.q3) return 3
  return 4
}

export function minScoreForDow(dow: number, dayMeta: number[]): number {
  return dayMeta[dow]
}

export function MIN_SCORE(dayMeta: number[]): number {
  return Math.max(...dayMeta)
}
