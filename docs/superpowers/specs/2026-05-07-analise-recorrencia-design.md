# Aba Análise — recorrência + volume + tendência

**Data:** 2026-05-07
**Rota afetada:** `/estatisticas` — nova aba **Análise** ao lado de Importações e Tendências
**Público:** mentor (sofisticado; opera dados; gera outputs pra orientar alunos)

## 1. Motivação

A aba Tendências corrigida ([2026-05-07-tendencias-regressao-linear-design.md](2026-05-07-tendencias-regressao-linear-design.md)) responde "o que está subindo/caindo ao longo do tempo" via regressão linear. Calibração empírica com FGV/OAB mostrou que esse método **não atende** programas amplos com edições heterogêneas (236 candidatos, zero passados), porque os dados oscilam sem trajetória linear clara.

A pergunta real do mentor é: **quais assuntos priorizar para orientar o estudo dos alunos?** Tendência é uma das dimensões; recorrência (em quantos anos aparece) e volume (quantas questões) são igualmente importantes — e mais robustas em programas amplos.

## 2. Objetivo

Painel interativo de **exploração das estatísticas indexadas**, mostrando os assuntos mais relevantes ranqueados por 3 dimensões independentes:

- **Recorrência**: % de anos do dataset em que o assunto apareceu com qtd>0
- **Volume**: questões absolutas (média/ano e total)
- **Tendência**: slope da regressão linear (reusa `buildTrendRanking`); pode ser nula

Mentor vê, filtra, seleciona, exporta. **Não há score composto único** — multi-dimensional explicitamente, mentor decide qual dimensão pesa mais para o caso dele.

## 3. Escopo

### 3.1 Entra

- Aba **Análise** em `/estatisticas` ao lado de Importações e Tendências
- Tabela densa com 3 colunas core (Recorrência, Volume, Tendência) + Pct médio
- Seletor de granularidade (Disciplina | Assunto | Sub-assunto)
- Drill-down progressivo (clicar numa linha de Disciplina filtra para Assuntos dela; idem Assunto → Sub-assunto)
- Breadcrumb mostrando o caminho atual
- 3 presets de filtro (Conservador / Moderado / Permissivo) — sem custom thresholds no MVP
- Toggle "Incluir bancas similares" (cross-banca; agregação simples sem pesos)
- Ações em lote: copiar nomes selecionados (clipboard), exportar CSV
- Empty states diferenciados por causa
- Engine pura `computeMetrics` reusando shape conhecido (estatísticas → métricas)

### 3.2 Não entra

- **Custom thresholds via sliders** — fica para v2.5 se mentor pedir
- **Seletor granular de quais bancas similares** — agregação atual inclui todas as bancas com mesma `area`
- **Pesos por confiabilidade no cross-banca** — agregação simples
- **Push de scores para `priorizacao.disciplinas`** do cargo — aguardar PR6 (priorização determinística) estabilizar; integração será spec separada
- **Geração de PDF de planejamento** — sub-projeto 3
- **Comparação lado-a-lado de 2 bancas** (heatmap/diff)
- **Score composto único** (descartado em favor de multi-dimensional)
- **4º nível de drill-down (sub-sub-assunto)** — dados de origem (estatísticas QConcursos) só têm 3 níveis

## 4. Métricas — definições exatas

| Métrica | Fórmula | Unidade | Observação |
|---|---|---|---|
| **Recorrência** | `(anos com qtd>0 / total anos no dataset) × 100` | % | Padroniza por ano (não por prova). Bancas com múltiplas provas/ano contam como 1 ano se houve cobertura. |
| **Volume médio** | `Σ qtd / (anos com qtd>0)` | questões/ano com cobertura | Média condicional aos anos onde apareceu — não dilui zeros. |
| **Volume total** | `Σ qtd em todos os anos` | questões absolutas | Auxiliar; útil para tooltip e CSV. |
| **Pct médio** | `média de pct nos anos com qtd>0` | % | Média condicional, alinhada com volume médio. |
| **Slope** | regressão linear sobre `(ano, pct)` em todos os anos do dataset | pp/ano | Reusa `calculateTrend` do `trendAnalysis.js`. Anos sem qtd entram como `pct=0` (Cenário A da spec de Tendências). |
| **R²** | qualidade do fit | 0–1 | Tooltip apenas; não filtra fora os itens. |

