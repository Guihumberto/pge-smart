# Estatísticas de Questões — Estado atual da rota `/estatisticas`

Documento de referência da view [src/views/EstatisticasView.vue](../src/views/EstatisticasView.vue) e dependências. Serve como baseline para decidir as próximas melhorias.

## Propósito

Permitir que o mentor **importe distribuições de questões por banca/área/ano** (coladas do site de origem como HTML do inspect element ou texto puro) e **analise tendências** ao longo dos anos por disciplina, assunto e sub-assunto.

Hoje a rota tem 2 abas:

| Aba | Função |
|-----|--------|
| **Importações** | Listar/criar/excluir importações; cada card mostra resumo + Top 3 disciplinas |
| **Tendências** | Calcular evolução (%) entre anos por banca/área, com gráficos e listas Em alta / Em queda |
| **Análise** | Tabela multi-dimensional (recorrência + volume + tendência) pra priorizar assuntos; drill-down progressivo; estado na URL |

## Arquitetura

```
EstatisticasView.vue
   ├─ store: useEstatisticaStore  (Pinia, persistido — paths: ['estatisticas'])
   │     └─ service: estatisticaService  →  /api/estatisticas (CRUD)
   ├─ store: useDictsStore        (bancas + áreas para autocomplete)
   ├─ utils: parseEstatisticas    (HTML do inspect element OU texto puro → árvore)
   └─ libs:  vue-chartjs (Line, Bar) + chart.js + lucide-vue-next
```

### Camada HTTP

[src/services/estatistica.service.js](../src/services/estatistica.service.js) — REST simples:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/estatisticas?banca&ano` | Lista (filtros opcionais) |
| GET | `/api/estatisticas/:id` | Detalhe (não usado pelo front hoje) |
| POST | `/api/estatisticas` | Cria importação |
| PATCH | `/api/estatisticas/:id` | Atualiza (existe no service, **não usado na view**) |
| DELETE | `/api/estatisticas/:id` | Remove |

### Store

[src/stores/useEstatisticaStore.js](../src/stores/useEstatisticaStore.js) — composition API. Estado: `estatisticas[]`, `loading`. Ações: `fetchEstatisticas`, `createEstatistica`, `updateEstatistica`, `removeEstatistica`. Persiste `estatisticas` em `localStorage` sob a chave `estatisticas`.

## Estrutura de dados

Cada documento de estatística tem este shape (consumido pela view):

```js
{
  id: 'nanoid',
  banca: 'FGV',           // string, livre, mas selecionada via dictsStore
  area: 'Fiscal',         // string, opcional
  ano: 2024,              // number
  descricao: 'PGE/AL 2026',
  dados: {
    disciplinas: [
      {
        nome: 'Direito Tributário',
        qtd: 30,
        pct: 25.0,
        assuntos: [
          {
            nome: 'Conceito de tributo',
            qtd: 8,
            pct: 6.7,
            sub_assuntos: [
              { nome: 'Definição legal', qtd: 3, pct: 2.5 }
            ]
          }
        ]
      }
    ]
  }
}
```

**3 níveis fixos**: `disciplina → assunto → sub_assunto`.

## Fluxo de importação

[EstatisticasView.vue:259-383](../src/views/EstatisticasView.vue#L259-L383) — modal com 4 metadados + textarea + preview.

```
1. Usuário clica "Nova Importação"
2. Preenche: banca (autocomplete dictsStore), área (autocomplete), ano, descrição
3. Cola texto/HTML no textarea
4. Clica "Processar preview"
   └─ parseEstatisticas(texto) → { disciplinas: [...] }
   └─ Renderiza árvore expansível com qtd/pct
5. Clica "Salvar"
   └─ store.createEstatistica({ ...form, dados: previewDados })
   └─ POST /api/estatisticas
   └─ unshift no array + toast.success
