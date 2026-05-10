# Priorização com Recência — Spec PR7

**Data:** 2026-05-08
**Status:** 🟡 Aprovada — pendente implementação
**Escopo:** evolução do score determinístico do PR6 com a dimensão **recência** (cobertura nos últimos 3 anos do universo). Toca `backend-express` (helpers + serviço) + `boilerplate-vue` (CargoConteudoView + EDITAIS.md). PlanoEstudoBuilder permanece intocado nesta sprint — apenas consome o score atualizado.

> Decisões D1–D20 do PR6 permanecem em vigor. Esta spec adiciona D21–D28 e altera D2 (pesos do score). Numeração contínua propositalmente.

---

## 1. Motivação

A Aba Análise (entregue em 2026-05-07, ver memória `project_analise_recorrencia_entregue` no projeto `legislacao`) introduziu a métrica `recencia` (% dos últimos 3 anos cobertos) que **não existe** no PR6. Esse gap se manifesta em 2 cenários reais que o mentor encontra na prática:

### Cenário A — "Subindo" (FGV/OAB pós-Reforma Tributária)

Assunto novo cobrado forte em 2024 e 2025, ausente em 2020-2023. Métricas atuais:
- `presenca` = 2/5 = 0.40 (baixa — só cobriu 2 anos do universo de 5)
- `peso_medio` = alto (quando cai, cai forte)
- `tendencia` = `crescente` (slope positivo grande)
- **Score atual** = `0.45×0.40 + 0.35×peso_norm + 0.20×1.0` ≈ 0.55

Resultado: assunto crítico-emergente fica em score médio. Mentor edita peso manual em quase todo cargo recente. Cansativo, sujeito a erro.

### Cenário B — "Sumindo" (assunto retirado de programa)

Cobrado fortemente em 2020 e 2021, zerado de 2022 em diante. Métricas atuais:
- `presenca` = 2/5 = 0.40
- `peso_medio` = alto historicamente
- `tendencia` = `decrescente`
- **Score atual** = `0.45×0.40 + 0.35×peso_norm + 0.20×0` ≈ 0.40

Resultado: assunto morto ainda pesa demais. Mentor deveria poder confiar que o score baixa rápido quando o tema sai do programa.

### Por que recência resolve

`recencia = (anos cobertos nos últimos 3 / 3)` distingue:

| Cenário | presença | recência | tendência | diagnóstico |
|---|---|---|---|---|
| FGV/OAB novo | 0.40 | 0.67 | +1.5 pp/ano | "subindo" — score sobe |
| Tema decadente | 0.40 | 0.00 | -2.0 pp/ano | "sumindo" — score cai |
| Fundo de programa estável | 1.00 | 1.00 | 0 | "sólido" — score alto |
| Cobrado uma vez forte (2021) | 0.20 | 0.00 | -1.0 pp/ano | "ruído" — score baixo |

Recência captura **presença binária recente**, complementar à `presenca` (presença ampla 5 anos) e `tendencia` (direção do volume). Não substitui — soma.

---

## 2. Decisões aprovadas

| # | Decisão | Status |
|---|---------|--------|
| **D2 (alterada)** | **Pesos do score: 30% presença + 20% recência + 30% peso médio normalizado + 20% tendência**. Substitui pesos 45/35/20 do PR6 original | ✅ |
| D21 | **Recência entra como 4ª dimensão**, não substitui presença/tendência. Fundamentação: as 3 dimensões atuais capturam aspectos diferentes (presença ampla, peso quando aparece, direção do movimento); recência adiciona "está vivo agora?" sem redundância forte com nenhuma | ✅ |
| D22 | **Janela de recência = últimos 3 dos 5 anos do universo PR6** (relativo, com gap-skip — D7). NÃO é "últimos 3 anos calendário". Ex: universo `{2015, 2018, 2020, 2024, 2025}` → janela recente `{2020, 2024, 2025}`. Justificativa: consistência interna com a janela do PR6 (gap-skip preservado); evita inconsistência tipo "ano calendário 2023 não está no universo, mas está na recência" | ✅ |
| D23 | **Pesos calibrados por palpite informado** (sem spike empírico upfront), com persistência `score_v1` lado-a-lado pra calibração contínua em produção. Decisão consciente do mentor (dev solo, low-traffic, validado a cada cargo gerado nos primeiros usos). Excepciona o feedback `feedback_calibracao_threshold_empirico` (memória do projeto `legislacao`) com justificativa: "qualquer coisa alteramos" — pesos são 1 lugar (D25), recalcular cargo é barato | ✅ |
| D24 | **`score_v1` (fórmula PR6 antiga) persistido lado-a-lado com `score` (nova fórmula)** dentro de `metricas`. Front mostra ambos no expand do assunto pra você comparar e decidir se ajusta peso manual. `score_v1` não afeta ordenação (ordenação usa `score` novo); é só auditoria/calibração visual | ✅ |
| D25 | **Pesos centralizados em uma única constante `WEIGHTS`** em `priorizacao.helpers.js`. Ajustar = mudar 4 números num lugar e re-rodar `gerarPriorizacao` no cargo (ou em todos os cargos do edital). Magic numbers fora — facilita o "qualquer coisa alteramos" | ✅ |
| D26 | **PlanoEstudoBuilder consome score atualizado nesta sprint, sem outras mudanças.** Adaptações listadas na memória `project_priorizacao_analise_integracao` (projeto `legislacao`), seção "Adaptações esperadas no PlanoBuilder" — filtro recência, tipo de tarefa modulado, distribuição temporal, display recência — ficam pra **fase 2**, depois do score novo amadurecer | ✅ |
| D27 | **Recência aplica-se aos 3 níveis** (disciplina + assunto + sub-assunto), mesma escada das outras métricas. **Distinção explícita entre dois casos sem match:** (a) **disciplina** sem `equivalente_historico` (D16 do PR6, todos assuntos da disc viram null) → `disc.metricas` recebe objeto populado com `recencia: 0, sem_match: true, presenca: 0, ...` (mantém convenção PR6 existente; PR7 só adiciona campo `recencia`); (b) **assunto/sub-assunto** individual sem `equivalente_historico` (dentro de disc mapeada) → `metricas: null` no nó (mantém convenção PR6 existente; PR7 não estende esse caso). Justificativa: minimizar mudanças vs PR6, evitar quebrar shape esperado pelo front em assunto-individual; null-guards de §6.1 cobrem ambos os casos. Disciplina com equivalente mas todos os assuntos sem cobertura nos últimos 3 anos → `recencia` da disciplina = 0 também (caso real legítimo, indistinguível por design — score continua refletindo via outras dimensões) | ✅ |
| D28 | **`disc.metricas.recencia` é própria da disciplina** (calculada sobre `disc.pct/qtd` por ano, mesma fórmula §3.1), NÃO agregada via mean dos assuntos. Consistente com D18 do PR6 (presença/peso/tendência da disciplina também são próprias, não agregadas) | ✅ |