### 4.1 Recorrência: por que anos e não provas

Bancas como FGV/OAB fazem 2 provas/ano; FCC pode fazer 1; Cespe pode pular anos. Padronizar por **ano** mantém a métrica comparável entre bancas. Se houve cobertura em qualquer prova daquele ano, conta como "ano coberto". Se houver demanda futura para granularidade por prova, é v2.

### 4.2 Volume médio condicional

`Σ qtd / anos_com_qtd_positiva` em vez de `Σ qtd / total_anos` previne diluir o volume por anos onde a banca não fez prova ou não cobriu o assunto. Exemplo:

- Assunto cobrado em 3 de 5 anos com 10 questões cada → volume médio = `30 / 3 = 10`
- Mesmo assunto avaliado contra 5 anos diluído → `30 / 5 = 6`

A primeira reflete melhor "quando aparece, vem com X questões". A segunda mistura cobertura com volume. Mentor pode olhar volume + recorrência juntos para o panorama completo.

## 5. Engine — `computeMetrics`

### 5.1 Localização e API

```
src/utils/recurrenceAnalysis.js
  ├─ DEFAULT_PRESETS = { conservador, moderado, permissivo }
  ├─ computeMetrics(estatisticas, options) → { items, anos, totalDataset }
  └─ applyPreset(items, presetName, customThresholds) → items filtrados
```

Signature de `computeMetrics`:

```js
computeMetrics(estatisticas, {
  banca,                      // string obrigatória (sem banca, retorna vazio)
  area,                       // string opcional
  granularidade,              // 'disciplina' | 'assunto' | 'sub_assunto'
  disciplinaFiltro,           // string opcional (drill-down: filtra pela disciplina)
  assuntoFiltro,              // string opcional (drill-down: filtra pelo assunto, requer disciplinaFiltro)
  crossBanca = false,         // se true, agrega outras bancas com mesma area
}) → {
  items: [
    {
      nome,                   // ex: 'Direito Tributário → CTN' ou só 'CTN' (depende de granularidade + filtro)
      caminhoCompleto,        // sempre full path: 'Disc → Ass → Sub' (útil pra exportar)
      tipo,                   // 'disciplina' | 'assunto' | 'sub_assunto'
      pai,                    // disciplina pai (assuntos) ou assunto pai (sub-assuntos), null se disciplina
      recorrencia,            // 0..100
      volumeMedio,            // questões/ano com cobertura
      volumeTotal,            // questões absolutas
      pctMedio,               // 0..100
      slope,                  // null se não calculável (n<2 anos com qtd>0)
      r2,                     // null se slope é null
      n,                      // anos com qtd>0
      qtdMax,                 // maior qtd absoluta entre os anos
      porAno,                 // { ano: { qtd, pct } } — para tooltip/drill-down detalhado
      boostedBy,              // Array<string>: [] | ['Cespe', 'FGV'] — convertido de Set interno antes de retornar
    }
  ],
  anos,                       // anos únicos do dataset filtrado (banca-alvo + cross-banca se aplicável)
  bancasContribuintes,        // Array<string>: [] | ['Cespe', 'FGV'] — bancas que entraram via cross-banca, populado no passo 4 do pipeline
}
```

### 5.2 Pipeline interno

1. **Filtrar dataset** por banca-alvo + área. Se `crossBanca`, também inclui outras bancas com mesma `area`, marcando origem em cada estatística.
2. **Anos do dataset**: união de todos os anos das estatísticas filtradas, ordenados.
3. **Hierarquia**: percorre `dados.disciplinas[].assuntos[].sub_assuntos[]`, monta mapa indexado por nome canônico (`Disc`, `Disc → Ass`, `Disc → Ass → Sub`). Cada nó armazena `{ porAno: { ano: { qtd, pct } }, boostedBy: Set }`.
4. **Cross-banca merge**: quando o mesmo `Disc → Ass` aparece em 2 bancas no mesmo ano, **soma qtd** e **soma pct** (clampa a 100). Adiciona banca-fonte ao `boostedBy` do nó. Acumula nomes únicos de bancas em `bancasContribuintes` (set local que vira array no retorno). Limitação documentada em §6.2.
5. **Filtra por granularidade**: retorna apenas nós do tipo solicitado (Disciplina | Assunto | Sub-assunto).
6. **Aplica filtros de drill-down** (disciplinaFiltro / assuntoFiltro).
7. **Computa métricas** para cada nó: recorrência, volumeMedio, volumeTotal, pctMedio, slope/r²/n/qtdMax via `calculateTrend(pctMap)`.
8. **Retorna** items + metadata.

