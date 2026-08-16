# RELEASE_TEST.md — Homologação da Release Candidate v1.0.0-rc.1

Roteiro passo a passo da **homologação manual** da aplicação React (Field Performance — tema Citrus) contra o legado.

> **Regra absoluta:** nenhuma escrita pode alcançar o Firebase de produção. A homologação usa um **projeto Firebase separado**.
> Os testes interativos (login, navegação, importação de arquivo, tabelas, WhatsApp, dialogs, fluxos de escrita, validação visual) são executados **manualmente pelo responsável** no navegador. Nada aqui deve ser marcado como "testado" sem execução real.

---

## 1. Pré-requisitos

- Node 20+ instalado.
- Projeto Firebase de **homologação** criado (separado de `produtividade-regionalnorte`).
- Service account do projeto de homologação (JSON) gerado no console Firebase.
- Conta de homologação criada no Auth do projeto de homologação (o e-mail `davidsgarcia.dev@gmail.com` recebe **admin** automaticamente — bootstrap preservado).
- Aplicação na branch `release/rc-1`, pasta `react/`.

## 2. Ambiente

1. Copie `.env.homologation.example` → `.env.homologation.local` e preencha com as credenciais **do projeto de homologação**.
2. No terminal, exporte a credencial do service account:
   - Windows (PowerShell): `$env:FIREBASE_HOMOLOG_SERVICE_ACCOUNT="C:/caminho/homolog-service-account.json"`
3. Rode a app em modo de homologação:
   - `npm install`
   - `npm run dev -- --mode homologation`
4. Abra `http://localhost:5173`.

### Firebase de homologação — collections / estrutura esperada

| Collection | Documento | Conteúdo |
|---|---|---|
| `produtividade` | `estado` | o objeto `state` completo (mesma estrutura da produção) |
| `usuarios` | `{uid}` | `{ email, nome, perfil }` (perfis: admin/gestor/leitura) |
| Auth | — | contas de e-mail/senha (por projeto) |

### Seed

Carrega um backup (da pasta `../backups/` do repositório) para `produtividade/estado` do projeto de homologação:

```bash
npm run seed:homolog -- --source ../backups/estado-2026-08-14.json
```

### Reset / limpeza da massa

```bash
npm run reset:homolog
```

O reset apaga `produtividade/estado` (a app recria o estado padrão ao carregar). **Usuários do Auth e a collection `usuarios` são por projeto**: limpe no console Firebase (Authentication → excluir contas; Firestore → excluir docs de `usuarios`) quando quiser recomeçar a massa.

> Massa de teste sugerida após o seed: criar 1 usuário gestor e 1 de leitura (Parâmetros → Usuários e Permissões), 2 colaboradores, 2 veículos com orçamento — para os cenários de escrita.

## 3. Cenários

> Para cada cenário, registrar: **Resultado** (OK / Divergência / Ausente / Erro) + **Evidência** (screenshot, valor, observação). Diferença **visual** não é erro funcional (identidade = Citrus).

### 3.1 LOGIN
| Cenário | Passos | Resultado esperado |
|---|---|---|
| Login válido | e-mail/senha corretos | entra; header mostra nome · perfil |
| Login inválido | senha errada | mensagem "Senha incorreta." |
| Login inválido | e-mail inexistente | mensagem "Usuário não encontrado." |
| Recuperação de senha | "Esqueci minha senha" | e-mail de recuperação enviado (toast) |
| Logout | menu usuário → Sair → confirmar | volta ao login |
| Persistência de sessão | F5 logado | permanece logado |
| Perfis | logar como gestor/leitura | Parâmetros oculto p/ leitura; ações restritas |

### 3.2 DASHBOARD
| Cenário | Resultado esperado |
|---|---|
| 6 KPIs (SLA, Meta, Média, Total OS, Total Pontos, Indisponibilidade) com cores | valores iguais ao legado |
| KPI SLA/Total OS/Indisponibilidade clicáveis abrem modais | abre e mostra dados |
| Alertas (4 regras + "Tudo certo!") | textos iguais ao legado |
| Filtros Região/Mês | mudam D-1/quartis/projeção como no legado |
| Gráfico Evolução Diária (labels `v\npct%`, tooltips) | igual ao legado |
| Gráfico Tendência e Projeção Semanal ("Mensal ↑/↓%", ` proj`) | igual ao legado |
| Cards individuais (média, quartil, progresso, SLA, MTTR, sparkline) | igual ao legado |
| Projeção de Fechamento (stats, barra, gap, tabela) | igual ao legado |
| Modo apresentação (7 slides, prev/next/contador, ←→, ESC, imagens dos gráficos) | funciona |
| Modal Detalhamento Técnico (insights, evolução, resumo por atividade, comparativo) | igual ao legado |
| Tema claro/escuro | gráficos recolorem |