---

## 3. Métrica nova: recência

### 3.1 Definição

```
janelaRecente = anosUniverso.slice(-3)        // últimos 3 (em ordem ascendente)
anosCobertosNaJanela = janelaRecente.filter(ano => totalPorAno[ano]?.qtd > 0)
recencia = anosCobertosNaJanela.length / janelaRecente.length     // fração 0..1
```

**Convenções (D10 PR6):** `recencia` é **fração 0..1** (igual presença e score). UI multiplica por 100 quando exibe.

### 3.2 Casos extremos

| Caso | `anosUniverso` | `janelaRecente` | cobertura na janela | `recencia` |
|---|---|---|---|---|
| Universo cheio, sólido | `[2021,2022,2023,2024,2025]` | `[2023,2024,2025]` | cobre 3/3 | 1.0 |
| Universo cheio, decadente | `[2021,2022,2023,2024,2025]` | `[2023,2024,2025]` | só 2021,2022 → 0/3 | 0.0 |
| Universo cheio, subindo | `[2021,2022,2023,2024,2025]` | `[2023,2024,2025]` | só 2024,2025 → 2/3 | 0.67 |
| Gap-skip cobrando todos os anos | `[2015,2018,2020,2024,2025]` | `[2020,2024,2025]` | cobre 3/3 | 1.0 |
| Gap-skip com salto recente (FGV/OAB) | `[2015,2018,2020,2022,2025]` | `[2020,2022,2025]` | só 2025 → 1/3 | 0.33 |
| Universo curto (2 anos) | `[2024,2025]` | `[2024,2025]` | cobre 2/2 | 1.0 (clamp `len(janela)` não 3) |
| Tema sem match (D16) | — | — | — | 0 (D27, com `sem_match: true`) |
| Tema mapeado mas nunca cobrado | `[2021..2025]` | `[2023,2024,2025]` | 0/3 | 0.0 |

**`janela.length` < 3:** acontece quando o universo tem só 1 ou 2 anos (caso degenerado). Nesse caso, `recencia = anosCobertos / janela.length` (denominador é o tamanho real da janela, não 3 fixo). Justificativa: bater 3 anos quando só temos 2 anos no universo daria recência subestimada artificialmente.

> ⚠️ Nuance vs `recurrenceAnalysis.js` (boilerplate-vue): a Análise calcula `janelaRecente = anos.slice(-RECENT_WINDOW)` sobre o **dataset todo** filtrado por banca/area, e retorna `janelaRecente: []` se `anos.length < 3`. Aqui no PR7 trabalhamos sobre o **universo da cascata por disciplina** (gap-skip preservado, máx 5) — diferente. **Não compartilhamos código** entre os dois (caminho C da memória adiado), só conceito.

### 3.3 Recência por nível (D27/D28)

- **Assunto / sub-assunto**: `recencia` calculado sobre `ass.totalPorAno` / `sub.totalPorAno` (qtd por ano do tema).
- **Disciplina**: `recencia` calculado sobre `disc.totalPorAno` (qtd da disciplina inteira por ano). NÃO é mean das recências dos assuntos — análogo ao D18 do PR6.

**Comportamento de UI em sub-assuntos sem match (D27b):** sub-assuntos cujo assunto pai tem `equivalente_historico: null` recebem `metricas: null` (convenção PR6 mantida). Front (CargoConteudoView §6.1) **não renderiza badges nem linha v1→v2 nesses sub-assuntos** — eles aparecem só com nome + tipo_fonte + leis_referencia. O assunto-pai já sinaliza "Sem match" visualmente, então a ausência de métricas no sub é coerente. Aceito como design implícito do PR6.

---

## 4. Score reformulado