### 5.3 `applyPreset(items, presetName)`

Filtra a lista pelo preset selecionado. **Não recalcula métricas** — só filtra.

```js
DEFAULT_PRESETS = {
  conservador: { recorrenciaMin: 50, volumeTotalMin: 5, r2Min: 0.5, slopeAbsMin: 0.3 },
  moderado:    { recorrenciaMin: 30, volumeTotalMin: 3, r2Min: 0.4, slopeAbsMin: 0.2 },
  permissivo:  { recorrenciaMin: 1,  volumeTotalMin: 1, r2Min: 0,   slopeAbsMin: 0   },
}
```

Filtros aplicados a um item:

- `recorrencia >= preset.recorrenciaMin`
- `volumeTotal >= preset.volumeTotalMin`
- Tendência: o item **passa mesmo se slope/r2 não qualificar**. Os thresholds de R² e slope só decidem se a coluna "Tendência" mostra valor ou fica vazia. Não filtram o item da tabela.

Default: **Moderado**. Pode ser ajustado pós-validação manual (calibração empírica, igual fizemos em Tendências).

## 6. Cross-banca

### 6.1 Comportamento

Toggle on no toolbar. Quando ativo:

- Filtra estatísticas onde `area === options.area` (qualquer banca, exceto a banca-alvo)
- Inclui essas estatísticas no dataset junto com as da banca-alvo
- Cada item ganha `boostedBy: [...]` com nomes das bancas que contribuíram (vazio se só banca-alvo)
- Tabela mostra badge `+N bancas` na linha (lista no tooltip)

### 6.2 Merge de pct quando há overlap

Cenário: ano 2024, Disc → CTN aparece em FCC (10 questões, 8% da prova FCC) e em Cespe (15 questões, 6% da prova Cespe).

**Decisão simples (MVP):**
- Soma qtd: 10 + 15 = 25
- Soma pct: 8 + 6 = 14% (clampa a 100 se exceder)

**Warning visual quando soma pct é alta:**
- Se `pctMedio > 50%`, badge laranja `⚠ ~{pct}%` no canto da célula Pct, com tooltip: "Soma de pct entre bancas — interpretação aproximada"
- Se `pctMedio > 100%` (clampado), tooltip adicional: "Soma excede 100% — provavelmente o assunto domina ambas as bancas no mesmo ano"

A soma de pct é **ingênua estatisticamente** (somar percentuais de provas diferentes não tem interpretação direta), mas no contexto de "ranking relativo" funciona bem o suficiente. Mentor entende isso ao ler "incluir bancas similares".

**Decisão refinada (v2 ou pós-validação)**: ponderação por total de questões da prova.

**Pré-requisito da v2** (bloqueante): expor `total_questoes` por estatística no índice ES. Hoje **não está no shape** (`{ banca, area, ano, dados: { disciplinas: [...] } }`). Isso vai requerer:
- Migração no backend (`backend-express/estatistica.service.js`) para calcular e persistir
- Reimportação ou backfill das estatísticas existentes
- PR coordenado com `back_leges` se usar índice externo

Adiada explicitamente; impacto avaliado.

### 6.3 Limitações documentadas

- Soma simples de pct entre bancas é aproximação, não estatisticamente rigorosa
- Estilos de banca diferentes (Cespe certo/errado vs múltipla escolha) podem distorcer
- Mentor é o "filtro" final — interpreta o resultado com bom senso