```

### O parser — [src/utils/statsParser.js](../src/utils/statsParser.js)

Detecta automaticamente o formato pela presença de `<li`, `<span` ou `assunto-nome` no texto. Suporta:

| Formato | Estratégia |
|---------|-----------|
| **HTML do inspect element** | `DOMParser` + busca por `li > div.assunto > span.assunto-nome-conteudo` e `span.indice-porcentagem`. Se há `<li>` aninhados, usa estrutura DOM; senão, calcula profundidade contando ancestrais `<ul>` |
| **Texto puro** | Pares de linhas (nome + `N (P%)`). Detecta hierarquia por **indentação** (≥2 níveis distintos) ou, se não houver, por **soma de contagens** (item é pai se a soma dos próximos itens bate com sua qtd, tolerância ±2 para disciplina, ±1 para assunto) |

A regex de contagem tolera vírgula decimal: `25,5%` ou `25.5%`.

**Limites do parser hoje**:
- Profundidade máxima fixa em 3 níveis. Sub-sub-assuntos são descartados silenciosamente.
- Heurística de soma pode falhar se o site original não fechar a árvore (item solto vira disciplina).
- Sem feedback visual sobre qual estratégia foi usada — usuário só vê resultado ou erro genérico "Nenhuma disciplina detectada".

## Aba "Importações"

[EstatisticasView.vue:26-103](../src/views/EstatisticasView.vue#L26-L103)

- Filtros: `banca` + `ano` (selects derivados das estatísticas existentes via `bancasUsadas` / `anosUsados`). Mudar filtro re-chama `fetchEstatisticas(filtro)`.
- Grid de cards (`auto-fill, minmax(340px, 1fr)`):
  - Badges de banca/área/ano
  - Total de questões + nº de disciplinas
  - **Top 3 disciplinas** com barra de progresso (largura = pct)
  - Menu kebab → Ver detalhes (modal de árvore expandível) | Excluir (`confirm()` nativo)
- Empty state com CTA "Importar dados".

## Aba "Tendências"

[EstatisticasView.vue:106-213](../src/views/EstatisticasView.vue#L106-L213) + lógica em [EstatisticasView.vue:516-794](../src/views/EstatisticasView.vue#L516-L794)

### Filtros em cascata

| Filtro | Origem | Comportamento |
|--------|--------|---------------|
| `banca` | `bancasUsadas` | Obrigatório — sem ele, mostra empty state |
| `area` | `areasUsadas` (filtra por banca) | Opcional |
| `disciplina` | `disciplinasDisponiveis` (filtra por banca + área) | Aparece só se há disciplinas; altera o "modo" da análise |
| `assunto` | `subAssuntosDisponiveis` (assuntos com sub_assuntos da disciplina) | Aparece só com disciplina selecionada |

`onTrendFilterChange()` zera disciplina/assunto e re-calcula. Mudar disciplina chama `calcularTendencias()` direto.

### Algoritmo de tendências — regressão linear (entregue 2026-05-07)

A lógica de cálculo foi extraída para [src/utils/trendAnalysis.js](../src/utils/trendAnalysis.js) e a view consome via `buildTrendRanking(estatisticas, options)`.

Spec do design: [docs/superpowers/specs/2026-05-07-tendencias-regressao-linear-design.md](../docs/superpowers/specs/2026-05-07-tendencias-regressao-linear-design.md)

**API:**

```js
buildTrendRanking(estatisticas, {
  banca, area, disciplina,
  thresholds = DEFAULT_THRESHOLDS,
  maxItems = 15,
}) → { anos, subindo, descendo, total, descartados, disciplinasMap, assuntosMap, subAssuntosMap }
```

**Pipeline:**

1. Filtra estatísticas por banca/área. Anos sem doc importado **não entram** no dataset (Cenário B da spec §3.2).
2. Monta hierarquia 3 níveis: `discRaw`, `assRaw`, `subRaw` com `{qtd, pct}` por ano. Assunto ausente em ano com doc → `0%` (Cenário A).
3. Seleciona candidatos:
   - Sem `disciplina` → assuntos de todas as disciplinas
   - Com `disciplina` → assuntos + sub-assuntos dessa disciplina
4. Para cada candidato, calcula `slope` (pp/ano) e `R²` via regressão linear (`calculateTrend`).
5. Aplica `qualifies` com 4 thresholds default:
   - `minAnosQtdPositiva: 3` — ≥3 anos com qtd>0
   - `minQtdMaxAbsoluta: 5` — ≥1 ano com qtd absoluta ≥5
   - `minR2: 0.5` — reta explica ≥50% da variância
   - `minSlopeAbs: 0.3` — |slope| ≥0.3pp/ano
6. Ranqueia: `subindo` ordenado por slope desc; `descendo` por slope asc; cap em `maxItems` (default 15).
7. Retorna mapas auxiliares (`disciplinasMap` etc) consumidos pelos charts.

**Por que regressão linear, não delta:**
- Robusto a outliers (1 ano anômalo não destrói a tendência)
- R² serve como filtro objetivo de confiança
- Slope tem unidade interpretável (pp/ano)
- Filtros de qtd absoluta cortam ruído puro (assuntos com 1-2 questões esporádicas)

**Empty states (4 cenários):**
1. Sem banca → "Selecione uma banca"
2. Banca selecionada mas sem dados → "Nenhuma estatística importada"
3. <3 anos → "Importe pelo menos 3 anos"
4. ≥3 anos mas tudo filtrado → banner amarelo explicando o motivo + count de descartados

**Calibração**: thresholds são iniciais (calibrados por raciocínio). Após uso real, ajustar conforme `feedback_calibracao_threshold_empirico.md`.

### Gráficos

| Gráfico | Tipo | Conteúdo | Computed |
|---------|------|----------|----------|
| Evolução por Disciplina | Line | Top 8 disciplinas por **média** de pct, ao longo dos anos | `chartDisciplinas` |
| Variação (Em alta/queda) | Bar (horizontal) | Top 8 subindo + top 8 descendo, ordenado por **slope** (pp/ano) | `chartAssuntos` |
| Evolução dos Assuntos da disciplina | Line | Top 10 assuntos da disciplina por média, só se `trend.disciplina` setado | `chartAssuntosDisciplina` |
| Sub-assuntos | Bar (horizontal) | Top 15 sub_assuntos: delta se ≥2 anos, valor absoluto do último ano se 1 ano | `chartSubAssuntos` |

Listas "Em alta / Em queda" mostram **slope** (`+0.85pp/ano`) com tooltip nativo (`title`) exibindo `R² · n anos` para inspeção de confiança.

Paleta `COLORS` com 10 cores hex hardcoded em [EstatisticasView.vue:525](../src/views/EstatisticasView.vue#L525). Fonte `'DM Sans'` referenciada em vários lugares (não verificado se está carregada globalmente).

## Aba "Análise"

Sub-projeto 2 (entregue em 2026-05-07) — painel multi-dimensional pra priorização de estudo.

**Por que existe**: a aba Tendências (regressão linear) responde "o que está subindo/caindo" — mas para programas amplos com edições heterogêneas (ex: FGV/OAB), os dados oscilam sem trajetória clara e Tendências fica vazia. Recorrência (em quantos anos o assunto apareceu) e volume (quantas questões) são mais robustas. A Análise mostra **3 dimensões independentes** — sem score composto único — e o mentor decide qual pesa mais.

### Métricas

| Métrica | Fórmula | Interpretação |
|---|---|---|
| **Recorrência** | (anos com qtd>0 / anos do dataset) × 100 | "Em quantos anos esse assunto apareceu" (histórico) |
| **Recência** | (anos com qtd>0 ∩ últimos 3 / 3) × 100 | "Aparece nos últimos 3 anos do dataset?" (atual) |
| **Volume médio** | Σ qtd / anos com qtd>0 | "Quando aparece, vem com X questões" (condicional, não dilui zeros) |
| **Volume total** | Σ qtd | Quantitativo absoluto |
| **Pct médio** | média condicional dos pcts | "Que fatia da prova esse assunto é, em média" |
| **Slope** | regressão linear sobre (ano, pct) | Tendência (pp/ano); `null` se aparece em <2 anos |
| **R²** | qualidade do fit | Tooltip apenas (não filtra) |

**Recência vs Recorrência** (sub-projeto incremento 2026-05-07): mentor compara visualmente "histórico" (recorrência) com "atual" (recência) pra identificar:
- Sólido: ambos altos
- **Sumindo**: recorrência alta, recência baixa
- **Subindo**: recorrência baixa, recência alta
- Removido: ambos baixos

Coluna Recência fica **oculta** quando dataset tem < 3 anos (mesmo valor da recorrência).

### Engine

[src/utils/recurrenceAnalysis.js](../src/utils/recurrenceAnalysis.js) — pura, testada (52 testes em [src/utils/__tests__/recurrenceAnalysis.test.js](../src/utils/__tests__/recurrenceAnalysis.test.js)):

- `computeMetrics(estatisticas, options)` — pipeline: filtra dataset → hierarquia → cross-banca merge → granularidade → drill-down → métricas
- `applyPreset(items, presetName)` — filtra por presets `conservador` / `moderado` (default) / `permissivo`. Apenas `recorrenciaMin` + `volumeTotalMin` filtram items; `r2Min`/`slopeAbsMin` decidem se a coluna Tendência mostra valor.
- `isTendenciaConfiavel(item, presetName)` — helper de UI

**IMPORTANTE**: presets de Análise são INDEPENDENTES dos thresholds de Tendências (`DEFAULT_PRESETS` aqui ≠ `DEFAULT_THRESHOLDS` em `trendAnalysis.js`). Mudar um NÃO deve afetar o outro — não compartilhar valores via import direto.

### Cross-banca

Toggle "Incluir bancas similares" agrega outras bancas com mesma `area`:
- Soma `qtd` (somatório)
- Soma `pct` clampando a 100 (aproximação MVP — soma de percentuais entre provas diferentes não é estatisticamente rigorosa, mas funciona bem pra ranking relativo)
- Cada item ganha `boostedBy: [...]` com nomes das bancas que contribuíram (vazio se só banca-alvo)
- Toggle se desliga automaticamente (com toast) quando não há outras bancas na área
- Warning visual `bg-amarelo` na coluna Pct quando `pctMedio > 50` E há contribuição cross-banca (limiar arbitrário pra interpretação aproximada)

### Componentes

```
src/components/analise/
   ├─ AnaliseToolbar.vue   (banca/área/granularidade/preset/cross + ações)
   └─ AnaliseTable.vue     (tabela densa com header sortable + drill-down + breadcrumb + paginação)

