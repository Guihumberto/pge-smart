# Aba Análise — Filtro de Disciplina + Coluna "Recência" + Visão Expandível

**Data:** 2026-05-07
**Rota afetada:** `/estatisticas` aba **Análise** (sub-projeto 2 já entregue na spec [2026-05-07-analise-recorrencia-design.md](2026-05-07-analise-recorrencia-design.md))
**Público:** mentor

## 1. Motivação

Validação manual da Análise multi-dimensional revelou três oportunidades:

1. **Filtro de disciplina explícito** — drill-down via clique funciona pra exploração, mas mentor que JÁ sabe a disciplina (ex: "quero analisar Direito Tributário") gasta cliques. Select no toolbar é via direta.

2. **Recência temporal** — recorrência atual mistura todos os anos do dataset. Assunto com 80% de recorrência histórica MAS que sumiu nos últimos 3 anos é diferente de assunto com 80% incluindo cobertura recente. Mentor precisa ver "o que está sendo cobrado AGORA" sem perder a visão histórica.

3. **Visão de disciplina** — caso de uso real: mentor seleciona uma disciplina pra **priorizar** os assuntos dela com sub-assuntos juntos, identificando o que é relevante DENTRO de cada assunto. Hoje, ver assunto + subs exige duas navegações separadas (gran=assunto, depois drill-down em cada). Visão expandível resolve com 1 clique de chevron por linha.

## 2. Objetivo

Adicionar três features à aba Análise sem mudar filosofia da spec original (multi-dimensional, sem score composto):

1. Filtro de disciplina no toolbar (sincronizado com drill-down existente)
2. Coluna "Recência" — % de cobertura nos últimos 3 anos do dataset, independente da recorrência geral
3. Modo expandível — quando `discFilter` ativo + `gran=assunto`, cada linha de assunto pode expandir mostrando seus sub-assuntos com destaque pros que passam no preset

## 3. Escopo

### 3.1 Entra

**Filtro disciplina:**
- Novo `<select>` "Disciplina" na toolbar entre Área e Granularidade
- Computed `analiseDisciplinasOptions` (disciplinas do dataset filtrado por banca/área)
- Sincronização bi-direcional select ↔ `analise.discFilter` (drill-down via clique continua atualizando o select)
- "Todas" limpa `discFilter` e `assFilter`

**Coluna Recência:**
- Coluna entre Recorrência e Vol/ano quando `anos.length >= 3`
- Engine: `computeMetrics` retorna `item.recencia`, `item.recenciaAnos`, `result.janelaRecente`
- Coluna oculta quando `anos.length < 3` (degrada graciosamente)
- CSV: header `Recencia` na 3ª posição
- Tooltip: lista anos cobertos
- Sortable

**Modo expandível:**
- Quando `analise.discFilter !== ''` AND `gran === 'assunto'` → linhas ganham chevron `▸`
- Click no chevron expande linhas indented com sub-assuntos do assunto pai
- Sub-assunto que passa no preset atual ganha background `#EEF2FF` (destaque)
- Sub-assunto que não passa fica visível mas com cor muted (contexto)
- Estado `expandedAssuntos: Set<string>` local ao AnaliseTable (não persiste em URL — UX efêmero)
- View calcula `analiseSubsByAssunto: Map<string, Item[]>` quando há discFilter

### 3.2 Não entra

- **Janela configurável** (3, 5, 10 anos) — fixa em 3 pra MVP
- **Filtro temporal** ("apenas últimos 3 anos") — coluna Recência já entrega contraste
- **Recência influencia preset** — preset continua filtrando só por `recorrenciaMin + volumeTotalMin`
- **Score composto** — descartado (consistente com spec original §2)
- **Recência ponderada (decay exponencial)** — fora de escopo
- **Filtro de sub-assunto no toolbar** — drill-down via clique cobre o caso
- **Sub-assuntos selecionáveis (checkbox próprio)** na visão expandível — fora MVP, futura v2
- **Subs vão pro CSV** — exportação fica nos assuntos. Pra exportar subs, mentor muda gran pra sub_assunto.
- **Botão "expandir todos"** — fora MVP
- **Persistência do estado de expansão na URL** — efêmero, não vai pra querystring

## 4. Métrica — Recência

### 4.1 Definição exata

