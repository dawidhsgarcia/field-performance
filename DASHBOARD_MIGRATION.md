# DASHBOARD_MIGRATION.md — Módulo Dashboard (Fase 6)

Documento de mapeamento e migração do **Dashboard** do legado para React + TypeScript + shadcn/ui + tema Citrus, mantendo **Chart.js** e o plugin customizado.

> Status: Fase 6 concluída em 16/08/2026. Legado intacto; regras reutilizadas; validação de paridade por testes.

## 1. Funcionalidades do legado (`dashboard.js` + `app.js`)

1. **6 KPIs**: SLA % no Prazo (clicável) · Meta da Equipe · Média da Equipe · Total de OS (clicável) · Total de Pontos · Indisponibilidade Técnica (clicável) — classes semânticas (success/warning/danger).
2. **4 alertas automáticos** (técnico abaixo, equipe abaixo, projeção abaixo, "Tudo certo!").
3. **Desempenho Individual**: cards por técnico (média + badge de quartil, barra de progresso, dias/úteis, pts total, SLA → modal OS, MTTR, sparkline SVG dos últimos 10 pontos).
4. **Gráficos Chart.js**:
   - `evolucaoDaily` (linha, D-1, pontos coloridos por meta, labels `v\npct%`).
   - `tendenciaSem` (barra, projeção da semana atual via `teamDailyTrend`, plugin `totalTrend` "Mensal ↑/↓%", labels delta `%` + ` proj`).
   - `momTechDaily` (linha do modal MoM; justificativas viram lacuna; pontos por meta/quartil).
   - Todos com `devicePixelRatio: Math.ceil(window.devicePixelRatio || 1)`.
5. **Plugin `autoDataLabels`** (app.js:9-62): `afterDatasetsDraw`, lê `formatterKey`/`colorKey` dos options + registros `AUTOLABEL_FORMATTERS/COLORS`; desenha 1–2 linhas; cores por linha.
6. **Projeção de Fechamento**: mês encerrado → mensagem; senão stats (Realizado/Projetado/Meta/Dias restantes) + barra % + gap (🚨/✅) + tabela por técnico (Média Atual, Tendência, Média Proj., Quartil Proj., Gap).
7. **5 modais**: OS executadas (filtro prazo + tabela sortable) · OS no Prazo por Atividade · Indisponibilidade Técnica · Total de OS (filtros atividade/prazo + sortable) · Detalhamento Técnico/MoM (insights, gráfico diário, resumo por atividade, comparativo mensal).
8. **Apresentação**: 7 slides fullscreen (KPIs, Cards, 2 gráficos via `toDataURL()`, SLA por atividade, Indisponibilidade, Projeção); prev/next/contador/ESC/←→.

## 2. Regras reutilizadas (Fase 2 — sem duplicação)

`computeDashboardKpis`, `computeAlerts`, `computeRanking`, `computeTeamGoalsSummary`, `computeTeamOverview`, `computeProjection`, `teamDailyTrend`, `quartilOf`, `minScoreForDow`, `MIN_SCORE`, `slaPctOf`, `osDurationMin`, `fmtHrs`, `buildWeeks`, `isoWeekOf`, `periodKeyOf`, `currentRegion`, `importedTechs`, `entryOf`, `fmtNum`, `esc`.

**Regras novas migradas para `utils/rules/kpis.ts` (antes do uso):**
- `techMonthStats(region, funci, year, month, params)` — base do comparativo MoM.
- `activitySlaRows`/`activitySlaSummary`/`techActivitySlaRows` — agregação SLA por atividade (`filter(evaluated>0)`, `total=evaluated`, ordenação, `APOIO` excluído no per-técnico).
- `computeTechInsights(region, funci, atual, anterior, params, today)` — bloco Insights do MoM (aproveitamento, ritmo, projeção, MTTR, SLA).
- **Validadas por testes** (`utils/rules/kpis.test.ts`) contra valores calculados manualmente a partir do legado.

## 3. Gráficos / plugin / exportação

- **Chart.js mantido** via `react-chartjs-2` (`Line`/`Bar`); registros únicos em `lib/charts.ts`.
- **`autoDataLabels`** portado como plugin registrado com registry em módulo (`setAutoLabel(key, formatter, colorFn)`) — sem `window`; options com `autoDataLabels: {display, formatterKey, colorKey}` (mesmo contrato).
- **Plugin `totalTrend`** portado (Mensal ↑/↓%, cores por tokens lidos do tema).
- **DPI**: `devicePixelRatio: Math.ceil(window.devicePixelRatio || 1)` preservado (`chartDPR()`).
- **Exportação**: canvas dos 2 gráficos registrados em `chartCanvasRegistry`; `toDataURL()` usado nos slides 3–4 da apresentação.
- **Tema**: `getCSSVar` portado a `utils/theme.ts`; gráficos reconstroem options quando o tema muda (`useTheme`), recolore instantaneamente (melhoria controlada vs. legado).

## 4. Modais / filtros / ordenação

- Modais via `Dialog` do shadcn; filtros prazo/atividade via `Select`.
- Tabela sortable compartilhada `OsTable` (hook `useSortableRows` + helpers `osHelpers.ts`), usada nos modais OS executadas e Total de OS.
- Guardas de abertura com mensagens exatas (toast): SLA sem dados, Total de OS sem relatório, Indisponibilidade sem justificativas.

## 5. Apresentação (data-driven)

- `PresentationOverlay`: 7 slides **React** reutilizando `KpiGrid`, `TechCards`, `ProjectionSection`, `ActivitySlaTable` e `IndisTable` com os mesmos dados do Dashboard; slides 3–4 usam `toDataURL()` dos gráficos; navegação por botões/←→/ESC/contador.
- Entrada pelo botão **Apresentar** no cabeçalho da página (não altera o Shell).

## 6. Diferenças legado ↔ React

1. `alert()`/`confirm()` → `sonner`/`Dialog` (mesmos textos).
2. KPIs/cards na apresentação: não clicáveis (exibição), adaptação da navegação.
3. `innerHTML`/`onclick` globais → componentes e callbacks.
4. Filtros região/mês no Dashboard via `RegionMonthFilter` compartilhado (mesmo estado global da store; no legado ficavam na sidebar).
5. Cores de quartis/SLA via tokens Citrus (`text-success-dark` etc.) em vez de hex.
6. `AUTOLABEL_FORMATTERS` globais → registry em módulo.

## 7. Validação

- `typecheck` ✓ · `build` ✓ (aviso de chunk >500 kB, não-bloqueante) · `lint` ✓ · `test` **79/79** ✓ · dev server HTTP 200 · legado intocado.
- Testes novos: `techMonthStats`, `activitySlaRows`/`activitySlaSummary`, `techActivitySlaRows`, `computeTechInsights` (paridade com o cálculo do legado).
- Pendência: validação manual em navegador (gráficos/DPI/exportação/apresentação) quando houver acesso à interface.