src/utils/
   ├─ recurrenceAnalysis.js   (engine)
   └─ csvExport.js            (CSV: escape, build, filename, download)
```

### Estado e querystring

Estado local na view via `reactive({})`. Persistido na URL (§15 da spec):

```
/estatisticas?tab=analise&banca=FCC&area=Fiscal&gran=assunto&disc=Direito%20Tribut%C3%A1rio&preset=moderado&cross=1&sort=recorrencia&dir=desc&page=1
```

- `router.push` quando muda banca/área (cria entry de history)
- `router.replace` no resto (não polui o histórico)
- Defaults omitidos da URL (URL fica limpa quando state é default)
- Refresh, back/forward e link compartilhável funcionam

### Drill-down e breadcrumb

- Clicar em linha de **disciplina** → muda granularidade pra `assunto` + filtra pela disciplina
- Clicar em linha de **assunto** → muda pra `sub_assunto` + filtra
- Clicar em linha de **sub-assunto** → não faz drill (último nível)
- **Breadcrumb** (`Análise / Trib / CTN`) — clicar em crumb anterior limpa filtros do nível abaixo + reseta paginação. **Mantém** seleções, ordenação e granularidade (usuário pode estar olhando todos os assuntos sem filtro de disc).

### Filtro de disciplina + modo expandível (sub-projeto incremento 2026-05-07)

Toolbar tem 5 selects/segmentos: **Banca → Área → Disciplina → Granularidade → Preset**. Filtro de Disciplina é via direta — sincronizado com drill-down (clicar linha disciplina e selecionar no select levam ao mesmo state).

Quando há `discFilter` ativo + `gran=assunto`, tabela entra em **modo expandível**:
- Cada linha de assunto ganha chevron `▸`
- Click expande mostrando sub-assuntos indented
- Sub-assunto que **passa no preset atual** ganha background `#EEF2FF` (destaque)
- Sub-assunto que não passa fica muted (contexto, sem destaque)
- Mudar preset recalcula destaques reativamente
- Mudar disciplina reseta as expansões (subs antigos não fazem sentido)

