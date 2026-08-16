import fs from 'node:fs'
import path from 'node:path'

export function readBackupFixture(name = 'estado-2026-08-14.json'): unknown {
  const file = path.join(process.cwd(), '..', 'backups', name)
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}
