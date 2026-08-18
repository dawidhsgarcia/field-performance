# Field Performance — Gestão de Desempenho Operacional

Aplicação de **Gestão de Desempenho Operacional** (Alloha Fibra) para acompanhamento de produtividade de equipes de campo: Dashboard (KPIs, alertas, evolução, projeção), Acompanhamento (matriz de apontamentos, meta diária da equipe, sobreaviso), Combustível, Banco de Horas e Parâmetros.

Construída em **React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui (tema Citrus)**, com dados compartilhados no **Firebase Firestore** e autenticação por e-mail/senha com perfis (Admin / Gestor / Leitura).

> **Status:** produção definitiva. Esta aplicação substitui o sistema legado em HTML/CSS/JS puro.

## Scripts

```bash
npm run dev          # dev server (Vite)
npm run build        # typecheck + build de produção
npm run preview      # prévia do build
npm run typecheck    # TypeScript (tsc -b)
npm run lint         # oxlint
npm run test         # Vitest (run)
npm run test:watch   # Vitest (watch)
```

## Configuração

- Copie `.env.example` para `.env.local` e preencha as variáveis `VITE_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
- A aplicação só inicializa o Firebase se `VITE_FIREBASE_API_KEY` e `VITE_FIREBASE_PROJECT_ID` estiverem preenchidas.

## Deploy

- **GitHub Pages:** o workflow `.github/workflows/deploy.yml` (typecheck + lint + test + build) publica o `dist/` em cada push para `main`.
- **Vercel:** as mesmas 6 variáveis `VITE_FIREBASE_*` são aplicadas em Production/Preview/Development.
- Backup diário do Firestore: mantido no repositório privado `gestao-desempenho` (`.github/workflows/backup-firestore.yml`).

## Segurança

- Autenticação obrigatória (Firebase Auth) com perfis Admin / Gestor / Leitura.
- Regras do Firestore restringem escrita por perfil — ver `firestore.rules`.
