import fs from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : null
}

const saPath = process.env.FIREBASE_HOMOLOG_SERVICE_ACCOUNT
if (!saPath) {
  console.error('FALTA a env FIREBASE_HOMOLOG_SERVICE_ACCOUNT (caminho do service account JSON do projeto de homologação).')
  process.exit(1)
}
const source = arg('--source')
if (!source) {
  console.error('Uso: node scripts/seed-homolog.mjs --source <backup.json>')
  process.exit(1)
}
if (!fs.existsSync(source)) {
  console.error('Arquivo de origem não encontrado:', source)
  process.exit(1)
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
const app = initializeApp({ credential: cert(sa), projectId: sa.project_id })
const db = getFirestore(app)

const data = JSON.parse(fs.readFileSync(source, 'utf-8'))
if (!data || !data.regions) {
  console.error('O arquivo não parece ser um estado válido do Field Performance (faltam regions).')
  process.exit(1)
}

await db.collection('produtividade').doc('estado').set(data)
console.log('Seed ok: produtividade/estado <-', source, `(${fs.statSync(source).size} bytes)`)
console.log('Projeto:', sa.project_id)
process.exit(0)
