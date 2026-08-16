# PARAMETROS_MIGRATION.md — Módulo Parâmetros (Fase 4)

Documento de mapeamento e migração do módulo **Parâmetros** do legado (HTML/CSS/JS) para React + TypeScript + shadcn/ui + tema Citrus.

> Status: Fase 4 concluída em 15/08/2026. Legado intacto; paridade funcional preservada.

## 1. Funcionalidades do legado (`render.js:renderParams` → `assets/js/render.js`)

1. **Meta por dia da semana** — 7 inputs (`dayMeta[0..6]`, min 0, max 20, step 0.5, unidade "pts") + **Janela de tendência (projeção)** (`trendWindow`, min 2, max 30, step 1, "dias").
2. **Limites dos Quartis** — `quartil.q1/q2/q3` (min 0, max 20, step 0.1, "pts/dia") + hint "Q4 (alerta) = abaixo de Q3".
3. **Alertas Automáticos** — `alertTech.{below,streak}`, `alertTeam.{belowPct,streak}`, `alertProjection.belowPct` (min/max conforme legado).
4. **Cadastro de Colaboradores** — filtro por região + tabela `Funcid | Nome | Função | Região | WhatsApp | Ações`, ordenada por nome.
5. **Cadastro de Veículos** — tabela `Placa | Região | Motorista | Orçamento | Ações`; orçamento `R$ fmtNum` ou `—`; região "(região removida)"; motorista "(técnico removido)".
6. **Usuários e Permissões** (somente `can('gerenciarUsuarios')`) — tabela `Nome | E-mail | Perfil | Ações`; marca "(você)" no próprio usuário; botão ✕ oculto para o admin bootstrap.
7. **Ações**: `Salvar parâmetros` / `Restaurar padrões`.

## 2. Campos e valores padrão (`DEFAULT_PARAMS`)

| Campo | Default | Limites |
|---|---|---|
| `dayMeta[0..6]` | [0,4,4,4,4,4,0] | min 0, max 20, step 0.5 |
| `trendWindow` | 7 | min 2, max 30, step 1 |
| `quartil.q1/q2/q3` | 3.5 / 2.5 / 1.0 | min 0, max 20, step 0.1 |
| `alertTech.below` / `.streak` | 2.0 / 3 | 0–20 / 1–30 |
| `alertTeam.belowPct` / `.streak` | 70 / 2 | 0–100 / 1–30 |
| `alertProjection.belowPct` | 80 | 0–100 |

**Regra de salvamento** (idêntica): cada campo é lido com `parseFloat/parseInt(v) || DEFAULT` — valor vazio/inválido cai no default.

## 3. Estrutura dos dados (Firestore)

- `state.params` — objeto `Params` (acima), gravado no documento `produtividade/estado` via `scheduleSave` (transacional, `_meta.version`).
- `state.colaboradores` — mapa `{ funci: { funci, nome, regiao, funcao, telefone } }`.
- `state.veiculos` — mapa `{ placa: { placa, motorista, regiao, orcamento } }` (placa sempre em maiúsculas).
- `usuarios` — collection separada `usuarios/{uid}` = `{ email, nome, perfil }` (fora do `state`), lida via **realtime** (`onSnapshot`).

## 4. Operações (legado → React)

| Operação | Legado | React |
|---|---|---|
| Salvar parâmetros | `renderParams` handlers → `scheduleSave` | `ParamsForm` → `state.store.commit(mutateParams)` → `scheduleSave` |
| Restaurar padrões | deep-copy `DEFAULT_PARAMS` → `scheduleSave` | idem (`commit`) |
| Criar/editar colaborador | `setColaborador` (state.js) | `services/state.setColaborador` via `commit` |
| Remover colaborador | `removeColaborador` | `services/state.removeColaborador` via `commit` |
| Criar/editar veículo | `setVeiculo` | `services/state.setVeiculo` via `commit` |
| Remover veículo | `removeVeiculo` | `services/state.removeVeiculo` via `commit` |
| Criar usuário | `createUsuario` (REST accounts:signUp) | `services/auth/users.createUsuario` |
| Editar usuário | `updateUsuario` | `services/auth/users.updateUsuario` |
| Remover usuário | `removeUsuario` | `services/auth/users.removeUsuario` (+ guards self/bootstrap no componente) |
| Usuários realtime | `loadUsuarios` (onSnapshot) | `auth.store.usuarios` (já ativo) |

