# Aba Foco — Histórico, Arquitetura e Aprendizados

Sessões: 2026-05-11 (criação completa).

Esta aba foi criada do zero em `EstatisticasView.vue` e nos componentes `src/components/foco/`. Tem 6 seções (Presença, Heatmap, Pareto, Normas, Insight via questões reais, Jurisprudência dos Tribunais Superiores) + PDF completo + IA enriquecida.

---

## O que foi entregue

| Seção | Componente / Endpoint | Status |
|-------|-----------------------|--------|
| 1. Presença anual da disciplina | `FocoPresenca.vue` | Entregue |
| 2. Heatmap assunto × ano | `FocoHeatmap.vue` | Entregue |
| 3. Concentração Pareto | `FocoPareto.vue` | Entregue |
| 4. Detecção de normas jurídicas | `FocoNormas.vue` + `utils/normaDetector.js` | Entregue |
| 5. Insight via questões reais | `FocoInsightQuestoes.vue` + `GET /estatisticas/foco/insight` | Entregue |
| 5a. Sentenças de estudo por assunto | sub-agg em `top_assuntos` (resposta=verdadeiro dedupedas) | Entregue |
| 5b. Análise inteligente por IA | `POST /estatisticas/foco/ia` + cache `localStorage` com TTL 30d | Entregue |
| 6. Jurisprudência dos Tribunais Superiores | `FocoJurisprudencia.vue` + `GET /estatisticas/foco/jurisprudencia` | Entregue |
| 6a. Enrich do catálogo `studialex_jurisprudencias` | `_mget` com IDs canônicos | Entregue |
| 6b. Julgados Relacionados (RAG ampliado) | sub-agg `vinculada_top` em `jurisprudencia_vinculada[].id_juris` | Entregue |
| 6c. Sentenças de estudo por julgado | sub-agg `sentencas` por bucket | Entregue |
| 6d. Filtros UI (esconder superados / só com material) | refs + computed em `FocoJurisprudencia.vue` | Entregue |
| PDF completo (6 seções) | `POST /estatisticas/foco/pdf` + `puppeteer` + `focoPdfTemplate.js` | Entregue |

---

## Arquitetura — Seção 6 (Jurisprudência)

### Fonte de dados — relacionamento, não extração

A `jurisprudencia.*` em `questoes_v2` é **denormalização** vinda do catálogo canônico `studialex_jurisprudencias` (24k docs). O vínculo é estabelecido upstream (curadoria humana + IA), e os campos relevantes (`tribunal`, `tipo_decisao`, `numero_identificacao`, `ano_decisao`, `tese_completa`) são copiados pro doc da questão para permitir agregação rápida sem `join`.

Path completo:
- `questoes_raw` (14k) — texto cru, sem juris
- `studialex_jurisprudencias` (24k, 80+ campos por julgado) — fonte da verdade
- `questoes_v2.jurisprudencia` (objeto único, 1355 docs) — denormalizado, vínculo principal
- `questoes_v2.jurisprudencia_vinculada[]` (array, 3242 docs) — RAG matches via `score_similaridade`

### IDs canônicos do catálogo

Padrão: `{tribunal_lower}_{tipo_slug}_{numero}` (+ sufixo opcional para informativos).

Exemplos: `stf_sumula_629`, `stj_recurso_repetitivo_867`, `stf_rg_602`, `stf_sumula_vinculante_10`, `stj_informativo_882_aresp_2_847_102-`.

Helpers em `plan-leges/src/modules/estatisticas/estatistica.service.js`:
- `buildCatalogId({tribunal, tipo, id})` — constrói slug a partir do `jurisprudencia.*` denormalizado. Rejeita números compostos ("MS 23.452", "414.426").
- `parseCatalogId(id)` — extrai `{tribunal, tipoSlug, numero}` via regex `^([a-z]+)_(.+?)_(\d+)(?:_.+)?$`.
- `TIPO_REGISTRY` — fonte única para `label ↔ slug ↔ aliases` (substitui 3 mapas separados).

### Cobertura do enrich

`studialex_jurisprudencias` (8123 docs) tem:
- `fonte_url`: 99.8% ✅ — botão "ver no STF" universal
- `tese_fixada`: 82.2% ✅ — display principal
- `ementa`: 76.6% ✅ — fallback
- `superada`=true: 9.1% ⚠ — flag crítica onde existe
- `palavras_chave`: 9.4%
- `rg_stf_tema`: 3.9%
- `resumo_didatico`: **5.3%** ❌ baixo — sempre preferir `tese_fixada`
- `legislacao_citada_estruturada`: **0%** ❌ vazio — cross-link com lei é IMPOSSÍVEL hoje
- `frequencia_provas` > 0: 6.7% ⚠
- `relevancia_concurso`=true: 6.4% ⚠ (é boolean, não score)