```
RECENT_WINDOW = 3
janelaRecente = anos.length >= RECENT_WINDOW ? anos.slice(-RECENT_WINDOW) : []
recenciaAnos = janelaRecente.filter(a => porAno[a].qtd > 0)
recencia = janelaRecente.length === 0
  ? null
  : (recenciaAnos.length / RECENT_WINDOW) × 100
```

- **Numerador**: anos da janela onde o item teve `qtd > 0`
- **Denominador**: sempre `RECENT_WINDOW` (=3) quando aplicável; `null` se dataset tem < 3 anos
- **Granularidade**: discreta (`0%`, `33%`, `67%`, `100%`)

### 4.2 Comportamento por tamanho do dataset

| `anos.length` | Comportamento |
|---|---|
| 0 | Items vazios (já tratado no pipeline) |
| 1-2 | `recencia = null`, `recenciaAnos = []`; coluna oculta na UI |
| ≥ 3 | `recencia ∈ {0, 33, 67, 100}`; coluna visível |

### 4.3 Por que 3 anos fixos

- Heurística mentor: "últimos 2 ciclos de concurso" cobre 99% dos casos práticos
- Janela menor (1-2) é ruído; maior (5+) dilui o sinal "recente"
- Configurável fica pra v2 se houver demanda real

### 4.4 Contraste útil — exemplo

| Assunto | Recorrência (5 anos) | Recência (3 anos) | Leitura |
|---|---|---|---|
| CTN | 100% (5/5) | 100% (3/3) | Sólido histórico E recente |
| Lei do Inquilinato | 80% (4/5) | 33% (1/3) | **Sumindo** — cobrado até 2023, menos agora |
| Marco Civil Internet | 40% (2/5) | 100% (3/3) | **Subindo** — novo, presente em todos os recentes |
| Tema antigo X | 60% (3/5) | 0% (0/3) | **Foi removido do programa** |

Mentor separa "dominante histórico" de "tendência" sem precisar do slope (que pode ser nulo se R² baixo).

## 5. Filtro de Disciplina

### 5.1 Toolbar

Novo campo entre Área e Granularidade:

```
Banca: [FCC ▾]  Área: [Fiscal ▾]  Disciplina: [Todas ▾]  Granularidade: [...]  Filtro: [...]
```

### 5.2 Comportamento

- **Default**: `"Todas as disciplinas"` (`analise.discFilter = ''`)
- **Opções**: derivadas de `analiseDisciplinasOptions` — disciplinas únicas no dataset filtrado por banca/área, alfabético
- **Selecionar uma disciplina**:
  - `analise.discFilter = nome_disciplina`
  - Se `gran === 'disciplina'` → muda pra `'assunto'` (mostrar assuntos da disciplina)
  - Se `gran === 'assunto' | 'sub_assunto'` → mantém (filtro só estreita o universo)
  - Limpa `assFilter` (assunto antigo pode não existir na nova disciplina)
  - Reseta `page = 1` e `selectedKeys = []` via watcher existente
  - **Quando gran=assunto** → ativa modo expandível (chevrons aparecem)
- **Selecionar "Todas"** → `discFilter = ''` + `assFilter = ''`; modo expandível desativa
- **Sincronização bi-direcional**: drill-down via clique de linha de Disciplina continua setando `discFilter` → select reflete (`v-model:disciplina="analise.discFilter"`)

### 5.3 Edge cases

- Banca/área muda → watcher existente reseta `discFilter` → select volta pra "Todas"
- Disciplina selecionada some do dataset → watcher reseta pra "Todas"
- Disciplina com nome contendo `<`, `>`, `&` → escape padrão do Vue protege

## 6. Modo Expandível (Visão de Disciplina)

### 6.1 Trigger

Modo ativa quando: `analise.discFilter !== ''` AND `gran === 'assunto'`.

Outros casos:
- `gran=disciplina` → não tem subs aninhados (não aplica)
- `gran=sub_assunto` → mostra subs como linhas principais (modo atual mantido)
- Sem `discFilter` mas gran=assunto → modo plain (sem chevrons), comportamento atual

### 6.2 UI

- Chevron `▸` à esquerda do nome do assunto (antes do checkbox)
- Click no chevron toggle → `▾` quando expandido
- Linha clicável **ainda dispara drill-down** (manter UX existente); chevron com `@click.stop` pra não conflitar
- Linhas dos subs renderizadas indented (`padding-left: 32px`) abaixo da linha do assunto
- Sub que passa no preset: background `#EEF2FF` + texto normal
- Sub que não passa: text muted (`color: #888`), background neutro
- Métricas dos subs: mesmas colunas (Nome, Recorr., Recência, Vol/ano, Vol total, Pct, Tendência) — sem checkbox no MVP
- Quando assunto não tem nenhum sub no dataset filtrado → chevron fica desabilitado (cinza), sem expansão

