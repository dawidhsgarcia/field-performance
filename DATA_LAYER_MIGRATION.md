# DATA_LAYER_MIGRATION.md — Camada de dados (Fase 2)

Documentação da migração da **camada de dados** do legado (HTML/CSS/JS puro) para **React + TypeScript** dentro de `react/`. Esta fase cobre Firebase, Auth, Firestore, realtime, concorrência, parsers, regras de negócio puras, datas e Zustand — **sem telas** e **sem alterar o legado**.

> Status: Fase 2 concluída em 15/08/2026. Validação: `typecheck` ✓, `build` ✓, `lint` ✓, `test` 74/74 ✓.

---

## 1. Firebase

### 1.1 Configuração
- Legado: `firebaseConfig` embutido no `state.js`, inicializado com API compat (`firebase.initializeApp`).
- Novo: configuração via variáveis de ambiente (`VITE_FIREBASE_*`) lidas em `src/lib/env.ts` (`firebaseConfig` + `hasFirebaseConfig()`). `.env.example` documenta as chaves; `.env.local` (gitignored) contém a config real do projeto. `src/services/firebase/config.ts` re-exporta.
- Inicialização segura em `src/services/firebase/client.ts` (API **modular v12**): app só inicializa se `apiKey` e `projectId` existirem (espelho do guard `if(window.firebase)`).

### 1.2 Módulos `src/services/firebase/`
| Arquivo | Papel |
|---|---|
| `config.ts` | re-export de `firebaseConfig`/`hasFirebaseConfig` |
| `client.ts` | `initializeApp`, `getFirestore`, `getAuth` (singleton) |
| `firestore.ts` | refs tipadas: `stateDocRef()` (`produtividade/estado`) e `usersCollectionRef()` (`usuarios`) — **caminhos e nomes preservados** |
| `realtime.ts` | `subscribeState(cb)` — `onSnapshot` do documento de estado |
| `persistence.ts` | `fetchState`, `saveToFirestore` (transação + retry), `saveWithRebase`, `reloadStateFromCloud`, `hasStateDoc` |

## 2. Autenticação — `src/services/auth/` + `src/stores/auth.store.ts`

| Arquivo | Conteúdo |
|---|---|
| `types.ts` | `AuthUser`, `Perfil`, `UserSession`, `AuthResult` |
| `index.ts` | `watchAuth`, `login`, `logout`, `sendPasswordReset` com **mensagens pt-BR idênticas** ao legado |
| `users.ts` | `loadUsuarios` (onSnapshot), `createUsuario` (**REST `accounts:signUp`** — mantém a sessão do admin), `updateUsuario`, `removeUsuario` |
| `lib/permissions.ts` | `PERFIS`, `PERMISSOES` (11 ações × 3 perfis), `can(perfil, acao)`, `applyAuthSession` (usuário → admin bootstrap `davidsgarcia.dev@gmail.com` → leitura) |
| `stores/auth.store.ts` | sessão (`user`, `perfil`, `carregando`), `init()` (watches), `login/logout/resetPassword`, `can(acao)` |

> Tela de login **não** foi migrada (Fase 3). O fluxo de autenticação é preservado.

## 3. Firestore / realtime / concorrência

Mecanismo migrado **fielmente** em `src/services/firebase/persistence.ts` + `src/stores/state.store.ts`:

1. **Gravação transacional** (`saveToFirestore`): lê o doc dentro de `runTransaction`, compara `_meta.version` local × remota; divergência → `ConflictError` → retry otimista até 3 tentativas; a versão local só avança em transação confirmada.
2. **Rebase** (`saveWithRebase`): em conflito, `reloadStateFromCloud()` (recarrega o remoto sem perguntar) → aplica `reapply()` sobre o estado novo → tenta de novo. Usado pela importação do relatório (`persistImport` → `importActivityReport` da store).
3. **Realtime com supressão de eco** (`startRealtime` na store): ignora atualizações onde `remoteAt <= localAt` (e versão ≤); se há edições não salvas (`dirty`), consulta `confirmDiscard()` (callback injetável — na Fase 2 o padrão é `() => false`, preservando o dado local na ausência de UI); preserva `currentRegion/currentYear/currentMonth` ao aplicar o remoto.
4. **`scheduleSave`**: debounce de 400ms; persiste Firestore → `window.storage` → `localStorage` (mesma ordem do legado); status exposto como `saveStatus` na store (DOM do indicador na Fase 3).
5. **`serializeState`**: remove `currentYear/currentMonth` (UI de sessão) antes de gravar.