> Componentes React **não acessam Firestore diretamente** — tudo passa pelos services e stores.

## 5. Validações (mensagens exatas preservadas via `sonner.error`)

- Colaborador: "Informe o funcid do colaborador." · "Informe o nome do colaborador." · "Escolha a função do colaborador." · `Já existe um colaborador com o funcid ${funci}.`
- Veículo: "Informe a placa do veículo." · "Escolha um motorista (técnico) para o veículo."
- Usuário: mensagens dos services (`createUsuario`/`updateUsuario`/`removeUsuario`) — e-mail válido, senha ≥ 6, EMAIL_EXISTS etc.
- Permissões: "Você não tem permissão para gerenciar colaboradores/veículos/usuários." · "Você não pode remover o próprio usuário."
- Leitura (`!can('salvarParams')`): inputs desabilitados + ações ocultas (a aba Parâmetros já é ocultada para leitura na sidebar).

## 6. Confirmações (exclusões)

`AlertDialog` (`ConfirmDialog`) com o **texto exato** do `confirm()`:
- Colaborador: `Remover ${nome} (${funci})? Ele será removido das regiões e os vínculos de veículos serão desfeitos.`
- Veículo: `Remover o vínculo do veículo ${placa}?`
- Usuário: `Remover o usuário "${nome || email}"?`

## 7. Feedback (toasts)

`sonner` com textos do legado: "Parâmetros salvos com sucesso!" · "Parâmetros restaurados!" · "Colaborador atualizado!/cadastrado!" · "Veículo atualizado!/cadastrado!" · "Usuário atualizado!/criado!/removido!". Exclusão de colaborador/veículo **não** gera toast (paridade com o legado).

## 8. Diferenças legado ↔ React

1. `alert()`/`confirm()` → `sonner`/`AlertDialog` (mesmos textos; feedback não-bloqueante).
2. Modal único (`cadModalBackdrop`, manipulação manual de DOM/ESC) → `Dialog` do shadcn (acessível, `key`/remount por abertura).
3. `renderParams()` (innerHTML + re-binding de listeners) → re-render por estado (Zustand).
4. Filtro de colaboradores: re-render só do tbody → filtro em estado local (mesmo resultado).
5. Região padrão no modal (novo registro): legado mantinha `colabFormRegiao`/`veiculoFormRegiao` entre aberturas; React usa a região atual (ou a primeira) — diferença apenas de conveniência.
6. Leitura dos valores no save: leitura direta do DOM → estado controlado (mesma regra `parseFloat/parseInt || DEFAULT`).
7. Layout visual: grupo `.param-group` → `Card` shadcn; tabelas `.proj-table` → `Table` shadcn (mesmas colunas/ordenações).

## 9. Arquitetura React

```
pages/ParametrosPage.tsx          # guard loading/empty + compõe + controla o Dialog
components/parametros/
├── ParamsForm.tsx                # metas/quatis/alertas + salvar/restaurar
├── ColaboradoresTable.tsx        # filtro região + Table + ações
├── VeiculosTable.tsx             # Table + ações
├── UsuariosTable.tsx             # Table + ações (admin)
├── CadastroDialog.tsx            # Dialog único por kind (colab/usuario/veiculo)
├── ConfirmDialog.tsx             # AlertDialog de confirmação (exclusões)
└── index.ts
```

Stores/services: `state.store` (data, `commit`, `applyMutation`), `auth.store` (user, `can`, `usuarios`), `services/state` (mutações puras), `services/auth/users` (CRUD de usuários).

## 10. Pendências / observações
- Guard bootstrap do usuário admin: o ✕ já é oculto na tabela; guard defensivo "O usuário administrador inicial não pode ser removido." aplicado no handler.
- Aviso de chunk > 500 kB no build (Firebase/Chart.js) — otimização de code-splitting fica para etapa futura.