### 6.3 Estado

```js
// AnaliseTable.vue
const expandedAssuntos = ref(new Set())  // chaves: caminhoCompleto do assunto
```

- Local ao componente; não persiste em URL
- Mudança de `discFilter` → reset (`expandedAssuntos.value = new Set()`)
- Mudança de `gran` (saindo de assunto) → modo desativa, set fica obsoleto mas não atrapalha (recriado quando volta)

### 6.4 Cálculo de subs (na view)

```js
const analiseSubsByAssunto = computed(() => {
  if (!analise.discFilter || analise.gran !== 'assunto') return new Map()
  const result = computeMetrics(store.estatisticas, {
    banca: analise.banca,
    area: analise.area || undefined,
    granularidade: 'sub_assunto',
    disciplinaFiltro: analise.discFilter,
    crossBanca: analise.cross,
  })
  const presetThresholds = DEFAULT_PRESETS[analise.preset] || DEFAULT_PRESETS.moderado
  const map = new Map()
  for (const item of result.items) {
    item.passesPreset =
      item.recorrencia >= presetThresholds.recorrenciaMin &&
      item.volumeTotal >= presetThresholds.volumeTotalMin
    if (!map.has(item.pai)) map.set(item.pai, [])
    map.get(item.pai).push(item)
  }
  // Ordena subs por recorrência desc dentro de cada assunto
  for (const subs of map.values()) {
    subs.sort((a, b) => b.recorrencia - a.recorrencia)
  }
  return map
})
```

Pass via prop: `:subs-by-assunto="analiseSubsByAssunto"`.

### 6.5 Edge cases

- Disciplina sem detalhamento de subs (alguns importes parados na profundidade 2) → chevrons desabilitados, mensagem ausente (mentor entende)
- Mudar preset → destaque dos subs recalcula reativamente (computed depende de preset)
- Cross-banca on → subs agregados também (mesmo pipeline; `passesPreset` aplica thresholds sobre métricas merged)

## 7. Mudanças concretas

### 7.1 Engine — `recurrenceAnalysis.js`

```js
// computeMetrics retorna mais campos
return {
  items: [...],
  anos,
  bancasContribuintes,
  janelaRecente,  // novo: anos.slice(-3) ou [] se anos.length < 3
}

// Cada item ganha:
{
  ...,
  recencia,       // 0..100, OR null se anos.length < 3
  recenciaAnos,   // [int] dos anos da janela com qtd>0; OR [] se anos.length < 3
}
```

Cálculo dentro do loop por nó (após n/qtdMax/etc):

```js
const RECENT_WINDOW = 3
let janelaRecenteItem = []
let recenciaAnos = []
let recencia = null
if (anos.length >= RECENT_WINDOW) {
  janelaRecenteItem = anos.slice(-RECENT_WINDOW)
  recenciaAnos = janelaRecenteItem.filter(a => (node.porAno[a]?.qtd || 0) > 0)
  recencia = (recenciaAnos.length / RECENT_WINDOW) * 100
}
```

`janelaRecente` no result top-level é calculado uma vez fora do loop (mesmo array).

`DEFAULT_PRESETS` continua igual (recência não tem threshold próprio no MVP).

### 7.2 AnaliseToolbar.vue

Adicionar prop e emit:

```js
disciplina: { type: String, default: '' },
disciplinasOptions: { type: Array, default: () => [] },
```

Adicionar `update:disciplina` aos emits.

Template entre Área e Granularidade:

```vue
<div class="field">
  <label class="field__label">Disciplina</label>
  <select :value="disciplina" class="filter-select"
          @change="$emit('update:disciplina', $event.target.value)">
    <option value="">Todas as disciplinas</option>
    <option v-for="d in disciplinasOptions" :key="d" :value="d">{{ d }}</option>
  </select>
</div>
```

### 7.3 AnaliseTable.vue

**COLS adiciona Recência:**

```js
const COLS = [
  { key: 'nome', label: 'Nome', numeric: false },
  { key: 'recorrencia', label: 'Recorrência', numeric: true },
  { key: 'recencia', label: 'Recência', numeric: true },
  { key: 'volumeMedio', label: 'Vol/ano', numeric: true },
  { key: 'volumeTotal', label: 'Vol total', numeric: true },
  { key: 'pctMedio', label: 'Pct', numeric: true },
  { key: 'slope', label: 'Tendência', numeric: true },
]
```