### 4.1 Fórmula nova (substitui D2 PR6)

```
score = 0.30 × presenca
      + 0.20 × recencia
      + 0.30 × peso_medio_normalizado
      + 0.20 × componente_tendencia
```

`componente_tendencia` mantém a definição PR6 (§3.3): `crescente=1`, `estavel=0.5`, `decrescente=0`.

**Constantes (D25):**

```js
// priorizacao.helpers.js — pesos atuais (mutáveis por commit)
export const WEIGHTS = Object.freeze({
  presenca: 0.30,
  recencia: 0.20,
  peso_medio: 0.30,
  tendencia: 0.20,
})
// invariante: soma === 1.0 (validação no boot do helper)

// Pesos da fórmula PR6 — IMUTÁVEIS, usados só em calcularScoreV1 + testes antigos
export const WEIGHTS_V1 = Object.freeze({
  presenca: 0.45,
  peso_medio: 0.35,
  tendencia: 0.20,
})
```

**As constantes legacy `PESO_PRESENCA` / `PESO_PESO_MEDIO` / `PESO_TENDENCIA` (PR6) são REMOVIDAS** — não viram aliases pra `WEIGHTS.*` porque os valores mudaram (0.45 → 0.30 em presença, 0.35 → 0.30 em peso_medio). Manter alias seria armadilha: testes que validavam `assert.equal(s, PESO_PRESENCA * 1 + PESO_PESO_MEDIO * 1 + PESO_TENDENCIA * 0.5)` da fórmula PR6 passariam silenciosamente com matemática nova mas valores diferentes — exatamente o tipo de regressão difícil de pegar.

**Migração dos testes antigos (§5.3):**
- Testes que validam comportamento PR6 da fórmula → migram para validar `calcularScoreV1`, importando `WEIGHTS_V1.*`.
- Testes que validam comportamento atual → atualizam pra `calcularScore` novo importando `WEIGHTS.*`.
- `PESO_RECENCIA` é constante NOVA (= `WEIGHTS.recencia`), exportada pra usar em testes legíveis.

Ajustar pesos = mudar `WEIGHTS` + reanalisar cargo(s) afetado(s) pelo botão "Analisar" existente (1 cargo por vez no fluxo atual; batch fica como melhoria futura, F2-2). Sem env var, sem UI — explícito no código pra trackear via git.

### 4.2 `score_v1` lado-a-lado (D24)

`score_v1` continua sendo a fórmula PR6 original (`0.45×presenca + 0.35×peso_norm + 0.20×tendencia`), persistido em `metricas.score_v1` em paralelo a `metricas.score` (fórmula nova).

Função pública nova `calcularScoreV1({presenca, peso_medio_normalizado, tendencia})` mantém o algoritmo antigo intocado pra auditoria/comparação. **Não importada pelo `cargo.service.js`** fora de `montarHistoricoEnriquecido` — não vira API pública nem é consumida em sort/corte.

`disc.score_v1` = mean dos `score_v1` dos assuntos não-null (mesma regra D13). Front mostra discreto no expand: `v1: 0.55 → v2: 0.61 (Δ +0.06)`.

### 4.3 Edge cases

- **Todas as 4 dimensões 0** (tema mapeado mas nunca cobrado, sem tendência): `score = 0.20 × 0.5 = 0.10` — mantém o valor "pisos" do PR6 (assunto mapeado conhecido > assunto desconhecido). `recencia = 0` adiciona 0, não muda nada.
- **`tendencia = null`** (somente caso disc sem match D16 — histórico raso PR6 retorna `'estavel'` com `slope=0` por D12, NÃO null): disciplina sem match retorna `score: null` no top-level + `metricas` populado com `recencia: 0, tendencia: null, sem_match: true` (D27a). Assuntos individuais sem `equivalente_historico` (dentro de disc mapeada) retornam `metricas: null` no nó (D27b — convenção PR6 mantida, não estendida).
- **`recencia` raramente é null**: só se decisão futura optar por marcar "histórico raso demais pra recência" (não nesta sprint). Convenção atual: recência sempre numérica em [0,1] quando há universo, mesmo universo curto.

---

## 5. Mudanças no backend

### 5.1 `priorizacao.helpers.js`

**Adições:**

1. Constantes `WEIGHTS` (atual, D25) e `WEIGHTS_V1` (PR6 imutável) — ver §4.1. **Removem-se** `PESO_PRESENCA` / `PESO_PESO_MEDIO` / `PESO_TENDENCIA` (PR6) — ver §4.1 razão (não viram aliases porque os valores mudaram). Adiciona-se `PESO_RECENCIA = WEIGHTS.recencia` como atalho de leitura para testes legíveis.

2. Helper puro novo `calcularRecencia(totalPorAno, janelaRecente)`:
    ```js
    /**
     * @param {Object<number, {qtd?:number, pct?:number}>} totalPorAno
     * @param {number[]} janelaRecente — subset ascendente de anosUniverso (últimos 3)
     * @returns {number} fração 0..1; 0 se janelaRecente vazia
     */
    export function calcularRecencia(totalPorAno, janelaRecente) {
      if (!janelaRecente?.length) return 0
      const cobertos = janelaRecente.filter(a => (totalPorAno?.[a]?.qtd ?? 0) > 0).length
      return cobertos / janelaRecente.length
    }
    ```

