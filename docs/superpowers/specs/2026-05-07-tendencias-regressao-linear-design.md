# Tendências — correção estatística (regressão linear)

**Data:** 2026-05-07
**Rota afetada:** `/estatisticas` aba **Tendências**
**Arquivo principal:** [src/views/EstatisticasView.vue](../../../src/views/EstatisticasView.vue)
**Spec relacionada (concluída):** [2026-05-07-estatisticas-modo-lote-design.md](2026-05-07-estatisticas-modo-lote-design.md)

## 1. Motivação

A aba Tendências calcula a evolução de assuntos pelo `delta` entre o primeiro e o último ano do dataset:

```js
delta = pct(últimoAno) - pct(primeiroAno)
if (Math.abs(delta) >= 0.3) tendencias.push(...)
```

Implementação atual em [EstatisticasView.vue:567-646](../../../src/views/EstatisticasView.vue#L567-L646) (a ser substituída).

### Problemas

Confirmados em conversa de design (2026-05-07):

1. **Tamanho amostral desigual entre anos** — 5% num ano com 50 questões (≈2 questões absolutas) é estatisticamente diferente de 5% num ano com 200 questões (≈10), mas o cálculo trata ambos igualmente.
2. **Anos ausentes** — bancas que não fazem prova todo ano deixam buracos no dataset; o cálculo atual descarta o assunto inteiro de um ano para o outro sem critério explícito.
3. **Sensibilidade a outliers** — comparar primeiro vs último ano significa que **um único ano anômalo destrói a tendência**: se 2022 teve um pico atípico, o delta com 2026 fica enviesado mesmo quando 2023, 2024 e 2025 mostram trajetória estável.
4. **Threshold absoluto fraco** — `|delta| ≥ 0.3pp` é arbitrário e não distingue entre tendência consistente e ruído de amostra pequena.

### Objetivo

Substituir o cálculo por **regressão linear** (`slope` em pp/ano + `R²` como medida de confiança), aplicar filtros de qualificação que removam itens com amostra fraca, e atualizar a UI para refletir as novas métricas — **sem redesenhar o layout** da aba.

## 2. Escopo

### Entra

- Função pura nova `calculateTrend(yearMap)` em `src/utils/trendAnalysis.js` — retorna `{ slope, r2, intercept, points }`
- Função pura `qualifies(stats, thresholds)` aplicando filtros de qualificação
- Função `buildTrendRanking(estatisticas, filtros)` orquestrando o pipeline (filtra dataset, monta mapas, aplica regressão, ranqueia)
- Substituição do `calcularTendencias()` na view por chamada a `buildTrendRanking`
- Listas "Em alta / Em queda" passam a exibir `slope` (`+0.8pp/ano`) em vez de `delta` acumulado
- Tooltip discreto em cada item: `R² = X · n=N anos`
- Testes unitários da nova função pura

### Não entra (decisões adiadas)

- Mudança de layout/componentes da aba (gráficos atuais ficam visualmente intactos)
- Nova aba **Análise** (sub-projeto 2 — outra spec)
- Cross-banca como reforço (sub-projeto 2)
- PDF de planejamento (sub-projeto 3)
- Configuração de thresholds pelo usuário (sub-projeto 2)
- Indicadores de "amostra pequena" no item visível (filtro agressivo cobre — quem ficar de fora não aparece)
- Bar chart "Tópicos com maior variação" — fica como está, mesmo que redundante com listas

## 3. Modelo conceitual

### 3.1 Filosofia: filtrar agressivo

Definida em conversa de design: a aba Tendências orienta estudo, então **orientação errada é pior que orientação ausente**. Itens com amostra fraca, R² baixo ou volume insuficiente **não aparecem** nas listas — não são exibidos com badge. Quem precisa de transparência total tem o modal "Ver detalhes" da estatística (cobertura ano-a-ano).

### 3.2 Tratamento de anos ausentes

Distinção crítica entre 2 cenários:

**Cenário A — assunto não aparece no doc do ano X, mas o doc existe.** Significa "banca não cobrou aquele assunto naquele ano". Conta como `qtd = 0, pct = 0`. Permite detectar quedas reais (assunto sai de 5% para 0% é tendência legítima).

**Cenário B — banca não tem doc importado no ano X.** Ex: user tem FCC/Fiscal de 2024–2026 mas não 2023. O ano 2023 **não entra no dataset**. Não preenchemos missing data.

**Algoritmo explícito** (executado dentro de `buildTrendRanking`):

```
1. anosDataset = sort(unique([est.ano for est in estatisticas filtradas por banca/area]))
2. Para cada caminho hierárquico canônico (disciplina[, assunto[, sub_assunto]]):
   2.1 porAno = {}
   2.2 Para cada ano em anosDataset:
       2.2.1 Procurar o caminho no doc daquele ano
       2.2.2 Se encontrado: porAno[ano] = { qtd: N, pct: P }
       2.2.3 Se não encontrado: porAno[ano] = { qtd: 0, pct: 0 }   ← Cenário A
   2.3 Aplicar qualifies(porAno) e calculateTrend extraindo só o pct
```

Anos ausentes do `anosDataset` (Cenário B) **não geram entrada** em `porAno`. Importante: o `n` da regressão é `anosDataset.length`, não "anos com qtd>0". O filtro `n_qtdPositiva ≥ 3` é aplicado em separado (§3.3).

### 3.3 Thresholds (defaults no MVP, configuráveis na signature)

Filtros aplicados em sequência. Item que reprovar em **qualquer** um fica fora das listas:

| Filtro | Valor | Propósito (cobre o quê) |
|---|---|---|
| `minAnosQtdPositiva` — mínimo de anos com qtd>0 | **≥3** | Cobertura mínima. 2 pontos sempre dão R²=1 (reta perfeita). 3+ permite avaliar se a tendência é linear de fato. |
| `minQtdMaxAbsoluta` — mínimo de qtd **absoluta** em ≥1 ano | **≥3** (calibrado 2026-05-07; antes era 5) | **Filtro de ruído puro**: previne assuntos com 1–2 questões esporádicas oscilando entre `0%` e `0.2%` virarem "tendência". Trabalha sobre `qtd` (número de questões), não `pct`. Calibração empírica: dataset FGV/OAB com 11 anos mostrou que 5 era apertado para programas amplos (OAB tem provas de 80q × 16+ disciplinas; sub-tópicos raramente atingem 5q num ano). 3 mantém defesa contra ruído puro sem cortar sub-assuntos legítimos. |
| `minR2` — R² mínimo | **≥0.5** | **Filtro de qualidade do fit**: a reta tem que explicar pelo menos 50% da variância. Abaixo disso, é majoritariamente ruído oscilante. |
| `minSlopeAbs` — \|slope\| mínimo (pp/ano) | **≥0.3** | **Filtro de relevância para estudo**: variações menores que isso são imperceptíveis para orientar planejamento. |

**Por que ambos `minQtdMaxAbsoluta` e `minSlopeAbs`?** Cobrem dimensões diferentes:
- `qtdMax` rejeita "assunto que existe no índice mas tem volume desprezível"
- `|slope|` rejeita "assunto com volume OK mas trajetória plana"
- Um pode passar enquanto o outro reprova, e ambos são casos legítimos de exclusão.

**Calibração inicial**: os valores acima são **defaults calibrados** baseados em raciocínio, não em validação empírica. Após a primeira rodada de uso real (validação manual §11), revisar:
- Se R²≥0.5 está deixando passar muito ruído → apertar para 0.6 ou 0.7
- Se está descartando tendências legítimas → relaxar para 0.4
- Memória do projeto sobre calibração de threshold (`feedback_calibracao_threshold_empirico.md`) reforça: thresholds vêm de spike + classificação manual, não de palpite. Esses números são ponto de partida, não verdade.

Configurabilidade fica para o sub-projeto 2 (Análise) — a signature da função suporta override desde já (§4.1) para preparar o terreno.

## 4. Arquitetura

### 4.1 Função pura, não composable

```
src/utils/trendAnalysis.js
  ├─ DEFAULT_THRESHOLDS = { minAnosQtdPositiva: 3, minQtdMaxAbsoluta: 5, minR2: 0.5, minSlopeAbs: 0.3 }
  ├─ calculateTrend(yearMap) → { slope, r2, intercept, points }
  ├─ qualifies(stats, thresholds = DEFAULT_THRESHOLDS) → boolean
  └─ buildTrendRanking(
        estatisticas,
        { banca, area, disciplina, thresholds = DEFAULT_THRESHOLDS, maxItems = 15 } = {}
     ) → { anos, subindo, descendo, total, descartados, disciplinasMap, assuntosMap, subAssuntosMap }
```

Decisão: função pura (não composable) porque:
- Stateless — não precisa reatividade
- Testável sem mount de componente
- **Reutilizável pelo sub-projeto 2 (Análise)** — mesma engine, UI diferente

**Configurabilidade na signature**: `thresholds` e `maxItems` aceitos como parâmetros opcionais com defaults. A view atual passa nada (usa defaults). A aba **Análise** vai passar `thresholds` derivados de UI de configuração — sem mudança de signature no futuro. Esta decisão custa zero agora e desbloqueia o sub-projeto 2.

### 4.2 Mudanças na view

Em [EstatisticasView.vue](../../../src/views/EstatisticasView.vue):

- **Remover** as ~80 linhas de [`calcularTendencias()` (linhas 567-646)](../../../src/views/EstatisticasView.vue#L567-L646)
- **Substituir** por chamada a `buildTrendRanking({ banca, area, disciplina })` no mesmo lugar
- **Atualizar** os `chartDisciplinas`, `chartAssuntos`, `chartAssuntosDisciplina`, `chartSubAssuntos` (computed) para consumir o novo `trendData.value` (mantém shape compatível na medida do possível — campos novos sobrescrevem `delta` por `slope`)
- **Adicionar** tooltip nos itens das listas

## 5. Modelo de dados

### 5.1 Saída de `calculateTrend(yearMap)`

```js
{
  slope: 0.85,         // pp/ano (positivo = subindo)
  r2: 0.87,            // 0..1
  intercept: -1693.4,  // intercept da reta (raramente exibido)
  points: [            // [[year, pct], ...] já ordenados
    [2022, 4.0], [2023, 5.5], [2024, 6.0], [2025, 7.5], [2026, 8.5],
  ],
}
```

Casos especiais:
- `points.length === 0` → `{ slope: 0, r2: 0, intercept: 0, points: [] }`
- `points.length === 1` → `{ slope: 0, r2: 0, intercept: y_único, points: [[ano, y]] }`
- `denom === 0` (todos x iguais — caso degenerado, não ocorre na prática com anos únicos) → `{ slope: 0, r2: 0, intercept: meanY, points }`
- `ssTot === 0` (todos y iguais — sem variância) → `{ slope: 0, r2: 1, intercept: meanY, points }` (reta horizontal perfeita)

### 5.2 Saída de `buildTrendRanking`

```js
{
  anos: [2022, 2023, 2024, 2025, 2026],   // anos do dataset filtrado por banca/area
  subindo: [
    {
      nome: 'Direito Tributário → CTN → Art.3',
      disc: 'Direito Tributário',          // disciplina-pai (pra filtros e drill-down)
      slope: 0.85,                         // pp/ano
      r2: 0.87,                            // 0..1
      n: 5,                                // anos com qtd>0 (não confundir com anos.length)
      qtdMax: 12,                          // maior qtd absoluta entre os anos (filtro qtd)
      primeiroPct: 4.0,                    // pct no primeiro ano do dataset
      ultimoPct: 8.5,                      // pct no último ano
      acumulado: 4.5,                      // slope × (últimoAno - primeiroAno) — legenda secundária
      porAno: {                            // estrutura unificada {pct, qtd} por ano
        2022: { pct: 4.0, qtd: 8 },
        2023: { pct: 5.5, qtd: 11 },
        2024: { pct: 6.0, qtd: 12 },
        2025: { pct: 7.5, qtd: 11 },
        2026: { pct: 8.5, qtd: 10 },
      },
    }
  ],
  descendo: [...mesmo shape, slope < 0...],
  total: 30,                  // total de tendências confiáveis (subindo.length + descendo.length)
  descartados: 12,            // quantos itens entraram no pipeline mas foram filtrados
  disciplinasMap: { 'Direito Tributário': { 2022: 12.5, ..., 2026: 18.0 } },  // pct por ano
  assuntosMap: { 'Direito Tributário → CTN': { 2022: 4.0, ..., 2026: 12.0 } },
  subAssuntosMap: { 'Direito Tributário → CTN → Art.3': { 2022: 4.0, ..., 2026: 8.5 } },
}
```

`subindo`/`descendo` ordenados por `|slope|` descendente; cap em **15** itens cada (igual ao limite atual; configurável via `maxItems`).

**`porAno` carrega `{ pct, qtd }`** porque o filtro `minQtdMaxAbsoluta` (§3.3) precisa de `qtd` absoluta. A regressão usa apenas `pct`. Carregar ambos no mesmo objeto evita ter 2 estruturas paralelas.

### 5.3 Compatibilidade com gráficos atuais

Os gráficos chartjs atuais leem `trendData.value.{disciplinas, assuntos, subAssuntos}` como mapas `nome → { ano: pct }` (não usam `subindo/descendo` para os Lines). Por isso `buildTrendRanking` **mantém esses mapas** como retornos auxiliares — não são redundância, são índices que os computeds dos charts já consomem.

| Gráfico | Lia | Vai ler |
|---|---|---|
| `chartDisciplinas` (Line) | `trendData.value.disciplinas` | `disciplinasMap` retornado por `buildTrendRanking` |
| `chartAssuntos` (Bar — variação) | `subindo` + `descendo` (delta) | `subindo` + `descendo` (slope) |
| `chartAssuntosDisciplina` (Line) | `trendData.value.assuntos` filtrados | `assuntosMap` filtrado por disc |
| `chartSubAssuntos` (Bar) | `trendData.value.subAssuntos` filtrados | `subAssuntosMap` filtrado |

**Por que mapas separados de `porAno`?** Os mapas top-level (`disciplinasMap`, `assuntosMap`, `subAssuntosMap`) carregam apenas `pct` por ano (não `qtd`), porque os charts precisam só de pct. Os itens em `subindo`/`descendo` carregam `porAno` com `{pct, qtd}` porque os filtros de qualificação precisam dos dois. Os 3 mapas top-level são reaproveitamento de cache — o pipeline já calcula pct por ano, então retornar como mapa não custa quase nada e evita o consumer iterar.

Ajustes nos charts:
- Fórmula de "média por nome" para escolher top-N nas barras passa a ser **média ponderada por anos com qtd>0** (consistente com filtragem do ranking)
- Eixo Y dos gráficos Bar passa a mostrar `pp/ano` (slope) em vez de `pp` (delta) — eixo legendado adequadamente

## 6. Algoritmo de regressão linear (referência)

Fórmula fechada (sem lib externa):

```js
export function calculateTrend(yearMap) {
  const points = Object.entries(yearMap)
    .map(([year, pct]) => [Number(year), Number(pct)])
    .filter(([y, p]) => Number.isFinite(y) && Number.isFinite(p))
    .sort((a, b) => a[0] - b[0])

  const n = points.length
  if (n < 2) return { slope: 0, r2: 0, intercept: n === 1 ? points[0][1] : 0, points }

  const sumX = points.reduce((s, [x]) => s + x, 0)
  const sumY = points.reduce((s, [, y]) => s + y, 0)
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0)
  const sumXX = points.reduce((s, [x]) => s + x * x, 0)

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, r2: 0, intercept: sumY / n, points }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² (coefficient of determination)
  const meanY = sumY / n
  const ssTot = points.reduce((s, [, y]) => s + (y - meanY) ** 2, 0)
  const ssRes = points.reduce((s, [x, y]) => {
    const yPred = slope * x + intercept
    return s + (y - yPred) ** 2
  }, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  return { slope, r2, intercept, points }
}
```

`qualifies` aplica os 4 thresholds da §3.3.

## 7. UI — mudanças mínimas

Localização: aba Tendências, listas "Em alta / Em queda" no template.

| Onde | Atual | Novo |
|---|---|---|
| `<span class="trend-item__delta">+{{ t.delta.toFixed(1) }}pp</span>` | `+4.5pp` | `<span class="trend-item__delta">{{ slopeFormat(t.slope) }}</span>` → `+0.85pp/ano` |
| `<span class="trend-item__range">{{ primeiro }}% → {{ ultimo }}%</span>` | mantém | mantém |
| (sem tooltip) | — | `<div class="trend-item" :title="\`R² = ${t.r2.toFixed(2)} · ${t.n} anos\`">` |
| Bar chart label "Variação (pp)" | mantém | renomeia para `Variação (pp/ano)` |
| Tooltip dos charts | mostra `t.delta` | mostra `t.slope` em pp/ano |

`slopeFormat(slope)`:
```js
const sign = slope > 0 ? '+' : ''
return `${sign}${slope.toFixed(2)}pp/ano`
```

Sem mudanças em CSS (cores, tamanhos, layout). Sem mudanças em filtros (banca, área, disciplina seguem iguais).

### 7.5 Empty states diferenciados

Três cenários distintos que hoje colapsam num único empty state. A correção exige distinguí-los:

| Cenário | Condição | Texto |
|---|---|---|
| Banca não selecionada | `!trend.banca` | "Selecione uma banca para ver tendências." (ícone TrendingUp) |
| Banca selecionada mas sem docs importados | `trend.banca && trendData.anos.length === 0` | "Nenhuma estatística importada para esta banca/área." (ícone BarChart3) |
| Banca tem docs mas <3 anos | `trendData.anos.length < 3` | "Importe dados de pelo menos 3 anos para calcular tendências confiáveis." (ícone BarChart3) |
| Banca tem ≥3 anos mas todos os assuntos ficaram filtrados | `trendData.anos.length ≥ 3 && trendData.subindo.length === 0 && trendData.descendo.length === 0` | "Nenhuma tendência confiável detectada com os critérios atuais. Pode ser que a banca varie demais entre anos ou os volumes sejam pequenos." (ícone BarChart3) |

A view atual tem só os 2 primeiros (e mistura os outros). Esta spec adiciona os outros 2.

## 8. Testes

`src/utils/__tests__/trendAnalysis.test.js`:

### `calculateTrend`
- Pontos colineares → R² = 1, slope = esperado
- Pontos com leve ruído → R² < 1, slope coerente
- < 2 pontos → slope = 0, r2 = 0
- Todos os y iguais → ssTot = 0, retorno `r2 = 1, slope = 0`
- Todos os x iguais (degenerado) → denom = 0, retorno `slope = 0`
- Slope negativo (descendente) → slope < 0, fórmula correta

### `qualifies`
- Cada threshold isolado: passa/falha
- Combinações limítrofes (n=2, n=3; qtdMax=4, qtdMax=5; r2=0.49, r2=0.5; slope=0.29, slope=0.3)

### `buildTrendRanking`
- Fixture com 5 anos cobrindo: tendência confiável (alta + baixa), tendência mas R² baixo (descartada), volume baixo (descartada), só 2 anos (descartada)
- Banca sem dados → `{ anos: [], subindo: [], descendo: [] }`
- Filtro por disciplina → ranking só com assuntos/sub-assuntos da disciplina
- Anos com docs ausentes não entram em `anos`
- Asunto que aparece em N anos com 0% em outros M → `0%` conta para os M anos

### Não testado (cobertura manual em §11)
- Render dos gráficos pós-mudança
- Tooltip aparecendo no hover
- Texto do label `+0.85pp/ano` no DOM real

## 9. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| 9.1 | Tendência atual mostra coisas que vão sumir após filtros novos — user pode estranhar "ué, sumiu" | Validação manual em §11 inclui comparação visual com Tendências antiga. Documentar na release note como "correção de bug — itens removidos eram artefato de amostra pequena". |
| 9.2 | User tem só 2 anos importados — todos os assuntos são filtrados (n<3) | Empty state existente "Dados insuficientes" cuida; ajustar texto para "Importe pelo menos 3 anos para ver tendências". |
| 9.3 | Performance com muitos assuntos × anos | Cálculo é O(N×anos); 1000 assuntos × 5 anos = 5000 ops simples. Sem otimização necessária no MVP. |
| 9.4 | Slope muito alto causando label desalinhado em UI (ex: `+12.34pp/ano`) | `toFixed(2)` cobre; teste manual com banca que tem assunto explosivo. |
| 9.5 | Mapas auxiliares (`disciplinasMap`, `assuntosMap`) — esquecimento de algum chart consumer | Auditoria das 4 charts ao implementar; teste manual antes de PR. |
| 9.6 | R² = 1 com 2 pontos é matematicamente correto mas enganoso | Threshold `n ≥ 3` filtra esses casos antes do R² ser avaliado. |
| 9.7 | Backwards compat — usuários acostumados com a Tendências antiga podem reportar "perdi info" | Fica claro no release note + documento ESTATISTICAS.md atualizado. |
| 9.8 | **Falsos negativos disfarçados de "tendência confiável"** — assunto com slope alto, R² alto, n≥3 mas sempre em **provas pequenas** (ex: provas de 50 questões em 2024, 60 em 2025, 80 em 2026). O `pct` cresce porque o assunto fica mais "denso" em provas menores, mas a relevância absoluta é baixa. Um aluno que estudar esse assunto vai encontrar pouca recorrência real. | Filtro `minQtdMaxAbsoluta ≥ 5` mitiga parcialmente (assuntos com qtd absoluta sempre baixa caem). Mitigação completa fica para o sub-projeto 2 (Análise) que vai considerar volume absoluto + recorrência. Documentar como limitação conhecida do MVP. |

## 10. Critérios de aceitação

Funcionais:
- [ ] Função `calculateTrend` retorna slope/r2/intercept corretos para pontos colineares e ruidosos
- [ ] `qualifies` aplica os 4 thresholds default (≥3 anos, qtd≥5 em ≥1 ano, R²≥0.5, |slope|≥0.3)
- [ ] `buildTrendRanking` aceita override de `thresholds` via parâmetro opcional (preparação pro sub-projeto 2)
- [ ] `buildTrendRanking` retorna ≤15 itens em cada lista (ou `maxItems` se override), ordenados por |slope| desc
- [ ] `buildTrendRanking` retorna mapas `disciplinasMap`, `assuntosMap`, `subAssuntosMap` consumidos pelos 4 charts
- [ ] `porAno` em cada item de `subindo`/`descendo` carrega `{pct, qtd}` por ano (não só pct)
- [ ] Aba Tendências carrega sem erro com banca selecionada
- [ ] Listas "Em alta / Em queda" exibem `+0.85pp/ano` no campo delta
- [ ] Tooltip mostra `R² = 0.87 · 5 anos` ao passar mouse no item
- [ ] Filtro por disciplina mostra apenas assuntos/sub-assuntos da disciplina
- [ ] Eixo Y do bar chart "Variação" exibe `pp/ano`
- [ ] Empty state "Selecione uma banca" quando `trend.banca` vazio
- [ ] Empty state "Nenhuma estatística importada para esta banca/área" quando banca selecionada mas dataset vazio
- [ ] Empty state "Importe pelo menos 3 anos" quando dataset tem 1-2 anos
- [ ] Empty state "Nenhuma tendência confiável detectada" quando ≥3 anos mas todos assuntos foram filtrados

Backwards compat:
- [ ] Estatísticas existentes (criadas antes deste PR) continuam aparecendo nos cálculos
- [ ] Aba Importações continua funcionando exatamente como na entrega anterior (modo lote OK)
- [ ] Tendências antigas com `delta` muito baixo deixam de aparecer — comportamento esperado, não regressão
- [ ] Build de produção passa (Node 20+ no CI)

## 11. Cenários de validação manual

Roteiro para uso quando a impl estiver pronta. Cada cenário tem pré-condição → passos → esperado.

### Cenário 1 — Tendência confiável
**Pré:** banca com 5 anos importados; assunto X que cresceu 1pp ao ano de forma consistente
1. Selecionar banca + área no filtro
2. **Esperado:** assunto X aparece em "Em alta" com `+1.00pp/ano`; tooltip mostra `R² = 0.95+ · 5 anos`

### Cenário 2 — Filtro de amostra pequena
**Pré:** assunto Y aparece só em 2 anos
1. Selecionar a banca correspondente
2. **Esperado:** Y NÃO aparece nas listas (filtro `n≥3`)

### Cenário 3 — Filtro de R² baixo
**Pré:** assunto Z com pontos `[2,8,3,7,2]` (oscilante, sem tendência clara)
1. Selecionar a banca
2. **Esperado:** Z NÃO aparece (filtro `R²≥0.5`)

### Cenário 4 — Filtro de slope baixo
**Pré:** assunto W com slope = 0.2pp/ano (abaixo do threshold)
1. Selecionar a banca
2. **Esperado:** W NÃO aparece (filtro `|slope|≥0.3`)

### Cenário 5 — Banca sem dados suficientes
**Pré:** banca com só 1 ano importado
1. Selecionar a banca
2. **Esperado:** empty state "Dados insuficientes"; nenhuma lista renderiza

### Cenário 6 — Drill-down por disciplina
**Pré:** banca com 5 anos; selecionar disciplina específica
1. Aplicar filtro disciplina
2. **Esperado:** listas mostram apenas assuntos/sub-assuntos daquela disciplina; gráfico "Evolução dos Assuntos" renderiza

### Cenário 7 — Comparação visual com versão antiga
**Pré:** snapshot da versão antiga (printscreen) da mesma banca
1. Carregar nova versão
2. **Esperado:** itens descartados eram aqueles com amostra fraca / R² baixo / slope baixo. Itens que sobraram fazem sentido como tendências reais.

## 12. Open questions / decisões adiadas

- **Configuração de thresholds pelo usuário** — controles de UI para ajustar `n`, `qtdMin`, `R²`, `slope`. Ficará no sub-projeto 2 (Análise).
- **Cross-banca como reforço** — combinar dados de 2 bancas para preencher gaps. Sub-projeto 2.
- **Visualização de `R²` na lista (não só tooltip)** — badge/chip se valer transparência maior. Reavaliar após uso real.
- **Bar chart "Tópicos com maior variação"** — fica como está, mesmo que redundante com listas. Decisão: não tocar layout no MVP.
- **Tendência como teste estatístico (p-value)** em vez de R² — overengineering pro caso de uso (orientar estudo). YAGNI.
- **Empty state com `n<3` separado de "sem dados"** — texto distinto explicando que precisa importar mais anos. Pequeno; pode entrar no MVP se for trivial.
- **Atualizar [documentation/ESTATISTICAS.md](../../../documentation/ESTATISTICAS.md)** com a nova lógica de tendência — pequeno; entra no PR final.
