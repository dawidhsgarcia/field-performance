import fs from 'node:fs'
import path from 'node:path'

function findBackupFile(name: string): string | null {
  const candidates = [path.join(process.cwd(), 'backups', name), path.join(process.cwd(), '..', 'backups', name)]
  for (const file of candidates) {
    if (fs.existsSync(file)) return file
  }
  const dirs = [path.join(process.cwd(), 'backups'), path.join(process.cwd(), '..', 'backups')]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^estado-\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
    if (files.length) return path.join(dir, files[files.length - 1])
  }
  return null
}

export function readBackupFixture(name = 'estado-2026-08-14.json'): unknown | null {
  const file = findBackupFile(name)
  if (!file) return null
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}
