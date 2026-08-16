import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { useTheme } from '@/hooks/useTheme'
import { getCSSVar } from '@/utils/theme'
import { chartDPR, setAutoLabel } from '@/lib/charts'
import { isoToDate, pad } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import { minScoreForDow } from '@/utils/rules/quartis'
import type { Params, Region } from '@/types'

interface MomTechChartProps {
  region: Region
  funci: string
  pk: string
  params: Params
  currentMonth: number
}

export function MomTechChart({ region, funci, pk, params, currentMonth }: MomTechChartProps) {
  const { theme } = useTheme()

  const result = useMemo(() => {
    void theme
    const y = Number(pk.slice(0, 4))
    const m = Number(pk.slice(5, 7)) - 1
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const allDays: Array<{ day: number; dow: number; iso: string }> = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(y, m, day).getDay()
      allDays.push({ day, dow, iso: `${y}-${pad(m + 1)}-${pad(day)}` })
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bizDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)

    const c = {
      primary: getCSSVar('--primary') || '#2794EB',
      success: getCSSVar('--success') || '#198754',
      warning: getCSSVar('--warning') || '#FFC107',
      danger: getCSSVar('--danger') || '#DC3545',
      textMut: getCSSVar('--text-mut') || '#7A8BAA',
      surface: getCSSVar('--surface') || '#FFFFFF',
    }

    const labels: string[] = []
    const data: number[] = []
    const pointColors: string[] = []
    const goals: number[] = []
    bizDays.forEach((d) => {
      const raw = region.entries?.[pk]?.[funci]?.[d.iso]
      if (typeof raw === 'string') return
      const goal = minScoreForDow(d.dow, params.dayMeta)
      labels.push(d.day + '/' + (currentMonth + 1))
      goals.push(goal)
      if (typeof raw === 'number') {
        data.push(raw)
        pointColors.push(raw >= goal ? c.success : raw >= params.quartil.q3 ? c.warning : c.danger)
      } else {
        data.push(0)
        pointColors.push(c.textMut)
      }
    })

    const hasNumeric = data.some((v) => v !== 0)
    if (bizDays.length === 0 || !hasNumeric) return null

    const maxVal = Math.max(...data, ...goals)
    const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.2) : 4

    setAutoLabel(
      'momTechDaily',
      (v, idx) => {
        if (v === null || v === undefined) return ''
        const goal = idx < goals.length ? goals[idx] : 0
        const pct = goal > 0 ? Math.round((Number(v) / goal) * 100) : 0
        return fmtNum(Number(v)) + '\n' + pct + '%'
      },
      (v, idx) => {
        if (v === null || v === undefined) return null
        const goal = idx < goals.length ? goals[idx] : 0
        return [null, goal > 0 && Number(v) >= goal ? c.success : null]
      },
    )

    return { labels, data, pointColors, c, yMax }
  }, [region, funci, pk, params, currentMonth, theme])

  if (!result) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Sem produção no período.</div>
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: chartDPR(),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            'Pontos do dia: ' + (ctx.parsed.y === null ? '—' : fmtNum(ctx.parsed.y)),
        },
      },
      autoDataLabels: { display: true, formatterKey: 'momTechDaily', colorKey: 'momTechDaily' },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: result.c.textMut, maxRotation: 0, autoSkip: false },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { display: false },
        beginAtZero: true,
        max: result.yMax,
      },
    },
  } as unknown as ChartOptions<'line'>

  const data = {
    labels: result.labels,
    datasets: [
      {
        label: 'Pontos do dia',
        data: result.data,
        fill: true,
        tension: 0.35,
        borderColor: result.c.primary,
        backgroundColor: result.c.primary + '22',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: result.pointColors,
        pointBorderColor: result.c.surface,
        pointBorderWidth: 2,
        spanGaps: true,
      },
    ],
  }

  return (
    <div className="h-[220px]">
      <Line data={data} options={options} />
    </div>
  )
}
