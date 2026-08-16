import { useEffect, useMemo, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { useTheme } from '@/hooks/useTheme'
import { getCSSVar } from '@/utils/theme'
import { chartDPR, registerChartCanvas, setAutoLabel } from '@/lib/charts'
import { isoToDate } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import { importedTechs } from '@/services/state'
import { minScoreForDow } from '@/utils/rules/quartis'
import type { Params, Region, Week } from '@/types'

interface EvolucaoChartProps {
  region: Region
  weeks: Week[]
  params: Params
  currentMonth: number
}

export function EvolucaoChart({ region, weeks, params, currentMonth }: EvolucaoChartProps) {
  const { theme } = useTheme()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    registerChartCanvas('evolucao', wrapRef.current?.querySelector('canvas') ?? null)
    return () => registerChartCanvas('evolucao', null)
  }, [])

  const result = useMemo(() => {
    void theme
    const allDays = weeks.flat()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const pk = weeks[0][0].iso.slice(0, 7)
    const pastBizDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)
    if (pastBizDays.length === 0) return null

    const primary = getCSSVar('--primary') || '#2794EB'
    const success = getCSSVar('--success') || '#198754'
    const danger = getCSSVar('--danger') || '#DC3545'
    const textMut = getCSSVar('--text-mut') || '#7A8BAA'
    const surface = getCSSVar('--surface') || '#FFFFFF'

    const labels: string[] = []
    const data: number[] = []
    const colors: string[] = []
    pastBizDays.forEach((d) => {
      let achieved = 0
      let available = 0
      importedTechs(region).forEach((tech) => {
        const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
        if (typeof raw === 'string') return
        available++
        if (typeof raw === 'number') achieved += raw
      })
      const dailyAvg = available > 0 ? Math.round((achieved / available) * 100) / 100 : 0
      labels.push(d.day + '/' + (currentMonth + 1))
      data.push(dailyAvg)
      colors.push(dailyAvg < minScoreForDow(d.dow, params.dayMeta) ? danger : success)
    })

    const dailyGoals = pastBizDays.map((d) => minScoreForDow(d.dow, params.dayMeta))
    const evoMax = Math.max(...data, ...dailyGoals)
    const yMax = evoMax > 0 ? Math.ceil(evoMax * 1.2) : 4

    setAutoLabel(
      'evolucao',
      (v, idx) => {
        const goal = idx < dailyGoals.length ? dailyGoals[idx] : 0
        const pct = goal > 0 ? Math.round((Number(v) / goal) * 100) : 0
        return fmtNum(Number(v)) + '\n' + pct + '%'
      },
      (v, idx) => {
        const goal = idx < dailyGoals.length ? dailyGoals[idx] : 0
        const met = goal > 0 && Number(v) >= goal
        return [null, met ? success : null]
      },
    )

    return { labels, data, colors, primary, success, textMut, surface, yMax }
  }, [region, weeks, params, currentMonth, theme])

  if (!result) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de dias úteis para exibir.
      </div>
    )
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: chartDPR(),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
            (ctx.dataset.label ? ctx.dataset.label + ': ' : '') + fmtNum(ctx.parsed.y) + ' pts',
        },
      },
      autoDataLabels: { display: true, formatterKey: 'evolucao', colorKey: 'evolucao' },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: result.textMut, maxRotation: 0, autoSkip: false } },
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
        label: 'Média diária (equipe)',
        data: result.data,
        fill: true,
        tension: 0.35,
        borderColor: result.primary,
        backgroundColor: result.primary + '22',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 5,
        pointBackgroundColor: result.colors,
        pointBorderColor: result.surface,
        pointBorderWidth: 2,
      },
    ],
  }

  return (
    <div ref={wrapRef} className="h-[320px]">
      <Line data={data} options={options} />
    </div>
  )
}
