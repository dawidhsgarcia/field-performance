# BANCO_HORAS_MIGRATION.md — Módulo Banco de Horas (Fase 8)

Documento de mapeamento e migração do módulo **Banco de Horas** do legado para React + TypeScript + shadcn/ui + tema Citrus.

> Status: Fase 8 concluída em 16/08/2026. Legado intacto; paridade funcional preservada. Último módulo funcional migrado.

## 1. Funcionalidades do legado (`bh.js` + `app.js:356-391`)

1. **Período 15 → 14** (`bh.period` = mês do fechamento; `bhPeriodLabel`); `bhPeriodSelect` com `${p} · ${label}` (períodos únicos desc; normalização para o maior).
2. **Filtro**: `allMode = currentRegion === ALL_REGION || !can('programarFolga')`; base filtrada por período **e** região do sidebar (`colaboradores[funci].regiao`); ordenação por **horas desc**.
3. **5 KPIs**: Técnicos · Horas a compensar · VLR total · Dias a compensar · Compensado (`kpi-success` se `totComp ≥ totHoras`).
4. **5 alertas**: Período fecha em breve (≤5 dias) · Conflito de escala (**só TÉCNICO DE FIBRA**) · Folgas a programar · Folga em dia de sobreaviso · "Tudo certo!".
5. **Tabela resumo** (`bh-summary-table`): Técnico · Função · Região · Total de horas · Compensação · Valor · Dias a programar · Folgas programadas (`dd/mm`) · Ações (Programar Folga + WhatsApp — **coluna oculta em allMode**).
6. **Modal de folgas** (calendário 2 meses): resumo "Folgas agendadas: x/y · Compensado: HH:MM de HH:MM — limite em dd/mm/aaaa"; dias marcados/agendáveis/bloqueados com tooltips; dot âmbar de sobreaviso; toggle com guardas (domingo/range/máx) e **avisos** (conflito + sobreaviso).
7. **WhatsApp**: `bhWaPhone` (dígitos, 10-11 → prefixo `55`), `bhWaMessage` (Olá + período + `• Dow dd/mm/aaaa — 8h/4h` + total + rodapé), `window.open(wa.me)`.
8. **Importação** (.xlsx/csv/txt): guard `can('importar')` + região específica; `.xlsx` → primeira aba; texto → `parseBhCsv(decodeActivityText)`; resumo.

## 2. Reutilização

- **Services**: `services/importers/bhReport` (`applyBhReport`, `bhFolgasOf`, `bhIsMarked`, `bhCalRange`, `bhCompensated`, `bhScheduledDays`, `bhBaseEntry`, `bhToggleFolga`); `state.store.importBh` → `{ok, message}` (resumo); `services/state` (`sobreavisoIsOn`, `setBhPeriod` novo).
- **Utils**: `bhPeriodOf/Label`, `bhFmtMin`, `bhFmtDate`, `MONTHS`, `pad`, `fmtNum`, `parseBhCsv`/`decodeActivityText`.
- **Componentes**: `RegionFilter` (novo, extraído do `RegionMonthFilter`), `AlertSection` (dashboard — estendida com ícones `event_busy`/`phone_in_talk`), `ImportResultDialog` (shared), `Skeleton`, CSS `.acomp-cal` (matrix.css, com modificador `cal-primary` e `cal-months`).
- **Constantes**: `BH_WORK_MIN`, `FUNCAO_DEFAULT`, `ALL_REGION`.

## 3. Regras novas — `utils/rules/bh.ts` (camada de regras)

- `filterBhBase(base, period, state, allMode)` — filtro período + região + sort horas desc.
- `computeBhKpis(base, bh)` → `{ count, totHoras, totVlr, totDias, totComp, compensado }`.
- `computeBhAlerts(base, bh, state, period, hoje)` → `AlertItem[]` (5 regras, textos exatos).
- `bhWaPhone(state, funci)` / `bhWaMessage(b, bh)`.
- `bhFolgaWarnings(state, b, funci, iso)` → `string[]` (conflito de escala p/ fibra + sobreaviso, textos exatos).
- **Validadas por testes** (`utils/rules/bh.test.ts` — 11 testes): filtro/ordenação, KPIs, 5 alertas, WhatsApp (phone/message), warnings.

## 4. Componentes

```
pages/BancoHorasPage.tsx
components/bh/
├── BhToolbar.tsx        # RegionFilter + bhPeriodSelect + botão Importar base
├── BhKpis.tsx           # 5 KPIs
├── BhAlerts.tsx         # reutiliza AlertSection (dashboard)
├── BhTable.tsx          # tabela resumo + ações (Programar Folga / WhatsApp)
├── BhModal.tsx          # Dialog-calendário 2 meses
└── index.ts
components/shared/RegionFilter.tsx   # seletor de região (extraído do RegionMonthFilter)
```

## 5. Diferenças legado ↔ React

1. `alert()` (avisos de folga, WhatsApp, importação) → `sonner`/`ImportResultDialog` com **os mesmos textos**.
2. Região: **só `RegionFilter`** no BH (sem navegação de mês — o período vem do `bhPeriodSelect`; paridade com o legado).
3. Calendário 2 meses com CSS `.acomp-cal` + `cal-primary` (marked = lime; o SBA mantém o âmbar).
4. Token **`--wa: #25d366`** usado apenas no botão WhatsApp (fora da paleta geral do Citrus).
5. `bhPeriodSelect` → `Select` do shadcn; tabela → `Table` shadcn.

## 6. Validação

- `typecheck` ✓ · `build` ✓ (aviso de chunk >500 kB, não-bloqueante) · `lint` ✓ · `test` **95/95** ✓ · dev server HTTP 200 · legado intocado.
- Comparação: fixtures equivalentes à base de BH — períodos/KPIs/alertas/folgas/WhatsApp replicam o legado; divergência → parar e diagnosticar.
- Pendência: validação manual em navegador (importação real, calendário, WhatsApp) quando houver acesso à interface.