## 7. Layout (texto descritivo)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Importações] [Tendências] [Análise* ]                          │
├─────────────────────────────────────────────────────────────────┤
│ Análise / Direito Tributário (Assuntos)        ← breadcrumb     │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ TOOLBAR (sticky no scroll)                                 │  │
│ │ Banca: [FCC ▾]  Área: [Fiscal ▾]                           │  │
│ │ Granularidade: [Disciplina | Assunto* | Sub-assunto]       │  │
│ │ Filtro: [Conservador | Moderado* | Permissivo]             │  │
│ │ ☐ Incluir bancas similares (Cespe, FGV) — quando ON        │  │
│ │                                                            │  │
│ │ Mostrando 23 de 156 itens · [Copiar selecionados] [CSV]    │  │
│ └────────────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ☐ Nome                Recorr. ↓  Vol/ano  Vol total  Pct  Tend.│
│ ├────────────────────────────────────────────────────────────┤  │
│ │ ☐ Trib → CTN            100%      8.2       41       12% ↑+0.85│
│ │ ☐ Trib → Lei 8137        80%      3.4       17        6%  →   │
│ │ ☐ Adm → Atos            100%      7.1       36       10% ↓-1.20│
│ │ ☐ Trib → ICMS            60%      5.0       15        9%  +0.20│
│ │ ...                                                        │  │
│ └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1 Comportamento de UI

- **Header de coluna clicável** → ordena por essa coluna asc/desc; default: Recorrência desc
- **Linha clicável (área não-checkbox)** → drill-down:
  - Clicar em Disciplina (granularidade=Disciplina) → muda granularidade pra Assunto + filtra por disciplinaFiltro
  - Clicar em Assunto (granularidade=Assunto) → muda granularidade pra Sub-assunto + filtra por disciplinaFiltro+assuntoFiltro
  - Clicar em Sub-assunto → não faz drill-down (último nível); abre tooltip com `porAno` detalhado
- **Breadcrumb** clicável → volta ao nível anterior, limpando filtros do nível inferior
- **Mudança manual de granularidade** via toolbar → limpa filtros de drill-down de níveis abaixo do novo:
  - Trocar para Disciplina → limpa `disciplinaFiltro` e `assuntoFiltro`
  - Trocar para Assunto → mantém `disciplinaFiltro`, limpa `assuntoFiltro`
  - Trocar para Sub-assunto → mantém `disciplinaFiltro` e `assuntoFiltro`
- **Mudança de banca/área** → reseta TUDO (granularidade volta para Assunto default, drill-down zerado, seleções zeradas, paginação volta para página 1, ordenação mantém porque é UI preference)
- **Breadcrumb clicado** → volta um nível: limpa filtros do nível imediatamente abaixo + paginação volta para 1; **mantém** seleções e ordenação
- **Tendência na célula**: ícone (`↑↑` `↑` `→` `↓` `↓↓`) + número curto (`+0.85`); tooltip mostra `R² · n anos · valores ano-a-ano`. Se item não tem slope (n<2), célula vazia.
- **Tooltip "incluir bancas similares" desabilitado** quando não há outras bancas com a mesma área (evita confusão).

### 7.2 Tabela densa (mentor-friendly)

- Linhas finas (height ~32px)
- Tipografia tabular (números alinhados à direita)
- Hover destaca linha
- Selected row tem background mais escuro
- Header sticky no scroll

## 8. Empty states

| Cenário | Texto |
|---|---|
| Sem banca selecionada | "Selecione uma banca para começar a análise." (ícone neutro) |
| Banca + área sem estatísticas | "Nenhuma estatística importada para {banca}/{area}. Importe na aba Importações." |
| Dataset com só 1 ano | Permite mostrar resultados (recorrência = 100% para tudo que aparece), mas adiciona banner: "Apenas 1 ano de dados — recorrência tem pouco significado. Importe mais anos para análise robusta." |
| Preset filtrou tudo | "Nenhum item passou no filtro {preset}. Tente um filtro mais permissivo, ative bancas similares, ou importe mais dados." + botão "Mudar para Permissivo" |
| Cross-banca on mas nenhuma outra banca tem dados na área | Toast informativo: "Nenhuma banca similar tem dados nessa área. Toggle ignorado." |

## 9. Outputs

### 9.1 Copiar selecionados

Botão habilita quando ≥1 linha selecionada. Copia para clipboard:

```
Disc → Ass1
Disc → Ass2
Disc → Ass3
```

(Uma linha por item, separadas por `\n`. Sem header.)

### 9.2 Exportar CSV

Header e linhas:

```csv
Nome,Recorrencia,VolumeMedio,VolumeTotal,PctMedio,Slope,R2,N,Boosted
"Tributário → CTN",100,8.2,41,12,0.85,0.87,5,
"Adm → Atos",100,7.1,36,10,-1.2,0.91,5,
"Tributário → CTN",80,5.5,22,9,0.4,0.6,4,"Cespe, FGV"
```

Codificação UTF-8 com BOM (Excel-friendly). Filename: `analise-{banca}-{area}-{YYYYMMDD}.csv`.

### 9.3 Decisões de output adiadas

- **Push para cargo/edital** — aguarda PR6
- **Compartilhamento via link** — não há infraestrutura de share no projeto
- **Geração de plano de tarefas** — sub-projeto futuro

## 10. Componentes / arquivos

```
src/utils/recurrenceAnalysis.js                      (novo)
src/utils/__tests__/recurrenceAnalysis.test.js       (novo)
src/views/EstatisticasView.vue                       (adiciona aba 'analise', toolbar, lógica)
  └─ ou extrai pra src/views/AnaliseTab.vue se ficar > 1800 linhas
src/components/analise/AnaliseToolbar.vue            (novo)
src/components/analise/AnaliseTable.vue              (novo)
src/components/analise/AnaliseRow.vue                (novo, opcional pra reuso)
```

Decisão sobre componentização: começar com tudo em `EstatisticasView.vue`, extrair quando passar de **400 linhas adicionais** ou ficar difícil de ler. Critério objetivo, evita over-engineering inicial.

## 11. Testes

### 11.1 Testes unitários (`recurrenceAnalysis.test.js`)

- `computeMetrics`:
  - Recorrência calculada corretamente (5 anos, item em 3 → 60%)
  - Volume médio condicional (não dilui em zeros)
  - Pct médio condicional
  - Granularidade respeitada (só disciplinas / só assuntos / só sub-assuntos)
  - Drill-down: `disciplinaFiltro` retorna só assuntos da disciplina
  - Cross-banca: agrega corretamente, marca `boostedBy`
  - Slope/R² calculado quando n≥2
  - n=1 → slope=null, r2=null
  - Item ausente em todos os anos → não aparece (filtrado por construção)
  - Banca sem estatísticas → retorna `items: []`
- `applyPreset`:
  - Cada preset filtra como esperado
  - Custom override mescla com defaults
  - Item sem slope ainda passa se recorrência+volume permitirem
- Edge cases: dataset vazio, anos vazios, dados malformados (disciplina sem nome, qtd como string)

### 11.2 Validação manual

Cenários a testar pós-implementação:

- Cebraspe/Procuradoria: tabela popula bem com Moderado; ordenação por cada coluna funciona; drill-down até sub-assunto exibe valores coerentes
- FGV/OAB: tabela popula com Permissivo (caso falho da Tendências); cross-banca on traz dados de outras bancas
- Empty states: cada um disparado pelo cenário correto
- Copiar selecionados → cola no editor de texto correto, com todos os nomes
- CSV → abre no LibreOffice/Excel sem corrupção de acento