## 4. Persistência — `src/services/storage/local.ts`
- `loadFromStorage()`: `window.storage` (claude.ai) → `localStorage`, ambos passando por `migrateState`.
- `saveToStorage(state)`: reserva local com a mesma precedência.
- `STORAGE_KEY = 'produtividade-alpha-solucoes-v3'` preservado.

## 5. Migração de estado — `src/lib/migrateState.ts`
Port fiel de `migrateLoadedState`: redefine mês para atual, deriva flag `imported` das `entries` (e corrige `imported:true` sem entries), backfill de `colaboradores` (função/telefone), migração SLA antiga → `region.sla[period]`, limpa campos órfãos (`rankingMode`, `avaliacoes`, `activityCounts`, `avaliacaoCriterios`, `minScore`→`dayMeta`), normaliza veículos/orçamento, BH (`folgas`, `period`, backfill one-shot das células `'BH'`), `sobreaviso` (normaliza/ordena ISO). **Retrocompatível com os backups em `../backups/`.**

## 6. Entidades (tipos) — `src/types/`
Espelho exato do `state` do legado (MEMORIA.md §4), sem campos inventados:
- `state.ts`: `AppState` (com `_meta`, `currentRegion/currentYear/currentMonth`), `Region`, `Technician`, `RegionSla`, `OsDetail`, `Params`, `Veiculo`, `Colaborador`.
- `fuel.ts`: `FuelPeriod`, `FuelSummary`, `FuelVehicle` (+`mercadorias`), `FuelDaily`, `FuelByDriver`.
- `bh.ts`: `BhBaseEntry`, `BhState`, `BhCompensated`.
- `dashboard.ts`: `Week`, `RankingRow`, `TeamGoalsSummary`, `TeamOverview`, `ProjectionRow/Result`, `AlertItem`, `DashboardKpis`, `MomStats`.
- `imports.ts`: `ActivityReportSummary`, `FuelImportSummary`, `BhImportSummary`, `ImportOutcome<T>`.
- `user.ts`: `Perfil`, `Permissao`, `AuthUser`. `firebase.ts`: `FirebaseEnvConfig`.

## 7. Parsers / importadores — `src/services/importers/`
- `xlsx.ts`: `readSheetRows` via **SheetJS `xlsx@0.18.5`** (mesma versão do CDN do legado), aba `Export` (ou primeira), `sheet_to_json(ws, {defval:null})`.
- `activityReport.ts`: `applyActivityReport(rawRows, regionId, state) → ImportOutcome<ActivityReportSummary>` — port integral do `import.js`. Regras preservadas: dia de produção = **fechamento**; `expurgo_dupla` descartado; baremo somado por dia (`Math.round(x*100)/100`); SLA por OS/tech/atividade (exclui `APOIO`); cria técnicos (`imported:true`) e colaboradores; `locked=true`; `bestPeriod`; `alert()` → `message` no retorno.
- `fuelReport.ts`: `applyFuelReport(text, state)` — parser `;` Windows-1252 (feito upstream), datas `dd/MM/yyyy` locais, ignora Lava-Rápido/Equipamentos, km plausível (`0<km≤30×litros`), agrega `summary/vehicles/daily/byDriver`.
- `bhReport.ts`: `applyBhReport(rawRows, state)` (substitui `base`, **preserva `folgas`**), período 15→14, `bhCalRange` (end exclusivo dia 15), `bhCompensated` (8h/4h, domingo fora), `bhScheduledDays`, `bhToggleFolga` (guardas domingo/range/máx), `bhBaseEntry`.

## 8. Regras de negócio puras — `src/utils/rules/`

Todas recebem parâmetros explícitos (`region`, `weeks`, `params`, `today`) — sem globais. Port sem alterar fórmula, arredondamento ou limites. **Documentação por regra (regra original / entrada / saída / exemplo / implementação TS):**

