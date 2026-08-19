import fs from 'node:fs';
import path from 'node:path';

const PROJECT = 'produtividade-regionalnorte';
const URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/produtividade/estado`;
const OUT_DIR = path.join(process.cwd(), 'backups');
const KEEP = 90;

const API_KEY = process.env.FIREBASE_API_KEY;
const BACKUP_EMAIL = process.env.FIREBASE_BACKUP_EMAIL;
const BACKUP_PASSWORD = process.env.FIREBASE_BACKUP_PASSWORD;

if(!API_KEY || !BACKUP_EMAIL || !BACKUP_PASSWORD){
  throw new Error('Faltam variáveis de ambiente: FIREBASE_API_KEY, FIREBASE_BACKUP_EMAIL, FIREBASE_BACKUP_PASSWORD');
}

async function getToken(){
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BACKUP_EMAIL, password: BACKUP_PASSWORD, returnSecureToken: true }),
  });
  if(!res.ok) throw new Error(`Falha ao autenticar no Firebase Auth (HTTP ${res.status}): ${await res.text()}`);
  const data = await res.json();
  if(!data.idToken) throw new Error('Sem idToken na resposta do Firebase Auth');
  return data.idToken;
}

function convert(v){
  if(v === null || typeof v !== 'object') return v;
  if('stringValue' in v) return v.stringValue;
  if('integerValue' in v) return Number(v.integerValue);
  if('doubleValue' in v) return Number(v.doubleValue);
  if('booleanValue' in v) return v.booleanValue;
  if('nullValue' in v) return null;
  if('timestampValue' in v) return v.timestampValue;
  if('referenceValue' in v) return v.referenceValue;
  if('bytesValue' in v) return v.bytesValue;
  if('geoPointValue' in v) return v.geoPointValue;
  if(v.mapValue){
    const fields = v.mapValue.fields || {};
    const out = {};
    for(const k of Object.keys(fields).sort()) out[k] = convert(fields[k]);
    return out;
  }
  if(v.arrayValue){
    return (v.arrayValue.values || []).map(convert);
  }
  return v;
}

const token = await getToken();
const res = await fetch(URL, {
  headers: { Authorization: `Bearer ${token}` },
});
if(!res.ok) throw new Error(`Falha ao baixar o documento (HTTP ${res.status}): ${await res.text()}`);
const doc = await res.json();
const fields = doc.fields || {};
const plain = {};
for(const k of Object.keys(fields).sort()) plain[k] = convert(fields[k]);

fs.mkdirSync(OUT_DIR, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const file = path.join(OUT_DIR, `estado-${date}.json`);
fs.writeFileSync(file, JSON.stringify(plain, null, 2) + '\n');
console.log(`Backup salvo: ${file} (${fs.statSync(file).size} bytes)`);

const files = fs.readdirSync(OUT_DIR)
  .filter(f => /^estado-\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort();
while(files.length > KEEP){
  fs.rmSync(path.join(OUT_DIR, files.shift()));
}
console.log(`Retenção: ${files.length} backup(s) mantidos (máx ${KEEP})`);