**Use case principal**: mentor seleciona disciplina pra **priorizar assuntos** dela com sub-assuntos juntos. Em vez de drill-down dois cliques, vê tudo aninhado em uma view.

### Refinos pós-validação manual (débitos técnicos quitados — 2026-05-07)

Cinco débitos técnicos identificados na validação manual + revisão dupla, aplicados em follow-up:

1. **`perPage` persiste em querystring** — share-link e refresh preservam "100/200 por página". Opções padronizadas em [src/components/analise/constants.js](../src/components/analise/constants.js) (`PER_PAGE_OPTIONS = [50, 100, 200]`), reusada pela view e pelo componente. (#ARCH-24 — single source of truth pra evitar drift.)
2. **Disciplina inválida em URL** — deeplink `?disc=Foo` quando `Foo` não está no dataset → toast informativo + reset pra "Todas". Guard de fetch (`store.estatisticas.length > 0`) evita reset prematuro durante carregamento.
3. **Memoização do pipeline `subsByAssunto`** — separado em 2 computeds: pipeline pesado (`computeMetrics`) cacheado por banca/área/disc/cross/gran; flag `passesPreset` recalculada por preset. Trocar preset agora é instantâneo (refactor evita recompute do `computeMetrics`). (#VUE-14)
4. **Contraste de subs muted** — texto `#555` (era `#888`) pra preservar legibilidade WCAG AA contra fundo claro. Subs destacados explicitamente `#1a1a2e`.
5. **Empty state quando disc sem sub-assuntos** — banner azul claro `analise-info` quando disciplina selecionada não tem detalhamento. Modo expandível desativa silenciosamente; mensagem explica.

### Outputs

- **Copiar selecionados** → clipboard com `caminhoCompleto` (1 por linha, sem header)
- **Exportar CSV** → arquivo `analise-{banca}-{area}-{YYYYMMDD}.csv` com BOM UTF-8 (Excel-friendly), headers `Nome,Recorrencia,VolumeMedio,VolumeTotal,PctMedio,Slope,R2,N,Boosted`

### Limitações documentadas

- Soma de pct cross-banca é aproximação (não estatisticamente rigorosa). v2 ponderaria por total de questões da prova (requer expor `total_questoes` no índice ES).
- Apenas 3 níveis de drill-down (dados QConcursos só têm Disciplina → Assunto → Sub-assunto).
- Análise por **ano**, não por prova. Bancas com múltiplas provas/ano contam como 1 ano se houve cobertura.
- Performance: `computeMetrics` é O(estatisticas × disciplinas × assuntos × subs). Para datasets típicos (≤200 docs × ~10 disciplinas × ~50 assuntos × ~5 subs) é instantâneo.

### Calibração futura

Spec sugere validar empiricamente os defaults `moderado` (`recorrenciaMin: 30, volumeTotalMin: 3, r2Min: 0.4, slopeAbsMin: 0.2`) com datasets reais. Se necessário, ajustar sem trocar a interface.

### Backlog da Aba Análise — pendências e melhorias

Itens **conscientemente fora do MVP** (registrados nas specs e revisões pós-spec). Listados aqui pra centralizar — quando vier demanda concreta, virar spec.

#### Pendências de validação

- **Validação manual completa** — percorrer 21 cenários de [TESTES_MANUAIS_ANALISE.md](TESTES_MANUAIS_ANALISE.md). Sign-off checklist no fim do arquivo
- **Calibração empírica dos presets** — `DEFAULT_PRESETS` em [src/utils/recurrenceAnalysis.js](../src/utils/recurrenceAnalysis.js) ainda usa palpites de spec. Calibrar contra dataset real (Cebraspe + FGV/OAB) seguindo `feedback_calibracao_threshold_empirico` da memória
- **Performance worst-case** — meta de spec é <200ms pra 50 estatísticas × 200 disciplinas. Não medido com `console.time` ainda; baixo risco mas vale rodar uma vez

#### Decisões adiadas da spec original ([2026-05-07-analise-recorrencia-design.md](../docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md) §14)

- Custom thresholds via sliders no toolbar (v2.5)
- Cross-banca com seletor granular de bancas similares
- Cross-banca com pesos por confiabilidade — requer expor `total_questoes` por estatística no índice ES (PR coordenado com back)
- ~~Push de scores para `priorizacao.disciplinas` do cargo — aguarda PR6 estabilizar~~ → **PR6 entregue 2026-05-07**, bloqueio levantado. Plano de integração em [EDITAIS.md §14](EDITAIS.md) + memória `project_priorizacao_analise_integracao.md`. Ponto de partida: adicionar Recência como 4ª dimensão do score do PR6 + adaptar `PlanoEstudoBuilderView` (que gera metas+tarefas consumidas pelo aluno em outro app)
- Comparação lado-a-lado de 2 bancas (heatmap/diff) — sub-projeto futuro
- PDF de planejamento gerado da Análise — sub-projeto 3
- Análise por prova (não por ano) — quando houver demanda
- kNN/embedding pra "assuntos similares" — fora de escopo conhecido

#### Decisões adiadas do incremento ([2026-05-07-analise-disciplina-recencia-design.md](../docs/superpowers/specs/2026-05-07-analise-disciplina-recencia-design.md) §3.2)

- Janela de Recência configurável (3, 5, 10 anos) — fixa em 3 no MVP
- Filtro temporal "apenas últimos 3 anos" — coluna Recência cobre
- Recência influenciar preset — preset filtra só recorrência+volume
- Recência ponderada (decay exponencial) — interpretação binária é mais clara
- Sub-assuntos selecionáveis no modo expandível (checkbox próprio) — v2
- Botão "expandir todos" / "colapsar todos"
- Persistência do estado de expansão na URL — UX efêmero é proposital
- Subs no CSV — exportação fica nos assuntos; pra subs, mudar gran=sub_assunto

#### Débitos técnicos rejeitados nas revisões duplas (não-bug; aceitos como dívida)

- **A11y avançado modo expandível** — `role="treegrid"` + `aria-level`/`aria-posinset` nas linhas dos subs. MVP usa `<table>` simples; gap conhecido (rodada 2 incremento #17). Revisitar se houver reclamação de usuário com SR
- **Empty state quando todos chevrons estão desabilitados** — sem mensagem específica quando disciplina tem assuntos mas nenhum tem subs detalhados E preset filtra alguns. Banner atual cobre o caso "size=0" mas não "size>0 sem expansões úteis"
- **Subs muted contraste WCAG AAA** — atual `#555` contra `#fafaf7` ≈ 9:1 (passa AA). Pra AAA, validar visualmente em monitor real; mudança trivial se necessário
- **Watcher disc-inválida com `options.length === 0`** — caso edge: banca selecionada não tem nenhuma disciplina E URL tem `?disc=Foo`. Watcher reseta com toast (correto). Cenário raríssimo

## Persistência e ciclo de vida

- Pinia persist sob chave `estatisticas` (paths: `['estatisticas']`). **`loading` não é persistido** — bom.
- `onMounted` faz **3 fetches em paralelo**: `fetchEstatisticas()`, `dictsStore.fetchByTipo('banca')`, `dictsStore.fetchByTipo('area')`.
- Listener global de click fechando o menu kebab — corrigido em PR de 2026-05-07: `handleGlobalClick` nomeado, registrado em `onMounted` antes do await dos fetches, removido em `onBeforeUnmount`.

## Pontos de atenção e oportunidades de melhoria

Lista priorizada por **valor x custo**, baseada na leitura do código:

### Quick wins (baixo custo, ganho claro)

1. **Listener vaza no unmount** — [EstatisticasView.vue:802](../src/views/EstatisticasView.vue#L802) registra `window.addEventListener('click', …)` sem remover. Trocar por `useEventListener` (VueUse) ou um `onUnmounted` com a referência da função.
2. **Confirmação de exclusão usando `confirm()` nativo** — [EstatisticasView.vue:508](../src/views/EstatisticasView.vue#L508). Padrão da app é `vue-sonner` + modal — substituir por modal de confirmação reusável.
3. **Filtro re-fetch desnecessário** — `carregarDados()` ao mudar filtro de banca/ano chama o backend, mas as estatísticas já estão todas no store (e persistidas). Filtrar client-side via `computed` evita rede + flicker.
4. **Edição não exposta** — `updateEstatistica` existe no store/service mas a UI **não tem botão Editar**. Ou implementar (no menu kebab) ou remover do service para reduzir superfície.
5. **`dictsStore` carregado a cada visita** — em vez de `fetchByTipo` sempre, gatear se já tem dados (padrão usado em outras stores do projeto).

### Melhorias estruturais (médio custo, ganho claro)

6. **Componentizar a view (1062 linhas, 2 tabs muito distintas)** — extrair `ImportacoesTab.vue`, `TendenciasTab.vue`, `ImportModal.vue`, `DetalhesModal.vue`, `StatCard.vue`, `TrendChart.vue`. Reduz cognitive load e facilita testes.
7. **Parser sem testes** — `parseEstatisticas` tem 3 caminhos (HTML estruturado, HTML por profundidade, texto por indentação, texto por soma) e nenhum teste. Adicionar fixtures (samples reais) + testes unitários antes de qualquer mudança no parser é pré-requisito para evoluir com segurança.
8. **Feedback do parser pobre** — só toast genérico em falha. Mostrar quantos níveis foram detectados, qual estratégia, e linhas que não casaram (para o usuário corrigir o input).
9. ~~**Threshold de tendência (0.3pp) hardcoded**~~ — resolvido em 2026-05-07: thresholds documentados em `trendAnalysis.js` (`DEFAULT_THRESHOLDS`) com 4 filtros (n, qtdMax, R², |slope|). Configuração via UI fica para a aba **Análise** (sub-projeto 2).
10. **Chart.js sem destroy explícito** — em remontagens rápidas (mudar filtros) o vue-chartjs já cuida, mas vale conferir se há vazamento. `chartOptions` é objeto literal não-reativo — bom.
11. **Top 8 / Top 10 / Top 15 / Top 3 espalhados** — extrair constantes nomeadas (`MAX_DISCIPLINAS_LINE = 8`, etc) para facilitar tunning.

### Investigações antes de mexer

12. **Backend não documentado aqui** — confirmar se `/api/estatisticas` tem mapping ES estável (banca/area como keyword, ano como integer) e se há índice de filtro. Mudanças no contrato exigem PR coordenado em [../backend-express/](../../backend-express/).
13. **Multi-aba** — Pinia persist sem conflict resolution. Importar em duas abas pode resultar em divergência. Conferir se isso é problema real para o uso atual.
14. **Sem paginação** — `fetchEstatisticas` traz tudo. Para um mentor com dezenas de bancas × anos × áreas, pode ficar pesado. Hoje provavelmente OK, mas é teto baixo.

### Ideias de produto (descobertas pela leitura, não vieram do CLAUDE.md)

15. **Comparação entre bancas** — hoje só dá pra ver evolução de UMA banca. Permitir comparar duas bancas no mesmo gráfico (ex: FGV vs Cebraspe em "Direito Tributário").
16. **Exportar análise** — gerar PDF/CSV das tendências (já há infra de PDF para Lei Seca via FastAPI, mas isso vai ser desligado — se houver demanda, planejar via Express + biblioteca node).
17. **Estimativa de incidência futura** — com 3+ anos de dados, projetar tendência (regressão linear simples) com banda de confiança.
18. **Vínculo com tarefas** — usar a tendência para sugerir tarefas: "FGV Tributário tem subida em X assunto — criar tarefa de questões filtrando por assunto?".

## Referências cruzadas

- View: [src/views/EstatisticasView.vue](../src/views/EstatisticasView.vue)
- Store: [src/stores/useEstatisticaStore.js](../src/stores/useEstatisticaStore.js)
- Service: [src/services/estatistica.service.js](../src/services/estatistica.service.js)
- Parser: [src/utils/statsParser.js](../src/utils/statsParser.js)
- Engine de Tendências: [src/utils/trendAnalysis.js](../src/utils/trendAnalysis.js)
- Engine de Análise: [src/utils/recurrenceAnalysis.js](../src/utils/recurrenceAnalysis.js)
- Helper CSV: [src/utils/csvExport.js](../src/utils/csvExport.js)
- Componentes Análise: [src/components/analise/](../src/components/analise/)
- Dicionários (bancas/áreas): [src/stores/useDictsStore.js](../src/stores/useDictsStore.js)
- Spec (sub-projeto 2): [docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md](../docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md)
- Doc geral do app: [documentation/metas-leges.md](metas-leges.md)
- Guia operacional: [CLAUDE.md](../CLAUDE.md)
