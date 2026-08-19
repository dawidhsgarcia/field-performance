# ARCHITECTURE.md — Field Performance (React)

Documento de arquitetura da nova aplicação **Field Performance** (React + Vite + TypeScript), criada dentro de `react/` como cópia de migração do sistema legado em HTML/CSS/JS puro que permanece intacto na raiz do repositório.

> **Estado atual:** **PRODUÇÃO DEFINITIVA.** Migração completa — todas as fases concluídas, paridade validada (108 testes), regras de segurança do Firestore aplicadas, backup diário migrado para este repositório e sistema legado **arquivado** (read-only) em `gestao-desempenho`.

---

## 1. Stack utilizada

| Camada | Tecnologia | Versão |
|---|---|---|
| Build | Vite | 8.x |
| UI | React | 19.x |
| Linguagem | TypeScript | 6.x |
| Estilos | Tailwind CSS v4 | 4.x |
| Design System | shadcn/ui (style radix-nova, biblioteca radix-ui) | latest |
| Ícones | lucide-react | latest |
| Estado | Zustand | 5.x |
| Backend | Firebase SDK (API modular) | 12.x |
| Gráficos | chart.js + react-chartjs-2 | 4.x / 5.x |
| Planilhas | SheetJS | 0.18.5 |
| Datas | Date nativo + utils próprios | — |
| Notificações | sonner | latest |
| Animações | tw-animate-css | latest |
| Testes | Vitest + Testing Library | 4.x |
| Lint | oxlint (padrão do Vite 8) | latest |
| Formatação | Prettier | latest |

> Notas:
> - **ESLint**: o Vite 8 passa a usar `oxlint` por padrão (rápido e compatível). Mantivemos o oxlint como linter do projeto. Prettier cuida da formatação.
> - **React Router**: não utilizado. A aplicação é SPA por abas (como o legado), controlada por estado.

## 2. Estrutura de pastas

```
react/
├── src/
│   ├── main.tsx                    # bootstrap + providers
│   ├── App.tsx                     # gate de auth + navegação por abas
│   ├── index.css                   # tokens Citrus (shadcn :root/.dark) + Tailwind v4
│   ├── components/
│   │   ├── ui/                     # componentes shadcn/ui instalados
│   │   ├── layout/                 # AppLogo, ThemeToggle, Sidebar, Header, UserMenu, PagePlaceholder, LoadingScreen
│   │   ├── shared/                 # RegionFilter, RegionMonthFilter, ImportResultDialog
│   │   ├── parametros/             # ParamsForm, ColaboradoresTable, VeiculosTable, UsuariosTable, CadastroDialog, ConfirmDialog
│   │   ├── acompanhamento/         # Toolbar, MatrixTable, DayCell, JustificationSelect, GoalsTable, LockBanner, LegendCodes, SbaDialog + matrix.css
│   │   ├── dashboard/              # cards (KpiGrid, TechCards, Sparkline) · charts (Evolucao/Tendencia/MomTech) · sections (Alert/Projection) · modals (Os/Sla/Indis/TotalOs/Mom + OsTable) · PresentationOverlay
│   │   ├── combustivel/            # CombustivelToolbar, FuelKpis, FuelProductivityTable
│   │   ├── bh/                     # BhToolbar, BhKpis, BhAlerts, BhTable, BhModal
│   │   ├── tables/                 # (futuro)
│   │   ├── forms/                  # (futuro)
│   │   └── modals/                 # (futuro)
│   ├── pages/                      # LoginPage + Parâmetros, Acompanhamento, Dashboard, Combustível, Banco de Horas (migrados)
│   ├── layouts/                    # AppLayout (Header + Sidebar + Content)
│   ├── hooks/                      # useTheme, useAuthSession, useAcompanhamentoData, useMatrixFocus, useDashboardData, useSortableRows
│   ├── services/
│   │   ├── firebase/               # client, config, firestore, realtime, persistence
│   │   ├── auth/                   # login/logout/reset, users, types
│   │   ├── importers/              # xlsx, activityReport, fuelReport, bhReport
│   │   └── state.ts                # selectors + mutações puras
│   ├── stores/                     # zustand: auth, app, state, params
│   ├── utils/                      # format, date, csv, numbers, theme, rules/*
│   ├── types/                      # state, user, firebase, fuel, bh, dashboard, imports
│   ├── lib/                        # constants, env, permissions, immutable, migrateState, seed, charts
│   └── assets/                     # assets estáticos
├── .env.example                    # variáveis de ambiente documentadas
├── .env.local                      # config local (gitignored)
├── vite.config.ts / vitest.config.ts
├── components.json                 # config do shadcn/ui
└── tsconfig*.json
```

