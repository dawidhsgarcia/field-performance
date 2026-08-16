import * as XLSX from 'xlsx'

export function readSheetRows(bytes: Uint8Array): Array<Record<string, unknown>> {
  const wb = XLSX.read(bytes, { type: 'array' })
  const ws = wb.Sheets['Export'] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: null })
}
