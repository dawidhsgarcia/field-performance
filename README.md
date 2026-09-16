# Field Performance — Gestão de Desempenho Operacional

Aplicação de **Gestão de Desempenho Operacional** (Alloha Fibra) para acompanhamento de produtividade de equipes de campo: Dashboard (KPIs, alertas, evolução, projeção), Acompanhamento (matriz de apontamentos, meta diária da equipe, sobreaviso), Combustível, Banco de Horas e Parâmetros.

Construída em **React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui (tema Citrus)**, com dados compartilhados no **Firebase Firestore** e autenticação por e-mail/senha com perfis (Admin / Gestor / Leitura).

> **Status:** produção definitiva. Esta aplicação substitui o sistema legado em HTML/CSS/JS puro, que está **arquivado** (read-only) no repositório `gestao-desempenho` para consulta futura.

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
- **Backup diário do Firestore:** mantido neste repositório (`.github/workflows/backup-firestore.yml`), autenticado com credenciais dedicadas (secrets `FIREBASE_BACKUP_*`), salvando em `backups/estado-*.json` (retenção de 90 dias).

## PWA / Instalação

A aplicação é uma **PWA instalável** (`vite-plugin-pwa` + Workbox):

- Instale pelo navegador (Chrome/Edge/Android: menu ⋮ → *Instalar*; iOS Safari: Compartilhar → *Adicionar à Tela de Início*).
- `npm run pwa:assets` regenera os ícones a partir de `public/pwa/logo.svg` (config em `pwa-assets.config.ts`).
- O build gera `manifest.webmanifest` e `sw.js` no `dist/` com **auto-update** silencioso e cache do app shell.
- Offline: o app shell, fontes e ícones ficam disponíveis sem rede; dados já carregados são servidos pelo cache local do Firestore (IndexedDB). **Login e dados novos exigem conexão** — tráfego autenticado (Auth/Firestore) não é interceptado pelo service worker.

```bash
npm run pwa:assets   # gera PNG/ICO em public/pwa/ (uma vez; já commitados)
npm run build        # gera dist/ com manifest.webmanifest + sw.js
npm run preview      # testa o PWA localmente (DevTools → Application)
```

## Segurança

- Autenticação obrigatória (Firebase Auth) com perfis Admin / Gestor / Leitura.
- Regras do Firestore **aplicadas em produção** (RBAC por perfil) — ver `firestore.rules` (deploy: `firebase deploy --only firestore:rules`).
- A conta `davidsgarcia.dev@gmail.com` é o admin bootstrap (`ADMIN_BOOTSTRAP_EMAIL`) e possui documento em `usuarios/{uid}` com perfil `admin`.