## 12. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| 12.1 | Cross-banca soma pct ingenuamente — pode dar valores enganosos | Documentado como aproximação MVP; warning visual quando soma > 50%; ponderação fica para v2 |
| 12.2 | Tabela densa pode ficar lenta com muitos itens (1000+) | Paginação (Pagination component da Fase 1 do PR anterior já existe). Default 50 linhas por página, opções 50/100/200 |
| 12.3 | Drill-down + cross-banca + filtro de preset pode confundir mentor | Breadcrumb sempre visível; estado das toggles persistido na URL (querystring) para compartilhamento e back/forward do browser. **Detalhamento de querystring em §15.** |
| 12.4 | Mentor pode interpretar slope como "vai continuar assim" | Tooltip da tendência inclui R² + n; coluna vazia quando slope não qualifica nos thresholds do preset (sinaliza "tendência não confiável") |
| 12.5 | CSV com BOM pode quebrar parsers estritos | É comportamento esperado para Excel; documentado |
| 12.6 | Mudança de banca não limpa drill-down → estado fantasma | `watch` em banca/área reseta `disciplinaFiltro`/`assuntoFiltro`/seleções |
| 12.7 | Toggle cross-banca em banca-alvo única (sem outras bancas com a área) | Toggle desabilitado com tooltip explicando |
| 12.8 | Reusar `calculateTrend` pode levar a inconsistências entre Tendências e Análise | Mesma engine matemática. Diferença é apenas o filtro: Tendências usa `qualifies` com `DEFAULT_THRESHOLDS` (4 limites). Análise usa `applyPreset` com `DEFAULT_PRESETS` (3 perfis nomeados). **Os 2 conjuntos de constantes são INDEPENDENTES** — vivem em arquivos separados (`trendAnalysis.js` vs `recurrenceAnalysis.js`); nunca compartilhar valor numérico via import direto. Mudar `DEFAULT_THRESHOLDS` de Tendências NÃO deve afetar Análise. Documentar no header do `recurrenceAnalysis.js`. |
| 12.9 | Performance ao trocar banca com dataset grande | `computeMetrics` percorre `estatisticas × disciplinas × assuntos × subs` (com early-exits por filtros). Hierarquia construída em hashmap por chave canônica (`Disc → Ass → Sub`) — merge de cross-banca é O(1) por chave. **Validar empiricamente** em dataset real (FCC + Cespe + FGV/OAB) antes de declarar OK; adicionar `console.time('computeMetrics')` na implementação inicial e remover quando estável. Estimativa otimista de 100ms NÃO é compromisso — é meta. |
| 12.10 | Estado da Análise persistido entre sessões pode confundir | Querystring (URL) é única persistência; não usar Pinia persist |

## 13. Critérios de aceitação

Funcionais:
- [ ] Aba **Análise** aparece em `/estatisticas` ao lado de Importações e Tendências
- [ ] Toolbar tem: banca, área, granularidade (3 botões), preset (3 botões), toggle cross-banca, ações (copiar/CSV)
- [ ] Tabela mostra colunas: Nome, Recorrência, Vol/ano, Vol total, Pct, Tendência (slope+ícone)
- [ ] Header de cada coluna ordena asc/desc; default Recorrência desc
- [ ] Clicar em linha de Disciplina muda granularidade pra Assunto + filtra pela disciplina
- [ ] Clicar em linha de Assunto muda granularidade pra Sub-assunto + filtra
- [ ] Breadcrumb sempre visível; clicar volta um nível
- [ ] Preset Moderado é o default; trocar preset filtra a tabela sem recalcular
- [ ] Cross-banca on agrega bancas com mesma área; bancas contribuintes aparecem em badge na linha + tooltip
- [ ] Cross-banca desabilitado quando não há outras bancas com a área
- [ ] Empty states cobrem 5 cenários diferentes com texto distinto
- [ ] Copiar selecionados copia nomes (1 por linha) sem prefixo decorativo
- [ ] Exportar CSV gera arquivo com BOM, headers corretos, abre no Excel
- [ ] Tooltip de tendência mostra R², n anos, e valores ano-a-ano

Não-funcionais (validação manual em Fase 6 da implementação):
- [ ] Tempo de cálculo < 200ms para datasets de até 50 estatísticas × 200 disciplinas (medir com `console.time`)
- [ ] Tabela paginada quando > 50 linhas
- [ ] Estado de filtros refletido na URL conforme §15
- [ ] Refresh do browser preserva estado da Análise via querystring
- [ ] Compartilhar URL para outro mentor reproduz a mesma view (se ele tem os mesmos dados)
- [ ] CSV exportado abre no Excel sem corrupção de acento (BOM funcional)

Unit tests (Vitest):
- [ ] `computeMetrics` cobre cenários da §11.1
- [ ] `applyPreset` aplica os 3 presets corretamente
- [ ] Edge cases: dataset vazio, banca inexistente, dados malformados, n=1 (slope null)

## 14. Decisões adiadas / open questions

- **Custom thresholds via sliders** — adiado para v2.5
- **Cross-banca com seletor granular** — adiado
- **Pesos por confiabilidade no cross-banca** — depende de expor `total_questoes` por estatística
- **Push de scores para `priorizacao.disciplinas`** — aguarda PR6 estabilizar; spec separada
- **Comparação lado-a-lado de 2 bancas** — sub-projeto futuro
- **PDF de planejamento** — sub-projeto 3
- **Persistência de seleção e drill-down entre sessões** — querystring é o limite no MVP
- **Score composto único com pesos calibráveis** — descartado em favor de multi-dimensional
- **Análise por prova (não por ano)** — quando houver demanda real
- **kNN/embedding para "assuntos similares"** — fora do escopo