### 8.1 Quartis — `quartis.ts`
- **Original:** `quartilOf(avg)` (render.js:193): `avg > q1 → 1`, `> q2 → 2`, `>= q3 → 3`, senão `4`; `null → null`.
- **Entrada:** média `number|null`, `quartil {q1,q2,q3}`.
- **Saída:** quartil 1–4 ou `null`.
- **Exemplo:** q1=3.5/q2=2.5/q3=1.0 → `4.0→1`, `3.0→2`, `1.0→3`, `0.9→4`, `null→null`.
- **TS:** `quartilOf(avg, quartil)` + `minScoreForDow(dow, dayMeta)` + `MIN_SCORE(dayMeta)`.

### 8.2 Ranking / D-1 — `ranking.ts`
- **Original:** `computeRanking(region, weeks)` (render.js:294).
- **Entrada:** `region`, `weeks` (dias com `{day,dow,iso}`), `params`, `today`.
- **Saída:** `RankingRow[]` ordenadas por média desc.
- **Regras:** dias úteis **até D-1** (`dateObj < today`); justificativa não entra no denominador; celas em branco **contam** no denominador; média = soma ÷ dias úteis decorridos.
- **Exemplo:** jul/2026, today=15, entries `01=4, 02='BH'` → `sum=4`, `days=9`, `avg=0.444…`.

### 8.3 Metas da equipe — `goals.ts`
- **Original:** `computeTeamGoalsSummary` (dashboard.js:799).
- **Entrada/regras:** esperado = disponíveis × `dayMeta[dow]`; `totalAchieved/totalExpectedPast` **até D-1**; `pct = realizado/esperado(D-1)`.
- **Saída:** `TeamGoalsSummary {pct, totalAchieved, totalExpected, totalExpectedPast, businessDays}`.

### 8.4 Overview / indisponibilidade — `goals.ts`
- **Original:** `computeTeamOverview` (dashboard.js:996).
- **Regras:** justificativas contam no **mês inteiro** (inclusive futuros); `unavailPct = justificados ÷ (técnicos × dias úteis)`; dias improdutivos só em dias passados (`null`/`0`); ordena por improdutivos desc.
- **Saída:** `TeamOverview`.

### 8.5 Projeção — `projection.ts`
- **Original:** `computeProjection(region, weeks)` (dashboard.js:1073).
- **Regras:** passado `< today`; **futuro `>= today` (o dia atual conta como restante)**; tendência = últimas pontuações numéricas até `trendWindow`; fallback tendência → média; `projectedSum = sum + fallback × remaining`; `projectedAvg = projectedSum ÷ (days + remaining)`; ordena por `projectedAvg` desc.
- **Saída:** `ProjectionResult {rows, remaining}`.

### 8.6 KPIs e alertas — `kpis.ts`
- **Original:** bloco de KPIs (dashboard.js:37-101) e 4 regras de alerta (dashboard.js:196-273).
- **KPIs:** SLA `% = round(onTime/evaluated*100)` (≥90 ok, <70 crítico); Meta da Equipe `%` (≥100 ok, < `alertTeam.belowPct` crítico); Média da Equipe (`≥q1` ok, `<alertTech.below` crítico); Total de OS; Total de Pontos; Indisponibilidade Técnica (≥20 crítico, ≥10 aviso).
- **Alertas:** (1) técnico `< alertTech.below` pts por `streak`+ dias consecutivos (crítico); (2) equipe `< alertTeam.belowPct`% por `streak`+ dias (aviso, dias sem lançamento não quebram a sequência); (3) projeção `< alertProjection.belowPct`% (aviso); (4) sem alertas → "Tudo certo!".
- **Saída:** `DashboardKpis`, `AlertItem[]`.

