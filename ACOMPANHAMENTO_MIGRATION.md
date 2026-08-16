# ACOMPANHAMENTO_MIGRATION.md — Módulo Acompanhamento (Fase 5)

Documento de mapeamento e migração do módulo **Acompanhamento** do legado para React + TypeScript + shadcn/ui + tema Citrus.

> Status: Fase 5 concluída em 15/08/2026. Legado intacto; paridade funcional preservada.

## 1. Funcionalidades do legado (`render.js` · `sobreaviso.js` · `app.js`)

1. **Matriz de apontamentos** (técnico × dia): 2 cabeçalhos (semanas ISO + dias), células de pontuação (`input` não-controlado) ou justificativa (`select` com cores), dot âmbar de sobreaviso, sticky header + coluna nome (corner-lock), zebra/hover.
2. **Edição**: `✏️ Pontuação` troca select → input; commit no blur/Enter; validações exatas (vazio → limpa · código → justificativa · `parseFloat` vírgula · NaN/locked → toast + reverte); **refocus** da célula após re-render.
3. **Meta diária da equipe**: Técnicos disponíveis · Disponibilidade técnica (%) · Meta esperada · Pontuação realizada · % Atingimento (cores por `alertTeam.belowPct`).
4. **LockBanner**: leitura · "Todas as regiões" · bloqueada (com **Habilitar edição manual** → confirm → `unlockRegion`).
5. **Sobreaviso**: pill SBA por técnico → Dialog-calendário do mês da sidebar (dias clicáveis, tooltips, resumo "Sobreaviso no mês: N dia(s)"), gravado em `state.sobreaviso`.
6. **Remover técnico**: ✕ → confirm → `removeColaborador` (remove das regiões, veículos e sobreaviso).
7. **Importação de relatório** (.xlsx/.csv): guards (`can('importar')` + região específica) → parse → `applyActivityReport` → persist com rebase → resumo (técnicos, dias, linhas válidas/ignoradas, período ajustado, bloqueio, "Confirmado na nuvem").
8. **Filtros**: região (com "Todas as regiões") e mês — estado global (`currentRegion/currentYear/currentMonth`).

## 2. Regras de negócio reutilizadas (Fase 2 — sem duplicação)

| Regra | Fonte |
|---|---|
| D-1 / ranking / quartis / metas | `utils/rules/{quartis,ranking,goals,projection,kpis}` |
| Semanas ISO 8601, `buildWeeks`, mês | `utils/date` (`isoWeekOf`, `buildWeeks`, `DOW`, `MONTHS`) |
| `currentRegion` (inclusive agregada "Todas"), `importedTechs`, `entryOf` | `services/state` |
| Mutações: `mutateEntry`, `removeColaborador`, `unlockRegion`, `toggleSobreaviso` | `services/state` |
| Parsers/importação | `utils/csv.parseActivityCsv`, `services/importers/xlsx.readSheetRows`, `activityReport.applyActivityReport` |
| Persistência (rebase/realtime) | `state.store` (`commit`, `importActivityReport`, `subscribeState`) |

**Adaptações (comportamento preservado):**
- `state.store.importActivityReport` passou a retornar `summary` + `savedToCloud` (sem nova lógica; só exposição).
- Verificação pós-importação ("Confirmado na nuvem") usa os dados locais já confirmados pelo rebase (sem leitura extra no Firestore).
- Refocus isolado em `useMatrixFocus` (DOM com `CSS.escape`); inputs não-controlados (`defaultValue`) + commit no blur/Enter.

## 3. Datas

Comportamento preservado: `buildWeeks`/`isoWeekOf` (ISO 8601), período pela `state.store` (`currentYear/currentMonth`, UI de sessão), D-1 derivado nas regras reutilizadas. Nenhuma conversão extra de fuso.

## 4. Filtros

- Região: `Select` (Todas as regiões + regiões) → `setRegion` (mesmo campo global da store).
- Mês: navegação ‹ › → `setMonth`.
- Importação: `Button` + input de arquivo oculto; desabilitada em "Todas as regiões" ou sem permissão.

## 5. Componentes criados (`components/acompanhamento/`)

| Componente | Papel |
|---|---|
| `AcompanhamentoToolbar` | filtros região/mês + botão Importar (parse + loading) |
| `MatrixTable` | matriz sticky (cabeçalhos semana/dia, linhas por técnico) |
| `DayCell` | célula (input não-controlado ou `JustificationSelect`) + dot SBA + commit/foco |
| `JustificationSelect` | select com cores (port de `buildJustificationSelect`) |
| `GoalsTable` | Meta diária da equipe |
| `LockBanner` | 3 variantes + desbloquear (AlertDialog) |
| `LegendCodes` | legenda de justificativas + SBA |
| `SbaDialog` | Dialog-calendário de sobreaviso (mês da sidebar) |
| `ImportResultDialog` | resumo da importação |
| `matrix.css` | sticky/corner-lock/células/calendário com **tokens Citrus** (sem hex quando há token; `--sba` novo) |

Hooks: `useAcompanhamentoData` (região/weeks/techs memoizados), `useMatrixFocus` (refocus isolado).

## 6. Shadcn / Citrus / A11y / Responsividade

- `Select`, `Button`, `Dialog`, `AlertDialog` (via `ConfirmDialog`), `Skeleton`; matriz custom (sticky) via `matrix.css`.
- Tokens semânticos; `--sba: #f59e0b` adicionado ao tema; aliases legado (`--surface`, `--weekend`, `--primary-tint`, etc.) mapeados aos tokens Citrus com `color-mix`.
- Foco visível, `aria-label` nos botões de célula/mês, tooltips de justificativa/sobreaviso, Enter/blur commitam, ESC fecha dialogs.
- Matriz com `overflow-x: auto` (scroll horizontal); toolbar empilha no mobile.

## 7. Diferenças legado ↔ React

1. `alert()`/`confirm()` → `Dialog`/`AlertDialog`/`sonner` (mesmos textos; importação em `ImportResultDialog`).
2. Refocus por `innerHTML` global → `useMatrixFocus` (DOM isolado, foco preservado).
3. Filtros região/mês: movidos da sidebar (legado) para o **toolbar da página** (mesma store/estado global).
4. Verificação pós-importação sem leitura extra no Firestore (usa dados locais confirmados).
5. Leitura: selects desabilitados e commits ignorados (mesmo comportamento do legado).
6. Estilos da matriz replicados em `matrix.css` com tokens Citrus (cores equivalentes).

## 8. Validação
- `typecheck` ✓ · `build` ✓ (aviso de chunk >500 kB, não-bloqueante) · `lint` ✓ · `test` 74/74 ✓ · dev server HTTP 200 · legado intocado.
- Pendências: teste manual completo em navegador (foco, sticky, importação real) quando houver acesso à interface.