## 15. Querystring para estado da Análise

### 15.1 Parâmetros

```
/estatisticas?tab=analise
  &banca=FCC
  &area=Fiscal
  &gran=assunto         # 'disciplina' | 'assunto' | 'sub_assunto'
  &disc=Direito%20Tribut%C3%A1rio   # opcional, drill-down nível 1
  &ass=CTN              # opcional, drill-down nível 2 (requer disc)
  &preset=moderado      # 'conservador' | 'moderado' | 'permissivo'
  &cross=1              # '1' | '0'
  &sort=recorrencia     # 'nome' | 'recorrencia' | 'volumeMedio' | 'volumeTotal' | 'pctMedio' | 'slope'
  &dir=desc             # 'asc' | 'desc'
  &page=1               # paginação
```

`tab=analise` distingue da aba Tendências e Importações. Ausente = aba Importações (default).

### 15.2 Validação de query params

- Valor desconhecido (ex: `gran=4d`) → ignora e usa default (`gran=assunto`)
- `disc` sem `gran=assunto` ou `gran=sub_assunto` → ignora
- `ass` sem `disc` → ignora
- Banca/área inexistente no `dictsStore` → carrega mas mostra empty state "Banca não encontrada nas estatísticas importadas"

### 15.3 Sincronização

Onde vive: dentro de `EstatisticasView.vue`, na seção da aba Análise. Não precisa composable separado no MVP — refs locais + watchers diretos. Se a lógica crescer, extrair para `useAnaliseQueryState` em fase futura.

- **State → URL**: `watch` em cada ref de filtro (`banca`, `area`, `gran`, `discFilter`, `assFilter`, `preset`, `cross`, `sort`, `dir`, `page`); chama `router.replace({ query: { ...route.query, [key]: value } })` (preserva outras queries; não `push` — evita poluir history)
- **URL → State**: no `onMounted` da view, ler `route.query` e popular refs com fallback para defaults se ausentes/inválidos
- **History entries**: só `router.push` quando muda `banca` ou `area` (mudanças "grandes"); resto é `replace`
- **Estado default quando URL vazia**: `gran=assunto, preset=moderado, cross=0, sort=recorrencia, dir=desc, page=1`

### 15.4 Edge cases

- Refresh com URL completa → state restaurado, computeMetrics roda
- Compartilhar URL com banca/área que mentor B não tem importadas → mentor B vê empty state (caso normal)
- Back/forward do browser → state acompanha URL via watch em `route.query`

## 16. Plano de implementação

Cada fase com revisão dupla (regra do projeto). Branch única; commits atômicos por fase.

### Fase 0 — Pré-requisitos

- ✅ Vitest já instalado (PR Modo Lote)
- ✅ Polyfill `crypto.hash` em `vitest.setup.js` (PR Modo Lote)
- ✅ Engine `calculateTrend` disponível em `trendAnalysis.js` (PR Tendências)
- ✅ Estatísticas indexadas via aba Importações (PR Modo Lote)

Nada a fazer. Sanity check: `npm test` deve passar antes de começar.

### Fase 1 — `computeMetrics` + `applyPreset` + testes

- Criar `src/utils/recurrenceAnalysis.js`:
  - `DEFAULT_PRESETS`
  - `computeMetrics(estatisticas, options)` — pipeline completo da §5
  - `applyPreset(items, presetName, customThresholds)` — filtros de §5.3
- Criar `src/utils/__tests__/recurrenceAnalysis.test.js`:
  - Cobertura mínima da §11.1 (recorrência, volume, granularidade, drill-down, cross-banca, slope null para n=1)
  - Edge cases: dataset vazio, banca inexistente, dados malformados, qtd como string

**Saída:** ~250 linhas de função + ~250 linhas de teste; ~25-30 testes novos.

### Fase 2 — Componentes da Análise