### Padrão Top Julgados (curado)

`focoJurisprudencia` agrega em `jurisprudencia.numero_identificacao` (Súmulas Vinculantes, REs, Súmulas, etc.). Para FGV Direito Constitucional: ~15 top julgados, 33% enriquecidos (Súmulas + Tema RG matcham; REs/MS individuais não — não estão no catálogo).

### Padrão "Julgados Relacionados" (RAG)

Agregação paralela em `jurisprudencia_vinculada[].id_juris.keyword` — bucket keys já são IDs canônicos do catálogo, sem precisar de `buildCatalogId`. Cobertura 2.4× maior para a mesma combinação banca+disciplina.

### Sentenças de estudo

Sub-agg `sentencas` com filter `resposta=verdadeiro` + `top_hits size:3` em cada bucket de assunto e de julgado. Pós-processamento em `dedupSentencas()` normaliza texto (lowercase + sem pontuação + colapsa espaços) e remove duplicatas. Limite final: 3 sentenças únicas por bucket.

Justificativa de design: 100% das questões em `questoes_v2` são `tipo: c/e` (mesmo as bancas ME tem seus enunciados convertidos para afirmações C/E individuais durante ingestão). Para `resposta=verdadeiro`, a `pergunta` JÁ é uma afirmação correta — pronta pra estudo.

A inversão das `resposta=falso` via IA (multiplicaria material por 4) foi adiada — exige validação semântica do "pivô" de cada negação. Hoje só usamos verdadeiras.

### Análise por IA

`POST /estatisticas/foco/ia` recebe `{banca, disciplina, total, tipoCobranca, doutrina_pct, jurisprudencia_pct, topAssuntos, termos}` e internamente busca `focoJurisprudencia` em paralelo. Prompt enriquecido inclui top julgados, tribunais predominantes, tipo decisão, recentes em prova, flag `[SUPERADO]`. Resposta de 3-4 linhas via Claude (max_tokens 350, timeout 30s).

Cache `localStorage` em `pge-smart/src/utils/focoIaCache.js` com:
- TTL 30 dias
- Invalidação por `total` (se o acervo cresce, cache stale é invalidado)
- Auto-cleanup de entrada corrompida
- Chave: `foco-ia:{banca}|{area}|{disciplina}`

---

## PDF completo (6 seções)

`POST /estatisticas/foco/pdf` — body recebe todos os dados do frontend (presenca, pareto, heatmap, normas, analise IA cacheada) + backend busca `focoQuestoesInsight` e `focoJurisprudencia` em paralelo. Renderiza HTML em `focoPdfTemplate.js` e gera PDF via Puppeteer.

Template helpers reusados: `renderJulgadoCard(j, opts)` para top julgados / recentes / vinculados; barras horizontais e verticais consistentes; CSS com `page-break-inside: avoid` nos cards de julgado.

### Otimização do Puppeteer

`plan-leges/src/utils/pdfGenerator.js` mantém um **browser singleton** (lazy + reset on `disconnected`). Page nova por request, fechada no `finally`. `waitUntil: 'load'` (não `networkidle0`) + `document.fonts.ready` com cap de 2s.

Benchmark: PDF subsequente caiu de ~3 s → 516 ms (~1.8 s de economia/PDF após o primeiro).

**Pegadinha resolvida:** `page.pdf()` no Puppeteer v22+ retorna `Uint8Array` (não `Buffer`). `res.send()` do Express trata `Uint8Array` como objeto e corrompe os bytes ("Falha ao carregar documento PDF" no viewer). Fix: `Buffer.from(pdf)` + `res.end(buffer)` + `Content-Length` no controller.

---

## Aprendizados técnicos (consolidado)

### Modelo de dados das estatísticas (Seções 1-4)
- Os docs em `estatisticas_questoes` (mentor) são indexados por **ano**, não por prova.
  Um ano pode não ter dado para uma banca/área — `null` no heatmap, distinto de `0`
  (disciplina presente mas assunto ausente).
- Estrutura do doc:
  ```json
  { "banca": "FCC", "area": "Procuradoria", "ano": 2023,
    "dados": { "disciplinas": [{ "nome": "Dir. Constitucional", "pct": 18.5, "qtd": 37,
      "assuntos": [{ "nome": "Princípios", "pct": 5.2, "qtd": 10 }] }] } }
  ```

