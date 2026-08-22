import { useEffect, useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import type { ChartOptions } from 'chart.js'
import { useTheme } from '@/hooks/useTheme'
import { getCSSVar } from '@/utils/theme'
import { chartDPR, registerChartCanvas, setAutoLabel } from '@/lib/charts'
import { isoDate, isoToDate, isoWeekOf } from '@/utils/date'
import { fmtNum } from '@/utils/format'
import { importedTechs } from '@/services/state'
import { teamDailyTrend } from '@/utils/rules/goals'
import type { AppState, Params, Region, Week } from '@/types'

interface TendenciaChartProps {
  region: Region
  weeks: Week[]
  params: Params
  currentYear: number
  currentMonth: number
  colaboradores?: AppState['colaboradores']
}

export function TendenciaChart({
  region,
  weeks,
  params,
  currentYear,
  currentMonth,
  colaboradores,
}: TendenciaChartProps) {
  const { theme } = useTheme()
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    registerChartCanvas('tendencia', wrapRef.current?.querySelector('canvas') ?? null)
    return () => registerChartCanvas('tendencia', null)
  }, [])

  const result = useMemo(() => {
    void theme
    const allDays = weeks.flat()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = isoDate(today.getFullYear(), today.getMonth(), today.getDate())
    const pk = weeks[0][0].iso.slice(0, 7)
    const pastBizDays = allDays.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)
    const projTrend = teamDailyTrend(region, pastBizDays, params, importedTechs(region, colaboradores))

    const primary = getCSSVar('--primary') || '#2794EB'
    const success = getCSSVar('--success-dark') || '#4c8a78'
    const danger = getCSSVar('--danger') || '#DC3545'
    const textMut = getCSSVar('--text-mut') || '#7A8BAA'
    const textColor = getCSSVar('--text') || '#1B2D52'

    const weekItems: Array<{ label: string; value: number; elapsed: number; isProj: boolean }> = []
    weeks.forEach((w) => {
      const bizDays = w.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) < today)
      const elapsed = bizDays.length
      let totalPts = 0
      let totalAvail = 0
      bizDays.forEach((d) => {
        importedTechs(region, colaboradores).forEach((tech) => {
          const raw = region.entries?.[pk]?.[tech.funci]?.[d.iso]
          if (typeof raw !== 'string') {
            totalAvail++
            if (typeof raw === 'number') totalPts += raw
          }
        })
      })
      const label = 'Sem ' + isoWeekOf(new Date(currentYear, currentMonth, w[0].day))
      if (w.some((d) => d.iso === todayIso)) {
        const remainingBiz = w.filter((d) => d.dow !== 0 && d.dow !== 6 && isoToDate(d.iso) >= today).length
        if (remainingBiz > 0 && projTrend != null) {
          const avgAvail = elapsed > 0 ? totalAvail / elapsed : importedTechs(region, colaboradores).length
          const estAvail = avgAvail * remainingBiz
          const projPts = totalPts + projTrend * estAvail
          const projAvail = totalAvail + estAvail
          weekItems.push({
            label,
            value: projAvail > 0 ? Math.round((projPts / projAvail) * 100) / 100 : 0,
            elapsed,
            isProj: true,
          })
          return
        }
      }
      weekItems.push({
        label,
        value: totalAvail > 0 ? Math.round((totalPts / totalAvail) * 100) / 100 : 0,
        elapsed,
        isProj: false,
      })
    })

    const shown = weekItems.filter((it) => it.elapsed > 0 || it.isProj)
    if (shown.length === 0) return null

    const weekAvgs = shown.map((it) => it.value)
    const filteredProjIndex = shown.findIndex((it) => it.isProj)
    const weekMax = Math.max(...weekAvgs)
    const yMax = weekMax > 0 ? Math.ceil(weekMax * 1.2) : 4

    setAutoLabel(
      'tendencia',
      (v, idx) => {
        const suffix = idx === filteredProjIndex ? ' proj' : ''
        if (idx === 0) return fmtNum(Number(v)) + suffix
        const prev = weekAvgs[idx - 1]
        if (!prev || prev <= 0) return fmtNum(Number(v)) + suffix
        const delta = ((Number(v) - prev) / prev) * 100
        return (delta >= 0 ? '+' : '') + Math.round(delta) + '%\n' + fmtNum(Number(v)) + suffix
      },
      (v, idx) => {
        if (idx === 0) return null
        const prev = weekAvgs[idx - 1]
        if (!prev || prev <= 0) return null
        const delta = ((Number(v) - prev) / prev) * 100
        return [delta >= 0 ? success : danger, null]
      },
    )

    return {
      labels: shown.map((it) => it.label),
      weekAvgs,
      filteredProjIndex,
      yMax,
      primary,
      success,
      danger,
      textMut,
      textColor,
    }
  }, [region, weeks, params, currentYear, currentMonth, theme, colaboradores])

  if (!result) return null

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: chartDPR(),
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; parsed: { y: number } }) =>
            (ctx.dataIndex === result.filteredProjIndex ? 'Projeção: ' : 'Média: ') +
            fmtNum(ctx.parsed.y) +
            '/dia',
        },
      },
      autoDataLabels: { display: true, formatterKey: 'tendencia', colorKey: 'tendencia' },
      totalTrend: {
        weekAvgs: result.weekAvgs,
        textColor: result.textColor,
        successColor: result.success,
        dangerColor: result.danger,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: result.textMut } },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: { display: false },
        beginAtZero: true,
        max: result.yMax,
      },
    },
  } as unknown as ChartOptions<'bar'>

  const data = {
    labels: result.labels,
    datasets: [
      {
        label: 'Média semanal',
        data: result.weekAvgs,
        backgroundColor: result.primary,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.6,
        maxBarThickness: 48,
      },
    ],
  }

  return (
    <div ref={wrapRef} className="h-[320px]">
      <Bar data={data} options={options} />
    </div>
  )
}
