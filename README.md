# Field Performance — React

Nova aplicação **Field Performance** (Gestão de Desempenho Operacional), migração do legado em HTML/CSS/JS puro para **React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui (tema Citrus)**.

> **Status:** Fase 1 — setup/fundação técnica concluída. Nenhuma tela/regra migrada ainda.
> O sistema legado permanece intacto na raiz do repositório e coexiste com este projeto em `react/`.

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

- Copie `.env.example` para `.env.local` e preencha as variáveis `VITE_FIREBASE_*`.
- Detalhes de arquitetura, design system Citrus e plano de migração em `ARCHITECTURE.md` (na raiz do projeto React) e `MIGRATION_PLAN.md` (na raiz do repositório).
