# Estatísticas — Importação em modo lote + correções

**Data:** 2026-05-07
**Rota afetada:** `/estatisticas`
**Arquivo principal:** [src/views/EstatisticasView.vue](../../../src/views/EstatisticasView.vue)
**Doc de referência do estado atual:** [documentation/ESTATISTICAS.md](../../../documentation/ESTATISTICAS.md)

## 1. Motivação

A tela de importação obriga o mentor a abrir o modal, preencher banca/área/descrição/ano e fechar a cada lote, mesmo quando ele importa **5+ anos seguidos da mesma combinação banca+área**. O fluxo é repetitivo e cria atrito em uma operação que precisa ser feita em escala — quanto mais bancas × áreas × anos importados, melhor a aba de Tendências (a ser renomeada em escopo separado).

Além do fluxo de lote, a leitura do código identificou **bugs e dívidas de baixo custo** que entram nesse mesmo PR por economia de contexto.

## 2. Escopo

### Entra

1. **Modal sticky** — banca/área/descrição persistem entre saves; ano auto-decrementa
2. **Reset por troca de banca/área** — ano volta para o ano corrente quando o usuário muda banca OU área
3. **Detecção de duplicata** — diálogo Substituir/Cancelar quando `banca + área + ano` já existem (Substituir = `PATCH`)
4. **Auto-processar ao colar** — `paste` no textarea com debounce 300ms gera preview sem clicar em "Processar preview"
5. **Auto-extrair ano** do conteúdo colado — parser tenta detectar; se ano do form está vazio, preenche; se há conflito, mostra chip discreto "Detectado: 2024"
6. **Persistência de rascunho** — 1 rascunho global em `localStorage`, válido por 24h, recuperável via banner ao reabrir o modal
7. **Atalhos** — `Ctrl/Cmd+Enter` força preview, `Ctrl/Cmd+S` salva, `Esc` fecha (com confirmação se há rascunho)
8. **Filtro de área** na aba Importações — adicional aos filtros banca/ano que já existem; lista em cascata (só áreas presentes na banca selecionada, ou todas se sem banca)
9. **Paginação dos cards** na aba Importações — numerada simples (12 por página), reseta para página 1 ao mudar qualquer filtro
10. **Suporte direto para `<ul>` raiz no parser** — quando o usuário cola `<ul class="indice-conteudo">...</ul>` (caso real do QConcursos), parser usa caminho rápido em vez do fallback `parseAllLisByDepth`
11. **Quick wins originais que entram junto:**
    - Corrigir vazamento do listener `window.click` para fechar o menu kebab (ver [EstatisticasView.vue:802](../../../src/views/EstatisticasView.vue#L802))
    - Substituir `confirm()` nativo da exclusão por `ConfirmDialog` reusável (ver [EstatisticasView.vue:508](../../../src/views/EstatisticasView.vue#L508))
    - Filtros da aba Importações deixam de chamar `fetchEstatisticas`; viram `computed` sobre o array do store
    - Gate em `dictsStore.fetchByTipo` (não re-fetcha se já tem dados)

### Não entra

- Componentização da view em `ImportacoesTab.vue` / `TendenciasTab.vue` / `ImportModal.vue` — escopo separado, não bloqueia este
- Renomeação da aba "Tendências"
- UI de edição livre de estatística (`updateEstatistica` é usado pelo PATCH de duplicata; UI dedicada exige conversa de produto)
- Comparação entre bancas, exportação de análise, projeção, vínculo com tarefas — ideias do doc de estado atual, ficam para específicas
- Mudanças no backend (`backend-express`) — todo o trabalho é client-side; contrato de `/api/estatisticas` permanece

## 3. Comportamento do modal sticky

### 3.1 Abertura

- Banca, área, descrição: vazias
- Ano: `new Date().getFullYear()`
- Foco inicial: textarea (assumindo que banca/área serão preenchidas via autocomplete; o usuário pode trocar de campo via tab/click normalmente)
- Se houver rascunho válido (≤24h), banner amarelo no topo: `Rascunho recuperado de HH:mm — [Restaurar] [Descartar]`
  - Restaurar: aplica `form` + `textoBruto` salvos, dispara o auto-processar
  - Descartar: limpa `localStorage[estatisticas_draft]`, banner some

### 3.2 Auto-processar ao colar

- Watcher em `textoBruto` com debounce 300ms
- Se `textoBruto` não-vazio → executa `parseEstatisticas()` e atualiza `previewDados`
- Se parser retorna ≥1 disciplina → preview aparece automaticamente
- Se parser retorna 0 disciplinas → **silencioso** (não mostra toast de erro no auto; só clica no botão manual mostra o toast)
- Botão "Processar preview" continua visível como fallback explícito

**Nota (aprendizado da Fase 2):** se o conteúdo colado contém comentários HTML (`<!-- ... -->`) com tags HTML dentro do texto do comentário, alguns parsers (incl. happy-dom) interpretam errado e quebram a estrutura. O parser real do browser é mais tolerante, mas vale lembrar caso surja relato de "colei do site X e nada apareceu". Mitigação: instruir o user a copiar apenas o `<ul class="indice-conteudo">` em vez de seções inteiras com comentários ao redor.

### 3.3 Auto-extrair ano

- Função nova `detectYear(texto): number | null` em [src/utils/statsParser.js](../../../src/utils/statsParser.js)
- Estratégia:
  - Se HTML: procura primeiro `<h1>`, `<h2>`, `<title>` ou texto até a primeira tag `<ul>`. Procura `\b(20\d{2})\b`
  - Se texto puro: procura nas primeiras 200 chars
- Retorna o **único** ano encontrado (se houver mais de um match distinto, retorna `null` — ambíguo)
- Comportamento na UI:
  - Se `form.ano` vazio/null → preenche com `detectYear()`
  - Se `form.ano` preenchido e `detectYear()` retorna valor diferente → exibe chip `Detectado: {ano} (aplicar)` ao lado do input do ano. Click aplica.
  - Se igual ou null → silencioso

### 3.4 Salvar — fluxo

```
1. Validação básica: banca, ano (number), ≥1 disciplina no preview
2. Checa duplicata client-side:
   const dup = store.estatisticas.find(e =>
     e.banca === form.banca &&
     (e.area || '') === (form.area || '') &&
     e.ano === form.ano
   )
3. Se dup existe:
   → Abre ConfirmDialog: "Já existe {banca} / {area || 'Geral'} / {ano}. Substituir os dados?"
     → "Substituir": store.updateEstatistica(dup.id, { dados: previewDados })
       (PATCH apenas com `dados` — preserva descricao/banca/area/ano existentes;
        ver §7 e §13 backwards compat)
     → "Cancelar": volta pro modal sem alterar nada
4. Se não há dup:
   → store.createEstatistica({ ...form, dados: previewDados })
5. Após sucesso (POST ou PATCH):
   → Limpa textarea + preview + rascunho do localStorage
   → Decrementa ano: form.ano -= 1
   → Toast formato: "Salvo: {banca} / {area || 'Geral'} / {ano salvo}"
   → Foco volta pro textarea
   → Mantém: banca, área, descrição
```

**Validação adicional pré-save (mitiga risco §11.5):** se `bancaSearch` tem texto mas `form.banca` está vazio (usuário digitou sem clicar no autocomplete), tratar como banca não-selecionada e bloquear o save com toast claro. Mesma regra para área.

**Implementação (Fase 5 entregue 2026-05-07):** centralizado no computed `canSave`:
- Banca e ano obrigatórios; ≥1 disciplina no preview
- Para área: se `areaSearch` tem texto sem `form.area` selecionado, bloqueia
- Para banca: a checagem específica é redundante (`!form.banca` já cobre — se digitou sem selecionar, `form.banca` continua vazio)
- O toast de feedback ainda dispara em `salvar()` antes do request, caso o user contorne via DOM

### 3.5 Botões do footer

- Cancela
- **Salvar** — comportamento sticky descrito em 3.4 (modal não fecha)
- **Salvar e fechar** — mesmo fluxo de 3.4 mas após sucesso fecha o modal e limpa tudo

### 3.6 Reset por troca de banca/área

- Watcher em `form.banca` e `form.area`
- Quando o **valor selecionado/válido** muda (não a string em digitação no autocomplete) → `form.ano = new Date().getFullYear()`
- Implementação: usar watchers nos `selectBanca`/`selectArea` (handlers já existentes), não em `bancaSearch`/`areaSearch` (que mudam a cada tecla)
- Edge case: se o usuário limpa a banca (volta a vazio), também reseta ano

### 3.7 Saída do modal

- X / clique no overlay / `Esc` — verifica se há rascunho não-salvo
- "Rascunho não-salvo" = `textoBruto.trim().length > 0` (independente do parser ter conseguido extrair disciplinas; o conteúdo bruto que o usuário pode perder é o que importa)
- Se sim → `ConfirmDialog`: "Há um rascunho não-salvo. Sair mesmo assim?" / "Continuar editando"
  - Sair → fecha; rascunho permanece em `localStorage` (lifecycle de 24h cuida)
  - Continuar → não fecha
- Se não → fecha direto

## 4. Persistência de rascunho

### 4.1 Composable novo

`src/composables/useImportDraft.js`:

```js
// Pseudo-API
const { draft, saveDraft, clearDraft, hasValidDraft } = useImportDraft()

// draft: { form, textoBruto, savedAt } | null
// hasValidDraft: boolean — true se savedAt < 24h atrás
```

### 4.2 Comportamento

- Chave: `estatisticas_draft`
- Salva: watcher em `textoBruto` (debounce 1s) chama `saveDraft({ form: { ...form }, textoBruto, savedAt: new Date().toISOString() })`
- Recupera: ao abrir o modal (`watch showModal`), se `hasValidDraft` → mostra banner
- Limpa: ao salvar com sucesso (POST ou PATCH)
- Não limpa: ao fechar o modal sem salvar (a feature é justamente recuperar nesse caso)

**Atenção (aprendizado das Fases 5 e 6):** o watcher `[form.banca, form.area]` reseta `form.ano` para o ano corrente sempre que banca/área mudam. Atribuir `form.value = { ...draft.form }` em uma única operação **NÃO basta** — o watcher dispara após o setter da ref e ainda sobrescreve. Solução implementada: após a atribuição síncrona, `await nextTick()` e re-atribuir `form.ano = draft.form.ano`. Isso roda DEPOIS do watcher, garantindo o ano correto.

**Implementação (Fase 6 entregue 2026-05-07):**
- Banner é controlado por flag `bannerDismissed` (ref) + computed: `showModal && hasValidDraft && !bannerDismissed`
- Dispensa o banner em 3 momentos: openModal (false novamente — banner aparece se há draft), restoreDraft, discardDraft, OU primeira mudança do textarea (`textoBruto` de '' para non-empty)
- Auto-save com debounce 1s, com guarda dupla: `clearTimeout` no início do callback (sempre) + revalidação dentro do timer (`!showModal || !textoBruto.trim()` → não salva). Evita race do timer pendente disparar após `clearDraft()` no `salvar()`.
- `formatDraftTime(iso)` retorna `"DD/MM, HH:MM"` via `toLocaleString('pt-BR', ...)` — mais útil que só `HH:MM` (rascunho de ontem fica claro)

## 5. Atalhos

- `Ctrl/Cmd + Enter` no textarea → força `processar()` (idempotente com o auto)
- `Ctrl/Cmd + S` no modal → dispara `salvar()` + `event.preventDefault()` para anular "Salvar página" do browser
- `Esc` → fluxo de saída (3.7)
- Atalhos só ativos enquanto `showModal === true`. Listener é registrado/removido via `watch(showModal)` e também removido em `onBeforeUnmount` por segurança.
- Conservador: aceita apenas o atalho exato (sem `Shift`/`Alt` extras). Pressionar `Shift+Ctrl+S` (View Source) ou `Alt+Ctrl+S` não dispara salvar.
- `tryCloseModal()` retorna early se `saving === true` — evita estado inconsistente onde o dialog de saída abriria sobre um save em curso.

## 6. Componente novo: `ConfirmDialog.vue`

Localização: `src/components/common/ConfirmDialog.vue`

API mínima:

```vue
<ConfirmDialog
  v-model="open"
  :title="String"
  :message="String"
  :confirm-label="'Substituir'"
  :cancel-label="'Cancelar'"
  :variant="'danger' | 'warning' | 'info'"
  @confirm="onConfirm"
  @cancel="onCancel"
/>
```

Reutilizado em:
- Confirmação de duplicata (Substituir/Cancelar)
- Confirmação de exclusão de estatística (substituindo o `confirm()` nativo na linha 508)
- Confirmação de saída com rascunho não-salvo

Estilo segue a paleta do projeto (`#534AB7` primário, mesma tipografia `DM Sans`, `border-radius: 16px` etc).

## 7. Detecção de duplicata — detalhe

- A checagem é **client-side**, baseada no `store.estatisticas` (já carregado e persistido)
- Match: `banca` (string exata) + `area` (string exata, com `''` para ausência — vide §13) + `ano` (number)
- **Atenção (aprendizado da Fase 8):** o `<ConfirmDialog>` da duplicata terá seu próprio listener de Esc (via Fase 1). O `onModalKeyDown` da view precisa ser estendido com gate adicional: `if (showExitDialog.value || showDuplicateDialog.value) return` para não competir com o Esc do dialog.
- Comparação case-sensitive — assume que o autocomplete já normaliza via `dictsStore`
- Se o usuário tiver mexido no `localStorage` ou os dados estiverem desatualizados, a duplicata é detectada apenas no servidor — fora do escopo (o backend não tem unique-by-tuple e não vamos adicionar agora)

**PATCH parcial seguro (importante para backwards compat):**
- O backend faz `updateDoc(INDEX, id, { ...patch, updatedAt })` em [backend-express estatistica.service.js:42-49](../../../../backend-express/src/modules/estatisticas/estatistica.service.js#L42-L49) — qualquer campo enviado **substitui** o existente
- No fluxo de duplicata, mandar **apenas `{ dados }`** no patch. Isso preserva `descricao`, `banca`, `area`, `ano` do documento original
- Se no futuro houver UI dedicada de edição, ela monta o patch com os campos efetivamente editados
- Implicação: o usuário não consegue **mudar a descrição** via fluxo de duplicata; só os dados disciplinares são atualizados. Aceitável e documentado.

**Implementação (Fase 10 entregue 2026-05-07):**
- Função unificada `runSave({ mode, closeAfter, dupId })` em vez de duplicar lógica entre create e update
- Toast formatado pela view: `Salvo: banca / área / ano` ou `Atualizado: banca / área / ano`
- O store `useEstatisticaStore` ganhou parâmetro `{ silent = false }` em `createEstatistica` e `updateEstatistica` — view passa `silent: true` para suprimir o toast genérico do store (evita toast duplicado)
- `canSave` bloqueia enquanto `showDuplicateDialog` ou `showExitDialog` está aberto
- `closeModal` reseta TODOS os refs de dialog para evitar state leak entre aberturas

## 8. Quick wins originais — detalhe

### 8.1 Vazamento do listener

Antes:
```js
onMounted(() => {
  // ...
  window.addEventListener('click', () => { openMenu.value = null })
})
```

Depois:
```js
const closeMenuOnClick = () => { openMenu.value = null }
onMounted(() => { window.addEventListener('click', closeMenuOnClick) })
onBeforeUnmount(() => { window.removeEventListener('click', closeMenuOnClick) })
```

### 8.2 Filtros client-side da aba Importações

Atualmente: `<select @change="carregarDados">` chama `store.fetchEstatisticas(filtro)`. Filtros disponíveis: `banca`, `ano`.

Depois: filtros viram `computed` sobre `store.estatisticas` e ganham um terceiro filtro de **área**:

```js
const filtro = ref({ banca: '', area: '', ano: '' })

const estatisticasFiltradas = computed(() => {
  return store.estatisticas.filter(e => {
    if (filtro.value.banca && e.banca !== filtro.value.banca) return false
    if (filtro.value.area && (e.area || '') !== filtro.value.area) return false
    if (filtro.value.ano && e.ano !== filtro.value.ano) return false
    return true
  })
})
```

`fetchEstatisticas` continua sendo chamado uma vez no `onMounted`. O parâmetro de filtro do service permanece (para outros usos potenciais).

**Importante (backend `size` default):** o backend ([utils/esHelper.js search](../../../../backend-express/src/utils/esHelper.js)) tem `size: 100` como default e o controller [listEstatisticas](../../../../backend-express/src/modules/estatisticas/estatistica.service.js#L12-L22) não passa `size` explícito. Hoje, com filtros aplicados, raramente passa de 100 docs por filtro. Mudando para client-side, o request inicial precisa trazer **todos** os docs do mentor — então passar de 100 docs totais começa a truncar silenciosamente. **Mitigação coordenada com o backend:** ajustar `listEstatisticas` para passar `{ size: 1000 }` ao `search()`. Mudança de 1 linha, sem impacto contratual. Detalhada em §13 backwards compat.

**Preservação da ordem:** o backend ordena por `ano DESC, createdAt DESC`. O `Array.prototype.filter` preserva a ordem de entrada, então o client-side filter mantém essa ordem natural. Não precisa re-sort.

**Cascata banca → área:** o select de área lista apenas as áreas presentes nas estatísticas da banca selecionada. Se nenhuma banca estiver selecionada, lista todas as áreas distintas. Implementação:

```js
const areasDisponiveisFiltro = computed(() => {
  const base = filtro.value.banca
    ? store.estatisticas.filter(e => e.banca === filtro.value.banca)
    : store.estatisticas
  return [...new Set(base.map(e => e.area).filter(Boolean))].sort()
})
```

Ao mudar a banca, se a área atual não existe mais na nova banca, limpar `filtro.area = ''`.

**Implementação (Fase 4 entregue 2026-05-07):** dois watchers separados em vez de um único, mais legíveis:
- Watcher 1: `[banca, area, ano, perPage]` → `page = 1` (reset de paginação)
- Watcher 2: `banca` → limpa `area` se inválida na nova banca

### 8.3 Paginação dos cards

- Per-page com **seletor** (opções: 12, 24, 48), default **12**
- Estado:

```js
const page = ref(1)
const perPage = ref(12)
```

- Computed:

```js
const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(estatisticasFiltradas.value.length / perPage.value))
)

const estatisticasPagina = computed(() => {
  const start = (page.value - 1) * perPage.value
  return estatisticasFiltradas.value.slice(start, start + perPage.value)
})
```

- O `v-for` no grid passa a iterar `estatisticasPagina` em vez de `store.estatisticas`
- Ao mudar **qualquer** filtro (banca/área/ano) **ou o per-page** → `page.value = 1`
- **Guard contra page out-of-bounds** (Fase 4 entregue 2026-05-07): quando uma estatística é deletada, `totalPaginas` pode decrescer abaixo de `page.value`. O computed `estatisticasPagina` aplica `Math.min(page.value, totalPaginas.value)` antes do slice — evita render vazio quando o usuário tá numa página que sumiu.
- Componente novo `src/components/common/Pagination.vue` (reusável):
  - Props: `currentPage`, `totalPages`, `total` (nº total de itens), `perPage`, `perPageOptions` (default `[12, 24, 48]`)
  - Eventos: `update:currentPage`, `update:perPage`
  - Layout: à esquerda `Mostrando 1–12 de 43`; ao centro/direita botões `‹ 1 2 3 … N ›`; à direita seletor `Por página: [12 ▾]`
  - Esconde os botões de páginas quando `totalPages === 1`, mas mantém o seletor de per-page e o "Mostrando…" enquanto houver itens
- Sem persistir page nem perPage entre sessões (sempre começa em 1 / 12)

### 8.4 Suporte para `<ul>` raiz no parser

Hoje em [statsParser.js:28-48](../../../src/utils/statsParser.js#L28-L48), `parseHtml` faz `root.querySelectorAll(':scope > li')`. Quando o usuário cola um `<ul class="indice-conteudo">...</ul>` direto (caso real do QConcursos), os filhos diretos do `<div>` wrapper são `<ul>`, não `<li>` — o que cai no fallback lento `parseAllLisByDepth`.

Adicionar caminho rápido:

```js
function parseHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.querySelector('div')

  // Caminho 1: usuário colou os <li> diretamente
  let topLis = root.querySelectorAll(':scope > li')

  // Caminho 2 (novo): usuário colou um <ul> wrapper — pega os <li> diretos do primeiro <ul>
  if (!topLis.length) {
    const rootUl = root.querySelector(':scope > ul')
    if (rootUl) topLis = rootUl.querySelectorAll(':scope > li')
  }

  // Caminho 3: fallback por profundidade (sem mudança)
  const lis = topLis.length ? topLis : root.querySelectorAll('li')
  if (!lis.length) return { disciplinas: [] }

  if (topLis.length) {
    return { disciplinas: Array.from(topLis).map(li => parseLiNode(li, 0)).filter(Boolean) }
  }
  return parseAllLisByDepth(root)
}
```

Fixture de teste já em [src/utils/__fixtures__/qconcursos-real-sample.html](../../../src/utils/__fixtures__/qconcursos-real-sample.html) — exercita esse caminho específico.

### 8.5 Gate no `dictsStore`

Antes:
```js
await Promise.all([
  store.fetchEstatisticas(),
  dictsStore.fetchByTipo('banca'),
  dictsStore.fetchByTipo('area'),
])
```

Depois:
```js
const fetches = [store.fetchEstatisticas()]
if (!dictsStore.bancas?.length) fetches.push(dictsStore.fetchByTipo('banca'))
if (!dictsStore.areas?.length) fetches.push(dictsStore.fetchByTipo('area'))
await Promise.all(fetches)
```

Verificar antes de aplicar: se `dictsStore` não persiste, o gate é inócuo dentro de uma sessão. Confirmar lendo [src/stores/useDictsStore.js](../../../src/stores/useDictsStore.js) na implementação.

## 9. Arquivos afetados

| Arquivo | Tipo | O que muda |
|---|---|---|
| [src/views/EstatisticasView.vue](../../../src/views/EstatisticasView.vue) | refactor | Modal sticky, atalhos, banner de rascunho, listener fix, filtros client-side (incl. área), paginação, integração com ConfirmDialog |
| `src/components/common/ConfirmDialog.vue` | novo | Componente reusável |
| `src/components/common/Pagination.vue` | novo | Paginação numerada simples (reutilizável em outras views futuramente) |
| `src/composables/useImportDraft.js` | novo | Persistência de rascunho |
| [src/utils/statsParser.js](../../../src/utils/statsParser.js) | adição | Função `detectYear(texto)` + caminho rápido para `<ul>` raiz em `parseHtml` |
| [src/utils/__fixtures__/qconcursos-real-sample.html](../../../src/utils/__fixtures__/qconcursos-real-sample.html) | já criado | Fixture de HTML real do QConcursos |
| `src/utils/statsParser.test.js` | novo | Fixtures + testes (HTML real, texto indentado, texto sem indentação, detectYear, `<ul>` raiz) |
| `src/composables/useImportDraft.test.js` | novo | Salvar, recuperar, expirar 24h, limpar |

Sem mudanças em store, service ou backend.

## 10. Testes

### 10.1 Pré-requisito — testes do parser

Hoje o `statsParser` tem 4 caminhos sem rede de segurança. Antes de adicionar `detectYear` ou o caminho rápido de `<ul>` raiz, criar fixtures.

**Decisão de implementação (Fase 2 entregue 2026-05-07):**
- Apenas a fixture de HTML real grande fica em arquivo separado:
  - ✅ `__fixtures__/qconcursos-real-sample.html` — HTML real do QConcursos, exercita Path 5 (`<ul>` raiz) com 3 níveis (matéria → assunto → sub-assunto)
- Demais cenários ficam **inline nos testes** (`statsParser.test.js`) com strings JS pequenas — mais legíveis e auto-contidos:
  - Path 1 (HTML com `<li>` direto)
  - Path 2 (fallback `parseAllLisByDepth` via wrapper `<section>`)
  - Path 3 (texto indentado)
  - Path 4 (texto sem indentação — heurística de soma)
  - Detecção de formato + entidades HTML
  - `detectYear` (10 casos)

Total: 29 testes do parser passando, cobrindo todos os 5 paths + detectYear + edge cases (entidades, precedência Path 1 vs 5, ano fora do espaço de busca).

**Refactor adicional realizado na Fase 2 (não previsto na spec):** `parseHtml`/`parseLiNode`/`parseAllLisByDepth` removeram dependência de seletor `:scope >` (não suportado por happy-dom) usando helpers `directChildren`/`firstDirectChild`. Comportamento preservado em browsers reais.

### 10.2 Testes novos

- `detectYear` — HTML com 1 ano, HTML com múltiplos anos (retorna null), texto puro com ano nas primeiras chars, texto sem ano
- `useImportDraft` — salvar/recuperar/expirar/limpar
- Smoke E2E (manual ou Playwright se já tiver setup): abrir modal, colar HTML, ver auto-processar, salvar, ver decremento, salvar duplicata e ver diálogo

### 10.3 Build

`npm run build` precisa passar antes de marcar pronto.

## 11. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| 11.1 | `detectYear` retorna falso positivo (ex: "Decreto 2024 de 2024" — número da norma ≠ ano da prova) | Heurística conservadora: só nos primeiros 200 chars / `<h1-h2>`; retorna `null` se houver múltiplos anos distintos. Não preenche silenciosamente se já há valor; chip de sugestão dá ao usuário a decisão final. |
| 11.2 | Race entre auto-processar (debounce 300ms) e salvar | Salvar checa `previewDados.disciplinas.length > 0`; se debounce ainda não rodou, botão fica desabilitado. Já é o comportamento atual. |
| 11.3 | Múltiplas abas com rascunhos diferentes | Pinia persist do `estatisticas` já tem o problema; o draft global piora marginalmente. Documentar como limitação conhecida. Solução real exige `BroadcastChannel` ou `storage` event — fora do escopo. |
| 11.4 | `Ctrl+S` capturado em outros contextos do app | Listener registra/remove apenas com modal aberto. Se o usuário tem outro listener global de `Ctrl+S`, modal vence enquanto aberto. |
| 11.5 | **Usuário digita banca/área no autocomplete sem clicar em uma sugestão** (bug pré-existente, amplificado pelo modo sticky) | Validação pré-save em §3.4: se `bancaSearch` tem texto e `form.banca` está vazio → bloqueia o save com toast "Selecione uma banca da lista". Mesma regra para área. |
| 11.6 | Decremento decrementa para ano absurdo (ex: 1900) | Na prática, usuário vê o ano errado e corrige manualmente. Não vamos validar limites — YAGNI. |
| 11.7 | `ConfirmDialog` adicionado no topo do `Teleport` pode conflitar com modal já existente (z-index) | Padronizar: ConfirmDialog usa `z-index` superior ao modal de import (ex: 200 vs 100). |
| 11.8 | **Backend `size: 100` default trunca silenciosamente** quando totalDocs > 100 | Mitigação coordenada: ajustar `listEstatisticas` para `{ size: 1000 }`. Detalhado em §13. |
| 11.9 | **PATCH de duplicata sobrescrevendo `descricao` com vazio** | Mandar apenas `{ dados }` no PATCH. Detalhado em §7. |

## 12. Critérios de aceitação

Funcionais:
- [ ] Abrir modal, colar HTML válido → preview aparece sem clicar em "Processar preview"
- [ ] Salvar com banca/área preenchidos → modal não fecha, ano decrementa em 1, banca/área/descrição mantidos
- [ ] Trocar banca após 2 saves → ano volta para ano corrente
- [ ] Trocar área após 2 saves → ano volta para ano corrente
- [ ] Salvar com `banca + área + ano` já existentes → ConfirmDialog aparece, "Substituir" faz PATCH, "Cancelar" não altera
- [ ] Cole HTML com ano detectável e campo Ano vazio → ano é preenchido automaticamente
- [ ] Cole HTML com ano detectável diferente do campo Ano → chip "Detectado: X" aparece, click aplica
- [ ] Fechar modal com textarea preenchido → ConfirmDialog de saída aparece
- [ ] Reabrir modal em <24h após fechar com rascunho → banner de recuperação
- [ ] Apagar todo o conteúdo do textarea limpa o preview automaticamente (Fase 7 — gate de auto-processar)
- [ ] Após sticky save (ano decrementa, textarea limpa), preview fica vazio sem precisar clicar
- [ ] `Ctrl+Enter` no textarea processa preview
- [ ] `Ctrl+S` salva e bloqueia o "Salvar página" do browser
- [ ] Botão "Salvar e fechar" salva e fecha
- [ ] Excluir estatística mostra ConfirmDialog em vez de `confirm()` nativo
- [ ] Listener de window.click é removido ao desmontar a view
- [ ] Filtros banca/área/ano da aba Importações filtram instantaneamente sem chamar a rede
- [ ] Filtro de área lista apenas as áreas presentes na banca selecionada (cascata)
- [ ] Mudar a banca limpa o filtro de área se a área atual não existe na nova banca
- [ ] Cards são paginados com default 12 por página
- [ ] Seletor de per-page oferece 12 / 24 / 48
- [ ] Mudar qualquer filtro **ou** o per-page reseta para página 1
- [ ] Botões de páginas somem quando há apenas 1 página de resultados (seletor de per-page e "Mostrando X–Y de Z" continuam)
- [ ] Colar `<ul class="indice-conteudo">...</ul>` direto produz preview correto (sem cair no fallback lento)
- [ ] Fixture `qconcursos-real-sample.html` é parseada corretamente (3 matérias, hierarquia 3 níveis)

Backwards compatibility (§13):
- [ ] Estatísticas existentes (criadas antes deste PR) continuam aparecendo nos cards
- [ ] Cards com `area === ''` aparecem em "Geral" no modal de detalhes (comportamento atual)
- [ ] Filtro de área com valor vazio mostra **todas** as estatísticas, incluindo as sem área
- [ ] PATCH de duplicata mantém `descricao` original do documento
- [ ] Aba Tendências continua funcionando com a base atual (sem regressão visual)
- [ ] Backend `listEstatisticas` ajustado para `size: 1000` (PR coordenado em `backend-express`)
- [ ] Validação pré-save bloqueia salvar com banca/área digitadas mas não selecionadas no autocomplete

Cenários de validação manual (extraídos da meta-revisão pós-Fase 10, 2026-05-07):
- [ ] Restaurar rascunho com ano X, depois colar HTML novo — auto-extrair propõe novo ano se diferente
- [ ] Abrir dialog de duplicata, pressionar X / clique no overlay → não abre showExitDialog em paralelo
- [ ] Fechar modal com auto-save pendente, reabrir antes de 24h → banner de recuperação mostra
- [ ] Deletar estatística enquanto na última página da paginação → guard `Math.min(page, totalPaginas)` evita render vazio
- [ ] Ctrl+Shift+S não dispara salvar (browser View Source segue funcionando)
- [ ] Apertar Esc 2x rápido com modal aberto + dialog: dialog fecha, depois modal exibe seu próprio fluxo de saída
- [ ] Em outra aba, criar duplicata da combinação atual; voltar à tela e tentar salvar a mesma combinação — backend não impede (limitação documentada §11.3)

Não-funcionais:
- [ ] Testes do parser passando (incluindo fixtures novas)
- [ ] Testes do `useImportDraft` passando
- [ ] `npm run build` sem warnings novos
- [ ] Sem regressão visual (cards, modal, gráficos da aba Tendências intactos)

## 13. Backwards compatibility

Constraint do usuário: **dados existentes já indexados precisam continuar funcionando**. Achados da análise + mitigações específicas.

### 13.1 Compat do campo `area`

- Docs criados pelo backend hoje têm `area: ''` quando o usuário não preencheu (`area?.trim() || ''` no [create](../../../../backend-express/src/modules/estatisticas/estatistica.service.js#L32))
- Docs hipoteticamente criados via outras rotas ou seeds podem ter `area === undefined`
- **Toda comparação client-side** trata como `''`: `(e.area || '') === filtro.value.area`
- Filtro de área no modal de detalhes mostra "Geral" quando vazia (já é o comportamento atual no [EstatisticasView.vue:221](../../../src/views/EstatisticasView.vue#L221))

### 13.2 Compat do limite do backend

- Hoje, `listEstatisticas` no backend usa `size: 100` (default do helper `search`)
- Migração para client-side filter exige trazer **todos** os docs do mentor de uma vez
- **Mitigação obrigatória (PR coordenado em backend-express):** alterar [estatistica.service.js linha 18](../../../../backend-express/src/modules/estatisticas/estatistica.service.js#L18) para passar `{ size: 1000 }`:
  ```js
  return search(INDEX.ESTATISTICAS_QUESTOES, {
    query: { bool: { must } },
    sort: [{ ano: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
  }, { size: 1000 })
  ```
- 1000 é folga ampla para o caso de uso real do mentor (estimativa atual: ≤ 200 docs)
- Sem mudança contratual, apenas comportamental
- **Plano:** PR pequeno e focado no backend antes ou junto com a Fase 4

### 13.3 Aba Tendências preservada

- Toda lógica em §2-§10 toca apenas a aba **Importações** e o modal
- A aba **Tendências** continua usando `store.estatisticas` direto, sem mudança
- Os dados que ela consome são os mesmos do array do store; client-side filter da Importações não filtra o array, só o `computed` de exibição

### 13.4 Compat do parser

- Caminho rápido novo (`<ul>` raiz) é **adicional**: rotas existentes (texto puro, HTML com `<li>` direto, fallback por profundidade) ficam intocadas
- Fixtures novas exercitam todos os caminhos garantindo que nenhum regrediu
- `detectYear` é puramente aditivo — função nova, não toca em `parseEstatisticas`

### 13.5 Compat do persist

- A chave `estatisticas` do Pinia persist mantém o mesmo shape (`{ estatisticas: [...] }`)
- Nova chave `estatisticas_draft` é independente; não conflita
- Limpeza de rascunho ao salvar não toca nas estatísticas persistidas

## 14. Open questions / decisões adiadas

- Componentizar a view (extrair `ImportacoesTab`, `TendenciasTab`, `ImportModal`): será spec separada, prioridade depois deste escopo
- Renomeação de "Tendências": discussão de produto separada
- Edição livre de estatísticas via UI (incluindo editar `descricao`): depende de UX dedicada
- Validação no backend de duplicatas: hoje permitido; pode endurecer em PR futuro coordenado com `backend-express`
- Aumentar `size` para limite maior (10k+) ou implementar paginação real no backend: necessário se o catálogo do mentor explodir; YAGNI agora
- **Invalidação do `dictsStore` cache** (Fase 3 entregue 2026-05-07): o gate atual usa `if (!dictsStore.bancas.length)` — só re-fetcha se estiver vazio. Como o store persiste em `localStorage`, se um admin adicionar banca/área nova no backend, o user só vê depois de clear manual. Mitigação possível: timestamp + TTL de 1 dia. YAGNI agora porque dictsStore muda raramente. Limitação documentada.

## 15. Roteiro de Validação Manual

Roteiro estruturado em jornadas. Cada jornada tem **pré-condição**, **passos numerados**, **resultado esperado** e referência ao critério da spec.

### Setup inicial (executar 1x antes das jornadas)

1. Garantir que `npm run dev` está rodando e o backend Express atualizado (com `size: 1000` em `listEstatisticas`)
2. Login no app pelo OAuth2 normal
3. Navegar para `/estatisticas`
4. Aba "Importações" ativa por padrão
5. Se houver dados de testes anteriores que atrapalhem: abrir DevTools → Application → Local Storage → remover chave `estatisticas_draft` (rascunho) — **NÃO** remover `estatisticas` (queremos manter dados pré-existentes para validar backwards compat)

### Jornada 1 — Modo lote (5 anos seguidos)

**Pré:** aba Importações sem nenhum modal aberto. Ter um HTML real do QConcursos copiado (use `src/utils/__fixtures__/qconcursos-real-sample.html` como referência se precisar).

1. Clicar **Nova Importação** → modal abre
2. **Esperado:** campo Ano vem com o ano corrente (ex: 2026)
3. Preencher banca via autocomplete (clicar uma sugestão), ex: "FGV"
4. Preencher área via autocomplete, ex: "Fiscal"
5. Preencher descrição: "Teste lote"
6. Colar o HTML no textarea
7. **Esperado (300ms depois):** preview aparece com disciplinas/assuntos sem clicar em "Processar preview"
8. Clicar **Salvar**
9. **Esperado:** toast "Salvo: FGV / Fiscal / 2026"; modal NÃO fecha; ano vai para 2025; textarea + preview limpos; foco volta no textarea
10. Colar outro HTML (ano 2025) no textarea
11. **Esperado:** preview aparece auto
12. Clicar **Salvar**
13. **Esperado:** toast "Salvo: FGV / Fiscal / 2025"; ano vai para 2024; modal continua aberto
14. Repetir para 2024, 2023, 2022 — cada save decrementa o ano
15. No último (2022), clicar **Salvar e fechar** → modal fecha
16. **Esperado:** voltou para a lista; 5 cards novos aparecem no grid (banca FGV / Fiscal, anos 2026–2022)

**Cobre:** §3.4 (sticky), §3.1 (abertura ano corrente), critérios "modal não fecha", "ano decrementa", "Salvar e fechar"

### Jornada 2 — Reset por banca/área

**Pré:** modal de importação aberto.

1. Selecionar banca "FGV" via autocomplete
2. Selecionar área "Fiscal"
3. **Esperado:** ano = ano corrente
4. Salvar (com HTML válido) — ano vira ano corrente − 1
5. Trocar a banca para "Cebraspe" via autocomplete
6. **Esperado:** ano volta para ano corrente
7. Trocar a área para outra
8. **Esperado:** ano volta para ano corrente

**Cobre:** §3.6 (reset por troca de banca/área)

### Jornada 3 — Duplicata

**Pré:** já existe uma estatística importada FGV/Fiscal/2026 (criada na Jornada 1). Modal aberto.

1. Selecionar banca "FGV", área "Fiscal", ano 2026
2. Colar HTML novo (mesmos critérios)
3. **Esperado:** preview aparece
4. Clicar **Salvar**
5. **Esperado:** ConfirmDialog `info` aparece — "Substituir FGV / Fiscal / 2026?". Mensagem deixa claro que descrição/banca/área/ano permanecem
6. Clicar **Cancelar**
7. **Esperado:** dialog fecha; modal continua aberto; nada mudou no store
8. Clicar **Salvar** novamente
9. **Esperado:** dialog reaparece. Clicar **Substituir**
10. **Esperado:** toast "Atualizado: FGV / Fiscal / 2026"; sticky save segue normal (ano vai para 2025); o card de FGV/Fiscal/2026 mostra os novos dados (verificar via "Ver detalhes" — disciplinas devem refletir o segundo HTML); descrição original PRESERVADA

**Cobre:** §7 (detecção de duplicata), critério "PATCH mantém descricao original"

### Jornada 4 — Rascunho

**Pré:** modal aberto, sem nenhum draft no localStorage (limpe na DevTools se necessário).

1. Preencher banca + área + descrição
2. Colar HTML no textarea — esperar 1s para auto-save
3. **Esperado:** chave `estatisticas_draft` aparece no localStorage com `form` + `textoBruto` + `savedAt`
4. **Não salvar.** Clicar **X** ou pressionar **Esc**
5. **Esperado:** ConfirmDialog `warning` "Sair sem salvar?"
6. Clicar **Sair**
7. **Esperado:** modal fecha; rascunho permanece no localStorage
8. Clicar **Nova Importação** novamente
9. **Esperado:** banner amarelo no topo do modal: "Rascunho recuperado de DD/MM, HH:MM"
10. Clicar **Restaurar**
11. **Esperado:** banca/área/ano/descrição/textarea restaurados como estavam; banner some; preview aparece em ~300ms
12. Fechar modal sem salvar; reabrir
13. Banner aparece de novo (rascunho ainda ativo). Clicar **Descartar**
14. **Esperado:** banner some; localStorage `estatisticas_draft` removido
15. **Edge — TTL:** Salvar um draft, esperar 24h+ (ou manualmente alterar `savedAt` para 25h atrás no DevTools), reabrir modal
16. **Esperado:** banner NÃO aparece (TTL expirou)

**Cobre:** §4 (rascunho), §3.7 (saída com confirmação)

### Jornada 5 — Atalhos

**Pré:** modal aberto.

1. Colocar foco no textarea (clicar dentro)
2. Pressionar **Ctrl/Cmd + Enter**
3. **Esperado:** preview processa imediatamente (mesmo se debounce 300ms ainda não terminou); se vazio, toast erro
4. Pressionar **Ctrl/Cmd + S** (com banca + ano + preview válidos)
5. **Esperado:** salva (sticky save); browser NÃO abre "Salvar página"
6. Pressionar **Ctrl/Cmd + Shift + S**
7. **Esperado:** atalho NÃO dispara salvar (browser segue funcionando para View Source ou bindings próprios)
8. Pressionar **Esc** com textarea preenchido
9. **Esperado:** ConfirmDialog de saída aparece (porque há rascunho)
10. Pressionar **Esc** novamente (com dialog aberto)
11. **Esperado:** dialog fecha (cancela). Modal continua aberto. NÃO abre showExitDialog em paralelo

**Cobre:** §5 (atalhos)

### Jornada 6 — Auto-extrair ano

**Pré:** modal aberto. Preparar 2 HTMLs com headers `<h1>Provas FGV 2024</h1>` e `<h1>Cebraspe 2023</h1>` (pode ser sintético — adicionar `<h1>` no topo de uma fixture qualquer).

1. Banca/área preenchidos. Ano = ano corrente
2. Colar HTML com `<h1>Provas FGV 2024</h1>` no topo
3. **Esperado:** chip "Detectado: 2024 (aplicar)" aparece ao lado do input do ano (porque 2024 ≠ ano corrente)
4. Clicar no chip
5. **Esperado:** form.ano = 2024, chip some (porque agora são iguais)
6. Apagar manualmente o ano (clicar no input, Ctrl+A, Delete)
7. Colar outro HTML com `<h1>Cebraspe 2023</h1>`
8. **Esperado:** ano preenchido silenciosamente para 2023 (porque estava vazio); SEM chip (porque ano = detected)
9. Colar HTML sem ano detectável (ex: a fixture qconcursos-real-sample.html, que não tem `<h1>`)
10. **Esperado:** chip não aparece; form.ano permanece o último valor

**Cobre:** §3.3 (auto-extrair ano)

### Jornada 7 — Filtros + paginação

**Pré:** ter ≥13 estatísticas no grid (importar várias rapidamente se necessário).

1. **Esperado:** grid mostra 12 cards; paginação aparece com "Mostrando 1–12 de N", botões `‹ 1 2 ... ›`, seletor "Por página: 12"
2. Clicar página 2
3. **Esperado:** grid muda; "Mostrando 13–N"
4. Trocar per-page para 24
5. **Esperado:** página volta para 1; grid mostra 24
6. Filtrar por banca "FGV"
7. **Esperado:** filtro instantâneo (sem network); página = 1; grid mostra só FGV; áreas no select de área refletem só áreas existentes em FGV (cascata)
8. Trocar banca para "Cebraspe" (que não tem a área filtrada)
9. **Esperado:** filtro de área é limpo automaticamente; só docs Cebraspe aparecem
10. Trocar para uma combinação banca+área que tenha 0 resultados
11. **Esperado:** empty state "Nenhum resultado com esses filtros" + botão **Limpar filtros**. Paginação some.
12. Clicar **Limpar filtros** → volta a mostrar todos
13. **Edge — page out-of-bounds:** ir para a última página, deletar todos os cards visíveis
14. **Esperado:** grid mostra os cards da nova "última página" (guard `Math.min(page, totalPaginas)`)

**Cobre:** §8.2, §8.3 (filtros + paginação)

### Jornada 8 — Quick wins

**Pré:** ≥1 card no grid.

1. Clicar no menu kebab de um card → "Excluir"
2. **Esperado:** ConfirmDialog `danger` "Excluir estatística"
3. Clicar **Cancelar** → dialog fecha; card permanece
4. Repetir → **Excluir** → toast "Estatística removida"; card some
5. Clicar fora de qualquer menu kebab aberto → menu fecha (listener `window.click`)
6. Navegar pra outra rota e voltar para `/estatisticas`
7. **Esperado:** dictsStore não re-fetcha se já tem dados (verificar Network tab — não deve ter chamada para `/api/dicts/banca` ou `/api/dicts/area`)

**Cobre:** §8.1, §8.4 (quick wins)

### Jornada 9 — Backwards compatibility

**Pré:** estatísticas pré-existentes (criadas antes do PR) no índice.

1. Abrir `/estatisticas`
2. **Esperado:** todas as estatísticas antigas aparecem nos cards (não foram corrompidas)
3. Filtrar por área vazia
4. **Esperado:** cards com `area === ''` aparecem (filtro vazio = todas)
5. Abrir um card antigo via "Ver detalhes"
6. **Esperado:** modal de detalhes mostra dados como antes; se area era '', título mostra "Geral"
7. Trocar para aba **Tendências**
8. **Esperado:** funciona igual — gráficos renderizam, filtros idênticos ao comportamento antes do PR

**Cobre:** §13 (backwards compatibility)

### Jornada 10 — Cenários edge da meta-revisão

1. **Restaurar rascunho com ano X, depois colar HTML novo com header de ano diferente Y** → chip "Detectado: Y (aplicar)" aparece (porque X ≠ Y)
2. **Abrir dialog de duplicata, clicar X do header do modal** → tryCloseModal vê showDuplicateDialog aberto e retorna; dialog de duplicata segue ativo, modal não tenta abrir showExitDialog
3. **Em outra aba, criar duplicata da combinação atual; voltar e tentar salvar** → backend NÃO bloqueia; cria documento físico duplicado (limitação documentada §11.3)
4. **Network offline durante save** → toast erro com `err.message`; modal continua aberto; usuário pode tentar de novo

### Tracking de bugs encontrados

Conforme você for executando, para cada falha:
- Anotar **Jornada N, passo X**, comportamento observado vs esperado
- Capturar console do browser e Network tab
- Pos-validação, listar consolidado em `docs/superpowers/specs/2026-05-07-estatisticas-validacao-achados.md` (se houver fix necessário, criar nova mini-spec ou anexar à essa)

### Build de produção

- [ ] `npm run build` passa sem erros (Node 20+ necessário; pode ser via CI ou ambiente atualizado)
- [ ] Sem warnings novos vs estado pré-PR