3. Helper utilitário `obterJanelaRecente(anosUniverso)`:
    ```js
    /**
     * Últimos min(3, |universo|) anos do universo PR6 (ordem ascendente).
     */
    export function obterJanelaRecente(anosUniverso) {
      const n = Math.min(3, anosUniverso?.length ?? 0)
      return anosUniverso?.slice(-n) ?? []
    }
    ```

4. **`calcularMetricasBase` atualizada** — adiciona campos `recencia`, `recencia_anos_cobertos` e `recencia_anos_total` (denominador real) no objeto retornado:
    ```js
    return {
      presenca, peso_medio, peso_no_universo,
      tendencia, tendencia_slope, consistencia,
      recencia,                          // NOVO (D21) — fração 0..1
      recencia_anos_cobertos,            // NOVO — qtd absoluta, 0..min(3, |universo|)
      recencia_anos_total,               // NOVO — denominador, = min(3, |universo|)
      anos_com_prova, anos_que_cobraram,
    }
    ```
    Persistir `recencia_anos_total` permite tooltip front renderizar "2/3 anos" sem precisar derivar do `_meta.anosUniverso` (que pode estar fora do escopo do componente). Recebe `janelaRecente` como parâmetro novo (opcional pra backwards-compat de testes; se ausente, calcula via `obterJanelaRecente(anosUniverso)`).

5. **`calcularScore` atualizada** — assinatura nova:
    ```js
    /**
     * @param {{ presenca, recencia, peso_medio_normalizado, tendencia }} m
     * @returns {number} fração 0..1
     */
    export function calcularScore({ presenca, recencia, peso_medio_normalizado, tendencia }) {
      const tendScore = tendencia === 'crescente' ? 1 : tendencia === 'decrescente' ? -1 : 0
      const componente_tendencia = (tendScore + 1) / 2
      const score = WEIGHTS.presenca * presenca
                  + WEIGHTS.recencia * recencia
                  + WEIGHTS.peso_medio * peso_medio_normalizado
                  + WEIGHTS.tendencia * componente_tendencia
      return clamp01(score)
    }
    ```

6. **Helper novo `calcularScoreV1`** — preserva algoritmo PR6 original via `WEIGHTS_V1` (congelado):
    ```js
    export function calcularScoreV1({ presenca, peso_medio_normalizado, tendencia }) {
      const tendScore = tendencia === 'crescente' ? 1 : tendencia === 'decrescente' ? -1 : 0
      const componente_tendencia = (tendScore + 1) / 2
      const score = WEIGHTS_V1.presenca * presenca
                  + WEIGHTS_V1.peso_medio * peso_medio_normalizado
                  + WEIGHTS_V1.tendencia * componente_tendencia
      return clamp01(score)
    }
    ```
    Usar `WEIGHTS_V1` (não `WEIGHTS`) **propositalmente** — `score_v1` é referência histórica imutável, não muda quando os pesos atuais (`WEIGHTS`) forem recalibrados em sessão futura.

7. **`montarHistoricoEnriquecido` atualizada** — três mudanças:
   - Calcula `janelaRecente` uma vez via `obterJanelaRecente(anosUniverso)` e passa pra cada `calcularMetricasBase` (helpers atual ln 400, 405, 446).
   - **Atualiza chamadas a `calcularScore`** (helpers atual ln 426, 437) pra passar `recencia: ass.metricas.recencia` / `recencia: sub.metricas.recencia` — agora que `calcularMetricasBase` populou esse campo, ele está disponível na `metricas` do nó. Sem isso, os 3 níveis chamariam `calcularScore` sem `recencia` e o componente correspondente viraria `undefined × 0.20 = NaN` no score final.
   - Pra cada nó (disc/ass/sub), adiciona `metricas.score_v1 = calcularScoreV1({...})` ao lado de `metricas.score` (`score_v1` NÃO recebe `recencia` — fórmula antiga não tinha).
   - Disciplina: agrega `disc.metricas.score_v1 = mean(score_v1 dos assuntos não-null)` (análogo a D13). Disciplina sem assuntos → `score_v1 = null` (igual `score`).

8. **`mergeMetricasNoOutput` atualizada** — espelha `score_v1` no top-level junto com `score`:
   - Pra cada assunto: adicionar `score_v1: histAss?.metricas?.score_v1 ?? null` ao objeto `assOut` (linhas ~603-613 do helpers atual).
   - Pra cada sub-assunto: adicionar `score_v1: histSub?.metricas?.score_v1 ?? null` ao objeto sub.
   - Pra cada disciplina: adicionar `score_v1: discScore_v1` (computado análogo a `discScore`) no objeto pushed em `disciplinas.push(...)` (linhas ~671-682). Caso `discMatched=false`, `score_v1: null` (igual `score: null`).
   - **Sem mudança no contrato `_metaParcial`** — `disc.score_v1` viaja paralelo a `disc.score`, ambos no top-level e em `metricas`.

### 5.2 `cargo.service.js`

Mudança mínima — todas as alterações de algoritmo ficam no helpers. Pontos onde `cargo.service.js` é tocado:

1. **Nada na ordenação/corte** — continuam consumindo `ass.score` (campo top-level), que agora vem do `score` novo em `mergeMetricasNoOutput`.
2. **`mergeMetricasNoOutput`** já propaga tudo de `metricas` (objeto completo) — `recencia` e `score_v1` viajam junto sem mudança.
3. **Defesa contra alucinação IA** — preservada (não muda).