### 3.3 ACOMPANHAMENTO
| Cenário | Resultado esperado |
|---|---|
| Filtros Região/Mês | matriz e metas mudam |
| Matriz (sticky header + coluna nome, scroll horizontal) | comportamento preservado |
| Edição: escolher "✏️ Pontuação" e digitar | foco mantido (refocus) |
| Edição: digitar justificativa (ex.: BH) | cor e legend |
| Validações (valor inválido / região bloqueada) | mensagens iguais ao legado |
| Teclado: Enter/blur confirmam; ESC fecha dialogs | funciona |
| Botão SBA → calendário → marcar/desmarcar | dot âmbar na matriz |
| Importação relatório (.xlsx/.csv) → `ImportResultDialog` | resumo igual ao legado |
| Banner de bloqueio + "Habilitar edição manual" | funciona |

### 3.4 PARÂMETROS
| Cenário | Resultado esperado |
|---|---|
| Salvar parâmetros (metas, janela, quartis, alertas) | toast + persiste |
| Restaurar padrões | toast + volta ao default |
| CRUD Colaboradores (criar/editar/excluir + filtro região) | funciona; mensagens iguais |
| CRUD Veículos (criar/editar/excluir; motorista por região; orçamento) | funciona |
| CRUD Usuários (criar/editar/excluir; self e admin bootstrap protegidos) | funciona |
| Validações e cancelamento de modal | mensagens iguais ao legado |

### 3.5 COMBUSTÍVEL
| Cenário | Resultado esperado |
|---|---|
| KPIs (6) por região e "Todas as regiões" | valores iguais ao legado |
| Tabela Produtividade × Consumo | colunas completas |
| Importação CSV → resumo; **bloqueio em "Todas as regiões"** | funciona |
| Ordenação padrão `orcPct` + 5 opções | igual ao legado |
| `vehicleRegiao`/`vehicleFunci` (cadastro → motorista) | atribuição correta |

### 3.6 BANCO DE HORAS
| Cenário | Resultado esperado |
|---|---|
| Região + `bhPeriodSelect` | período e filtro por região |
| KPIs e saldo/compensação | iguais ao legado |
| Calendário de folgas (2 meses; marcar/desmarcar; bloqueios domingo/range/máx) | funciona |
| Avisos (conflito de escala p/ fibra, sobreaviso) | textos iguais (sonner) |
| AlertSection/alertas BH | iguais ao legado |
| WhatsApp (sem telefone / sem folgas / envia `wa.me`) | mensagens e link corretos |
| Importação base BH (.xlsx/.csv/.txt) | resumo igual ao legado |

### 3.7 REALTIME
| Cenário | Resultado esperado |
|---|---|
| 2 abas abertas; gravar numa | a outra atualiza (onSnapshot) |

## 4. Registro de divergências

```
Módulo:
Funcionalidade:
Comportamento legado:
Comportamento React:
Resultado: (OK / Divergência / Ausente / Erro)
Evidência:
Correção necessária: (sim/não + qual)
```

## 5. Bugs

Se encontrar um bug:
1. Registrar no formato acima + reproduzir;
2. Identificar a causa;
3. Corrigir **somente na branch `release/rc-1`**;
4. Executar testes relacionados + regressão (`npm run test`) + `npm run build`;
5. Atualizar este arquivo e registrar a correção (commit na `release/rc-1`).

## 6. Critérios de aprovação

- Funcionalidades críticas testadas (login, dashboard, acompanhamento, parâmetros, combustível, banco de horas, importações, CRUDs);
- Regras críticas validadas (D-1, quartis, projeção, SLA, sobreaviso, conflitos, `vehicle*`);
- Firebase validado (auth, realtime, escritas de homologação);
- Nenhuma divergência crítica aberta.

## 6.1 Bugs corrigidos durante a homologação

| ID | Módulo | Funcionalidade | Problema | Correção | Validação |
|---|---|---|---|---|---|
| BUG-01 | Dashboard | Modais OS no Prazo por Atividade / Total de OS / Indisponibilidade (+ demais modais) | Largura fixa menor que o conteúdo (base `sm:max-w-sm`/`max-w-*`) cortando informações e/ou quebra de linha nas células | Padronização: classe `.dialog-fit` no `index.css` (`width:auto; max-width:96vw; max-height:92vh; overflow:auto` + `.dialog-fit table { width:max-content }`) aplicada em Sla, Indis, TotalOs, Os, Mom, Bh, Sba e Cadastro; células das tabelas `whitespace-nowrap` (Atividade e BH Folgas programadas incluídas). Modais crescem com o conteúdo, sem cortar e sem quebrar linha; `ImportResultDialog` intencionalmente inalterado | typecheck ✓ · lint ✓ · test 104/104 ✓ · build ✓ |

## 7. Classificação final

- [ ] **APROVADA PARA GO-LIVE**
- [ ] **REPROVADA — CORREÇÕES NECESSÁRIAS**

> Data: ____ · Responsável: ____ · Versão testada: v1.0.0-rc.1 (branch `release/rc-1`)