**Coluna condicional**: filtrar `COLS` baseado em `hasRecenciaCol = anos.length >= 3`. Atualizar `colspan` no empty-row.

**Renderização da célula Recência:**

```vue
<td v-if="hasRecenciaCol" class="td-num">
  <span v-if="item.recencia !== null" :title="recenciaTooltip(item)">
    {{ pctFormat(item.recencia) }}
  </span>
  <span v-else class="trend-empty">—</span>
</td>
```

Helper:

```js
function recenciaTooltip(item) {
  const cobertos = item.recenciaAnos.length > 0 ? item.recenciaAnos.join(', ') : 'nenhum'
  return `${item.recenciaAnos.length}/3 anos cobertos: ${cobertos}`
}
```

**Modo expandível:**

```js
const props = defineProps({
  ...,
  subsByAssunto: { type: Map, default: () => new Map() },
})

const expandedAssuntos = ref(new Set())
const isExpandableMode = computed(() => props.subsByAssunto.size > 0)

function toggleExpand(item) {
  const next = new Set(expandedAssuntos.value)
  if (next.has(item.caminhoCompleto)) next.delete(item.caminhoCompleto)
  else next.add(item.caminhoCompleto)
  expandedAssuntos.value = next
}

watch(() => props.subsByAssunto, () => {
  expandedAssuntos.value = new Set()
})
```

Template (linha do assunto + linhas indented dos subs):

```vue
<template v-for="item in pagedItems" :key="item.caminhoCompleto">
  <tr class="row" :class="...">
    <td class="td-expand" v-if="isExpandableMode" @click.stop>
      <button v-if="hasSubs(item)" class="chevron-btn" @click="toggleExpand(item)">
        {{ expandedAssuntos.has(item.caminhoCompleto) ? '▾' : '▸' }}
      </button>
      <span v-else class="chevron-empty"></span>
    </td>
    ...
  </tr>
  <template v-if="isExpandableMode && expandedAssuntos.has(item.caminhoCompleto)">
    <tr v-for="sub in subsByAssunto.get(item.nome) || []"
        :key="sub.caminhoCompleto"
        class="row row--sub"
        :class="{ 'row--sub-highlight': sub.passesPreset }">
      <td v-if="isExpandableMode"></td>
      <td class="td-check"></td>
      <td class="td-nome td-nome--sub">{{ sub.nome }}</td>
      <td class="td-num">{{ pctFormat(sub.recorrencia) }}</td>
      <td v-if="hasRecenciaCol" class="td-num">{{ sub.recencia != null ? pctFormat(sub.recencia) : '—' }}</td>
      <td class="td-num">{{ numFormat(sub.volumeMedio, 1) }}</td>
      <td class="td-num">{{ sub.volumeTotal }}</td>
      <td class="td-num">{{ pctFormat(sub.pctMedio) }}</td>
      <td class="td-num">{{ sub.slope == null ? '—' : slopeFormat(sub.slope) }}</td>
    </tr>
  </template>
</template>
```

`hasSubs(item)` retorna `subsByAssunto.has(item.nome) && subsByAssunto.get(item.nome).length > 0`.

**CSS extras:**

```css
.row--sub { background: #fafaf7; }
.row--sub-highlight { background: #EEF2FF; font-weight: 500; }
.row--sub:not(.row--sub-highlight) { color: #888; }
.td-nome--sub { padding-left: 32px; font-size: 11px; }
.td-expand { width: 24px; text-align: center; padding: 0; }
.chevron-btn {
  background: transparent; border: none; cursor: pointer;
  font-size: 12px; color: #666; padding: 4px;
}
.chevron-btn:hover { color: #534AB7; }
.chevron-empty { display: inline-block; width: 24px; }
```

### 7.4 EstatisticasView.vue

Novo computed `analiseDisciplinasOptions`:

```js
const analiseDisciplinasOptions = computed(() => {
  if (!analise.banca) return []
  const out = new Set()
  for (const e of store.estatisticas) {
    if (e.banca !== analise.banca) continue
    if (analise.area && (e.area || '') !== analise.area) continue
    for (const disc of e.dados?.disciplinas || []) {
      if (disc.nome) out.add(disc.nome)
    }
  }
  return [...out].sort()
})
```