Risco zero de regressão em `gerarSugestaoCorte` / `gerarSugestaoSemana` — eles consomem `score` em si, e o `score` continua existindo (com nova fórmula).

### 5.3 `priorizacao.helpers.test.js`

**Testes novos (~28 cases):**

- `calcularRecencia` (10 casos):
  1. cheio (3/3) — universo cobre tudo
  2. metade (1/3, 2/3) — 2 casos
  3. zerado (0/3) — universo sem cobertura na janela
  4. **janela vazia** (`janelaRecente=[]`) → retorna 0 sem NaN ⚠️ defesa contra div/0
  5. **`totalPorAno` undefined/null** → retorna 0 sem crash
  6. universo curto 2 anos → denominador 2, não 3
  7. universo curto 1 ano cobrindo → 1.0
  8. gap-skip (universo `[2015, 2020, 2025]`, janela `[2015, 2020, 2025]`, cobre 2020+2025) → 2/3
  9. apenas qtd=0 (`{2024:{qtd:0}}`) — não conta como cobertura

- `obterJanelaRecente` (5 casos): universo 5/3/2/1/0 anos.

- `calcularScore` (nova) (8 casos):
  - todas 4 dimensões = 1 → score = 1.0 (clamp top)
  - todas = 0, tendência estável → score = 0.20×0.5 = 0.10
  - **mix realista**: presença=0.4, recência=0.67, peso_norm=0.5, tend=crescente → cálculo manual verificado (`0.30×0.4 + 0.20×0.67 + 0.30×0.5 + 0.20×1.0 = 0.604`)
  - mesmo mix com tend=decrescente → score menor
  - **chamada sem `recencia` (testar fail-fast OU fallback)**: definir contrato — proposta: lança ou retorna NaN? Decisão na fase 1 — provavelmente **espalha NaN** (consistente com PR6 que assumia campos presentes)
  - clamp inferior 0
  - 2 casos edge

- `calcularScoreV1` (legacy) (4 casos): snapshots da fórmula PR6 antiga — passa nos mesmos inputs que os testes PR6 originais usavam, valida valores idênticos. Importa `WEIGHTS_V1.*` em vez de `PESO_*`.

- `calcularMetricasBase` (3 casos novos): com `janelaRecente`, validar `recencia`, `recencia_anos_cobertos`, `recencia_anos_total` saem corretos. 1 caso sem passar `janelaRecente` → fallback via `obterJanelaRecente` interno funciona.

- `montarHistoricoEnriquecido` (3 casos novos):
  - assunto subindo (presença=0.4, recência=0.67, tend crescente) → `score > score_v1`
  - assunto decadente (presença=0.4, recência=0, tend decrescente) → `score < score_v1`
  - disc com 2 assuntos, um sem match → `score` e `score_v1` ambos = mean dos não-null, shapes idênticos

**Migração de testes antigos (~10 cases tocados):**

Testes do PR6 que importam `PESO_PRESENCA` / `PESO_PESO_MEDIO` / `PESO_TENDENCIA` quebram porque essas constantes deixam de existir. Cada teste é classificado:

1. Se valida **comportamento da fórmula** (ex: `score = PESO_PRESENCA × p + ...`) → migra pra testar `calcularScoreV1`, importa `WEIGHTS_V1.*`.
2. Se valida **estrutura da `metricas`** retornada → atualizar lista de campos esperados pra incluir `recencia`, `recencia_anos_cobertos`, `recencia_anos_total`, `score_v1`.
3. Se valida **score numérico esperado** com fórmula PR6 → recalcular o valor esperado com fórmula PR7, OU mover o teste pra `calcularScoreV1` se o intuito original era "fórmula de referência".

Total esperado: **64 → ~92** (+28 novos) testes, com ~10 dos 64 tocados (não removidos).

---

## 6. Mudanças no frontend

### 6.1 `CargoConteudoView.vue`

**Mudança 1 — badge de recência no expand do assunto** (próximo aos badges existentes de presença/peso/tendência):

```vue
<v-chip
  v-if="ass.metricas?.recencia != null"
  size="x-small"
  :color="recenciaColor(ass.metricas.recencia)"
>
  Recência: {{ formatRecencia(ass.metricas) }}
</v-chip>
```

`formatRecencia({ recencia, recencia_anos_cobertos, recencia_anos_total })` retorna `"2/3 anos"` usando o **denominador real persistido** (`recencia_anos_total`), não hardcoded 3 — em universos curtos (2 anos), exibe "X/2 anos" honesto. `recenciaColor`: ≥0.67 verde, 0.33-0.66 amarelo, <0.33 vermelho.

**Null-guards obrigatórios (tratam mix schema_v1/v2 e cargos legados — R7):**
- `v-if="ass.metricas?.recencia != null"` — esconde o chip inteiro em assuntos pré-PR7 (sem o campo). Não exibir "Recência: —" porque ruído visual.
- `formatRecencia` defensivo — se `recencia_anos_total == null`, retorna `"—"` em vez de `"X/null anos"`.
- Aplicar mesmo padrão pra `disc.metricas.recencia` no header da disciplina.

**Mudança 2 — comparação `score_v1 → score` no expand**:

Linha discreta abaixo do score principal:
```
v1: 0.55 → v2: 0.61 (Δ +0.06)
```