## 3. Estratégia de componentes

- **Componentes shadcn/ui** em `components/ui/` (button, input, label, select, table, tabs, card, badge, dialog, alert-dialog, sheet, dropdown-menu, tooltip, avatar, sonner, calendar, separator, skeleton, alert, textarea, checkbox).
- Componentes de negócio por domínio: `components/{layout,dashboard,tables,forms,modals}/`.
- Regras:
  - Uso de **tokens semânticos** (`bg-primary`, `text-muted-foreground`, `border-border`) — nunca hexadecimais nos componentes.
  - Componentes puros e tipados; estado global via stores (Zustand) ou props.
  - Conversão funcional (não literal) dos elementos legados: tabela da matriz e calendários são componentes próprios; modais usam `Dialog`/`Sheet`.
  - `cn()` (lib/utils) para composição de classes.

## 3.1 Componentes de layout

| Componente | Responsabilidade |
|---|---|
| `AppLogo` | Marca (SVG grid 4 quadrados) em `bg-primary`; variante `collapsed` só com o símbolo |
| `ThemeToggle` | Botão de alternância claro/escuro via `useTheme` (`Sun`/`Moon`) |
| `Sidebar` | Navegação principal (Lucide: LayoutDashboard, CalendarDays, Fuel, Clock3, Settings); estados ativo (`bg-primary` + `aria-current`) e hover; colapsável com `Tooltip`; item **Parâmetros** oculto para perfil leitura |
| `Header` | Sticky topo: hamburger (mobile → Sheet), `AppLogo`, `ThemeToggle`, `UserMenu` |
| `UserMenu` | `Avatar` (iniciais) + `DropdownMenu` (nome, e-mail · perfil) + **Sair** com `AlertDialog` de confirmação |
| `PagePlaceholder` | Título (`font-display`), descrição e empty-state — base das páginas |
| `LoadingScreen` | Tela de carregamento enquanto `auth.carregando` |

## 3.2 Layout — `layouts/AppLayout.tsx`

```
<Header /> (sticky, topo)
<div flex>
  <aside> desktop ≥ lg: sidebar fixa (w-64; w-16 colapsada) com toggle PanelLeft </aside>
  <Sheet> mobile < lg: sidebar em Sheet (hamburger; ESC/backdrop fecham) </Sheet>
  <main> conteúdo da aba ativa </main>
</div>
```
- Skip-link para o conteúdo.
- Colapso da sidebar persistido em `localStorage` (`fp-sidebar-collapsed`).

## 3.3 Navegação

- SPA por **abas** (sem router): `app.store.activeTab` (espelho do `switchTab` do legado).
- `App.tsx` resolve a página ativa; redireciona para Dashboard quando a aba ativa não é permitida (ex.: Parâmetros para perfil leitura).

## 3.4 Login e sessão

- `pages/LoginPage.tsx`: card central com marca, e-mail/senha (`Label`+`Input`), erro inline (`role="alert"`), loading no submit e **"Esqueci minha senha"** (→ `sendPasswordReset` + toast).
- `hooks/useAuthSession.ts`: inicializa o auth (`watchAuth` + `usuarios`) no mount.
- `App.tsx`: `carregando → LoadingScreen` · `!user → LoginPage` · `user → AppLayout + página ativa`.
- Ao autenticar → `state.store.loadState()` (Firestore → storage); ao deslogar → `state.store.reset()` (limpa dados).
- **Logout** com `AlertDialog` de confirmação → `signOut` → limpa sessão → redireciona ao Login.
- Persistência de sessão automática do Firebase Auth (reconexão em F5).

## 3.5 Tema

- `hooks/useTheme.tsx`: light padrão; dark via classe `.dark`; persistência na chave `gd-analise-de-performance-theme` (fallback do legado).
- Tipografia: `font-display` (**Host Grotesk**) em títulos; `font-sans` (**Onest**) na interface.

## 4. Estratégia do Design System Citrus

Citrus é o **design system oficial** da nova aplicação.

- Tokens definidos em `src/index.css` (`:root` claro + `.dark`):

| Token | Claro | Escuro |
|---|---|---|
| background | #fafafa | #0d0e0c |
| foreground | #262626 | #f2f2f0 |
| card / popover | #ffffff | #11120f |
| primary | #b8e954 | #b8e954 |
| primary-foreground | #000000 | #000000 |
| secondary | #45807a | #45807a |
| secondary-foreground | #ffffff | #ffffff |
| muted | #f5f5f5 | #1a1b19 |
| muted-foreground | #525252 | #9b9c98 |
| border | #e5e5e5 | #262a23 |
| input | #d4d4d4 | #2b2f26 |
| ring | #b8e954 | #b8e954 |

