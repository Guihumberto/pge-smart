# Priorização Determinística — Spec PR6

**Data:** 2026-05-06 (ajustes 2026-05-07 — ver §12 changelog)
**Status:** ✅ Aprovada — pendente implementação
**Escopo:** refator da Fase 2 (priorização) do pipeline de análise — `backend-express` + `boilerplate-vue`

---

## 1. Motivação

A priorização atual ([cargo.service.js linhas 200-329](../../../../backend-express/src/modules/edital-cargos/cargo.service.js#L200)) entrega à IA dados brutos (`qtd`, `pct` por ano) e pede que ela **calcule score, tendência e consistência subjetivamente**. Isso falha em dois cenários reais:

### Cenário A — banca com provas irregulares (ex: FCC fiscal)
Anos sem prova aparecem como `qtd: 0` no histórico. A IA confunde "ano sem prova" com "queda de cobrança". Resultado: tendências falsas, scores subestimados em assuntos que cobram bem mas em provas espaçadas.

### Cenário B — banca com volume estável (ex: FGV-OAB, 240 questões/ano em 3 provas)
A métrica funciona ok aqui, mas comparar absolutos entre bancas com volumes diferentes (50 vs 240 questões/ano) distorce o score quando o usuário consulta histórico misto.

### Problemas concretos da abordagem atual

1. Confunde "ano sem prova" com "queda" — distorce tendência
2. Compara absoluto entre bancas com volumes distintos — distorce frequência
3. Não tem métrica de **presença em provas** (assunto que cai sempre vs caiu uma vez forte)
4. Tendência subjetiva da IA — output não-determinístico para o mesmo input

---

## 2. Decisões aprovadas

| # | Decisão | Status |
|---|---------|--------|
| D1 | Métricas determinísticas calculadas no backend (não mais delegadas à IA) | ✅ |
| D2 | Pesos do score: **45% presença + 35% peso médio + 20% tendência** | ✅ |
| D3 | Janela: últimos **5 anos importados mais recentes** da banca/área (não precisam ser consecutivos), excluindo ano corrente parcial. **Ver D7** | ✅ |
| D4 | Cascata de fallback (substituição, sem mistura): **(1)** banca alvo + área alvo → **(2)** banca alvo + qualquer área → **(3)** outras bancas + área alvo → **(4)** qualquer banca + qualquer área → null. **Ver D7/D8** | ✅ |
| D5 | Mostrar métricas no front (transparência) | ✅ |
| D6 | Pesos hard-coded por agora; configuração via UI fica como melhoria futura | ✅ |
| D7 | **Inferência de gap como "ano sem prova"**: anos faltantes entre o `min` e o `max` dos docs importados na banca/área são tratados como "não houve prova" — não entram no denominador. Ex: docs em {2020, 2023, 2024, 2025} → universo = {2020, 2023, 2024, 2025} (4 anos), não {2020..2025} (6 anos) | ✅ |
| D8 | **Substituição entre níveis da cascata** (não mistura ponderada). Quando o nível 1 tem dados, ignora 2/3/4 mesmo que também tenham. Hierarquia já está ordenada por confiança, mistura piora interpretabilidade do tooltip | ✅ |
| D9 | **Vocabulário UI**: badges/tooltips dizem "provas importadas" (não "anos com prova"), reforçando que a métrica reflete o histórico que **o mentor importou** — campo interno `anos_com_prova` mantém o nome para minimizar diff | ✅ |
| D10 | **Convenção numérica do `pct`**: mantém o formato do índice — `pct` é **porcentagem (0..100)** em todo lugar (storage, helpers, front). Tooltips e templates do front consomem direto, **sem multiplicar por 100**. Refatorar §6 que assumia fração | ✅ |
| D11 | **Sub-assuntos têm métrica própria** (não herdam do assunto pai). `montarHistoricoEnriquecido` desce até `sub_assuntos`. Score, presença, peso_medio, tendência e consistência são calculadas no nível sub-assunto também, com a mesma fórmula | ✅ |
| D12 | **Tendência indefinida quando `\|anos_universo\| < 2`**: convencionar `tendencia = 'estavel'` (slope=0, componente do score = 0.5). Justificativa: 1 ponto não permite regressão; "estável" é o assumido conservador. Aceita o trade-off de ranking neutralizado quando o histórico é raso | ✅ |
| D13 | **Disciplina pós-PR6**: `disc.score = mean(score dos assuntos não-null)` (média aritmética). `mean` representa "quanto vale dedicar tempo à disciplina inteira" — alinhado com o caso de uso de plano de estudo. `max` distorceria empatando disciplinas com 1 assunto top vs disciplinas equilibradas | ✅ |
| D14 | **`fonte_cascata` por disciplina** (`disc.fonte_cascata`), não global — necessário para suportar re-análise parcial (cada disciplina pode terminar em nível diferente da cascata). `_meta.fonte_cascata_majoritaria` no nível global é informativo: a fonte mais frequente entre as disciplinas, usada no header da §6.5 | ✅ |
| D15 | **`_meta` legado preservado**: campos consumidos pelo front antigo (`bancaAlvo`/`temDadosBancaAlvo`/`qtdAnosBancaAlvo`/`bancasSimilares`/`qtdAnosBancaSimilar`) **continuam sendo gravados** para não quebrar templates existentes. Adiciona-se `fonte_cascata_majoritaria`, `schema_priorizacao`, `anosUniverso[]` sem remover os legados | ✅ |
| D16 | **Lookup restritivo cross-disciplina**: se `disc.equivalente_historico === null`, **todos os assuntos** dela recebem `score: null` (e flag `sem_match: true`), independente do que a IA tenha mapeado nos assuntos. Justificativa: simplifica o lookup; o caso "assunto migrou de disciplina entre editais" é raro e o mentor pode editar manualmente. Prompt instrui a IA a respeitar a regra | ✅ |
| D17 | **1 chamada IA com blocos por disciplina**: o prompt de mapping (Fase 2C) envia 1 bloco por disciplina-edital, listando apenas os **nomes** dos candidatos (disciplinas + assuntos + sub-assuntos) do universo daquela disciplina (selecionado via D14). IA mapeia dentro de cada bloco, sem cross-cascata. Mantém custo IA constante (não escala com N de disciplinas) e respeita a cascata por disciplina | ✅ |
| D18 | **Métricas no nível disciplina** calculadas direto sobre `disc.pct/qtd` por ano (mesma fórmula §3.2 aplicada à série da disciplina). `disc.metricas.score` continua **agregado** via mean dos assuntos (D13) — as outras 4 métricas (`presenca`, `peso_medio`, `tendencia`, `consistencia`) são próprias da disciplina, não agregadas. **`peso_medio_normalizado`** tem 2 escopos: `max_peso_assuntos` (entre os assuntos da disciplina) e `max_peso_sub_assuntos` (entre todos os sub-assuntos da disciplina). Cada nível normaliza pelo seu próprio max | ✅ |
| D19 | **Backend sempre escreve `disc.metricas`** mesmo quando `equivalente_historico === null`: nesse caso `disc.metricas = { score: null, anos_com_prova: 0, anos_que_cobraram: 0, fonte_cascata: <nivel>, sem_match: true }`. Banner §6.6 distingue "metricas ausente" (legado pré-PR6) vs "metricas com sem_match" (PR6 sem match — não dispara banner). Inclui `disc.metricas.cobertura_match` (% de assuntos com match histórico) | ✅ |
| D20 | **Atualização do `prio-meta` legado é OBRIGATÓRIA** na Fase 2 (não opcional). Sem isso, a UI mostra vocabulário inconsistente na mesma view (`prio-meta` diz "5 anos" enquanto §6.5 diz "5 provas importadas"). Custo é uma edição em template existente | ✅ |

---

## 3. Métricas determinísticas

### 3.0 Convenções numéricas (D10)

- **`pct` é porcentagem (0..100)** em todos os lugares: storage no índice, helpers, métricas calculadas e tooltips do front. Front consome direto, **sem multiplicar por 100**.
- `presenca` é **fração 0..1** (`anos_que_cobraram / anos_com_prova`).
- `score` é **fração 0..1** (combinação ponderada de componentes 0..1, ver §3.3).
- `peso_medio_normalizado` é **fração 0..1** (ver §3.3).
- `tendencia_slope` é **pp/ano** (pontos percentuais por ano).
- Onde a UI exibir como porcentagem: `presenca` e `score` multiplicam por 100; `peso_medio` não.

### 3.1 Universo de anos (regra de gap-skip — D7)

Antes de calcular qualquer métrica, define-se o **universo** de anos relevantes para a banca/área da cascata vigente (selecionada por `selecionarUniversoCascata` — §5.1):

1. Pega todos os docs do nível ativo e extrai o conjunto único de anos.
2. **Exclui ano corrente** se for parcial (mostrado só no tooltip, ver §3.5).
3. **Ordena descendente, pega 5 mais recentes, reordena ascendente** para uso em regressão linear.
4. Esse conjunto final = `anos_com_prova` (campo interno) = "provas importadas" (UI — D9). Gaps preservados intencionalmente (D7).

Exemplo: docs FCC fiscal em {2010, 2015, 2018, 2020, 2024, 2025, 2026-parcial} → universo = {2015, 2018, 2020, 2024, 2025}.

### 3.2 Métricas (disciplina + assunto + sub-assunto — D11/D18)

Calculadas para cada **disciplina, assunto e sub-assunto** com a mesma fórmula. Cada nível tem métricas próprias (D18):
- **Disciplina** usa a série `disc.pct/qtd` por ano direto do índice (não agrega assuntos para `presenca`/`peso_medio`/`tendencia`/`consistencia` — só `score` é agregado via mean dos assuntos, D13).
- **Assunto** usa `ass.pct/qtd` por ano.
- **Sub-assunto** usa `sub.pct/qtd` por ano.

| Métrica | Fórmula | O que captura |
|---------|---------|---------------|
| `presenca` | `anos_que_cobraram / anos_com_prova` (fração 0..1) | "Sempre cai" vs "caiu uma vez" |
| `peso_medio` | `mean(pct[ano])` apenas anos com `qtd > 0` (porcentagem 0..100) | Quão pesado o tema é quando aparece |
| `peso_no_universo` | `presenca × peso_medio` | Importância "real" considerando ambas |
| `tendencia` | regressão linear de `pct[ano]` (ver §3.4) | Crescente/estável/decrescente |
| `consistencia` | `1 - stdev(pct) / max(0.01, mean(pct))` nos anos com prova; clamp em [0, 1] | Baixa volatilidade entre provas |

**Casos extremos:**
- `anos_que_cobraram === 0` (tema mapeado mas nunca cobrado no universo): `presenca = 0`, `peso_medio = 0`, `tendencia = 'estavel'` (D12), `consistencia = 1` (zero volatilidade trivial). Score sai 0.10 (só componente neutro de tendência). **Diferente de score null** (que sai quando IA não encontrou `equivalente_historico`).
- `mean(pct) === 0` em consistência: `max(0.01, 0)` evita divisão por zero — denominador 0.01 dá `consistencia ≈ 1` para temas nunca cobrados (tratado pela cláusula anterior).
- `stdev` em série constante: 0 → `consistencia = 1`.

### 3.3 Score final

```
score = 0.45 × presenca
      + 0.35 × peso_medio_normalizado
      + 0.20 × componente_tendencia
```

**`peso_medio_normalizado` (D18 — escopos separados por nível):**

Dois max-pesos calculados por disciplina, no universo selecionado para a disciplina pela cascata:
- `max_peso_assuntos = max(peso_medio dos assuntos da disciplina)` — usado para normalizar **assuntos**.
- `max_peso_sub_assuntos = max(peso_medio dos sub-assuntos da disciplina, varrendo todos os assuntos)` — usado para normalizar **sub-assuntos**.

Para a **disciplina** em si, `peso_medio_normalizado = 1.0` (ela é o nível mais externo do escopo — não há "max_peso_disciplinas" no PR6; comparações inter-disciplinares são feitas via `disc.score` agregado).

Regras:
- Se `max_peso_<nivel> === 0`: `peso_medio_normalizado = 0` (evita NaN em 0/0).
- Se `max_peso_<nivel> > 0`: `peso_medio_normalizado = peso_medio / max_peso_<nivel>` (fração 0..1).
- **Invariante:** cada nível (assuntos da disciplina; sub-assuntos da disciplina) tem ao menos 1 elemento com `peso_medio_normalizado = 1.0`.

Implicação aceita: comparação inter-disciplinar de score do assunto X de disc A vs assunto Y de disc B deve ser interpretada como "ranking dentro do contexto da disciplina + presença + tendência", não como prevalência absoluta.

**`componente_tendencia`:**
- `tendencia_score`: `crescente = +1`, `estavel = 0`, `decrescente = -1`.
- `componente_tendencia = (tendencia_score + 1) / 2` → `crescente = 1`, `estavel = 0.5`, `decrescente = 0`.

**Disciplina (D13 + D16):** `disc.score = mean(score dos assuntos não-null)`. Casos:
- Disciplina sem `equivalente_historico` (D16): **todos** os assuntos viram `score: null`, `disc.score = null`, flag `sem_match: true` no `disc.metricas`.
- Disciplina com equivalente, mas todos os assuntos mapeados retornaram `score: null` por sua vez (raro): `disc.score = null`.
- Caso geral: `mean` ignora null. Mistura de "raro" (0.10) + cobertos (0.55) entra normalmente. **Comportamento aceito (I1)**: para sinalizar enviesamento, `disc.metricas.cobertura_match = assuntos_com_match / total_assuntos` é exibido no header (§6.5) — ex: "Direito Tributário: 70% dos assuntos com match histórico".

### 3.4 Tendência calculada

- Pega os pares `[ano, pct]` apenas dos anos com prova **do tema** (anos onde `qtd > 0`).
- **Regressão linear** `slope = cov(ano, pct) / var(ano)` usando ano calendário como X. **Implicação aceita**: gaps preservados (D7) puxam slope para mais conservador — é intencional, mantém interpretabilidade ("crescimento por ano calendário", não "por prova").
- Mapeamento: `slope >= +0.3 pp/ano` → `crescente`; `slope <= -0.3 pp/ano` → `decrescente`; senão `estavel`.
- **Caso `|anos com qtd > 0| < 2` (D12):** retorna `tendencia = 'estavel'`, `slope = 0`. Aceito o trade-off de ranking neutralizado quando histórico é raso.

### 3.5 Caso "ano em curso"

Se `dayjs().year() === stats.ano`, **excluir** do cálculo de presença/tendência/consistência. Justificativa: ano não terminou, dados parciais distorcem média.

UI (Q1 confirmado): exibir "Já houve N questões de X em 2026 (parcial)" no tooltip, sem afetar score.

---

## 4. Cascata de fallback (4 níveis, substituição — D8)

```
1. Banca ALVO + área ALVO tem ≥ 1 doc importado?
   ├── SIM → usa só este universo (100%)                ← ideal
   └── NÃO → vai para 2

2. Banca ALVO + qualquer área tem ≥ 1 doc importado?
   ├── SIM → usa só este universo (100%)                ← preserva estilo da banca
   └── NÃO → vai para 3

3. Outras bancas + área ALVO tem ≥ 1 doc importado?
   ├── SIM → usa só este universo (100%)                ← preserva relevância dos temas
   └── NÃO → vai para 4

4. Qualquer banca + qualquer área tem ≥ 1 doc importado?
   ├── SIM → usa só este universo (100%)                ← último recurso
   └── NÃO → score null, badge "sem dados históricos"
```

**Substituição, não mistura (D8)**: a primeira camada com dados é usada exclusivamente. Não combina níveis ponderados (sem 70/30). Isso simplifica o tooltip e mantém o score interpretável: "este score veio do nível N da cascata".

**Aviso explícito sobre nível 4 (último recurso):** quando a cascata cai em "qualquer banca, qualquer área", o universo mistura provas heterogêneas (FCC fiscal 2025 + CESPE judicial 2024 + FGV OAB 2023). As métricas resultantes refletem prevalência geral do tema no histórico importado, **não fenômenos da banca/área alvo**. UI exibe aviso forte no header (§6.5). Aceito como trade-off explícito — alternativa é score null, que é pior para o mentor.

**`fonte_cascata` por disciplina (D14)**: cada `disc.fonte_cascata` registra o nível usado para aquela disciplina (`'banca_alvo_area_alvo' | 'banca_alvo_qualquer_area' | 'outras_bancas_area_alvo' | 'qualquer'`). Re-análise parcial pode deixar disciplinas em níveis diferentes — esperado.

**`_meta.fonte_cascata_majoritaria`**: campo agregado no `_meta` global = a fonte que mais aparece entre as disciplinas. Front usa para exibir um aviso curto no header (§6.5); detalhes por disciplina ficam visíveis em hover/expand.

`area` aqui = campo `area` do edital (ex: "fiscal", "judicial", "OAB"). Stats do índice `metas_leges_estatisticas_questoes` têm campo `area`. **Normalização (R2)**: comparar com `.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')` para tolerar variações de acentuação/caixa entre docs antigos e edital.

---

## 5. Mudanças no backend

### 5.1 Novos helpers de seleção de universo (D7+D8)

**`selecionarUniversoCascata(allStats, { bancaAlvo, areaAlvo })`** — função pura que aplica a cascata de 4 níveis. Retorna `{ docs, fonte }` onde `fonte` é uma das 4 strings da §4.

```js
function selecionarUniversoCascata(allStats, { bancaAlvo, areaAlvo }) {
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  const bA = norm(bancaAlvo), aA = norm(areaAlvo)

  const n1 = allStats.filter(s => norm(s.banca) === bA && norm(s.area) === aA)
  if (n1.length) return { docs: n1, fonte: 'banca_alvo_area_alvo' }

  const n2 = allStats.filter(s => norm(s.banca) === bA)
  if (n2.length) return { docs: n2, fonte: 'banca_alvo_qualquer_area' }

  const n3 = allStats.filter(s => norm(s.area) === aA)
  if (n3.length) return { docs: n3, fonte: 'outras_bancas_area_alvo' }

  if (allStats.length) return { docs: allStats, fonte: 'qualquer' }
  return { docs: [], fonte: null }
}
```

**Performance (N4):** `selecionarUniversoCascata` é chamada **uma vez por disciplina** (D14). Para edital com N disciplinas e |allStats|=200, complexidade é O(N×|allStats|). Otimização opcional: pré-normalizar `allStats` (`{...doc, _bancaNorm, _areaNorm}`) **uma vez** em `analisarConteudo` antes do loop por disciplina. Não é necessário para tamanhos atuais (~5k iterações totais para edital típico).

**`construirJanelaAnos(docs, { agora = dayjs() })`** — aplica D7 (gap-skip) + cap de 5:

```js
function construirJanelaAnos(docs, { agora = dayjs() } = {}) {
  const anoCorrente = agora.year()
  const anosImportados = [...new Set(docs.map(d => d.ano))]
    .filter(a => a < anoCorrente)        // D7: ano corrente parcial fica de fora
    .sort((a, b) => b - a)                // descendente
    .slice(0, 5)                          // cap de 5 mais recentes (não consecutivos)

  const anoCorrenteQtdParcial = docs
    .filter(d => d.ano === anoCorrente)
    .reduce((acc, d) => acc + (d.dados?.disciplinas || []).reduce((s, x) => s + (x.qtd || 0), 0), 0)

  return {
    anos: anosImportados.sort((a, b) => a - b), // ascendente para regressão
    anoCorrenteExcluido: anoCorrenteQtdParcial > 0,
    anoCorrenteQtdParcial,
  }
}
```

### 5.2 Novo helper `montarHistoricoEnriquecido(docs, anos)`

Substitui `montarHistorico` ([cargo.service.js linha 343](../../../../backend-express/src/modules/edital-cargos/cargo.service.js#L343)). Recebe **só os docs do universo selecionado** (output de 5.1) + a lista `anos` (output de `construirJanelaAnos`). Retorna estrutura com 3 níveis (disciplina → assunto → sub-assunto), todos com métricas próprias (D11).

`pct` é mantido como **porcentagem 0..100** em todo lugar (D10).

```js
{
  "Direito Tributário": {
    total: { /* qtd, pct por ano */ },
    metricas: {
      presenca: 1.0,
      peso_medio: 18.0,                 // porcentagem (D10): 18% das questões em média
      peso_no_universo: 18.0,
      tendencia: 'estavel',
      tendencia_slope: 0.05,
      consistencia: 0.92,
      score: 0.74,                      // fração 0..1 — agregada via mean dos assuntos (D13)
      anos_com_prova: 5,                // |universo| (D7 + cap 5)
      anos_que_cobraram: 5,
      anos_corrente_excluido: true,
      anos_corrente_qtd_parcial: 3,
    },
    assuntos: {
      "Obrigação tributária": {
        total: { /* qtd, pct por ano */ },
        metricas: { /* mesma estrutura */ },
        sub_assuntos: {
          "Lançamento": {
            total: { /* qtd, pct por ano */ },
            metricas: { /* mesma estrutura — D11 */ },
          }
        }
      }
    }
  }
}
```

**Guards de robustez:**
- `pct ?? 0`, `qtd ?? 0`, `disc.assuntos ?? []`, `ass.sub_assuntos ?? []`.
- Docs com `dados.disciplinas` não-array → ignorados silenciosamente (não derruba o cálculo).
- Disciplina sem nenhum assunto → métricas calculadas só no nível disciplina (`assuntos: {}`).

**Score na disciplina (D13):** `disc.metricas.score = mean(score dos assuntos não-null)`. Se todos os assuntos retornaram score null → `disc.score = null`.

**Assunto e sub-assunto são independentes:** cada um calcula seu próprio score sobre seus próprios `pct`/`qtd` por ano. Sub-assuntos NÃO agregam para cima — o score do assunto pai é calculado direto a partir das métricas do próprio assunto (não é mean dos sub-assuntos). Isso preserva o significado: "este assunto cai 18% das provas" é independente de "o sub-assunto X dentro dele cai 4%".

### 5.3 `analisarConteudo` — pipeline atualizado

Antes (atual): IA calcula score/tendência. Agora:

```
Fase 1 — Classificação (IA)
   tipo_fonte, leis_referencia, carga_estimada_horas
                ↓
Fase 2A — Seleção de universo (backend, determinístico)
   selecionarUniversoCascata(allStats, { bancaAlvo, areaAlvo })  ← D8
                ↓
   construirJanelaAnos(docs)                                     ← D7 + cap 5
                ↓
Fase 2B — Cálculo (backend)
   montarHistoricoEnriquecido(docsUniverso, anosJanela)
                ↓
Fase 2C — Mapping (IA)
   Para cada assunto do edital:
     - Encontre equivalente_historico (string com nome canônico no histórico)
     - Retorne o NOME equivalente, NADA MAIS (não calcula nada)
                ↓
Fase 2D — Merge (backend)
   Pega métricas de historicoEnriquecido[equivalente_historico]
   Injeta score/tendência/peso_medio/presenca/etc no output
   Persiste _meta.fonte_cascata para transparência
                ↓
   Resultado: priorização com score determinístico
```

### 5.4 Prompt — 1 chamada IA com blocos por disciplina (D17)

Uma única chamada `chamarIA` consolida o mapping de TODAS as disciplinas do edital. O prompt é construído com **um bloco por disciplina-edital**, listando apenas os **nomes** dos candidatos do universo daquela disciplina (D14). IA mapeia dentro de cada bloco — nunca cross-cascata, nunca cross-disciplina.

**Sistema:**
```
PRIO_SYSTEM = `Você é um especialista em mapeamento semântico de assuntos jurídicos.
Sua ÚNICA tarefa: para cada disciplina/assunto/sub-assunto do edital, encontrar o
equivalente nos candidatos fornecidos para AQUELA disciplina (cada disciplina tem
sua própria lista de candidatos).

REGRAS:
1. NÃO calcule scores, tendências ou frequências — só mapeamento de nomes.
2. Mapeie APENAS dentro do bloco da disciplina-edital correspondente. Nunca use
   candidatos de outra disciplina-edital.
3. Se a disciplina-edital não tem equivalente direto, retorne disciplina.equivalente_historico = null
   E TODOS os assuntos/sub-assuntos dela com equivalente_historico = null (regra D16).
4. Se a disciplina tem equivalente mas um assunto específico não, retorne aquele assunto com null.

Apenas retorne o NOME do equivalente (string) ou null.`
```

**User (formato):**
```
EDITAL:

DISCIPLINA "Direito Tributário" (cascata: banca_alvo_area_alvo)
  Candidatos disciplina: ["Direito Tributário", "Tributário"]
  Candidatos assuntos: ["Obrigação tributária", "Crédito", "Lançamento", "ICMS"]
  Candidatos sub-assuntos: ["Suspensão", "Extinção", "Imunidade"]
  Assuntos do edital:
    - Obrigação tributária
      sub: [Lançamento, Suspensão]
    - Crédito tributário
      sub: [Extinção]

DISCIPLINA "Inglês Técnico" (cascata: qualquer)
  Candidatos disciplina: ["Língua Inglesa", "Inglês"]
  Candidatos assuntos: ["Reading", "Vocabulary", "Grammar"]
  Candidatos sub-assuntos: []
  Assuntos do edital:
    - Compreensão de texto técnico
    - Vocabulário jurídico inglês
```

**Formato saída IA:**
```
{"disciplinas":[
  {"nome":"Direito Tributário","equivalente_historico":"Direito Tributário","assuntos":[
    {"nome":"Obrigação tributária","equivalente_historico":"Obrigação tributária","sub_assuntos":[
      {"nome":"Lançamento","equivalente_historico":"Lançamento"},
      {"nome":"Suspensão","equivalente_historico":"Suspensão"}
    ]},
    {"nome":"Crédito tributário","equivalente_historico":"Crédito","sub_assuntos":[
      {"nome":"Extinção","equivalente_historico":"Extinção"}
    ]}
  ]},
  {"nome":"Inglês Técnico","equivalente_historico":"Língua Inglesa","assuntos":[
    {"nome":"Compreensão de texto técnico","equivalente_historico":"Reading","sub_assuntos":[]},
    {"nome":"Vocabulário jurídico inglês","equivalente_historico":"Vocabulary","sub_assuntos":[]}
  ]}
]}
```

`tipo_fonte`/`leis_referencia`/`carga_estimada_horas` continuam vindo da Fase 1 (já é determinístico hoje).

### 5.5 Novo helper `mergeMetricasNoOutput(iaOutput, historicosPorDisc, classificacao, fontesPorDisc)`

`historicosPorDisc` é um mapa `{ nomeDiscEdital: historicoEnriquecido }` — um histórico por disciplina-edital, calculado sobre o universo da cascata daquela disciplina (D14).

Para cada disciplina do edital:

1. Pega `disc.equivalente_historico` da IA. Se **null** → todos os assuntos viram `score: null`, `disc.metricas = { score: null, anos_com_prova: <janela>, anos_que_cobraram: 0, fonte_cascata: <nivel>, sem_match: true, cobertura_match: 0 }` (D16/D19). Pula iteração nos assuntos.
2. Pega métricas da disciplina via `historicosPorDisc[discEdital.nome][disc.equivalente_historico].metricas` (nível disciplina — D18).
3. Para cada assunto:
   - Pega `ass.equivalente_historico`. Se null → `ass.score = null` (sem badge "Sem match" — ver §6.4).
   - Senão, busca em `historicosPorDisc[discEdital.nome][disc.equivalente_historico].assuntos[ass.equivalente_historico].metricas`.
4. Mesmo passo recursivo para sub-assuntos.
5. **`disc.score`** (D13): `mean(score dos assuntos não-null)`. **`disc.metricas.cobertura_match`** (I1/D19): `assuntos_com_match / total_assuntos`.
6. Anota `disc.fonte_cascata` (de `fontesPorDisc[discEdital.nome]`).
7. Calcula `_meta.fonte_cascata_majoritaria = mode(disc.fonte_cascata)`.

**Estados possíveis de score** (importante para o front):
| Estado | Quando acontece | Score | Flag/Badge UI |
|--------|----------------|-------|---------------|
| Mapeado e cobrado | IA achou equivalente, `anos_que_cobraram > 0` | número 0..1 | (nenhum) |
| Mapeado, amostra pequena | `anos_que_cobraram === 1` | número 0..1 | "Amostra pequena" |
| Mapeado mas nunca cobrado | IA achou equivalente, `anos_que_cobraram === 0` | 0.10 (só componente neutro de tendência) | "Mapeado mas nunca cobrado" |
| Sem match (assunto) | IA retornou `equivalente_historico: null` para o assunto | `null` | "Sem match no histórico" |
| Sem match (disciplina inteira — D16) | IA retornou `disc.equivalente_historico: null` | `null` em todos | `disc.metricas.sem_match: true`; badge global na disciplina |
| Cargo legado (PR4/PR5) | Disciplina **não tem** `metricas` no doc (campo ausente) | mantém score antigo da IA | banner amarelo §6.6 |

**Diferença sutil mas crítica:** "Sem match" PR6 grava `disc.metricas` com `sem_match: true` — não é o mesmo que cargo legado (que não tem `metricas` em absoluto). §6.6 distingue.

**Nullidade em sem_match (ajuste pós-implementação Fase 1, 2026-05-07):** quando `sem_match: true`, os campos `tendencia`, `tendencia_slope` e `consistencia` ficam **`null`** (não `'estavel'`/`0`/`1`). Justificativa: distinguir "sem sinal" (null) de "estável real" (`'estavel'` calculado a partir de dados). Mesma regra propaga para assunto/sub-assunto sem match (`metricas: null` no nó, mas para casos onde o sub-nó está sob disc com match, o `metricas` do sub fica null e o `tendencia` no output do nó também é null). Front (§6.3, §6.4) precisa tolerar.

**`_meta` final** (D15 — preservar legados):
```js
priorizacao._meta = {
  // legados (mantidos para front antigo):
  bancaAlvo, areaAlvo,
  bancasSimilares,                    // mantido — derivado de docs do nível 3
  temDadosBancaAlvo,                  // boolean — true se nível 1 entrou em ≥1 disciplina
  qtdAnosBancaAlvo,                   // |universo do nível 1|
  qtdAnosBancaSimilar,                // |universo do nível 3|
  classificacaoLocal,                 // boolean — fase 1 IA rodou OK
  processadoEm,
  // novos PR6:
  schema_priorizacao: 'deterministic_v1',
  fonte_cascata_majoritaria: 'banca_alvo_area_alvo' | ...,
  anosUniverso: [2015, 2018, 2020, 2024, 2025], // do nível majoritário
}
```

---

## 6. Mudanças no frontend

**Convenção de unidades nos templates (D10):** `peso_medio` está em **porcentagem 0..100** — usar direto (`{{ peso_medio.toFixed(1) }}%`), **não multiplicar por 100**. `presenca` e `score` estão em fração 0..1 — multiplicar por 100 quando exibir como %. `consistencia` é fração 0..1 também.

### 6.1 Novo badge "Presença" (vocabulário D9)

Adicionar ao lado de score/tendência em `CargoConteudoView.vue`. Texto da UI usa **"provas importadas"** em vez de "anos com prova" (D9).

```html
<span
  v-if="ass.metricas"
  class="prio-presenca prio-info"
  :title="`Presente em ${ass.metricas.anos_que_cobraram} de ${ass.metricas.anos_com_prova} provas importadas. Peso médio ${ass.metricas.peso_medio.toFixed(1)}%`"
>
  P:{{ ass.metricas.anos_que_cobraram }}/{{ ass.metricas.anos_com_prova }}
</span>
```

### 6.2 Tooltip enriquecido no score

```html
<span class="prio-score" :title="tooltipScore(ass)">{{ score }}</span>
```

```js
function tooltipScore(item) {
  const m = item.metricas
  if (!m) return `Score: ${item.score != null ? (item.score * 100).toFixed(0) : '—'}`
  return `Score: ${(item.score * 100).toFixed(0)} — Presença ${(m.presenca * 100).toFixed(0)}% × Peso ${m.peso_medio.toFixed(1)}% × Tendência ${item.tendencia}`
}
```

### 6.3 Linha "Métricas detalhadas" expandível

Dentro de `.prio-assunto__details`, adicionar bloco colapsado por default. Renderiza só quando `ass.metricas` existe (cargo parcialmente migrado tolera ausência — ver §6.5).

```html
<details v-if="m" class="prio-metricas-detalhes">
  <summary>Métricas detalhadas</summary>
  <div>
    <span>Presente em {{ m.anos_que_cobraram }} de {{ m.anos_com_prova }} provas importadas</span>
    <span>Peso médio: {{ m.peso_medio.toFixed(1) }}% das questões por prova</span>
    <span v-if="m.tendencia">Tendência: {{ tendenciaLabel(m.tendencia) }} ({{ m.tendencia_slope?.toFixed(2) }} pp/ano)</span>
    <span v-else>Tendência: — (sem sinal histórico)</span>
    <span v-if="m.consistencia != null">Consistência: {{ (m.consistencia * 100).toFixed(0) }}%</span>
    <span v-if="m.anos_corrente_qtd_parcial">Ano corrente excluído (parcial: {{ m.anos_corrente_qtd_parcial }} questões)</span>
  </div>
</details>
```

**Nota (D16):** quando `sem_match: true`, `tendencia`, `tendencia_slope` e `consistencia` ficam null (decisão pós-Fase 1). Templates devem usar `v-if` para ocultar linhas, não exibir `'estavel'` falso ou `null pp/ano`.

### 6.4 Badges de qualidade de amostra

Para sinalizar visualmente os estados ambíguos da §5.5 (estados de score):

| Condição | Badge | Tooltip |
|----------|-------|---------|
| `m.anos_que_cobraram === 0` (mapeado mas nunca cobrado) | "Mapeado · nunca cobrado" — azul-cinza | "Tema existe no histórico mas não foi cobrado nas N provas importadas. Score baixo até primeira cobrança." |
| `m.anos_que_cobraram === 1` | "Amostra pequena" — amarelo-claro | "Apenas 1 prova no universo cobrou este tema. Score volátil até consolidar mais histórico." |
| `score === null` (assunto sem match) | "Sem match" — cinza | "IA não achou equivalente no histórico. Mentor pode revisar o mapeamento manualmente." |
| `disc.metricas.sem_match === true` (disciplina sem match D16) | "Disciplina sem match" — cinza, no header da disciplina | "Disciplina não tem equivalente no histórico desta cascata. Todos os assuntos sem score." |
| `m.anos_corrente_qtd_parcial > 0` | (sem badge — só no tooltip do score, §6.2) | — |

### 6.5 Header da priorização — fonte da cascata (D14) + cobertura de match (D19)

Mostra dois sumários agregados:

```js
const fontes = priorizacao.disciplinas.map(d => d.fonte_cascata).filter(Boolean)
const counts = countBy(fontes)
const majoritaria = priorizacao._meta.fonte_cascata_majoritaria
const coberturaMedia = mean(priorizacao.disciplinas.map(d => d.metricas?.cobertura_match ?? 1))
```

**Aviso de fonte:**
- **Todas em nível 1** (`counts.banca_alvo_area_alvo === fontes.length`): sem aviso (caso ideal)
- **Mistura, mas majoritária é nível 1**: aviso curto "X de N disciplinas usaram fontes alternativas — clique para detalhes"
- **Majoritária ≠ nível 1**: aviso forte com texto da majoritária:

| `fonte_cascata_majoritaria` | Texto |
|-----------------------------|-------|
| `banca_alvo_qualquer_area` | "Histórico desta área é esparso para a banca; maioria usa dados de outras áreas da mesma banca" |
| `outras_bancas_area_alvo` | "Histórico desta banca é esparso; maioria usa dados de outras bancas na mesma área" |
| `qualquer` | "Histórico muito esparso; maioria usa média geral de bancas/áreas heterogêneas — interpretar com cautela" |

**Cobertura de match (D19):** abaixo do aviso de fonte, exibir "Cobertura média de match: X%". Quando uma disciplina é expandida, mostrar sua cobertura individual: "Direito Tributário: 70% dos assuntos com match histórico" — sinaliza que `disc.score` pode estar enviesado pela exclusão de assuntos sem match.

Detalhes por disciplina (qual nível cada uma usou) ficam em hover/expand do header.

### 6.6 Compatibilidade com cargos antigos e parcialmente migrados (Q2: clique)

Cargos com priorização gerada **antes** do PR6 não terão `metricas` em algumas (ou todas) disciplinas. Tratamento:

- **Critério do banner:** alguma disciplina **sem o campo `metricas`** no doc. Cargos PR6 sem match (D16/D19) **têm `metricas`** com `sem_match: true` — esses NÃO disparam o banner (são cargos PR6 corretos, só não têm equivalente).

```js
const temDisciplinaLegada = priorizacao.disciplinas.some(d => !d.metricas)
// Cargo PR6 sem match (disc.metricas.sem_match === true) não conta como legado.
```

- **Banner amarelo (Q2 — manual):** "Esta priorização tem disciplinas analisadas com a versão antiga. [Recalcular tudo] para usar métricas determinísticas em todas." Botão dispara `analisarConteudo` em todas as disciplinas. **Não recalcula automaticamente.**
- **Renderização robusta:** templates de §6.1, §6.2, §6.3, §6.4 já têm `v-if="ass.metricas"` ou check no `tooltipScore`. Disciplinas/assuntos sem `metricas` mantêm o `score` legado da IA, sem badges novos.

### 6.7 Atualização do `prio-meta` legado (D20 — OBRIGATÓRIO)

O template em [CargoConteudoView.vue:373-377](../../src/views/CargoConteudoView.vue#L373-L377) hoje mostra "(N anos)" e "Similares: ...". Sem update, a UI exibe vocabulário inconsistente lado-a-lado: header §6.5 diz "5 provas importadas", `prio-meta` diz "5 anos". Inaceitável (D20).

```html
<span v-if="priorizacaoMeta" class="prio-meta">
  Banca alvo: <strong>{{ priorizacaoMeta.bancaAlvo }}</strong>
  <template v-if="priorizacaoMeta.qtdAnosBancaAlvo > 0">
    · {{ priorizacaoMeta.qtdAnosBancaAlvo }} provas importadas
  </template>
  <template v-else>(sem histórico)</template>
  <span v-if="priorizacaoMeta.fonte_cascata_majoritaria && priorizacaoMeta.fonte_cascata_majoritaria !== 'banca_alvo_area_alvo'">
    · Fonte alternativa em uso (ver header)
  </span>
</span>
```

Conceito "Similares" pode ser removido — com cascata sem mistura (D8), `bancasSimilares` é informativo apenas e não afeta os cálculos. Decisão de UI: manter visível como "informação extra" ou ocultar quando `fonte_cascata_majoritaria === 'banca_alvo_area_alvo'`.

---

## 7. Testes de aceitação

| # | Cenário | Esperado |
|---|---------|----------|
| T1 | FCC fiscal, docs em {2020, 2023, 2024, 2025}, assunto presente em 2020 e 2024 | Universo = 4 anos (D7 — pula 2021/2022); presença = 2/4 = 0.5; `fonte_cascata = banca_alvo_area_alvo` |
| T2 | FGV OAB, 3 anos consecutivos, assunto em todos, peso médio 5% | Presença 1.0; tendência estável; cap 5 não atinge (só tem 3) |
| T3 | Ano corrente (2026) com prova parcial | Excluído de presença/tendência/consistência; tooltip mostra `anos_corrente_qtd_parcial` |
| T4 | Mais de 5 anos importados, ex {2010, 2015, 2018, 2020, 2024, 2025} | Universo = 5 mais recentes = {2015, 2018, 2020, 2024, 2025}; 2010 fora |
| T5 | FCC fiscal sem dados, FCC judicial tem dados | Cascata cai para nível 2 (`banca_alvo_qualquer_area`); header exibe aviso correspondente |
| T6 | Banca-alvo sem dados em nenhuma área, mas outras bancas cobrem a área | Cascata nível 3 (`outras_bancas_area_alvo`) |
| T7 | Nenhuma banca tem a área, mas há docs de outras áreas | Cascata nível 4 (`qualquer`); aviso "histórico esparso" |
| T8 | Sem nenhum doc no índice | Score `null`, badge "sem dados históricos" |
| T9 | Cargo PR6 — recalcular → métricas mudam? | **Métricas determinísticas (presença, peso, tendência, score) NÃO mudam** dado o mesmo universo. **`carga_estimada_horas` e `tipo_fonte` podem variar** porque vêm da Fase 1 IA (não-determinística) — isso afeta `sugestao_semana` em `recalcularSemanas`. Trade-off conhecido |
| T10 | Cargo antigo (PR4/PR5) | Banner amarelo "Recalcular para métricas determinísticas"; **não recalcula auto** (Q2). Critério: alguma `disc.metricas` ausente |
| T11 | Tooltip no score | Mostra "Score: X — Presença Y% × Peso Z.Z% × Tendência W" (`peso_medio` direto, sem `× 100` — D10) |
| T12 | Detalhes expandidos | Mostra "N de M provas importadas", peso médio em %, slope em pp/ano, consistência em % |
| T13 | Score acoplado ao **`reorganizarPriorizacao`** (preview) | `cortar_conteudo` corta primeiro menores scores ([cargo.service.js:507](../../../../backend-express/src/modules/edital-cargos/cargo.service.js#L507)). Validar que com PR6 o corte respeita determinismo |
| T14 | Score acoplado ao **`aplicarReorganizacao`** (persist) | `cargo.service.js:596` faz o mesmo sort. Cargo persiste com lista coerente |
| T15 | Sub-assunto com métrica própria (D11) | `metricas` populado no nível sub-assunto; tooltip do sub-assunto mostra suas próprias presença/peso/tendência (não herda do assunto pai) |
| T16 | Cargo com mistura PR6 + legado (re-análise parcial) | 2 disciplinas PR6 (têm `metricas`), 5 legadas (sem `metricas`) — banner aparece, badges novos só nas 2 PR6, score legado persistido nas 5; tooltip de score nas legadas usa fallback `(item.score * 100).toFixed(0)` |
| T17 | Tema mapeado (`equivalente_historico !== null`) mas com `anos_que_cobraram === 0` | Score = 0.10 (não null), badge "Raro" |
| T18 | `\|anos_universo\| === 1` (banca importada só 1 ano) | `tendencia = 'estavel'`, slope = 0, score component tendência = 0.5 (D12); presença e peso continuam válidos |
| T19 | Cascata mista por disciplina (D14) | Disc A em nível 1, Disc B em nível 3; `disc.fonte_cascata` reflete; `_meta.fonte_cascata_majoritaria = 'banca_alvo_area_alvo'` (mode); header §6.5 mostra "X de N disciplinas usaram fontes alternativas" |
| T20 | `pct` é porcentagem 0..100 (D10) | Tooltip mostra `peso_medio.toFixed(1)` direto. Conferir nenhum `* 100` espúrio em `peso_medio` no template |
| T21 | Sub-assunto X tem `peso_medio = 0.5%` e é o maior sub-assunto da disciplina; assunto pai pesa 22% (D18) | `sub_X.peso_medio_normalizado === 1.0` (escopo de sub-assuntos é separado dos assuntos) |
| T22 | Disciplina com 9 assuntos sem-match + 1 cobrado a 0.55 (I1/D13) | `disc.score = 0.55` (mean ignora null), `disc.metricas.cobertura_match = 0.10` (10%), header sinaliza |
| T23 | IA retorna `disc.equivalente_historico = null` (D16) | **Todos** os assuntos da disciplina têm `score: null`, `disc.metricas.sem_match = true`. Banner §6.6 NÃO dispara (`disc.metricas` existe). Badge "Disciplina sem match" no header da disciplina |
| T24 | Disciplina-edital "Direito Empresarial" sem equivalente, mas IA tentou mapear "Sociedades anônimas" para histórico de "Direito Comercial" (cross-disciplina) | Comportamento D16: assunto vira `score: null` (lookup restritivo). Mentor pode editar manualmente |
| T25 | Cascata nível 4 com mistura {2025 FCC fiscal, 2024 CESPE judicial, 2023 FGV OAB} | Métricas calculadas sobre série heterogênea; header §6.5 exibe aviso forte "interpretar com cautela" |
| T26 | Disciplina com `disc.metricas.peso_medio = 18%` (calculada direto) e 6 assuntos com pcts {3,3,4,4,2,2} | `disc.metricas.peso_medio` = 18% (do índice), assuntos têm seus próprios peso_medio. Tooltip da disciplina != tooltip de assunto somados |
| T27 | Prompt da IA com 2 disciplinas em cascatas diferentes (D17) | 1 chamada IA, payload tem 2 blocos, cada bloco lista só candidatos do universo daquela disciplina; saída respeita estrutura por disciplina |

### Unit tests recomendados (helpers puros)
- `selecionarUniversoCascata` — cobertura dos 4 níveis + zero docs
- `construirJanelaAnos` — gap-skip preserva intervalos; cap 5; ano corrente parcial; <5 anos disponíveis
- `calcularPresenca(stats, anosComProva)` — múltiplos cenários (sempre cai, nunca cai, parcial, denominador 0)
- `calcularPesoMedio(stats)` — só anos com `qtd > 0`; `pct` em porcentagem (D10)
- `calcularTendencia(stats)` — slope com pares válidos; `|anos|<2` → `'estavel'` (D12); thresholds ±0.3
- `calcularConsistencia(stats)` — `mean === 0`; `stdev === 0`; valores extremos
- `calcularScore(metricas)` — pesos 45/35/20; clamp [0,1]; agregar disciplina via mean (D13)
- `mergeMetricasNoOutput(iaOutput, historico, classif, fontePorDisc)` — equivalente encontrado/null/anos_que_cobraram=0/cargo legado coexistindo

---

## 8. Riscos

| # | Risco | Mitigação |
|---|-------|-----------|
| R1 | IA retorna `equivalente_historico` errado (mapping ruim) | Backend valida que o nome existe no histórico antes de aceitar. Se inválido → score null com aviso |
| R2 | Banca/área com nome irregular (acentos, maiúsculas, whitespace) | Normalizar **banca E área** (`.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()`) ao comparar — implementado em `selecionarUniversoCascata` (§5.1) |
| R3 | Disciplinas com `score: null` (sem match) bagunçam ordenação | Sort com fallback `score ?? -1` (já em uso). Após PR6, ainda válido para casos onde a IA não achou equivalente |
| R4 | UI fica poluída com 6 badges por linha | Manter só "score + presença" visível; resto em tooltip e `<details>` expandível |
| R5 | `pct` em fração vs porcentagem (incompatibilidade silenciosa) | D10 fixou: porcentagem 0..100 em todo lugar; tooltips do front refatorados (§6) para não multiplicar; teste T20 valida |
| R6 | Sub-assuntos com métrica própria mas com pouquíssimas amostras | Badge "Amostra pequena" (§6.4) sinaliza visualmente; mentor decide se confia |
| R7 | `disc.score` agregado pode esconder disciplinas com 1 assunto crítico | mean é mais conservador — mas o filtro/sort por assunto (não disciplina) continua exposto no front; mentor pode drill-down |
| R8 | Mistura "mapeado mas nunca cobrado" (0.10) com "sem match" (null) e "cobertos" no `disc.score` (mean) | Aceito (I1). Sinalizado via `disc.metricas.cobertura_match` no header §6.5 — mentor decide se confia |
| R9 | IA mapeia assunto cross-disciplina (assunto vive em disciplina histórica diferente da disciplina-edital) | Resolvido por D16 (lookup restritivo): se disc não tem equivalente, todos os assuntos viram null. Prompt instrui IA a respeitar |
| R10 | Prompt único IA estoura tokens com cascata por disciplina | Resolvido por D17: prompt envia só **nomes** dos candidatos por disciplina (não os históricos enriquecidos); custo IA fica praticamente igual ao atual |
| R11 | Cascata nível 4 (qualquer banca/área) produz métricas semanticamente vazias | Aceito como último recurso. Header §6.5 mostra aviso forte "interpretar com cautela". Alternativa (score null) seria pior |

---

## 9. Plano de implementação

### Fase 1 — Backend (~5–6h)
0. **Definir contratos** (interface JSDoc): `Metricas`, `EnrichedNode`, `PriorizacaoMeta`, `FonteCascata` — escrever em `cargo.service.js` ou módulo separado, mesmo em JS (apenas comentários `@typedef`). Fecha o shape antes de codar.
1. **Testes unitários (TDD)** dos helpers puros conforme §7 unit tests — começar pelos casos extremos (zero docs, 1 ano, gap, ano corrente parcial)
2. **Helpers puros**: `calcularPresenca`, `calcularPesoMedio`, `calcularTendencia` (com fallback D12), `calcularConsistencia` (com piso 0.01 em mean), `calcularScore` (com peso_medio_normalizado por disciplina — D4/B4), `normalizarTexto`
3. **`selecionarUniversoCascata(allStats, { bancaAlvo, areaAlvo })`** — D8 (4 níveis substituição), normaliza banca **e** área (R2)
4. **`construirJanelaAnos(docs)`** — D7 (gap-skip) + cap 5 mais recentes + tracking de ano corrente parcial
5. **`montarHistoricoEnriquecido(docsUniverso, anos)`** — substitui `montarHistorico` em [cargo.service.js:343](../../../../backend-express/src/modules/edital-cargos/cargo.service.js#L343); inclui **disciplina, assunto e sub-assunto** com métricas próprias (D11/D18); 2 max-pesos por disciplina (`max_peso_assuntos`, `max_peso_sub_assuntos`) para o `peso_medio_normalizado` por nível
6. **`mergeMetricasNoOutput(iaOutput, historicosPorDisc, classificacao, fontesPorDisc)`** — junta tudo: lookup restritivo (D16 — disc.equiv null ⇒ todos os assuntos null), `disc.score = mean(assuntos)` (D13), `cobertura_match` (D19), flag `sem_match` quando aplicável, `disc.fonte_cascata` (D14), `_meta.fonte_cascata_majoritaria`
7. **Refatorar prompt** `PRIO_SYSTEM` para D17: mapping-only com **blocos por disciplina-edital**; cada bloco lista só os nomes dos candidatos do universo daquela disciplina; instrução explícita "se disciplina não tem equivalente, todos os assuntos viram null"
8. **`analisarConteudo` orquestra**: pré-normalizar `allStats` uma vez (otimização N4); loop por disciplina-edital (cada uma chama `selecionarUniversoCascata` → `construirJanelaAnos` → `montarHistoricoEnriquecido`); montar `historicosPorDisc` map; **1 chamada IA única** com prompt em blocos (D17); `mergeMetricasNoOutput` final
9. **`_meta` da priorização** (D15 — preserva legados): mantém `bancaAlvo`/`temDadosBancaAlvo`/`qtdAnosBancaAlvo`/`bancasSimilares`/`qtdAnosBancaSimilar`; adiciona `schema_priorizacao: 'deterministic_v1'`, `fonte_cascata_majoritaria`, `anosUniverso[]`

### Fase 2 — Frontend (~3–4h)
1. Badge "Presença N/M provas importadas" — com `v-if="ass.metricas"` para tolerar disciplinas legadas (§6.6)
2. Tooltip enriquecido no score com `peso_medio` direto (sem `* 100` — D10)
3. `<details>` "Métricas detalhadas" no `.prio-assunto__details` — também tolerante a métricas ausentes
4. Badges de qualidade de amostra (§6.4): "Mapeado · nunca cobrado", "Amostra pequena", "Sem match", "Disciplina sem match" (D16)
5. Header sumário de fonte da cascata + cobertura de match (§6.5) — usa `_meta.fonte_cascata_majoritaria`, contagem das `disc.fonte_cascata` e `mean(disc.metricas.cobertura_match)`
6. Banner amarelo "Recalcular" — critério: `disciplinas.some(d => !d.metricas)` (não só pelo `_meta.schema`)
7. **Atualizar `prio-meta` legado** para vocabulário "provas importadas" (§6.7) — **obrigatório** (D20)
8. CSS dos novos elementos

### Fase 3 — Testes manuais (~3h)
1. Cargo FCC fiscal real com gaps (ex: 2020 + 2023-2025) → universo de 4 anos (não 6) e presença correta — T1
2. Cargo de banca sem dados na área → cascata cai pra nível 2/3/4 e header sumário (§6.5) avisa — T5/T6/T7
3. Cargo com >5 anos importados → cap aplicado (5 mais recentes, não consecutivos) — T4
4. Cargo com import de ano corrente parcial → exclusão do score + tooltip "(parcial)" — T3
5. Cargo antigo (PR4/PR5) → banner manual de recalcular; disciplinas legadas renderizam sem badges novos — T10
6. Re-análise parcial (selecionando 1-2 disciplinas) → cargo fica misto, banner aparece, badges novos só nas reanalisadas — T16
7. `reorganizar` com déficit → corte respeita score determinístico — T13/T14
8. Cargo com 1 ano único de histórico → tendência neutralizada, score válido — T18
9. Conferir nenhum `* 100` espúrio em `peso_medio` — T20
10. **(Pós-Fase 2)** Sub-assunto com `anos_que_cobraram === 1` → badge "Amostra pequena" no sub (P2-1) — T15 + visual sub
11. **(Pós-Fase 2)** Sub-assunto com métricas → expandir `<details>` "Métricas detalhadas" (P2-2)
12. **(Pós-Fase 2)** Cargo onde todos os scores são iguais (ex: todos "Mapeado/nunca cobrado" = 0.10) → toggle mostra tooltip "scores idênticos — ordem alfabética preservada" (P2-3)
13. **(Pós-Fase 2)** Disciplina inteira `sem_match: true` → badge "Disc. sem match" no header da disciplina + assuntos NÃO mostram badge "Sem match" individual (P3-1, evita poluição) — T23
14. **(Pós-Fase 2)** Disciplina com `cobertura_match < 1` (ex: 70% dos assuntos com match) → ao expandir o disc, exibe linha "70% dos assuntos com match histórico" (P3-2) — §6.5
15. **(Pós-Fase 2)** Cargo com mistura de fontes (D14): 5 disc em nível 1 + 2 em nível 3 → header sumário mostra "2 de 7 disciplinas usaram fontes alternativas" — T19

### Follow-ups conhecidos (não-bloqueantes, registrados na revisão dupla pós-Fase 2)

- **P3-3**: cobertura média esconde dispersão (todas em 100% vs 1 em 50% e 2 em 100%). Considerar `min(coberturas)` ou contagem de outliers.
- **P3-4**: `recalcularTudoPR6` envia nomes de disciplinas que podem não existir mais em `cargo.conteudo_parseado` (após edição do bruto). Backend ignora silenciosamente — banner amarelo continua aparecendo após "Recalcular tudo". Não afeta correção, só UX.
- **P3-5**: cargo legado pode ter `score` em escala não-normalizada → ordenação errática até mentor recalcular tudo. Mitigado pelo banner que orienta recalcular.
- **P3-6**: `recalcularTudoPR6` chama `initPrioState` que reset estado de expand/collapse. Mentor perde estado de UI ao recalcular. Aceitável.
- **P3-7**: `disc.score === 0` exato (caso patológico: presenca=0 + peso=0 + decrescente) mostra "0" no badge — mentor pode confundir com bug. Decisão UX deixar como está.

---

## 10. Pendências em aberto (vindas da sessão atual)

### 10.1 Bug do toggle "Ordenar por relevância" — RESOLVIDO

**Causa-raíz** (descoberta na revisão final da sessão 2026-05-06):
A IA retorna `score: null` para todas as disciplinas quando a banca não tem histórico de questões (caso comum em editais novos). O sort `score ?? -1` + desempate alfabético acabava produzindo a mesma ordem do edital (que já é alfabética), parecendo "não ter ordenado".

**Fix aplicado** (sessão 2026-05-06): o toggle desabilita-se automaticamente quando `disciplinas.every(d => d.score == null)`, com tooltip e label "(sem dados históricos)" comunicando o motivo. Para cargos com scores reais, o toggle funciona normalmente.

**Resolução natural via PR6**: após a implementação deste PR, scores serão SEMPRE numéricos (calculados deterministicamente), eliminando a possibilidade do caso "todos null". O toggle voltará a ser sempre útil.

### 10.2 Origem dos dados — RESOLVIDO (2026-05-07)

**Conclusão da investigação:** o índice `metas_leges_estatisticas_questoes` é populado **manualmente pelo mentor** via [EstatisticasView.vue](../../../src/views/EstatisticasView.vue) (botão "Nova Importação"). Cada doc é um par `(banca × área × ano)`. Não há sinal nativo que distinga "ano sem prova" de "ano não importado".

**Decisão (D7 — gap-skip):** anos faltantes **entre** o `min` e o `max` dos docs importados são tratados como "não houve prova" — não entram no denominador. Isso é uma inferência consistente com o comportamento natural do mentor (quem importa anos seguidos quando os tem; pula quando não há prova).

**Decisão (D9 — vocabulário):** UI fala em "**provas importadas**" em vez de "anos com prova", deixando explícito que o universo é o histórico observado pelo mentor. Campo interno `anos_com_prova` mantém o nome para reduzir diff.

**Não há mais bloqueio para implementar.** O comportamento "se eu importar mal, o sistema mede mal" é responsabilidade do mentor — análogo ao usuário não cadastrar dados em qualquer outro sistema.

### 10.3 Calibração de pesos pós-deploy
Após implementação, coletar feedback nos primeiros 5-10 cargos analisados:
- Os scores fazem sentido pra você?
- Algum assunto crítico ficou com score baixo demais?
- Pesos 45/35/20 vão precisar de ajuste? Se sim, parametrizar via env ou UI.

---

## 11. Decisões confirmadas em 2026-05-07

1. **Spec formal vs implementação direta** — spec formal seguida de revisão dupla. ✅ aprovado em 2026-05-06.
2. **Q1 — Mostrar ano corrente no tooltip como "parcial"?** ✅ sim.
3. **Q2 — Banner de recalcular para cargos antigos: automático ou clique?** ✅ clique (manual, mentor decide quando).
4. **A1 — Janela de 5 anos: consecutivos ou os 5 importados mais recentes?** ✅ os 5 mais recentes, não precisam ser consecutivos.
5. **A2 — Cascata: substituir ou misturar entre níveis?** ✅ substituir (D8). Hierarquia já está ordenada por confiança.
6. **(a/b) — Nível 3 da cascata: outras bancas qualquer área OU outras bancas área alvo?** ✅ (b) outras bancas + área alvo. Nível 4 fica como "qualquer".

---

## 12. Changelog

### 2026-05-07 (6ª passagem) — revisão cross-fase pós Fase 1+2

Revisão extra com agente fresh focada em **integração end-to-end** (contrato backend ↔ frontend), distinta das revisões individuais por fase. Achou 3 P1 + 4 P2 + 2 P3 que escaparam das revisões anteriores.

**Aplicados (3 fixes):**
- **P1-2** (back) — `disc.carga_estimada_horas` ganhou fallback `sum(assuntos)` quando classificação Fase 1 IA falha. Sem isso, card "Carga total estimada" no front mostra 0h em cargo onde Fase 1 falhou parcialmente.
- **P1-3** (back) — `cortar_conteudo` em `reorganizarPriorizacao`: ordenação trata null primeiro (sem match cortado antes de score baixo) e descrição separa "X sem match histórico + Y com score abaixo de Z%". Antes mostrava "score abaixo de 0%" em cargo misto.
- **P2-4** (front) — lista de "Assuntos cortados" mostra "sem match" em vez de "score 0" quando `c.score == null`. Coerência com restante da UI.

**Diferidos como follow-up:**
- **P2-2** — recálculo parcial silencioso (IA trunca JSON). Depende da estabilidade do provider OpenRouter; se virar problema, retornar `metaParcial.disciplinasFaltantes` no backend e mostrar toast laranja.
- **P2-3** — `_meta.bancaAlvo` sobrescrito a cada `analisarConteudo` pode dessincronizar com disciplinas mantidas se mentor mudou banca pós-análise. Caso edge raro.
- **P2-1** — Tooltip da tendência da disciplina é da disciplina equivalente histórica, não dos assuntos do edital. Documentar em tooltip aprimorado quando relevante.
- **P3-1** — `_meta.anosUniverso`/`schema_priorizacao` gravados mas não lidos pelo front. Útil pra debug futuro.
- **P3-2** — Naming inconsistente `disc.tendencia` (raiz) vs `disc.metricas.tendencia`. Débito técnico, não bug.

**Resultado:** sistema majoritariamente consistente cross-fase. Bugs visíveis identificados e corrigidos antes do teste manual. Tests: 64/64 passing. Sintaxe back+front OK.

### 2026-05-07 (5ª passagem) — pós-Fase 2 frontend (revisão dupla)

Fase 2 frontend implementada em [CargoConteudoView.vue](../../src/views/CargoConteudoView.vue). Revisão dupla pós-Fase 2 não achou P0/P1 — apenas 3 P2 e 7 P3. **Aplicados**: P2-1 (qualityBadge em sub-assuntos), P2-2 (`<details>` Métricas detalhadas no sub), P2-3 (tooltip "scores idênticos"), P3-1 (oculta "Sem match" individual quando disc inteira sem_match), P3-2 (cobertura individual da disciplina no expand). **Diferidos como follow-up**: P3-3 a P3-7 (registrados em §9 → "Follow-ups conhecidos").

**Mudanças neste documento (5ª passagem):**
- §9 Fase 3: cenários 10-15 adicionados cobrindo os comportamentos novos (sub-assunto badges, sub `<details>`, toggle "scores idênticos", oculta "Sem match" individual, cobertura individual no expand, mistura de fontes).
- §9 nova seção "Follow-ups conhecidos" lista P3-3 a P3-7 da revisão dupla (não bloqueiam canary).

Spec preservada em todo o resto — contrato com a Fase 1 backend mantido. Status: implementação Fase 2 fechada; pronto para teste manual end-to-end (Fase 3).

### 2026-05-07 (4ª passagem) — ajuste pós-Fase 1 backend (revisão dupla)

Fase 1 backend implementada. Revisão dupla pós-Fase 1 identificou 1 P0 + 1 P1 + 3 P2 + 3 P3. **Apenas 1 fix afeta o contrato com a Fase 2 frontend** (mudança propagada para a spec):

- **`tendencia`/`tendencia_slope`/`consistencia` viram `null` em sem_match** (não mais `'estavel'`/`0`/`1`). Justificativa: distinguir "sem sinal" de "estável real". Templates do front (§6.3) precisam usar `v-if` para tolerar null. **§5.5 e §6.3 atualizadas com a nova convenção.**

Demais fixes (P0 try/catch da Fase 2D, P1 otimização N4, P2 disc alucinada filtrada) são internos e não afetam o front. Status: implementação Fase 1 fechada com 64 testes passing.

### 2026-05-07 (terceira passagem) — revisão final pós-2ª rodada

3ª rodada com agente fresco focada em buracos novos introduzidos pelos fixes da 2ª rodada. Identificou 3 BLOCKERs + 5 IMPORTANTs + 4 NICEs + 1 ponto descartado com justificativa. Todos resolvidos.

**Decisões novas (D16-D20):**
- D16 — lookup restritivo cross-disciplina (`disc.equiv === null` ⇒ todos os assuntos null).
- D17 — 1 chamada IA com blocos por disciplina (cada bloco lista só candidatos do universo da disciplina).
- D18 — métricas próprias da disciplina + `peso_medio_normalizado` com 2 escopos (`max_peso_assuntos`, `max_peso_sub_assuntos`).
- D19 — backend sempre escreve `disc.metricas` (com `sem_match: true` quando aplicável); inclui `cobertura_match`.
- D20 — atualização do `prio-meta` legado é OBRIGATÓRIA (não cosmética).

**Mudanças neste documento (terceira passagem):**
- §2: D16-D20 adicionadas; D14 ref atualizada §6.4 → §6.5.
- §3.2/§3.3: métricas calculadas para disciplina, assunto e sub-assunto (D18); `peso_medio_normalizado` com 2 max-pesos por nível; `disc.score` clarificado para os 3 cenários (D13 + D16 + I1).
- §4: aviso explícito sobre nível 4 (mistura heterogênea — R11); ref §6.4 → §6.5.
- §5.1: nota de performance O(N×|allStats|) e otimização sugerida (N4).
- §5.4: prompt totalmente reescrito (D17 — blocos por disciplina, exemplos concretos).
- §5.5: assinatura mudada para `(iaOutput, historicosPorDisc, classificacao, fontesPorDisc)`; passos numerados; tabela de 6 estados de score (era 5); diferença explícita "PR6 sem match" vs "cargo legado".
- §6.4: textos refinados ("Mapeado · nunca cobrado" em vez de "Raro"; "Disciplina sem match" novo); coluna de tooltip explícita.
- §6.5: cobertura média de match exibida no header (D19); aviso "interpretar com cautela" no nível 4.
- §6.6: critério do banner clarificado (PR6 sem match NÃO dispara banner).
- §6.7: marcado como OBRIGATÓRIO (D20).
- §7: T21-T27 adicionados (sub-assunto normalização, mean enviesado, disciplina sem match, cross-disciplina, nível 4, métricas próprias da disc, prompt em blocos).
- §8: R8-R11 adicionados.
- §9 Fase 1 passos 5/6/7/8 reescritos refletindo D16/D17/D18/D19/N4; Fase 2 passos 4/5/7 atualizados (badges novos, header com cobertura, prio-meta obrigatório).

### 2026-05-07 (segunda passagem) — revisão dupla da spec ajustada

Após aplicar D7-D9, foi feita revisão dupla com agente fresco. Foram identificados 5 BLOCKERs e 7 IMPORTANTs. Todos resolvidos com 6 decisões adicionais (D10-D15) confirmadas pelo dev:

**Decisões novas (D10-D15):**
- D10 — `pct` é porcentagem 0..100 em todo lugar (front consome direto, sem `* 100`).
- D11 — sub-assuntos têm métrica própria (não herdam do assunto pai).
- D12 — `tendencia = 'estavel'` quando `|anos_universo| < 2` (regressão indefinida).
- D13 — `disc.score = mean(scores dos assuntos não-null)`.
- D14 — `fonte_cascata` por disciplina; `_meta.fonte_cascata_majoritaria` no nível global.
- D15 — `_meta` legado preservado (front antigo continua funcionando).

**Mudanças neste documento (segunda passagem):**
- §2: D10-D15 adicionadas.
- §3 reestruturada com numeração 3.0-3.5; novos blocos sobre convenções numéricas (D10), casos extremos (zero-div, NaN), agregação de disciplina (D13), tendência indefinida (D12).
- §4: `fonte_cascata` por disciplina (D14); `fonte_cascata_majoritaria` no `_meta`.
- §5.2: exemplo do output enriquecido inclui sub-assuntos com métricas (D11); guards de robustez explicitados.
- §5.5: tabela "estados possíveis de score" (5 estados); `_meta` final exaustivo (legados + novos — D15).
- §6: tooltips refatorados sem `* 100` em `peso_medio` (D10); fallback para disciplinas legadas (cargo parcialmente migrado); §6.4 nova (badges de amostra); §6.5 reescrita (sumário agregado da cascata por disciplina); §6.7 nova (atualização opcional do `prio-meta` legado).
- §7: testes T9 corrigido, T14-T20 adicionados (apply, sub-assunto, parcial, anos_que_cobraram=0, 1 ano só, mistura cascata, D10).
- §8 R5-R7 adicionados (riscos de unidades, sub-assuntos amostra pequena, agregação mean).
- §9 Fase 1: passos 0 (contratos JSDoc) e 1 (TDD) adicionados; passos renumerados; menção a sub-assuntos (D11) e fonte por disciplina (D14).
- §9 Fase 2: 8 passos (era 6); §9 Fase 3: 9 cenários (era 6).

### 2026-05-07 (primeira passagem) — ajustes pós-revisão da §10.2

Sessão de Humberto (mentor solo) confirmou que `metas_leges_estatisticas_questoes` é populado manualmente. Premissa "ausência = sem prova" foi reformulada como inferência D7 (gap-skip). 6 decisões adicionais (D7-D9 + Q1/Q2 + cascata) destravaram a implementação.

**Mudanças neste documento:**
- §2: D3 reescrito (cap 5 mais recentes não consecutivos); D4 reescrito (cascata 4 níveis substituição); D7-D9 adicionados.
- §3.0 nova subseção: regra de gap-skip + cap + exemplo.
- §4: cascata reescrita (4 níveis, substituição, normalização R2 explícita).
- §5: helpers reorganizados — 5.1 nova (`selecionarUniversoCascata` + `construirJanelaAnos`); 5.2 e seguintes renumerados.
- §6.1, §6.3, §6.5: vocabulário "provas importadas" (D9); §6.4 nova (aviso de fonte da cascata).
- §7: cenários T1-T13 reescritos cobrindo gap-skip, cap, cascata em 4 níveis e acoplamento ao reorganizar.
- §9 Fase 1: 8 passos (era 7); Fase 2: 6 passos (era 5); Fase 3: 6 cenários (era 4).
- §10.2: marcado como RESOLVIDO.
- §11: 6 decisões confirmadas, deixou de ser "pendente".

### 2026-05-06 — versão inicial
Spec original aprovada. PR6 documentado em §1-§9 com decisões D1-D6.