Cor do delta: verde se +, vermelho se -, cinza se ≈0. Tooltip explica "v1 = fórmula PR6 antiga sem recência; v2 = fórmula atual".

**Null-guards:**
- `v-if="ass.score_v1 != null && ass.score != null"` — esconde a linha inteira em assuntos pré-PR7 (sem `score_v1`).
- Em assunto sem match (D16, ambos null) — não há nada pra comparar; já oculto.
- Se `|score - score_v1| < 0.005` → opcionalmente esconde a linha (sem mudança relevante; reduz ruído visual quando recência empata na perfeita).

**Mudança 3 — header da disciplina** ganha resumo de recência (`disc.metricas.recencia`) ao lado dos outros badges, mesma lógica de cor + null-guard.

**Sem nova rota, nova view ou refator estrutural.** Apenas additions em CargoConteudoView. Estimativa: ~60-80 linhas tocadas (counting null-guards).

### 6.2 `PlanoEstudoBuilderView.vue`

**Zero mudança nesta sprint** (D26). PlanoBuilder lê `disc.score` e `ass.score` — esses campos agora refletem a fórmula nova, ranking sai naturalmente atualizado.

> Adaptações 1-6 listadas na memória `project_priorizacao_analise_integracao` (projeto `legislacao`, §"Adaptações esperadas no PlanoBuilder") ficam pra fase 2 dedicada, após você sentir como o ranking PR7 se comporta em 3-5 cargos reais.

### 6.3 Outros componentes

- **`SugestaoCorteCard`** / **`SugestaoSemanaCard`** — consomem score top-level, não precisam mudar.
- **`PreferenceUserStore`** — não toca priorização.

---

## 7. Schema do `cargo.priorizacao` pós-PR7

Mudança aditiva — backwards-compatible com PR6.

```js
priorizacao: {
  disciplinas: [
    {
      nome,
      equivalente_historico,
      score,                              // mean dos assuntos (D13) — nova fórmula
      score_v1,                           // NOVO (D24) — fórmula PR6 antiga
      tendencia,
      fonte_cascata,
      metricas: {
        score, score_v1,                  // NOVO score_v1
        presenca, peso_medio, peso_medio_normalizado, peso_no_universo,
        tendencia, tendencia_slope, consistencia,
        recencia,                         // NOVO (D21) — fração 0..1
        recencia_anos_cobertos,           // NOVO — 0..min(3, |universo|), numerador pro tooltip
        recencia_anos_total,              // NOVO — denominador real (= min(3, |universo|))
        anos_com_prova, anos_que_cobraram,
        fonte_cascata, cobertura_match, sem_match,
      },
      assuntos: [
        {
          nome, score, score_v1, tendencia, equivalente_historico,
          metricas: { ...mesmo set acima... }
          sub_assuntos: [{ nome, score, score_v1, tendencia, metricas: {...} }]
        }
      ]
    }
  ],
  _meta: {
    schema_priorizacao: 'deterministic_v2',     // CHANGED de 'deterministic_v1'
    weights: { presenca: 0.30, recencia: 0.20, peso_medio: 0.30, tendencia: 0.20 },  // NOVO — snapshot dos pesos no momento da geração (auditoria)
    fonte_cascata_majoritaria,
    anosUniverso,
    /* legacy preservados */
  }
}
```

**`_meta.weights`**: snapshot dos pesos no momento que `gerarPriorizacao` rodou. Permite distinguir cargos analisados antes/depois de eventual recalibração futura sem precisar mexer em data migrations.

**`_meta.schema_priorizacao`** salta para `'deterministic_v2'`. Front pode usar pra detectar se um cargo foi analisado pré- ou pós-PR7 — e mostrar aviso "este cargo precisa ser reanalisado pra ganhar o score com recência" se quiser. Nesta sprint **não exibimos aviso** — basta o mentor reanalisar quando notar (D24 + score_v1 lado-a-lado dão visibilidade suficiente).

**Sem migration retroativa**: cargos antigos seguem com `schema=deterministic_v1`, sem `recencia`, sem `score_v1` (que seria igual ao `score` velho). Reanalisar é manual pelo botão existente.

---

## 8. Plano de implementação faseado

Cada fase termina com **2 rodadas de revisão crítica** (regra `feedback_revisao_dupla_por_fase` da memória `legislacao`) + checagem se a spec precisa ajuste antes de avançar. Sem push entre fases — deploy em batch ao fim da sprint, validação local primeiro (regra `feedback_deploy_batch_validacao_local`).

### Fase 1 — Helpers puros + testes

- `priorizacao.helpers.js`: `WEIGHTS`, `WEIGHTS_V1`, `PESO_RECENCIA`, `calcularRecencia`, `obterJanelaRecente`, `calcularScoreV1`, `calcularScore` (signature nova c/ recência), `calcularMetricasBase` (campos novos `recencia` / `recencia_anos_cobertos` / `recencia_anos_total`). Remover constantes `PESO_PRESENCA` / `PESO_PESO_MEDIO` / `PESO_TENDENCIA` antigas.
- `priorizacao.helpers.test.js`: ~28 testes novos (ver §5.3 distribuição) + migrar ~10 testes antigos do PR6 que importavam `PESO_*` (classificação em §5.3).

