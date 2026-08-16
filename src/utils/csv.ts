import { fuelNormKey } from './numbers'

export function decodeActivityText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

export function decodeFleetText(bytes: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(bytes)
}

export function parseActivityCsv(bytes: Uint8Array): Array<Record<string, unknown>> {
  let text = decodeActivityText(bytes)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const grid: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ';') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      if (field !== '' || row.length) row.push(field)
      if (row.length) grid.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    grid.push(row)
  }
  const nonEmpty = grid.filter((r) => r.some((f) => String(f).trim() !== ''))
  if (nonEmpty.length === 0) return []
  const header = nonEmpty[0].map((h) => String(h).trim())
  const out: Array<Record<string, unknown>> = []
  for (let i = 1; i < nonEmpty.length; i++) {
    const r = nonEmpty[i]
    if (r.length === 1 && String(r[0]).trim() === '') continue
    const obj: Record<string, unknown> = {}
    header.forEach((h, j) => {
      obj[h] = r[j] !== undefined && r[j] !== '' ? r[j] : null
    })
    out.push(obj)
  }
  return out
}

export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = false
        }
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') inQ = true
      else if (ch === ';') {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
  }
  out.push(cur)
  return out
}

export function parseFleetCsv(text: string): { cols: string[]; rows: string[][] } | null {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) return null
  const header = splitCsvLine(lines[0])
  const cols = header.map((h) => fuelNormKey(h))
  const rows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.length === 1 && !cells[0].trim()) continue
    rows.push(cells)
  }
  return { cols, rows }
}

export function parseBhCsv(text: string): Array<Record<string, unknown>> {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '')
  if (!lines.length) return []
  const first = lines[0]
  const delim = first.indexOf(';') !== -1 ? ';' : first.indexOf('\t') !== -1 ? '\t' : ';'
  const cells = (line: string) => {
    const out: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"'
            i++
          } else {
            inQ = false
          }
        } else {
          cur += ch
        }
      } else if (ch === '"') inQ = true
      else if (ch === delim) {
        out.push(cur)
        cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out
  }
  const header = cells(first)
  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < lines.length; i++) {
    const r = cells(lines[i])
    if (r.length === 1 && !r[0].trim()) continue
    const obj: Record<string, unknown> = {}
    header.forEach((h, j) => {
      obj[h] = r[j] !== undefined && r[j] !== '' ? r[j] : null
    })
    rows.push(obj)
  }
  return rows
}