Novo computed `analiseSubsByAssunto` (per §6.4).

Wire no template:

```vue
<AnaliseToolbar
  ...
  :disciplina="analise.discFilter"
  :disciplinas-options="analiseDisciplinasOptions"
  @update:disciplina="onAnaliseDisciplinaChange"
/>

<AnaliseTable
  ...
  :subs-by-assunto="analiseSubsByAssunto"
/>
```

Handler novo:

```js
function onAnaliseDisciplinaChange(newDisc) {
  analise.discFilter = newDisc
  if (newDisc && analise.gran === 'disciplina') {
    analise.gran = 'assunto'
  }
  if (!newDisc) {
    analise.assFilter = ''
  }
  // Seleções por caminhoCompleto ficam órfãs quando muda disciplina
  // (mesmo princípio do watcher de gran adicionado na regra-de-vida).
  analiseSelectedKeys.value = []
}
```

`page=1` é resetado pelo watcher existente de `discFilter`. Reset de `selectedKeys` é feito explícito aqui — caminhoCompleto da disciplina antiga (ex: "Trib → CTN") não casa com nenhum item da disciplina nova ("Adm → Atos"), então preservar inflaria contador.

Importar `DEFAULT_PRESETS`:

```js
import { computeMetrics, applyPreset, DEFAULT_PRESETS } from '@/utils/recurrenceAnalysis'
```

### 7.5 CSV — `csvExport.js`

`HEADERS` ganha `'Recencia'` na 3ª posição:

```js
const HEADERS = ['Nome', 'Recorrencia', 'Recencia', 'VolumeMedio', 'VolumeTotal', 'PctMedio', 'Slope', 'R2', 'N', 'Boosted']
```

`itemToRow` inclui `recencia`:

```js
csvEscape(item.caminhoCompleto),
Math.round(item.recorrencia),
item.recencia == null ? '' : Math.round(item.recencia),
Number(item.volumeMedio).toFixed(1),
...
```

Decisão de design: **sempre incluir `Recencia` no CSV header** (vazio quando null). Mantém shape estável; mentor que consome via Excel não precisa lidar com header variável.

## 8. Testes

### 8.1 Unitários `recurrenceAnalysis.test.js`

- Recência: 5 anos, item em últimos 2 → 67%
- `anos.length < 3` → `recencia = null`, `recenciaAnos = []`
- `anos.length === 3` → janela = todos, recência == recorrência (caso degenerado)
- Item sumindo: 4/5 anos total, 1/3 últimos → recencia=33% diferente de recorrencia=80%
- Item subindo: 2/5 anos total, 3/3 últimos → recencia=100% diferente de recorrencia=40%
- `result.janelaRecente` retornado corretamente (anos.slice(-3) ou [])

### 8.2 Smoke `AnaliseTable.test.js`

- Coluna Recência presente quando `anos.length >= 3`
- Coluna Recência ausente quando `anos.length < 3`
- Tooltip mostra anos cobertos
- `colspan` do empty-row ajusta corretamente
- Modo expandível: chevron renderiza quando `subsByAssunto` populado
- Click chevron expande/colapsa
- Sub com `passesPreset=true` ganha classe `row--sub-highlight`
- Sub com `passesPreset=false` aparece sem highlight
- Mudança de `subsByAssunto` reseta `expandedAssuntos`

### 8.3 Smoke `AnaliseToolbar.test.js`

- Prop `disciplinasOptions` renderiza opções
- Selecionar disciplina emite `update:disciplina`
- "Todas" emite valor vazio

### 8.4 CSV `csvExport.test.js`

- Header inclui `Recencia` na posição correta
- Item com recência null → campo vazio
- Item com recência válida → arredondado pra inteiro

### 8.5 Validação manual (atualização do roteiro)

Adicionar ao TESTES_MANUAIS_ANALISE.md:

- **Cenário 13 — Filtro de disciplina via select**
- **Cenário 14 — Recência identifica "sumindo"**
- **Cenário 15 — Coluna oculta com <3 anos**
- **Cenário 16 — Modo expandível**: selecionar disciplina, expandir um assunto, verificar destaque dos subs que passam no preset, mudar preset e ver destaques mudarem

## 9. Riscos