**Deliverable:** `npm test` no backend-express verde — ~92 testes (64 base + 28 novos, ~10 dos 64 tocados na migração).
**Custo:** ~3-4h (a migração dos ~10 antigos engole tempo extra além dos novos).

### Fase 2 — Pipeline (montarHistoricoEnriquecido + mergeMetricasNoOutput)

- `montarHistoricoEnriquecido`: passar `janelaRecente`, popular `metricas.score_v1` nos 3 níveis, popular `disc.score_v1`
- `mergeMetricasNoOutput`: já propaga `metricas` inteiro — só validar que `recencia` e `score_v1` chegam ao output. Adicionar `disc.score_v1` no top-level (espelhando `disc.score`)
- `cargo.service.js`: gravar `_meta.weights`, mudar `schema_priorizacao` pra `'deterministic_v2'`
- **Smoke test manual**: rodar `gerarPriorizacao` em 1 cargo de teste local, conferir que JSON output tem todos os campos novos

**Deliverable:** smoke test OK, output JSON bate com schema §7
**Custo:** ~1-2h

### Fase 3 — Frontend display

- `CargoConteudoView.vue`: badges recência (assunto/sub/disciplina), linha `score_v1 → score`, tooltips
- Verificar visualmente em cargo já analisado pré-PR7: campos `recencia`/`score_v1` ausentes → exibir "—" gracefully
- Verificar em cargo recém-analisado pós-PR7: tudo aparece

**Deliverable:** UI mostra recência + comparação v1/v2 sem quebrar cargo legado
**Custo:** ~2-3h

### Fase 4 — Documentação

- `EDITAIS.md` §13: nova subseção 13.4 "Recência (PR7)" com fórmula, janela, edge cases. Atualizar 13.3 (schema) com campos novos
- `EDITAIS.md` §11 (melhorias futuras): mover "Configuração de pesos via UI" pra status atualizado, adicionar pendência fase 2 do PlanoBuilder
- `EDITAIS.md` topo: bumpar "Última atualização" para 2026-05-08 (PR7)

**Deliverable:** docs sincronizados com código
**Custo:** ~30min

### Fase 5 — Validação manual + calibração visual

Você roda em 3-5 cargos reais (mistura de bancas estáveis e erráticas) com este checklist:

1. Reanalisar cargo → priorização carrega com schema_v2
2. Expandir 5 assuntos com perfis diferentes (sólido / subindo / sumindo / raro / fundo) — conferir badges recência batem com seu julgamento
3. Comparar `v1 → v2` em pelo menos 10 assuntos: descrever 2-3 movimentos que **fazem sentido** e 0-2 que **soaram estranhos**
4. Re-rodar geração de plano no mesmo cargo (com score atualizado): observar como o ranking mudou. Esperado **alguma reordenação** (assuntos novos sobem, decadentes caem) — anotar se a reordenação **faz sentido pedagógico** ou se está exagerada / subestimada
5. Anotar ajustes de pesos sugeridos (se houver) num arquivo temporário pra eventual D2-rev em sessão futura

**Deliverable:** documento curto com observações + decisão "manter pesos 30/20/30/20" ou "ajustar para X/Y/Z/W"
**Custo seu:** ~1-2h
**Custo meu:** se houver ajuste → 30min de re-rodar fases 1-2 com pesos novos

### Fase 6 — Commits + push em batch

Quando fase 5 estiver OK (regra `feedback_commit_push_batch_fim_sessao` da memória `legislacao`):

- Commits separados por área (helpers + tests / pipeline / front / docs)
- Push em batch quando você der OK
- Deploy GH Actions automático

---

## 9. Riscos e trade-offs

### R1 — Pesos por palpite informado, não por spike empírico

A regra `feedback_calibracao_threshold_empirico` (memória `legislacao`) recomenda calibração via spike + classificação manual. Estamos pulando isso — D23 documenta a exceção: dev solo, low-traffic, `score_v1` lado-a-lado vira "spike contínuo em produção". Mitigação: D25 (pesos centralizados) torna ajuste trivial.

**Cenário onde o risco se materializa:** mentor descobre, depois de gerar 5 planos, que recência está pesando demais e assuntos sólidos (alta presença + recência baixa em programa cíclico) caíram demais. Custo do ajuste: 30min (mudar `WEIGHTS`, re-testar, reanalisar cargos afetados).

### R2 — Cargos antigos (`schema=deterministic_v1`) não têm recência

Decisão (§7): sem migration retroativa. Cargos antigos seguem com fórmula antiga até serem reanalisados manualmente. Aceitável porque:
- Reanalisar = 1 botão, ~10s/cargo no painel atual.
- Cargos não analisados recentemente provavelmente já têm dados desatualizados de qualquer jeito (ESTATISTICAS muda toda semana com lotes novos).

### R3 — `disc.metricas.recencia` própria vs agregada (D28)

D28 alinha com D18 PR6 — disciplina tem métricas próprias, não agregadas dos assuntos. Mas algum dia alguém vai questionar "por que `disc.recencia = 1.0` se 50% dos assuntos têm recência 0?". Resposta: porque a **disciplina inteira** apareceu nos últimos 3 anos (algum assunto, não importa qual). É a métrica certa pra "matéria está viva no programa?". Se virar confusão, considerar adicionar `disc.recencia_assuntos_media` no fase-2 (não nesta sprint).

### R4 — Recência de sub-assunto raramente útil

