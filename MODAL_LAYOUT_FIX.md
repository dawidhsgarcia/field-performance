# MODAL_LAYOUT_FIX.md — Correção global dos modais

Relatório da correção de infraestrutura dos Dialogs/Modais da aplicação React (branch `release/rc-1`).

## Causa identificada

O componente base `components/ui/dialog.tsx` (`DialogContent`) usava:

```
w-full max-w-[calc(100%-2rem)] ... sm:max-w-sm
```

- `sm:max-w-sm` fixava a largura em ~512px no desktop (não baseada no conteúdo) e não havia `max-height`/`overflow` controlados.
- Correções por-modal (`dialog-fit`/`dialog-lg`) foram adicionadas para compensar, criando comportamento divergente entre os modais.

## Solução global aplicada

**`components/ui/dialog.tsx` — `DialogContent`:**
```
w-auto max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-x-hidden overflow-y-auto
```
- Largura baseada no conteúdo, limitada ao viewport (`calc(100vw - 2rem)`, gutters de 1rem em cada lado).
- Sem scroll horizontal no Dialog (`overflow-x-hidden`).
- Scroll vertical apenas quando o conteúdo excede `calc(100vh - 2rem)`.
- `grid gap-4`, `p-4`, `bg-popover`, `ring` e animações preservados (Citrus/shadcn).
- Sem `word-break`/`overflow-wrap` global (texto quebra naturalmente).

**`components/ui/alert-dialog.tsx` — `AlertDialogContent`:** mesmo tratamento (afeta `ConfirmDialog`, logout e demais usos).

**Remoção das correções por-modal:** removida a classe `dialog-fit` de 8 modais (SbaDialog, BhModal, IndisModal, MomModal, OsModal, SlaModal, TotalOsModal, CadastroDialog) e removidas as classes `.dialog-lg`, `.dialog-fit`, `.dialog-fit table` do `index.css`. O sizing passou a ser centralizado no componente base (verificado: eram apenas overrides de largura/altura, sem finalidade funcional própria).

**Tabelas (exceção):** continuam encapsuladas em containers `overflow-x-auto` → o scroll horizontal, quando necessário, fica **restrito ao container da tabela**; o Dialog não estica além do viewport nem ganha scroll horizontal.

**DialogFooter:** já é responsivo no shadcn (`flex-col-reverse` em mobile, `sm:flex-row` em desktop) — sem alteração.

## Arquivos alterados

- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/acompanhamento/SbaDialog.tsx`
- `src/components/bh/BhModal.tsx`
- `src/components/dashboard/modals/IndisModal.tsx`
- `src/components/dashboard/modals/MomModal.tsx`
- `src/components/dashboard/modals/OsModal.tsx`
- `src/components/dashboard/modals/SlaModal.tsx`
- `src/components/dashboard/modals/TotalOsModal.tsx`
- `src/components/parametros/CadastroDialog.tsx`
- `src/index.css`

## Modais testados

> Teste manual a ser executado (validação visual) — marcar conforme testado:

- [ ] OS no Prazo por Atividade (SlaModal)
- [ ] Indisponibilidade Técnica (IndisModal)
- [ ] Total de OS (TotalOsModal)
- [ ] OS executadas (OsModal)
- [ ] Detalhamento Técnico / MoM (MomModal)
- [ ] Banco de Horas — folgas (BhModal)
- [ ] Sobreaviso (SbaDialog)
- [ ] Cadastro Parâmetros (CadastroDialog)
- [ ] Importação (ImportResultDialog — via base, sem alteração direta)
- [ ] Confirmações (ConfirmDialog) e logout (AlertDialog)

Larguras a validar: 1920 · 1440 · 1280 · 1024 · 768 · 430 · 390.

## Problemas específicos encontrados

- **`ImportResultDialog`**: não alterado diretamente; deve receber o comportamento novo via base. Verificar sizing/conteúdo/botões/scroll. Se houver problema, investigar se é consequência do base antes de criar override local.

## Exceções

- `ImportResultDialog.tsx` — **sem alteração direta** (recebe o comportamento pelo base).
- Overlay/backdrop do Dialog: mantido o padrão shadcn (fora do escopo desta correção).

## Validação automática

- `npm run typecheck` ✅ (zero erros)
- `npm run lint` ✅ (zero erros)
- `npm run test` ✅ 104/104
- `npm run build` ✅ (aviso de chunk >500 kB, pré-existente)

---

## Correção específica — SlaModal e TotalOsModal

### Causa do overflow (identificada)

1. **Cap de 50vw no `DialogContent`:** o base usa `left-1/2 -translate-x-1/2` com `width:auto`. Para elemento posicionado, o shrink-to-fit é limitado por `available = viewport − left` → com `left:50%`, o modal fica limitado a **~50vw**, independentemente do conteúdo.
2. **Tabela `nowrap`:** `OsTable`/`ActivitySlaTable` usam o padrão shadcn (`whitespace-nowrap`) e a coluna **Atividade** tem nomes longos → o min-content da tabela excede o espaço → o wrapper `overflow-x-auto` da tabela rola (scroll horizontal visível).

### Correção aplicada

- **`SlaModal.tsx`** e **`TotalOsModal.tsx`** — `DialogContent` com `className="inset-x-0 mx-auto translate-x-0"`: anula `left-1/2 -translate-x-1/2` (via twMerge), centraliza com `margin:auto` e permite largura até `max-w-[calc(100vw-2rem)]` (elimina a causa do cap de 50vw).
- **`OsTable.tsx`** e **`ActivitySlaTable.tsx`** — coluna **Atividade** com `min-w-40 whitespace-normal` (padrão legado `.atividade-cell`): reduz o min-content da tabela → cabe no modal em desktop/tablet; o wrapper `overflow-x-auto` permanece só como última instância no mobile.
- Sem alterar `DialogContent`/`AlertDialog` global, `ImportResultDialog` nem outros modais.

### Modais afetados (a validar manualmente)

- [ ] SlaModal
- [ ] TotalOsModal
- [ ] OsModal (tabela compartilhada)
- [ ] MomModal (tabela compartilhada)

Larguras a validar: 1920 · 1440 · 1280 · 1024 · 768 · 430 · 390 — sem scroll horizontal no Dialog; Atividade quebrando corretamente; demais colunas preservadas; nada cortado.