### Campo `area` em `questoes_v2` ≠ `area` do mentor
- Mentor seleciona "Procuradorias" (texto). Em `questoes_v2`, `area` é um **ID numérico** ("9", "3").
- **Não filtrar `questoes_v2` por `area`** — o filtro relevante é `banca + disciplina`.
  Documentado em `focoQuestoesInsight` no service.

### Heatmap: conflito border vs border-collapse
- `border-collapse: collapse` em `<table>` ignora/sobrescreve `border` inline em `<td>`.
- Solução: usar `outline` para células nulas. `outline` não participa do colapso.

### Mixed chart no vue-chartjs
- Usar `<Chart type="bar">` genérico e dataset com `type: 'line'`. Não combinar `<Bar>` e `<Line>`.
- Registrar `BarElement, LineElement, PointElement` no mesmo `ChartJS.register(...)`.

### Shannon entropy como métrica de concentração
- `H = -Σ p_i * log2(p_i)`, normalizado por `log2(n)`.
- Ratio < 0.4 → concentrada (priorizar). Ratio > 0.7 → ampla (estudar tudo).

### Regex para normas jurídicas
- Padrões fixos em `normaDetector.js` + `GENERIC_PATTERNS` (Lei N.NNN/AAAA, LC N, EC N).
- Deduplicação: checar `jaCapturada` antes de adicionar item do generic pattern.

### Reset de estado ao trocar disciplina
- Componentes com estado local (`expanded`, `reactive({})`) precisam de `watch(() => props.xxx, reset)`.
- Em `reactive({})`, limpar com `for (const key of Object.keys(obj)) delete obj[key]` em vez de reatribuir.

### Pareto: corte 80% e MAX_BARS
- `maxBars = computed(() => Math.max(cut80.value + 3, 20))` mantém visual consistente com a métrica.

### Watch em `props: Array`
- Vue compara por referência: se o pai recria o array com mesmo conteúdo, o watch dispara.
- Fix: `() => [..., (props.anos || []).join(',')]` em vez de `() => [..., props.anos]`.

### Significant text agg para "termos característicos"
- `significant_text` no campo `pergunta` (text) com `filter_duplicate_text: true` e `min_doc_count: 2`.
- Não confundir com termos NÃO-significativos: vem do score de Elasticsearch, é raridade relativa.

### Singleton de browser Puppeteer
- Use `_browserPromise` (não `_browser`) para evitar race ao detectar `null`.
- Listener `disconnected` reseta o estado quando o Chromium morre.
- Page nova por request, fechada no `finally` (com log de erro de close para observabilidade).
- Não usar `waitUntil: 'networkidle0'` se quiser velocidade — `'load'` + `document.fonts.ready` é deterministicamente mais rápido.

---

## Dívida técnica conhecida (não urgente)

### Refatorações skipadas propositalmente
- **Extrair `<JulgadoCard />` componente Vue** — ~75 linhas duplicadas entre "Julgados Mais Cobrados" e "Julgados Relacionados". Vale extrair quando precisar mexer no rendering de julgado.
- **Helper `persistedTtl` compartilhado** entre `focoIaCache.js` e `composables/useImportDraft.js`. Aguardar o 3º caller antes de extrair.
- **Front enviar `juris` no payload de `focoIA`** — eliminaria a 3ª query ES (`focoIAInsight` re-busca por dentro). Coupling alto entre componentes irmãos (`FocoInsightQuestoes` × `FocoJurisprudencia`); fazer quando latência da IA virar problema medido.

### Bloqueado por dados ausentes no catálogo
- **Cross-link julgado ↔ lei**: `legislacao_citada_estruturada` está 0% populado em `studialex_jurisprudencias`. Quando o catálogo passar a popular, dá pra fechar o ciclo lei↔juris↔questão.
- **Frequência nacional**: `frequencia_provas` só 6.7% populado — não é confiável para ranking.
- **Score de relevância**: `relevancia_concurso` é boolean (não score) e só 6.4% true.

### Item adiado por escopo
- **Inversão das `resposta=falso` via IA** (Fase 3) — multiplicaria material de estudo por 4. Complexidade média: exige IA identificar o "pivô" (palavra/expressão errada) e produzir a forma correta. Hoje usamos só as 326 verdadeiras de FGV/Constitucional, descartando 1049 falsas.

### Itens menores
- `normaDetector.js`: deduplicação pode falhar se uma norma fixa nova tiver nome abreviado que coincida com o prefix do generic pattern.
- `FocoToolbar.vue`: áreas/disciplinas refletem apenas o que o mentor importou — documentar isso na UI (tooltip "com base nos dados importados").