## 9. Datas — `src/utils/date.ts`
Documentação do **modelo misto** preservado (sem "correção" de fuso):
- **UTC-naive (imports/activity/BH):** `parseUsDateTime` ("7/6/2026 4:43:00 PM" → Date UTC lido com `getUTC*`), `excelSerialToDate` (normaliza meia-noite UTC para evitar deslocamento em TZ negativas), `excelSerialToDateTime` (preserva hora), `fmtDateTime`, `bhParseDate` (UTC-midnight).
- **Local (fuel):** `parseFleetDate` (`dd/MM/yyyy HH:mm`, `new Date(y,m-1,d)`).
- **UI/sessão:** `buildWeeks`, `isoWeekOf` (ISO 8601, 1ª quinta), `periodKey`, `isoDate`, `bhPeriodOf/Start/End/Label/Days` (15→14, mês do fechamento), `osDurationMin` (MTTR via `Date.UTC`).

## 10. Zustand — stores
- `stores/state.store.ts` (novo): documento global `data` + UI de sessão (`currentRegion/currentYear/currentMonth`) + `status/saveStatus/dirty`; ações `loadState` (Firestore → storage), `refreshFromCloud`, `applyMutation` (helper `produce`), `scheduleSave`, `setRegion/setMonth`, `importActivityReport/importFuel/importBh`.
- `stores/auth.store.ts`: sessão/RBAC.
- `stores/app.store.ts`: abas/sidebar. `stores/params.store.ts`: rascunho do formulário de Parâmetros (Fase 4).
- **Removidos** (eram placeholders): `filters.store.ts`, `acompanhamento.store.ts`.
- Fluxo: `Firebase → Services → Utils/Rules → Stores → (Hooks → Componentes na Fase 3+)`. **Componentes não acessam Firestore.**

## 11. Arquitetura da camada de dados
```
src/
├── lib/            env, constants, permissions, immutable (produce), migrateState, seed
├── services/
│   ├── firebase/   client, config, firestore, realtime, persistence
│   ├── storage/    local (window.storage + localStorage)
│   ├── auth/       index (login/logout/reset/watch), users, types
│   ├── importers/  xlsx, activityReport, fuelReport, bhReport, types
│   └── state.ts    selectors (currentRegion, buildAllRegion, importedTechs) + mutações puras
├── stores/         auth, app, state, params
├── utils/          date, csv, numbers, format, rules/{quartis,ranking,goals,projection,kpis}
└── types/          state, user, firebase, fuel, bh, dashboard, imports
```

## 12. Testes de paridade (Vitest, 74 testes, **sem tocar Firestore**)
- `lib/migrateState.test.ts` — normalização de **backup real** (`../backups/estado-2026-08-14.json`, leitura via `fs`).
- `utils/date.test.ts` — parse US/serial/ISO week/`bhPeriodOf`/`bhPeriodLabel`.
- `utils/csv.test.ts` — parser `;`/aspas + decode Windows-1252 (UTF-8 fatal → 1252).
- `utils/rules/*.test.ts` — quartis, D-1, denominador com justificativa, metas, overview, projeção (hoje = restante).
- `services/importers/*.test.ts` — activity (expurgo, APOIO, SLA, `locked`), fuel (Lava-Rápido/equipamentos, km plausível), bh (base/folgas, `bhCalRange`, `bhCompensated`, `bhToggleFolga`, `bhBaseEntry`).
- `lib/permissions.test.ts` — matriz RBAC + bootstrap/fallback.

## 13. Decisões técnicas
1. **SDK Firebase modular v12** (substitui compat 10.12.2) — sem mudança de schema.
2. **`produce()` com `structuredClone`** (sem Immer) para atualizações imutáveis com paridade de lógica.
3. **Parser CSV próprio** preservado (legado não usa biblioteca de CSV); SheetJS apenas para `.xlsx`.
4. `alert()`/`confirm()` → **mensagens de retorno + callbacks injetáveis** (UI/notificações na Fase 3+).
5. `render()` global → re-render por estado (store). `renderFuelPanel/renderBhPanel` (DOM) ficam para as Fases 6/7.

## 14. Pontos pendentes
- Tela de login e gating do app (Fase 3).
- Indicador de salvamento no DOM (header/sidebar) — o estado `saveStatus` já existe.
- Ligação da importação à UI (inputs de arquivo) — os services/store estão prontos.
- Migração de telas (Dashboard, Acompanhamento, Combustível, Banco de Horas, Parâmetros).
- Exposição de `migrateState`/`seedState` na inicialização do app.
