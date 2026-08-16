import fs from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const saPath = process.env.FIREBASE_HOMOLOG_SERVICE_ACCOUNT
if (!saPath) {
  console.error('FALTA a env FIREBASE_HOMOLOG_SERVICE_ACCOUNT (caminho do service account JSON do projeto de homologação).')
  process.exit(1)
}

const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'))
const app = initializeApp({ credential: cert(sa), projectId: sa.project_id })
const db = getFirestore(app)

await db.collection('produtividade').doc('estado').delete()
console.log('Reset ok: produtividade/estado removido (a app recria o estado padrão ao carregar).')
console.log('Projeto:', sa.project_id)
console.log('Lembre: usuários do Auth e a collection usuarios são por projeto — limpe no console do Firebase (Auth + Firestore usuarios).')
process.exit(0)
