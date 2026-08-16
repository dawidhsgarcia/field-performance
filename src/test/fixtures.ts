import fs from 'node:fs'
import path from 'node:path'

export function readBackupFixture(name = 'estado-2026-08-14.json'): unknown | null {
  const file = path.join(process.cwd(), '..', 'backups', name)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}