Sub-assunto granular cobrado uma vez nos últimos 3 anos = recência 0.33. Pouca discriminação. Aceitável: o score sub-assunto continua sendo dominado por presença + peso. Recência adiciona ruído pequeno, não distorce.

### R5 — `_meta.weights` snapshot pode confundir

Se o mentor mudar `WEIGHTS` no código, cargos antigos continuam mostrando o snapshot antigo em `_meta.weights`. Isso é intencional (auditoria histórica), mas pode confundir leitura: "achei que mudei pra 35/15/30/20, por que aqui mostra 30/20/30/20?". **UI não exibe `_meta.weights` em lugar nenhum nesta sprint** — campo é puro storage para auditoria via JSON inspector. Cargos PR6 (`schema=deterministic_v1`) **não têm `_meta.weights`** — null/undefined. Cargos PR7 (`schema=deterministic_v2`) sempre têm. Se virar pendência futura, expor numa view `/admin/priorizacao-config` (F2-2). Snapshot é gravado com `{ ...WEIGHTS }` (clone, não referência ao Object.freeze) pra evitar acoplamento entre re-renders se um dia o `Object.freeze` for relaxado.

**Granularidade do snapshot — por cargo, não por disciplina:** `cargo.service.js` sobrescreve `_meta.weights` em **toda** análise (incluindo re-análise parcial onde só 1 disciplina foi atualizada). Consequência: se o mentor reanalisar a disc A com pesos `30/20/30/20`, depois mudar pesos pra `35/15/30/20` no código e reanalisar a disc B, o snapshot final é `35/15/30/20` — perde-se o registro de que a disc A foi calculada com pesos antigos. Score da disc A continua válido (não muda até que ela seja reanalisada), mas a auditoria do `_meta.weights` deixa de bater. Aceito como trade-off (dev solo, low-traffic, recalibração rara). Se virar problema, F2 considera `disc.metricas.weights_snapshot` por disciplina.

### R6 — Schema bump acumulado sem migration retroativa

Vamos de `'deterministic_v1'` (PR6) → `'deterministic_v2'` (PR7) sem migration. Cargos antigos ficam estacionados. Se daqui a 6 meses surgir PR8 com `'deterministic_v3'`, cargos `_v1` ficam 2 versões atrás. Cada bump é trivial (reanalisar = 1 botão), mas a soma de cargos defasados pode crescer. Aceito porque (a) cargos não-recentes provavelmente já têm histórico desatualizado por outras razões (lotes novos chegam toda semana em ESTATISTICAS), (b) reanalisar é idempotente. Se virar problema, considerar batch migration script no futuro.

### R7 — Mix de schemas em re-análise parcial

PR6 já permite re-análise parcial (1 disciplina por vez), mantendo as outras com priorização antiga. Pós-PR7, isso significa que um cargo pode ter disciplinas com `metricas.score_v1`/`recencia` e disciplinas sem (analisadas pré-PR7). Front (§6) precisa renderizar gracefully — campo ausente ⇒ "—" no badge, esconder linha v1→v2 da disciplina afetada. Aceito porque seguir o padrão PR6.

---

## 10. Pendências de fase 2 (não escopadas aqui)

Ficam fora desta sprint, listadas pra retomar em sessão futura:

- **F2-1** — `PlanoEstudoBuilderView` adapta-se à recência (filtro "só recência ≥ N%", tipo de tarefa modulado por recência, distribuição temporal). Detalhamento na memória `project_priorizacao_analise_integracao` (projeto `legislacao`, §"Adaptações esperadas").
- **F2-2** — UI de admin pra configurar pesos (substitui edit manual em `WEIGHTS`).
- **F2-3** — Banner em `CargoConteudoView` quando `schema_priorizacao === 'deterministic_v1'` ("este cargo precisa ser reanalisado pra ganhar score com recência").
- **F2-4** — Engine compartilhada entre `recurrenceAnalysis.js` (front) e `priorizacao.helpers.js` (back). Caminho C da memória `project_priorizacao_analise_integracao` (§"3 caminhos"). Adiado — só vale com mais consumidores da engine.

---

## 11. Atualização de docs (parte da Fase 4)

Arquivos atualizados nesta spec:

1. **`boilerplate-vue/documentation/EDITAIS.md`**:
   - §13.3 (schema) — adicionar `score_v1`, `recencia`, `recencia_anos_cobertos` no exemplo.
   - **Nova §13.4** — "Recência (PR7) — detalhes do modelo". Definição da janela, fórmula, edge cases. ~50 linhas.
   - §11 (melhorias futuras) — mover "Configuração de pesos via UI" pra "fase 2 PR7"; adicionar "PlanoBuilder consumir recência" como pendência F2-1.
   - §12 (status) — adicionar bloco "PR7 — Recência" com checklist Fase 1-6.
   - Topo — bumpar "Última atualização" pra 2026-05-08.

2. **`legislacao/.claude/projects/.../memory/`** (a fazer no fim da sessão):
   - Novo `project_pr7_recencia_entregue.md` quando entregar (substitui `project_priorizacao_analise_integracao.md` ou complementa? — decidir no fim).
   - `MEMORY.md` index atualizado.

---

## 12. Changelog

| Data | Mudança |
|------|---------|
| 2026-05-08 | Spec PR7 inicial (D21–D28, D2 alterada) |
