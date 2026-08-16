# RELEASE_CANDIDATE.md — Field Performance (React) v1.0.0-rc.1

Release Candidate da aplicação **Field Performance** (migração HTML/CSS/JS → React + Vite + TypeScript + Tailwind v4 + shadcn/ui + tema **Citrus**).

> Status: **v1.0.0-rc.1** — Release Candidate (não é versão definitiva de produção; não foi feito deploy).
> A aplicação legada em produção permanece **intacta** e é a versão ativa.

## Identificação

| Item | Valor |
|---|---|
| Versão | `1.0.0-rc.1` |
| Branch | `release/rc-1` |
| Commit (código RC) | `505be4a` |
| Tag | `v1.0.0-rc.1` (leve, não-definitiva; aponta para o commit final da branch com toda a documentação) |
| Localização | `react/` dentro do repositório da migração |

## Validação (nesta versão)

| Check | Resultado |
|---|---|
| Build (`npm run build`) | ✅ sucesso (4 assets; aviso de chunk >500 kB) |
| TypeScript (`tsc -b`, noEmit) | ✅ zero erros |
| Lint (`oxlint`) | ✅ zero erros (warnings de fast-refresh dos componentes shadcn) |
| Testes (`vitest run`) | ✅ **104/104** (inclui paridade Fase 9: KPIs, alerts, sobreaviso, backup real) |
| Paridade com legado | ✅ regras críticas comparadas (FINAL_AUDIT.md) |
| Dev server | ✅ HTTP 200 |

## Ambiente e variáveis necessárias

A aplicação lê a configuração Firebase de variáveis de ambiente (`.env.local`, **gitignored**):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

- `.env.example` documenta as chaves; `.env.local` contém a config real do projeto.
- A app só inicializa o Firebase se `VITE_FIREBASE_API_KEY` e `VITE_FIREBASE_PROJECT_ID` estiverem preenchidas.

## Dependências

**Runtime:** react, react-dom, firebase (modular 12.x), zustand, chart.js, react-chartjs-2, radix-ui, sonner, lucide-react, clsx, tailwind-merge, class-variance-authority, xlsx (0.18.5), date-fns, react-day-picker, tw-animate-css.

**Dev:** vite, typescript, @vitejs/plugin-react, tailwindcss, @tailwindcss/vite, vitest, jsdom, @testing-library/react, @testing-library/jest-dom, oxlint, prettier.

> Removidas nesta versão (não utilizadas): `dayjs`, `@testing-library/user-event`.

## Riscos conhecidos

1. **`xlsx@0.18.5` — audit high (sem fix no npm).**
   - Versão atual: `0.18.5`.
   - Risco: `GHSA-4r6h-8v6p-xvw6` (Prototype Pollution) e `GHSA-5pgg-2g8v-p4x9` (ReDoS) no parsing de `.xlsx`.
   - Ausência de fix disponível no pacote npm (a distribuição oficial do SheetJS é off-npm).
   - **Decisão: manter temporariamente** para preservar a paridade com o legado (que usa a mesma versão via CDN) e não introduzir segunda variável no RC.
   - **Avaliação futura:** migrar para a distribuição oficial SheetJS (xlsx ≥0.20.x) em um ambiente de teste antes da versão definitiva, validando datas/números.
2. **Bundle > 500 kB** (Firebase + Chart.js em um único chunk) — code-splitting recomendado para produção.
3. **Regras do Firestore abertas** (sem restrição por perfil no console) — legado também assim; avaliar regras de segurança antes da versão definitiva.
4. **`dangerouslySetInnerHTML`** nos Insights do modal MoM — templates fixos com dados numéricos (seguro), documentado.
5. **Validação visual final em navegador** (fluxos reais de login/importação/WhatsApp) — pendente de validação manual.

## Limitações

- Identidade visual **Citrus** (não replica o visual legado por design).
- Sem testes E2E automatizados (validação manual no navegador).
- CSVs internos (`Norte.csv`/`Sul.csv`) são locais (gitignored) e não fazem parte da app.
- `window.storage` (reserva do claude.ai) só existe naquele ambiente; fora dele o fallback é `localStorage`.

## Próximo passo

Avaliar os riscos acima, validar visualmente os fluxos reais e, somente com autorização, preparar o **deploy em ambiente separado** (GitHub Pages) — **sem substituir a produção atual**.
