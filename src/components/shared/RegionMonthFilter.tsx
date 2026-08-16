import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RegionFilter } from '@/components/shared/RegionFilter'
import { useStateStore } from '@/stores/state.store'
import { MONTHS } from '@/utils/date'

export function RegionMonthFilter() {
  const data = useStateStore((s) => s.data)
  const setMonth = useStateStore((s) => s.setMonth)

  if (!data) return null

  const goMonth = (delta: number) => {
    let y = data.currentYear
    let m = data.currentMonth + delta
    if (m < 0) {
      m = 11
      y--
    }
    if (m > 11) {
      m = 0
      y++
    }
    setMonth(y, m)
  }

  return (
    <>
      <RegionFilter />
      <div className="flex items-center gap-1 rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => goMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[130px] text-center text-sm font-medium">
          {MONTHS[data.currentMonth]} de {data.currentYear}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => goMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </>
  )
}