| # | Risco | Mitigação |
|---|---|---|
| 9.1 | User confunde recência com recorrência | Tooltip + label explícito; doc na view |
| 9.2 | Cross-banca afeta recência? Sim | porAno é merged; comportamento documentado |
| 9.3 | CSV shape muda — quebra parsers de mentor | Coluna nova é additive; aviso no commit |
| 9.4 | Select de disciplina com 100+ opções | Sort alfabético + native select é rápido até ~1000; v2 pode trocar |
| 9.5 | `anos.slice(-3)` falha se `anos` desordenado | `anos` sempre ordenado no pipeline (sort ascending) — invariante |
| 9.6 | `analiseSubsByAssunto` chamado em re-renders frequentes | É computed; cache invalida só quando deps mudam (banca, area, disc, cross). OK. |
| 9.7 | Disciplinas com nomes idênticos cross-banca | `analiseDisciplinasOptions` usa Set por nome — colisão silenciosa improvável (mentor importa banca por banca) |
| 9.8 | Performance worst-case modo expandível | Cada expansão renderiza N subs. Disciplina com 30 assuntos × 10 subs cada = 300 linhas se TODAS expandidas. Aceitável (mentor expande poucas por vez). |

## 10. Critérios de aceitação

Funcionais:
- [ ] Toolbar tem 5 selects/segmentos: Banca, Área, Disciplina, Granularidade, Preset (em ordem hierárquica)
- [ ] Disciplina default "Todas" populado com disciplinas do dataset filtrado
- [ ] Selecionar disciplina filtra tabela (sincroniza com `analise.discFilter`)
- [ ] "Todas" limpa `discFilter` e `assFilter`
- [ ] Drill-down via linha continua funcionando E sincroniza com select
- [ ] Auto-muda gran de disciplina pra assunto quando user seleciona disciplina via select
- [ ] Coluna "Recência" entre Recorrência e Vol/ano quando `anos.length >= 3`
- [ ] Coluna oculta quando `anos.length < 3`
- [ ] Tooltip da célula Recência lista anos cobertos
- [ ] Sortable
- [ ] CSV inclui `Recencia` (vazio quando null)
- [ ] Modo expandível ativa quando `discFilter !== ''` AND `gran === 'assunto'`
- [ ] Chevron expande linha mostrando subs indented
- [ ] Sub que passa no preset ganha background destaque
- [ ] Sub que não passa aparece muted
- [ ] Mudar preset recalcula destaques (reativo)
- [ ] Mudar disciplina reseta `expandedAssuntos`

Não-funcionais:
- [ ] Tempo de cálculo permanece < 200ms (recência é O(3) por item; subs é 1 chamada extra de computeMetrics quando há discFilter)
- [ ] aria-sort presente quando ordenado (já existe, mantém)

Unit tests:
- [ ] `computeMetrics` cobre §8.1
- [ ] `AnaliseTable` cobre §8.2
- [ ] `AnaliseToolbar` cobre §8.3
- [ ] `csvExport` cobre §8.4

## 11. Plano de implementação

Cada fase com revisão dupla cumulativa (regra do projeto).

### Fase 1 — Engine + testes (≈30min)
- `computeMetrics` retorna `recencia`, `recenciaAnos`, `janelaRecente`
- 6 testes novos em `recurrenceAnalysis.test.js`

### Fase 2 — UI base (≈40min)
- `AnaliseToolbar`: prop/emit `disciplina` + `disciplinasOptions` + `<select>`
- `AnaliseTable`: COLS + coluna Recência condicional + tooltip + ordenação
- 6 testes smoke

### Fase 3 — View integração + CSV (≈25min)
- `analiseDisciplinasOptions` computed
- Wire no toolbar + handler `onAnaliseDisciplinaChange`
- `csvExport.js` ganha header Recencia + item field
- 2 testes csvExport

### Fase 4 — Modo expandível (≈50min)
- `analiseSubsByAssunto` computed na view
- `AnaliseTable`: expandedAssuntos state + chevron + linhas aninhadas + CSS
- 5 testes smoke

### Fase 5 — Docs + roteiro manual (≈15min)
- ESTATISTICAS.md atualiza seção Análise (3 sub-seções novas)
- TESTES_MANUAIS_ANALISE.md ganha cenários 13-16

### Fase 6 — Regra de vida pós-spec (2 rodadas + fixes + aprendizados doc)

**Total estimado:** ~3h de trabalho focado. A maior parte é UI (modo expandível). Engine é mudança trivial.

**Não muda backend.** Tudo é client-side, lendo do mesmo store.