- Criar `src/components/analise/AnaliseToolbar.vue` — banca/área/granularidade/preset/cross/contadores/ações
- Criar `src/components/analise/AnaliseTable.vue` — tabela com header sortable, linhas, breadcrumb
- Criar `src/components/analise/AnaliseRow.vue` (opcional, extraído se row ficar complexa)
- Testes unitários: AnaliseTable smoke (renderiza, ordena, seleciona)

**Saída:** componentes desacoplados; ~400 linhas; ~10 testes.

### Fase 3 — Aba `analise` na view

- Adicionar 3ª aba ao seletor de tabs em `EstatisticasView.vue`
- Bloco `<template v-if="activeTab === 'analise'">` que monta `<AnaliseToolbar>` + `<AnaliseTable>` (componentes da Fase 2)
- State refs locais com defaults: `analiseFilter = { banca: '', area: '', gran: 'assunto', discFilter: '', assFilter: '', preset: 'moderado', cross: false, sort: 'recorrencia', dir: 'desc', page: 1 }`
- Computed `analiseItems = computed(() => applyPreset(computeMetrics(store.estatisticas, options), preset))`
- Watchers para resetar drill-down/seleção conforme §7.1
- **Estado inicial**: defaults da §15.3 — sem querystring nesta fase, refs apenas iniciam com defaults; querystring vem na Fase 4

**Saída:** Análise funcional ponta a ponta com state local; testar manualmente com Cebraspe/Procuradoria.

### Fase 4 — Querystring + sincronização

- Implementar §15: read-on-mount, watch-and-replace, validação de params malformados
- `onMounted`: popular state do `route.query`
- Watchers de cada filtro disparam `router.replace({ query: { ...currentQuery, key: value } })`
- Testar back/forward, refresh, link compartilhado

**Saída:** estado da Análise persistido na URL.

### Fase 5 — Outputs (copiar + CSV)

- Botão "Copiar selecionados" usa `navigator.clipboard.writeText(...)` com nomes de itens selecionados (1 por linha)
- Botão "Exportar CSV" gera Blob com BOM UTF-8 + filename `analise-{banca}-{area}-{YYYYMMDD}.csv`
- Toasts de feedback ("Copiado!", "Download iniciado")

**Saída:** outputs funcionais; testar com Excel e LibreOffice.

### Fase 6 — Empty states + UX polish

- 5 empty states da §8
- Tooltip de tendência com R²/n/ano-a-ano
- Badge "+N bancas" com tooltip listando bancas contribuintes
- Warning visual quando soma pct > 50% (badge laranja)
- Ajustes de CSS pra densidade da tabela

**Saída:** UI polida; visual coerente com app.

### Fase 7 — Documentação + validação manual + calibração

- Atualizar `documentation/ESTATISTICAS.md` adicionando seção "Aba Análise"
- Roteiro de validação manual:
  - Cebraspe/Procuradoria com Moderado → tabela popula bem
  - FGV/OAB com Permissivo + cross-banca → comparar com Tendências (que mostrou zero)
  - Drill-down progressivo Disciplina → Assunto → Sub-assunto
  - Copiar e CSV
  - URL compartilhável
- Calibrar presets se necessário (aplica `feedback_calibracao_threshold_empirico`)
- Performance check com `console.time` em datasets reais

**Saída:** sub-projeto 2 entregue, validado e documentado.

---

**Total: 7 fases.** Núcleo (Fases 1-3) cabe num PR; Fases 4-6 podem ser PRs subsequentes ou tudo num PR grande, dependendo da estratégia de revisão. Recomendação: 1 PR só pra simplificar (sub-projeto único).

**Estimativa de esforço:** 2-3 dias de trabalho focado (semelhante ao PR de Tendências corrigida).

**Não muda o backend** — toda a Análise é client-side, baseada nas estatísticas já indexadas.

**Dependências:**
- Fase 1 é pré-requisito de Fases 2-7
- Fase 2 (componentes) é pré-requisito de Fase 3 (a view importa os componentes)
- Fase 3 é pré-requisito de Fases 4, 5, 6 (view tem que existir antes de adicionar querystring/outputs/polish)
- Fases 4, 5, 6 podem rodar em qualquer ordem após Fase 3
- Fase 7 é última (validação manual + calibração + docs)

**Revisão dupla** ao final de cada fase, conforme `feedback_revisao_dupla_por_fase.md`.
