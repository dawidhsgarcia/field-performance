import { Chart, registerables, type Plugin } from 'chart.js'
import { getCSSVar } from '@/utils/theme'

Chart.register(...registerables)

type AutoLabelFormatter = (
  value: unknown,
  index: number,
  data: Chart['data'],
  dataset: Chart['data']['datasets'][number],
) => string | null | undefined

type AutoLabelColor = (
  value: unknown,
  index: number,
  data: Chart['data'],
  dataset: Chart['data']['datasets'][number],
) => string | Array<string | null> | null

const formatters: Record<string, AutoLabelFormatter> = {}
const colors: Record<string, AutoLabelColor> = {}

export function setAutoLabel(key: string, formatter: AutoLabelFormatter, colorFn?: AutoLabelColor) {
  formatters[key] = formatter
  if (colorFn) colors[key] = colorFn
}

const autoDataLabels: Plugin = {
  id: 'autoDataLabels',
  afterDatasetsDraw(chart) {
    const opts = ((chart.options.plugins as unknown as Record<string, unknown>)?.autoDataLabels || {}) as {
      display?: boolean
      formatterKey?: string
      colorKey?: string
    }
    if (!opts.display) return
    const ctx = chart.ctx
    const textColor = getCSSVar('--text-mut') || '#7A8BAA'
    const fontFamily = getCSSVar('--font-ui') || 'Inter, sans-serif'
    const formatter = opts.formatterKey ? formatters[opts.formatterKey] : null
    const colorFn = opts.colorKey ? colors[opts.colorKey] : null
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return
      meta.data.forEach((el, i) => {
        const value = dataset.data[i]
        if (value === null || value === undefined || !el) return
        let text: string | null | undefined
        if (typeof formatter === 'function') text = formatter(value, i, chart.data, dataset)
        else text = String(value)
        if (text === undefined || text === null || text === '') return
        const pos = el.tooltipPosition ? el.tooltipPosition(false) : (el as { x: number; y: number })
        if (!pos) return
        const lines = String(text).split('\n')
        const lineH = 12
        const base = (el as { base?: number }).base
        const elY = el.y ?? 0
        const top = typeof base === 'number' ? Math.min(elY, base) : (pos.y ?? 0)
        const ca = chart.chartArea
        const bottomLimit = ca ? (ca.bottom ?? 0) - 2 : top - 4
        const topLimit = ca ? (ca.top ?? 0) + 12 + (lines.length - 1) * lineH : top - 4
        const labelBottom = Math.min(Math.max(top - 4, topLimit), bottomLimit)
        const colorValue = typeof colorFn === 'function' ? colorFn(value, i, chart.data, dataset) : null
        ctx.save()
        ctx.font = '600 11px ' + fontFamily
        ctx.fillStyle = textColor
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        lines.forEach((line, li) => {
          const c = Array.isArray(colorValue) ? colorValue[li] : colorValue
          ctx.fillStyle = c || textColor
          ctx.fillText(line, pos.x ?? 0, labelBottom - (lines.length - 1 - li) * lineH)
        })
        ctx.restore()
      })
    })
  },
}

const totalTrend: Plugin = {
  id: 'totalTrend',
  afterDraw(chart) {
    const opts = ((chart.options.plugins as unknown as Record<string, unknown>)?.totalTrend || {}) as {
      weekAvgs?: number[]
      textColor?: string
      successColor?: string
      dangerColor?: string
    }
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const top = chartArea.top ?? 0
    const left = chartArea.left ?? 0
    const weekAvgs = opts.weekAvgs || []
    const first = weekAvgs[0]
    const last = weekAvgs[weekAvgs.length - 1]
    if (first == null || last == null || first <= 0) return
    const delta = ((last - first) / first) * 100
    const color = delta >= 0 ? opts.successColor : opts.dangerColor
    const arrow = delta >= 0 ? '↑' : '↓'
    const pctStr = arrow + ' ' + Math.abs(Math.round(delta)) + '%'
    ctx.save()
    ctx.font = '600 12px Inter, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = opts.textColor || '#1B2D52'
    ctx.fillText('Mensal ', left + 8, top + 8)
    const mensalW = ctx.measureText('Mensal ').width
    ctx.fillStyle = color || '#1B2D52'
    ctx.fillText(pctStr, left + 8 + mensalW, top + 8)
    ctx.restore()
  },
}

Chart.register(autoDataLabels, totalTrend)

const canvasRegistry: { evolucao?: HTMLCanvasElement; tendencia?: HTMLCanvasElement } = {}

export function registerChartCanvas(
  key: 'evolucao' | 'tendencia',
  el: HTMLCanvasElement | null,
) {
  if (el) canvasRegistry[key] = el
  else delete canvasRegistry[key]
}

export function getChartCanvas(key: 'evolucao' | 'tendencia'): HTMLCanvasElement | null {
  return canvasRegistry[key] || null
}

export function chartDPR(): number {
  return Math.ceil(window.devicePixelRatio || 1)
}
