# COMBUSTIVEL_MIGRATION.md — Módulo Combustível (Fase 7)

Documento de mapeamento e migração do módulo **Combustível** do legado para React + TypeScript + shadcn/ui + tema Citrus.

> Status: Fase 7 concluída em 16/08/2026. Legado intacto; paridade funcional preservada.

## 1. Funcionalidades do legado (`fuel.js` + `app.js`)

1. **6 KPIs** (sobre veículos **cadastrados** em Parâmetros, filtrados pela região ativa): Custo total (`R$`) · Orçamento (`R$` ou `—`) · Orçamento × Consumo `%` (danger >100 / warning ≥90 / success) · KM/L médio (success ≥10 / danger <6 / warning) · Custo por km (`R$`) · Custo Operacional (`custo ÷ totalOS` da região; `—` se 0).
2. **Tabela Produtividade × Consumo**: 1 linha por técnico importado (região ativa ou todas); colunas **Região** (só allMode, `padding-left:20px`) · **Técnico** · Média pts/dia · Abast. · Litros · Custo · Orçamento · **% Orçamento** (colorido) · Km · KM/L · **Pontos/L** · **Litro/OS**; resumo "⛽ Consumo atribuído por vínculo... 🎯 {label}".
3. **Ordenação** pelas 5 opções (`pts`, `pontosL`, `kml`, `custo`, `orcPct` — **padrão `orcPct`**), decrescente, fallback nome/região.
4. **Atribuição veículo→técnico/região**: cadastro (`state.veiculos`) → fallback por nome do motorista (`importedTechs`).
5. **Importação** (.csv, Windows-1252): guard (`can('importar')` + **região específica** — consumo é global, mas o botão/guarda são desabilitados em "Todas as regiões", paridade) → decode 1252 → `applyFuelReport` → `scheduleSave` → **resumo** (abastecimentos válidos/ignorados, km descartado >30 km/L, veículos, períodos, litros/custo/KM/L, dica).

## 2. Dados

| Dado | Origem | Transformação |
|---|---|---|
| `state.fuel[pk]` | Firestore (`produtividade/estado.fuel`) | agregado por período (`summary/vehicles/daily/byDriver`) |
| Veículos cadastrados | `state.veiculos` | `getVeiculo` filtra veículos sem cadastro |
| Região do veículo | `state.regions` + `importedTechs` | `vehicleRegiao`/`vehicleFunci` (cadastro → motorista) |
| Média pts/dia | `region.entries` + `params` | `computeRanking` |
| Total de OS / por técnico | `region.sla[pk]` | `totalOS` e `techSla[funci].totalOS` |
| Período | `currentYear/currentMonth` (store) | `periodKeyOf` (via `RegionMonthFilter`) |

## 3. Regras (reutilizadas / novas)

**Reutilizadas:** `applyFuelReport` (service, parser migrado na Fase 2), `computeRanking`, `getVeiculo`, `importedTechs`, `periodKeyOf`, `buildWeeks`, `fmtNum`, `parseFleetCsv`/`parseFleetDate`, `FUEL_KM_L_ALERT`/`FUEL_KM_MAX_FACTOR`.

**Novas em `utils/rules/fuel.ts`** (funções puras; componentes sem cálculo de negócio):
- `vehicleRegiao`/`vehicleFunci` (atribuição — não portadas na Fase 2).
- `fuelVehicles` / `filterFuelByRegion`.
- `computeFuelKpis(vehicles, state, allMode, pk)` → `FuelKpis` (com status orçamento/KM-L).
- `computeFuelProductivityRows(per, state, regionFilter)` → `FuelProductivityRow[]`.
- `sortFuelProductivity(rows, key)` (5 opções, desc, fallback nome/região).
- `decodeFleetText(bytes)` em `utils/csv.ts` (Windows-1252).
- Tipos `FuelKpis`, `FuelProductivityRow`, `FuelSortKey`, `FuelStatus` em `types/fuel.ts`.

**Validadas por testes** (`utils/rules/fuel.test.ts`): atribuição (cadastro + fallback), KPIs (totais, orçamento %, KM/L com status), tabela e ordenação.

## 4. Componentes

```
pages/CombustivelPage.tsx               # loading/vazio + toolbar + KPIs + tabela + importação
components/combustivel/
├── CombustivelToolbar.tsx              # RegionMonthFilter + Select ordenação + botão Importar Consumo (input .csv, decode 1252)
├── FuelKpis.tsx                        # 6 KPIs (Card shadcn + status semântico)
├── FuelProductivityTable.tsx           # tabela shadcn completa (Região em allMode; % Orçamento com cor; empty states)
└── index.ts
components/shared/ImportResultDialog.tsx  # movido de acompanhamento (reutilizado por Combustível e Acompanhamento)
```

## 5. Diferenças legado ↔ React

1. `alert()` do resumo de importação → `ImportResultDialog` (mesmo texto); falha de parse/decode → `sonner.error` (mesma mensagem).
2. Filtros região/mês e ordenação → `RegionMonthFilter` + `Select` (mesmos valores/UX; ordenação padrão `orcPct`).
3. `innerHTML` → componentes shadcn/Tailwind com tokens Citrus (sem hex nos componentes; cores por `var(--danger-dark)` etc.).
4. `vehicleRegiao`/`vehicleFunci` migradas para a camada de regras.

## 6. Validação

- `typecheck` ✓ · `build` ✓ (aviso de chunk >500 kB, não-bloqueante) · `lint` ✓ · `test` **84/84** ✓ · dev server HTTP 200 · legado intocado.
- Comparação: fixtures equivalentes ao CSV de frota (`Norte.csv`/`Sul.csv` locais) — totais/KPIs/ordenação replicam o legado; divergência → parar e diagnosticar.
- Pendência: validação manual em navegador (importação real, resp. mobile) quando houver acesso à interface.
