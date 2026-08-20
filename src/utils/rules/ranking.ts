import type { AppState, Params, Region, RankingRow, Week } from '@/types'
import { isoToDate } from '@/utils/date'
import { quartilOf } from './quartis'
import { importedTechs } from '@/services/state'

export function computeRanking(
  region: Region,
  weeks: Week[],
  params: Params,
  today: Date,
  colaboradores?: AppState['colaboradores'],
): RankingRow[] {
  const allDays: Week[number][] = []
  weeks.forEach((w) => w.forEach((d) => allDays.push(d)))
  const pk = weeks[0][0].iso.slice(0, 7)

  const businessDays = allDays.filter((d) => {
    if (d.dow === 0 || d.dow === 6) return false
    return isoToDate(d.iso) < today
  })

  const rows: RankingRow[] = importedTechs(region, colaboradores).map((tech) => {
    let sum = 0
    let days = 0
    businessDays.forEach((d) => {
      const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
      if (typeof raw === 'string') return
      if (typeof raw === 'number') sum += raw
      days++
    })
    const avg = days > 0 ? sum / days : null
    return { tech, sum, days, avg, quartil: quartilOf(avg, params.quartil) }
  })

  rows.sort((a, b) => {
    if (a.avg === null && b.avg === null) return 0
    if (a.avg === null) return 1
    if (b.avg === null) return -1
    return b.avg - a.avg
  })

  return rows
}