- Tokens de extensão semânticos: `success` (#39da8a) e `warning` (#fdac41), mapeando os semânticos do legado (KPIs/alertas).
- Radii: `--radius: 0.5rem` (8px) → sm 4px, md 6px, lg 8px, xl 12px (escala Citrus).
- Tipografia: `--font-display` **Host Grotesk** (títulos), `--font-sans` **Onest** (corpo/interface), `--font-mono` (dados técnicos), `--font-serif` **Lora** (editorial, reservado). Carregadas via Google Fonts no `index.html`.
- Dark mode: classe `.dark` no `<html>`. A chave de persistência é a do legado (`gd-analise-de-performance-theme`), garantindo o fallback de preferência dos usuários existentes (ver `src/hooks/useTheme.tsx`).

## 5. Estratégia Firebase

- **API modular** (SDK 12.x) com `initializeApp`/`getFirestore`/`getAuth`.
- Config via variáveis de ambiente (`VITE_FIREBASE_*`), lida em `src/lib/env.ts`; inicialização segura em `src/services/firebase/client.ts` (app só inicializa se `apiKey` + `projectId` existirem).
- Caminhos preservados do legado:
  - Documento de estado: `produtividade/estado`
  - Collection de usuários: `usuarios`
- Estrutura base pronta para a Fase 2:
  - `firestore.ts` → refs tipadas (`stateDocRef`, `usersCollectionRef`)
  - `realtime.ts` → `subscribeState` (onSnapshot)
  - `auth/index.ts` → `login`, `logout`, `sendPasswordReset`, `watchAuth`
- **Nesta fase nenhuma collection/documento foi criado ou alterado.**

## 6. Estratégia Zustand

- Store global única por domínio, criadas com `create<T>()`:
  - `auth.store.ts` — sessão/perfil
  - `app.store.ts` — aba ativa + sidebar
  - `filters.store.ts` — região + mês (UI de sessão)
  - `params.store.ts` — parâmetros (com `DEFAULT_PARAMS` espelhando o legado)
  - `acompanhamento.store.ts` — dados carregados (placeholder)
- A persistência (Firestore → `window.storage` → `localStorage`) e a migração de estado (`migrateLoadedState`) serão implementadas na Fase 2, mantendo o mesmo comportamento transacional (`_meta.version`, rebase, realtime).

## 7. Estratégia Chart.js

- **Chart.js mantido** como biblioteca de gráficos (paridade visual com o legado).
- Wrappers React via `react-chartjs-2` (Fase 6).
- Preparação:
  - `chart.js` e `react-chartjs-2` instalados.
  - Os gráficos legados (Evolução Diária, Tendência e Projeção Semanal, Evolução Diária do técnico) e o plugin customizado `autoDataLabels` serão migrados em uma etapa posterior, com atenção a DPI fracionário e `canvas.toDataURL()` (modo apresentação).

## 8. Estratégia SheetJS

- A camada de importação fica em `services/importers/`.
- Migrados na Fase 2: `xlsx.ts` (SheetJS `xlsx@0.18.5` — aba `Export` ou primeira, `sheet_to_json`), `activityReport.ts`, `fuelReport.ts` e `bhReport.ts` (parsers CSV próprios + decodificação Windows-1252 preservados).

## 9. Convenções de código

- **Sem comentários** no código (regra do AGENTS.md); nomes autoexplicativos.
- Funções/nomes em **português** (paridade com o legado); código em inglês para APIs públicas (como o legado).
- `prettier`: sem ponto-e-vírgula, aspas simples, `printWidth: 100`, `trailingComma: all`.
- Imports com alias `@/` → `src/`.
- Tipagem estrita (TS 6, `noUnusedLocals`, `verbatimModuleSyntax`, `erasableSyntaxOnly`).
- Componentes shadcn respeitam o padrão gerado pelo CLI (data-slot, cva).

## 10. Estado final (produção)

1. **Swap de produção concluído** — a app React é a versão definitiva (GitHub Pages + Vercel).
2. **Legado descontinuado e arquivado** no repositório privado `gestao-desempenho` (read-only, preservado para consulta).
3. **Regras de segurança do Firestore aplicadas** em `produtividade-regionalnorte` (RBAC admin/gestor/leitura).
4. **Backup diário migrado** para este repositório (`.github/workflows/backup-firestore.yml`), autenticado.
5. **Testes de paridade** rodando contra o backup real (`backups/` local no CI).

> Histórico: as fases 1–9 da migração foram concluídas; o legado na raiz foi removido (movido para `gestao-desempenho`) conforme planejado, sem perda de dados.
