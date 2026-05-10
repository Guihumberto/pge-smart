# Quebra de assunto em N tasks de 1-2h — Spec PR8

**Data:** 2026-05-08
**Status:** 🟡 Aprovada — pendente implementação
**Escopo:** evoluir `sugerirProximaMeta` em `plano.generator.js` pra que assuntos longos sejam quebrados em N tasks respeitando a regra "1-2h por task" (soft) e a estrutura natural do conteúdo (sub-assuntos → faixas de artigos → fallback tempo). Toca `backend-express` (4 arquivos novos/modificados). Não toca front nem `back_leges` (apenas consome endpoint existente).

> Decisões D1–D28 (PR6 + PR7) permanecem em vigor. Esta spec adiciona D29–D38. Numeração contínua propositalmente.

---

## 1. Motivação

Hoje o gerador de meta (`sugerirProximaMeta`) faz round-robin por disciplina e gera **1 task por assunto pendente**. O `tipo_fonte` do assunto vira `tipo` da task (`legislacao` → `lei_seca`, etc.). Funciona quando o assunto é curto (1-2h). Quebra quando é longo:

- Assunto "Obrigação tributária" tem CTN arts 113-138 + 5h estimadas → vira **1 task de 5h**, violando a restrição "1-2h por task" do produto.
- Assunto com 4 sub-assuntos não usa essa estrutura — todos os subs viram conteúdo agregado de 1 única task.
- Não há task de **questões dedicada** ao assunto: o aluno estuda mas não pratica imediatamente.

Mentor compensa hoje editando manualmente cada task gigante no ModalTask (define `artsFilter`, divide em 2-3 tasks no olho, adiciona task de questões manual). Repetitivo, sujeito a erro, perde a coordenação pedagógica.

PR8 automatiza essa quebra: respeita a estrutura natural do conteúdo, gera task companion de questões quando o banco tem disponibilidade, coordena as orientações IA pra que as N tasks formem uma sequência pedagógica.

---

## 2. Decisões aprovadas

| # | Decisão | Status |
|---|---------|--------|
| D29 | **Quebra adaptável em árvore de decisão**: (a) integro se carga ≤ 2h e 1 lei; (b) por sub-assuntos com `arts_referencia` se Fase 1 anotou; (c) IA split como fallback quando subs não anotados ou ausentes; (d) chunks de tempo (~1.5h cada) quando assunto é puramente doutrinário. Ver §4 algoritmo completo | ✅ |
| D30 | **Limites 1-2h por task são SOFT** — sugestão, não hard cap. Algoritmo prioriza coesão pedagógica (sub-assunto unitário coerente) sobre regra de tempo. Tasks de 0.8h ou 2.5h são aceitas se a estrutura assim mandar. Front mostra carga real, mentor edita se quiser | ✅ |
| D31 | **1 chamada IA por assunto, retornando N orientações coordenadas** (não 1 chamada por task). IA recebe contexto do conjunto de tasks do assunto e gera orientações encadeadas ("aplique o que viu na task 1"). Custo IA igual ou menor que hoje, qualidade pedagógica superior. Ver §6 | ✅ |
| D32 | **`arts_referencia` por sub-assunto na Fase 1** — campo opcional novo no schema do sub-assunto. IA da classificação preenche quando o sub é regido por norma específica (ex: `"142-150"` pra "Lançamento" do CTN). Quando ausente, gerador chama **IA split dedicada** (fallback) na hora da quebra. Ver §5 | ✅ |
| D33 | **Threshold "array não-vazio" pra gerar task `questoes` companion**. Consulta `POST /questoes/impressas` no `back_leges` (recebe `{id_law, id_art: [...]}`) — retorna até 10 questões do banco SEM filtro de usuário. Se array não-vazio → há ≥ 1 questão pros arts requeridos → gera task companion. Granularidade por-artigo (saber quais arts específicos têm questões) fica em fase 2 (precisa endpoint novo no `back_leges`, F2-1). Ver §7 | ✅ |
| D34 | **Cache em memória por execução** do `sugerirProximaMeta` — Map `{idLaw → totalPorArt}` evita refetch do `back_leges` quando vários assuntos da meta usam a mesma lei (CTN compartilhado entre disciplinas tributárias). 1 fetch por lei única por geração de meta | ✅ |
| D35 | **Schema bump independente** — `_meta.schema_classificacao = 'v2'` pra cargos analisados com prompt PR8 (anotação `arts_referencia`). Independente de `schema_priorizacao` (PR7). Os 2 eixos coexistem ortogonalmente | ✅ |
| D36 | **Namespace `_pr8` na task gerada** pra metadados de chunk (`chunkOrigem`, `chunkIndex`, `chunkTotal`, `assuntoOriginal`). Não polui campos top-level que ModalTask consome. Front antigo ignora gracefully | ✅ |
| D37 | **Sem migration retroativa do `arts_referencia`** — cargos analisados pré-PR8 caem no IA split na primeira meta (custo IA extra aceitável). Reanálise manual atualiza pro novo schema | ✅ |
| D38 | **Falha grácil em todas as integrações IA/HTTP** — IA split falha → fallback proporcional cego + warn; `back_leges` indisponível → tasks `lei_seca` geradas, `questoes` companion não; orientações IA falham → tasks ficam sem `orientacao` field. Geração de meta nunca aborta por essas falhas | ✅ |

---

## 3. Componentes (arquivos)

### Novos

```
backend-express/src/modules/plano-estudo/
├── quebrarAssunto.helpers.js       (helper puro — função de quebra)
├── quebrarAssunto.helpers.test.js  (~15 testes unitários)
├── orientacoesCoordenadas.js       (1 chamada IA → N orientações)
└── orientacoesCoordenadas.test.js  (~6 testes)

backend-express/src/utils/
├── questoesArtClient.js            (wrapper cross-service back_leges)
└── questoesArtClient.test.js       (~3 testes com fetch mockado)
```

### Modificados

```
backend-express/src/modules/plano-estudo/plano.generator.js
  - sugerirProximaMeta refatorado pra orquestrar quebra + companion + orientações
  - confirmarMeta atualizado pra aceitar _pr8, formQuestions pré-montado pelo orquestrador
    e id_disciplina resolvido (hoje monta formQuestions do zero descartando input — ver §6.4)
  - gerarOrientacoesTasks descontinuado (substituído por orientacoesCoordenadas)

backend-express/src/modules/edital-cargos/cargo.service.js
  - Prompt da Fase 1 da análise (classificação) ganha instrução de arts_referencia
  - _meta.schema_classificacao = 'v2' nos cargos analisados pós-PR8

backend-express/src/modules/edital-cargos/priorizacao.helpers.js
  - mergeMetricasNoOutput valida e propaga arts_referencia opcional do sub-assunto
    (string mantida; não-string descartada com warn)
```

### Não toca

- `boilerplate-vue/src/views/PlanoEstudoBuilderView.vue` — apenas consome a meta sugerida (mais tasks geradas, mesmo shape)
- `boilerplate-vue/src/components/workspace/ModalTask.vue` — task gerada bate exatamente com shape esperado
- `back_leges` — apenas consome endpoint `POST /questoes/estatistica-artigo` existente
- Frontend do aluno (legislacao) — tarefas chegam no shape persistido

---

## 4. Algoritmo `quebrarAssunto`

Função pura, testável sem ES, sem IA. Recebe assunto enriquecido + opts; retorna lista ordenada de chunks que viram tasks downstream.

### 4.1 Assinatura

```js
/**
 * @param {Object} args
 * @param {Object} args.assunto — saída do PR6/PR7 com nome, leis_referencia, tipo_fonte, sub_assuntos[], carga_estimada_horas
 * @param {Object} args.disciplina — { nome }
 * @param {Object} [args.opts] — { pisoH=1, tetoH=2 }
 * @param {Function} args.iaSplit — async (assunto, faixaArts) => [{rotulo, arts}]. Injetado pelo
 *   caller. Em produção: orquestrador `gerarTasksDoAssunto` em `plano.generator.js` cria callback
 *   que chama `chamarIA` com prompt do IA split. Em testes: mock determinístico.
 * @returns {Promise<Chunk[]>} chunks ordenados; cada chunk é { rotulo, arts, idLaw, cargaEstimadaH, origem, tipoTask }
 */
export async function quebrarAssunto({ assunto, disciplina, opts, iaSplit })
```

`iaSplit` **sempre** é parâmetro obrigatório — `quebrarAssunto` é puro do ponto de vista do mockable side-effect: testes injetam stub que retorna shape fixo, produção injeta callback que faz a chamada real.

### 4.2 Árvore de decisão

```
1. Pré-checagens:
   - assunto.carga ausente/null/<=0 → assume 1.5h + warn
   - assunto.leis_referencia vazia → caminho "doutrinário" (caso 4)
   - assunto.leis_referencia tem múltiplas leis → trata cada lei como assunto separado lógico,
     concatena resultados. Carga distribuída proporcional entre leis.

2. Caminho "íntegro" (carga ≤ tetoH e 1 lei sem complexidade):
   → 1 chunk com rotulo=assunto.nome, arts=todos da lei (parser), origem='integro'

2b. Caminho "íntegro com arts_referencia no nível do assunto" (PR8 edge case):
   - Assunto tem arts_referencia preenchido no nível pai (não nos subs) E carga > tetoH E sem subs
     (ou subs sem arts_referencia):
     → Se carga ≤ ~3h: 1 chunk íntegro com arts=parse(assunto.arts_referencia), origem='integro'
     → Se carga > ~3h: vai pro caminho 4 (IA split) usando assunto.arts_referencia
       como faixa de entrada (não a lei inteira).

3. Caminho "estrutural" (sub-assuntos com arts_referencia preenchido):
   - Cada sub vira 1+ chunks:
     - sub.carga ≤ tetoH → 1 chunk com sub.arts
     - sub.carga > tetoH → divide arts proporcionalmente em chunks de ~1.5h
   - origem='sub_assunto'

4. Caminho "IA split" (subs sem arts ou sem subs):
   - Chamada async iaSplit(assunto, faixaArts, contextoLeis):
     prompt: "Assunto X, lei(s) Y[+Z], arts (faixa total ou assunto.arts_referencia se existe),
              carga K horas, tipo_fonte ['legislacao']. Divida em chunks coerentes
              semanticamente, 1-2h cada. Retorne [{rotulo, arts:[...]}, ...]"
     **Quando assunto.tipo_fonte inclui 'legislacao', IA DEVE produzir chunks com `arts` populado**
     (não pode retornar chunks vazios). Prompt instrui isso explicitamente.
     **Quando assunto tem múltiplas leis E sem subs diferenciados, prompt recebe contexto de
     todas as leis** e instrui IA a produzir chunks separados por lei (ex: chunks 1-3 da CTN,
     chunks 4-5 da Lei 8.137).
   - Validação do retorno:
     - Array não-vazio?
     - Pra assuntos legislativos: arts dentro do range total + não-vazio?
     - rotulo string não-vazia?
     - Se multi-lei: cada chunk identifica qual lei? (campo `idLaw` opcional no retorno IA)
   - Sucesso → chunks com origem='ia_split'
   - Falha (IA timeout, JSON inválido, validação falha) → fallback caso 5

5. Caminho "tempo proporcional" (fallback do fallback ou doutrinário):
   - Sem leis_referencia: chunks de Math.ceil(carga/1.5)h cada,
     rotulo "Parte X de Y", arts=[], origem='tempo_proporcional'
   - Com leis_referencia mas IA falhou: divide arts em chunks contíguos de tamanho
     ~Math.ceil(arts.length / N) onde N=Math.ceil(carga/1.5), atribui rotulos genéricos
     ("Bloco 1 de N — arts X-Y"), origem='tempo_proporcional'
```

### 4.3 Parser de `arts_referencia` / `leis_referencia`

Reusa `parseArticles()` do front (arquivo real: `boilerplate-vue/src/utils/articleParser.js` — descoberta P3 confirmou nome). Duplica pra `backend-express/src/utils/articleParser.js` na implementação. Função existente suporta exatamente os formatos que a spec precisa (`"1-5"`, `"1 a 5"`, `"1ao5"`, `"1, 5 a 10, 100"`); strings com parágrafos/incisos/`§` retornam `{ resolved: [], error: '...' }` — caller trata como vazio + warn → cai no IA split.

Formatos suportados:
- `"142-150"` → `[142, 143, ..., 150]`
- `"1, 5 a 10, 100"` → `[1, 5, 6, 7, 8, 9, 10, 100]`
- `"art 142, §1 a §3"` → string não-parseável → trata como vazio + warn
- `"toda a lei"` → string não-parseável → trata como vazio + warn

Strings não-parseáveis caem no IA split (caminho 4) — o algoritmo se auto-recupera.

### 4.4 Estrutura do chunk retornado

```js
{
  rotulo: 'Lançamento (arts 142-150)',         // título humano (vai pro task.title)
  arts: [142, 143, ..., 150],                   // pra filterLaw.artsFilter; [] em chunks doutrinários
  idLaw: 'CTN_id',                              // primeira lei do assunto; null em chunks doutrinários
  cargaEstimadaH: 1.5,                          // sub.carga ou divisão proporcional
  origem: 'sub_assunto',                        // 'integro' | 'sub_assunto' | 'ia_split' | 'tempo_proporcional'
  tipoTask: 'lei_seca'                          // tipo da task gerada (ver §4.4.1 abaixo)
}
```

### 4.4.1 Mapeamento `chunk → tipoTask`

`tipoTask` é derivado da combinação de `idLaw` + `tipo_fonte` do assunto:

```
- chunk.idLaw presente E 'legislacao' em tipo_fonte    → 'lei_seca'
- chunk.idLaw ausente E 'doutrina' em tipo_fonte       → 'leitura_pdf'
- chunk.idLaw ausente E 'jurisprudencia' em tipo_fonte → 'leitura_pdf'
- chunk.idLaw ausente E 'teoria' em tipo_fonte         → 'leitura_pdf'
- nenhum dos acima                                     → 'outras' (mentor decide depois)
```

Reusa lógica do `mapTipoFonte` existente em `plano.generator.js:508`, estendendo pra considerar presença de `idLaw`. Companion `questoes` só aplica quando `tipoTask === 'lei_seca'` (precisa de `idLaw` + `arts` pra filtrar disponibilidade).

### 4.5 Edge cases

- Subs sobrepostos (sub A `1-10`, sub B `5-15`): mantém como mentor classificou. IA Fase 1 errou → mentor edita.
- Multi-lei: chunks de cada lei separados; carga proporcional por lei (`carga/N_leis`).
- IA split retorna lixo (arts fora do range, vazio): fallback proporcional cego + log warn.

---

## 5. Integração com Fase 1 da análise

### 5.1 Schema atualizado (sub-assunto)

```js
sub_assuntos: [
  {
    nome: 'Lançamento',
    tipo_fonte: ['legislacao'],
    leis_referencia: ['CTN'],
    arts_referencia: '142-150',          // NOVO PR8 — string livre, opcional
    carga_estimada_horas: 1.5,
  }
]
```

### 5.2 Mudança no prompt da Fase 1

Aditiva. Localização: `cargo.service.js` (ou `cargo.classificacao.prompt.js` se extraído). Adiciona instrução:

```
Pra cada sub-assunto:
  ...
  - "arts_referencia": string opcional. Preencha SOMENTE quando o sub-assunto
    é regido por uma faixa específica de artigos da lei do assunto-pai
    (ex: "142-150" pra "Lançamento" do CTN). Se o sub for genérico ou
    regido pela lei toda, OMITIR. Use a notação mais natural: "X-Y", "X, Y, Z",
    "X-Y, Z-W". Não tente abranger jurisprudência ou doutrina aqui.
```

### 5.3 Validação no merge

Em `backend-express/src/modules/edital-cargos/priorizacao.helpers.js` → função `mergeMetricasNoOutput` (mesmo arquivo do PR6/PR7). Adicionar validação de `arts_referencia`:
- String? Mantém no objeto de saída (parser do `quebrarAssunto` é tolerante).
- Não-string (number, object, null explícito)? Descarta + log warn.
- Ausente? Mantém ausente (campo opcional).

Sem rejeição da resposta inteira — campo é opcional. Validação localizada no nível do sub-assunto durante o merge `iaOutput → cargo.priorizacao`.

### 5.4 Schema bump

Cargo analisado com prompt novo recebe `_meta.schema_classificacao = 'v2'`. Cargos antigos continuam com `'v1'` ou ausente. Eixo independente de `schema_priorizacao` (PR7).

### 5.5 Compatibilidade retroativa

- Cargos PR6/PR7 (sem `arts_referencia` nos subs) → caem no IA split do `quebrarAssunto` na primeira meta. Funciona, custo IA extra.
- Reanálise do cargo (botão "Analisar" do CargoConteudoView) re-roda Fase 1 com prompt novo → preenche `arts_referencia`. Próxima meta usa quebra determinística.
- **Sem migration retroativa** (R2 — D37).

### 5.6 Custo IA da Fase 1

Aditivo. ~30 caracteres por sub que ganha `arts_referencia` × ~5 subs/disc × ~10 disc = ~1.5KB extra por análise.

**⚠️ Correção pós-validação manual (2026-05-08):** estimativa "~1.5KB" subestimou cargos grandes (50+ subs). Em cargos como Direito Administrativo de PGE com 3-4 leis grandes (Lei 8.112, 8.666, 14.133), output da Fase 1 cresceu de ~20KB pra ~31KB+ (acima do limite default `max_tokens=8000` do `chamarIA`). Resultado: JSON truncado no meio, `extractGenericJson` falhou em recuperar, Fase 1 retornou `{ disciplinas: [] }` silenciosamente, Fase 2 (mapping) seguiu com input vazio e retornou `finish_reason: stop` → AppError 500. **Fix aplicado**: `max_tokens` da chamada Fase 1 elevado pra **24000**; `max_tokens` da Fase 2 (mapping) elevado de 16000 pra 24000 como defesa adicional. Bug registrado pós-validação manual do usuário em cargo Procurador PGE/AL.

---

## 6. Orientações coordenadas (1 chamada IA → N orientações)

### 6.1 Helper `orientacoesCoordenadas.js`

```js
/**
 * @param {Object} args
 * @param {Object} args.assunto — { nome, ... }
 * @param {Object} args.disciplina — { nome }
 * @param {string} args.banca, args.orgao, args.concurso, args.cargo — contexto
 * @param {Task[]} args.tasks — chunks já montados (lei_seca + questoes intercaladas)
 * @returns {Promise<{ taskIdx: number, orientacao: string }[]>}
 */
export async function gerarOrientacoesCoordenadas({ assunto, disciplina, banca, orgao, concurso, cargo, tasks })
```

### 6.2 Estrutura do prompt

```
Assunto: "${assunto.nome}"
Disciplina: "${disciplina.nome}"
Banca: ${banca} — Órgão: ${orgao} — Concurso: ${concurso} — Cargo: ${cargo}

O aluno vai estudar este assunto em ${tasks.length} tasks sequenciais:
${tasks.map((t, i) => `  Task ${i+1}: ${t.type} — ${t.title} — ${t.carga}h`).join('\n')}

Pra cada task, gere uma orientação curta (2-3 frases) que:
  - Foca no aspecto específico da task (instrui o como, não repete o que)
  - Encadeia com tasks anteriores quando faz sentido
  - Considera estilo da banca (FCC = lei seca + literalidade; CESPE = certo/errado;
    FGV = casos práticos; etc.)

Retorne APENAS JSON válido: [{"taskIdx": 1, "orientacao": "..."}, ...]
```

### 6.3 Fluxo no orquestrador

```js
async function gerarTasksDoAssunto(assunto, ctx) {
  const chunks = await quebrarAssunto({ assunto, disciplina, opts, iaSplit: ctx.iaSplitFn })
  const tasks = []
  for (const chunk of chunks) {
    // Monta task principal do chunk (lei_seca | leitura_pdf | outras conforme chunk.tipoTask — §4.4.1)
    tasks.push(montarTaskDoChunk(chunk, { assunto, disciplina, ...ctx }))

    // Companion `questoes` só pra chunks lei_seca (precisa idLaw + arts pra filtrar disponibilidade)
    if (chunk.tipoTask === 'lei_seca' && chunk.idLaw && chunk.arts.length > 0) {
      const stats = ctx.questoesCache.get(chunk.idLaw) ?? await arasComQuestoes({ idLaw: chunk.idLaw, arts: chunk.arts, cpf: ctx.cpf })
      ctx.questoesCache.set(chunk.idLaw, stats)
      const artsComQ = chunk.arts.filter(a => stats.totalPorArt.get(a) >= 1)
      if (artsComQ.length > 0) {
        tasks.push(montarQuestoesTask(chunk, artsComQ, { assunto, disciplina, ...ctx }))
      }
    }
  }

  // Coordena orientações IA
  try {
    const orientacoes = await gerarOrientacoesCoordenadas({ assunto, disciplina, ...ctx, tasks })
    for (const { taskIdx, orientacao } of orientacoes) {
      if (tasks[taskIdx - 1]) tasks[taskIdx - 1].orientacao = orientacao
    }
  } catch (e) {
    log.warn(`[orientacoes] falhou pra assunto ${assunto.nome}: ${e.message}`)
  }

  return tasks
}
```

Onde:
- `montarTaskDoChunk(chunk, opts)` — switch interno no `chunk.tipoTask` produz task com shape compatível com ModalTask (§8.1 lei_seca, §8.2 leitura_pdf análogo).
- `montarQuestoesTask(chunk, artsComQ, opts)` — task companion (§8.2 questoes).
- `ctx.iaSplitFn` — callback IA criado pelo orquestrador no início de `sugerirProximaMeta`.

### 6.4 `confirmarMeta` — mudança obrigatória pra persistir os campos novos

Hoje `confirmarMeta` em `plano.generator.js:330+` faz **whitelist explícito** ao chamar `createDoc(INDEX.TASKS, taskId, {...})` (linhas 403-421). Campos não listados são descartados silenciosamente. Adicionalmente, `formQuestions` é montado **do zero** (linhas 392-401) ignorando o que vem em `t.formQuestions`.

PR8 precisa modificar `confirmarMeta` em 3 pontos:

1. **Aceitar `_pr8` no shape persistido** — adicionar `_pr8: t._pr8 || null` ao objeto do `createDoc`. Sem isso, metadados de chunk são perdidos na primeira persistência.

2. **Aceitar `formQuestions` pré-montado pelo orquestrador** — quando `t.formQuestions` chega populado (PR8), respeita; quando não chega (status quo), monta do zero (compat retroativa).

3. **`id_disciplina` continua `[]` (descoberta P2 cancelou a resolução automática)** — task `questoes` é gerada com `formQuestions.id_disciplina: []`. Mentor preenche no ModalTask. `confirmarMeta` mantém comportamento atual de não-zerar (já trata array vazio gracefully).

```js
// confirmarMeta linha ~403, antes:
formQuestions: isLeiSeca ? { /* hardcoded zero */ } : null,
// PR8:
formQuestions: t.formQuestions ?? (isLeiSeca ? buildFormQuestionsDefault(t) : null),
```

### 6.5 Resolução `id_disciplina` (degradação consciente — P2 da descoberta)

**Descoberta P1-P5 confirmou que NÃO existe endpoint de resolver `nomeDisciplina → idDisciplina` no `back_leges`** (busquei `findDisciplinaByName`, `searchDisciplina`, rotas `/disciplina*` — nada). Criar endpoint novo expandiria escopo (3º repo).

**Decisão MVP**: pular a resolução. Task `questoes` companion sempre é gerada com `formQuestions.id_disciplina: []`. Mentor preenche manualmente no ModalTask quando abrir a task pela primeira vez (UX já existente — disciplina é um v-autocomplete preenchível).

Trade-off:
- **Custo**: 1 clique extra por task `questoes` quando o mentor edita.
- **Benefício**: zero modificação no `back_leges`, zero risco de quebrar API existente, MVP mais rápido.
- **F2-X (pendência futura)**: criar endpoint `GET /disciplinas/by-name` + helper `resolverIdDisciplina` cacheado, automatizar.

**Sem helper `resolverIdDisciplina` na Fase 3.** Spec original previa esse helper; descoberta P2 cancelou.

### 6.4 Comportamento de falha

- IA timeout/erro → tasks vão pra meta sem `orientacao` field.
- JSON malformado → tenta extrair via regex `\[.*\]`; se ainda inválido, fallback gracioso.
- Array com tamanho ≠ tasks → aplica orientações que casam por `taskIdx`, ignora as inválidas.

### 6.5 Custo IA

| Hoje (PR7) | PR8 |
|---|---|
| 1 call por task priorizada (~12 calls/meta) | 1 call por assunto (~6 calls/meta) |
| Tokens: ~50k/meta | Tokens: ~45k/meta |

Custo IA igual ou menor, qualidade pedagógica superior.

### 6.6 Edge cases

- Assunto com 1 task só → ainda chama IA (uniformidade, custo desprezível).
- Assunto sem `tipo_fonte` claro → pula chamada, orientação vazia (mentor edita).
- 8 assuntos × 1 chamada = 8 chamadas serial via `await` em loop. Evita rate-limit.

---

## 7. Cross-service `back_leges` (`questoesArtClient.js`)

### 7.1 Wrapper

```js
/**
 * @param {{ idLaw: string, arts: number[], cpf: string }} params
 * @returns {Promise<{ disponivel: boolean, exemploCount: number, _explicitlyEmpty?: boolean }>}
 *
 * disponivel = true quando back_leges responde 200 com array de questões não-vazio.
 * exemploCount = quantas questões vieram (0..10, limite do endpoint).
 * _explicitlyEmpty = true quando back_leges respondeu 200 mas array vazio (lei/arts sem questões cadastradas).
 */
export async function verificarQuestoesDisponiveis({ idLaw, arts, cpf })
```

### 7.2 Comportamento

- Chama `POST /questoes/impressas` no `back_leges` com `{ id_law: idLaw, id_art: arts }` + auth do mentor (cpf via header).
- **Endpoint existente**: retorna até **10 questões** do índice `questoes_v2` filtradas por `id_law + id_art[]` (sem filtro de usuário). Não é aggregation — é busca real (`size: 10`).
- Threshold (D33): `disponivel = response.length > 0`. Se `true`, gera task `questoes` companion. Se `false`, não gera.
- **Limitação aceita**: granularidade por-artigo (saber quais arts específicos do chunk têm questões) NÃO é exposta — endpoint atual não retorna agregação por art. Pra MVP, threshold "ao menos 1 questão pra arts agregados" é suficiente. Granularidade fina vira F2-9 (endpoint novo no `back_leges`).

### 7.3 Falha grácil

- Network error / 4xx / 5xx / timeout → retorna `{ disponivel: false, exemploCount: 0 }` (sem `_explicitlyEmpty`) + warn.
- Resposta 200 com array vazio → retorna `{ disponivel: false, exemploCount: 0, _explicitlyEmpty: true }`.
- CPF do mentor não disponível (raro) → retorna `disponivel: false`, gera só lei_seca, sem companion.

### 7.4 Cache em memória por execução

`sugerirProximaMeta` cria `ctx.questoesCache = new Map()` no início. Chave do cache: `${idLaw}:${arts.join(',')}` (ou hash equivalente). Wrapper só cacheia respostas bem-sucedidas:

```js
const cacheKey = `${idLaw}:${arts.sort((a,b)=>a-b).join(',')}`
let resultado = ctx.questoesCache.get(cacheKey)
if (!resultado) {
  resultado = await verificarQuestoesDisponiveis({ idLaw, arts, cpf })
  if (resultado.disponivel || resultado._explicitlyEmpty) {
    // Só cacheia em sucesso. Falha de rede deixa resultado sem flags — não cacheia.
    ctx.questoesCache.set(cacheKey, resultado)
  }
}
```

**Hit rate menor que se fosse só `idLaw`** — porque chunks diferentes da mesma lei têm `arts` diferentes (ex: chunk 1 = arts 113-121, chunk 2 = arts 122-130). Mas evita ainda assim refetches quando o mesmo cargo tem chunks idênticos (raro mas possível).

**Tamanho do cache**: ~ `(N_leis × N_chunks_por_lei)`. Típico 2-5 leis × 1-3 chunks = 2-15 entradas. Máximo prático ~100. Sem TTL nem LRU. Descartado ao fim de cada `sugerirProximaMeta`.

Por meta típica (~6 assuntos com chunks variados), reduz fetches de ~20 pra ~10-15 (ganho menor que originalmente projetado, mas ainda vale).

---

## 8. Schema da task gerada

### 8.1 Task `lei_seca`

```js
{
  // Comuns
  type: 'lei_seca',
  title: 'Lançamento (CTN arts 142-150)',
  description: 'Parte 2 de 4 — Obrigação Tributária',
  link: null,
  orientationId: null,

  // Específicos lei_seca (compatível com ModalTask)
  filterLaw: {
    idLaw: 'CTN_id',
    compilado: true,
    withTags: false,
    tagsFilter: [],
    withMarks: false,
    withQuestions: false,        // questões em task separada companion
    artsFilter: [142, 143, ..., 150],
  },
  formQuestions: null,

  // Plano (existentes)
  disciplina: 'Direito Tributário',
  carga: 1.5,
  tipoFonte: ['legislacao'],
  leisRef: ['CTN'],
  score: 0.62,                   // herdado do assunto
  origem: 'priorizado',
  orientacao: '...',             // texto da IA coordenada (PR8)

  // Metadados PR8 (D36)
  _pr8: {
    chunkOrigem: 'sub_assunto',  // 'integro' | 'sub_assunto' | 'ia_split' | 'tempo_proporcional'
    chunkIndex: 1,
    chunkTotal: 4,
    assuntoOriginal: 'Obrigação tributária',
  }
}
```

### 8.2 Task `questoes` (companion)

```js
{
  type: 'questoes',
  title: 'Questões: Lançamento (CTN arts 142-150)',
  description: 'Aplica o que estudou na task anterior',
  link: null,
  orientationId: null,

  filterLaw: null,
  formQuestions: {
    typeRespQuestions: 0,        // 0 = todos os tipos
    banca: [],
    ano: [],
    favoritas: false,
    id_disciplina: [<id_disc>],  // resolvido por nome (caching durante execução)
    id_subject: [],
    id_area: [],
    name_disciplina: ['Direito Tributário'],
    artsFilter: [142, 144, ...], // só os que TÊM questões (filtrados via back_leges)
    idLaw: 'CTN_id',
  },

  disciplina: 'Direito Tributário',
  carga: 1.0,                    // fixo MVP
  tipoFonte: ['legislacao'],
  leisRef: ['CTN'],
  score: 0.62,                   // mesmo do assunto
  origem: 'priorizado',
  orientacao: '...',

  _pr8: {
    chunkOrigem: 'questoes_companion',
    chunkIndex: 2,
    chunkTotal: 4,
    assuntoOriginal: 'Obrigação tributária',
    artsRequested: [142, ..., 150],   // pre-filtro
    artsComQuestoes: [142, 144, ...], // pós-filtro
  }
}
```

### 8.3 Compatibilidade com persistência

`confirmarMeta` em `plano.generator.js:330` recebe lista de tasks e persiste. Verificação na implementação: confirmar que aceita `filterLaw`, `formQuestions`, `_pr8` (ajustar whitelist se rejeitar). Mudança trivial se necessária.

### 8.4 Resolução `disciplina.nome → id_disciplina`

Helper `resolverIdDisciplina(nomeDisciplina, cpf)` cacheado por execução. Falha → `id_disciplina: []` + warn (mentor seleciona manual no ModalTask).

---

## 9. Plano de implementação faseado

Cada fase termina com **2 rodadas de revisão crítica** (regra `feedback_revisao_dupla_por_fase`) + checagem se a spec precisa ajuste antes de avançar. Sem push entre fases — deploy em batch ao fim da sprint.

### Fase 1 — Helpers puros + testes

- `parseArticles.js` movido pra `backend-express/src/utils/` (compartilhado com front via duplicação leve OU import via path; decisão na implementação)
- `quebrarAssunto.helpers.js` + `~15 testes` (todas as 5 branches do decision tree)
- Mocks IA pra IA split (testes determinísticos)

**Deliverable:** `npm test` verde, ~117 testes (102 PR7 + 15 PR8)
**Custo:** ~1.5 dias

### Fase 2 — Cross-service + orientações

- `questoesArtClient.js` + `~3 testes` (fetch mockado: feliz, erro, vazio)
- `orientacoesCoordenadas.js` + `~6 testes` (IA mockada)

**Deliverable:** ~126 testes verdes
**Custo:** ~1 dia

### Fase 3 — Orquestrador

- `plano.generator.js` refatora `sugerirProximaMeta` pra usar quebrarAssunto + companion + orientações
- `gerarOrientacoesTasks` legacy depreciada (mantém função mas não é mais chamada; remove em fase 2 do PR8 quando estável)
- Cache em memória por execução
- Resolução `id_disciplina` cacheada
- `~6 testes de integração` com mocks IA + back_leges

**Deliverable:** ~132 testes verdes + smoke test manual rodando `sugerirProximaMeta` em 1 cargo de teste local
**Custo:** ~1.5 dias

### Fase 4 — Fase 1 da análise (prompt + schema bump)

- `cargo.service.js` ou `cargo.classificacao.prompt.js` ganha instrução de `arts_referencia`
- `_meta.schema_classificacao = 'v2'` setado em `analisarConteudo`
- Validação tolerante de `arts_referencia` no merge
- Smoke test: reanalisar 1 cargo local + conferir que `arts_referencia` aparece nos subs

**Deliverable:** smoke test OK
**Custo:** ~0.5 dias

### Fase 5 — Documentação

- Nova `EDITAIS.md §14 — Geração de tasks com quebra adaptável (PR8)`
- Atualizar `EDITAIS.md §12 status` com bloco PR8
- Atualizar `EDITAIS.md §13.3 schema` se task ganhar campos novos exibidos

**Deliverable:** docs sincronizados
**Custo:** ~30min

### Fase 6 — Validação manual

Mentor (você) gera meta em 2-3 cargos reais com perfis variados:
1. Cargo PR7-puro (sem reanálise pós-PR8): caem no IA split, gera tasks com `_pr8.chunkOrigem='ia_split'`
2. Cargo reanalisado pós-PR8 (com `arts_referencia` populado): chunks com `chunkOrigem='sub_assunto'`
3. Cargo com assuntos curtos (carga ≤ 2h): chunks `chunkOrigem='integro'` (sem quebra)

Checklist:
- [ ] Tasks geradas têm carga em [0.5, 2.5]h aproximadamente
- [ ] Tasks `lei_seca` têm `filterLaw.artsFilter` populado corretamente
- [ ] Tasks `questoes` companion aparecem **só onde há questões disponíveis**
- [ ] Orientações IA fazem sentido pedagógico encadeado
- [ ] Mentor consegue editar task no ModalTask sem quebrar (campos compatíveis)

**Deliverable:** documento curto com observações + flag GO/NO-GO
**Custo seu:** ~1-2h

### Fase 7 — Commits + push em batch

Quando Fase 6 estiver OK (regra `feedback_commit_push_batch_fim_sessao`):
- Commits separados por área (helpers + tests / orquestrador / Fase 1 prompt / docs)
- Push em batch quando OK
- Deploy GH Actions automático

**Total:** ~4.5 dias minhas + 1-2h suas

---

## 10. Testes (resumo)

| Suite | Testes novos |
|---|---|
| `quebrarAssunto.helpers.test.js` | ~15 (todas as 5 branches da árvore) |
| `orientacoesCoordenadas.test.js` | ~6 (mocks IA: feliz, malformado, falhas) |
| `questoesArtClient.test.js` | ~3 (fetch mockado: feliz, erro, vazio) |
| `plano.generator.integration.test.js` | ~6 (caminho feliz + degradação) |
| **Total PR8** | **~30** |

Cobertura alvo:
- 100% paths nos helpers puros (todas as branches do decision tree)
- Caminhos felizes + 3-4 caminhos de degradação na integração
- **Front (CargoConteudoView, ModalTask): nenhum teste novo** — front não muda

Total acumulado: ~132 testes no `backend-express`.

---

## 11. Riscos e trade-offs

### R1 — Custo IA em cargos legados (PR6/PR7)

Cargos sem `arts_referencia` nos subs caem todos no IA split. **Total de chamadas IA por geração de meta** (consolidado):

| Cenário | Orientações coordenadas | IA splits | Total |
|---|---|---|---|
| Cargo PR8-completo (Fase 1 reanalisada) | 1 por assunto (~6) | 0 | ~6 |
| Cargo legado (PR6/PR7) sem reanálise | 1 por assunto (~6) | 1 por assunto longo (~3-5) | ~9-11 |

Tokens extras estimados por meta de cargo legado vs PR8-completo: **~10-15k tokens** (IA split adiciona ~2-3k por chamada). Aceitável. Mitigação natural: mentor reanalisa cargo (botão "Analisar") → próxima meta usa quebra determinística (volta pra ~6 chamadas).

### R2 — Sem migration retroativa de `arts_referencia`

Mantém padrão R6 do PR7. Cargos antigos parados até reanálise manual. Reanalisar = 1 botão.

### R3 — Multiplicação de tasks na meta (1 ass = 5+ tasks)

Assunto longo com 4 subs + companions = 8 tasks. Meta de 12-15 tasks dominada por 2 assuntos. Mitigação: `disciplinasPorMeta` e `assuntosPorDisciplina` no config existente já limitam **assuntos** (não tasks). PlanoBuilder vai mostrar contagem de tasks no preview. Config nova `maxTasksPorMeta` em fase 2 se necessário.

### R4 — IA split errar a divisão semântica

IA fallback divide arts por proximidade numérica, não por coesão. Mitigação: `arts_referencia` (Fase 1, mais cuidadoso) é fonte primária. IA split é fallback. Mentor edita no ModalTask se discordar. `_pr8.chunkOrigem='ia_split'` permite identificar e revisar tasks suspeitas.

### R5 — `arts_referencia` formato livre quebra parser

Strings exóticas (`"art 142, §1 a §3"`, `"todos exceto 145"`) → trata como vazio + warn → cai no IA split. Auto-recuperação. Estender parser em fase 2 se padrão recorrente aparecer.

### R6 — `back_leges` indisponível bloqueia task questoes

Se `back_leges` cair, task `questoes` companion não é gerada (zero pra todos os chunks). Mentor recebe meta funcional (lei_seca gerada, questões manuais depois). Sem fallback adicional.

### R7 — Orientações IA inúteis em assunto com 1 task

Pra assunto com 1 chunk íntegro, orientação coordenada é redundante. Custo IA e qualidade marginal igual ao status quo. Mantém uniformidade. Fase 2 considera heurística `if (tasks.length === 1) → template determinístico`.

### R8 — Carga estimada do chunk pode estar errada

Divisão proporcional cega (`carga_assunto / N_chunks`) pode ficar irreal. Mitigação: sub-assunto com `carga_estimada_horas` próprio (campo já existe) tem prioridade. Mentor edita carga no ModalTask.

### R9 — Schema bump `_meta.schema_classificacao` cria 2º eixo de versão

`schema_priorizacao` (PR7) + `schema_classificacao` (PR8) coexistem ortogonalmente. UI não exibe nenhum (debugging/auditoria). Documentar em EDITAIS.md §13.

### R10 — Resolução `id_disciplina` falha

Disciplina nova ou naming divergente → `id_disciplina: []` + warn. Task `questoes` fica sem filtro de disciplina. Mentor seleciona manual. Fase 2: criar disciplina automaticamente em `back_leges` se nome novo.

### R11 — Reanálise parcial cria mix de schemas (heterogeneidade da meta)

PR6 D14 permite re-análise parcial (1 disciplina por vez). Pós-PR8, cargo PR6/PR7 onde mentor reanalisa apenas 1 disciplina fica num estado misto: 1 disciplina com `arts_referencia` populado (schema_v2) + N disciplinas sem (schema_v1). Próxima geração de meta usa **quebra estrutural determinística** na disciplina v2 e **IA split** nas demais — qualidade pedagógica heterogênea, mentor pode estranhar sem entender o motivo.

**Mitigações:**
- Documentar em D37 (acima) que reanálise parcial é a causa raiz.
- Logar nas tasks via `_pr8.chunkOrigem` (`'sub_assunto'` vs `'ia_split'`) — debugging permite identificar.
- Sugestão pra mentor: **reanalisar todo o cargo uma vez pós-deploy do PR8** pra homogeneizar (botão "Analisar" sem filtro de disciplina). Documentar essa orientação na fase de validação manual (§9 Fase 6).
- Fase 2: opção F2-3 (banner "este cargo tem disciplinas pré-PR8 — reanalisar pra ganhar quebra estrutural") complementa.

### R12 — `confirmarMeta` whitelist explícito descarta campos novos silenciosamente

Hoje `confirmarMeta` linhas 403-421 lista os campos persistidos no `createDoc(INDEX.TASKS, ...)`. Sem ajuste, `_pr8`, `formQuestions` pré-montado e `id_disciplina` resolvido **vão pro descarte**, e o mentor não vê erro — só ausência silenciosa de metadados. Mitigação: §6.4 prescreve explicitamente as 3 mudanças em `confirmarMeta`. Adicionar teste de integração que valida persistência roundtrip dos campos novos.

### R13 — Schema bumps acumulados (`_priorizacao_v2` + `_classificacao_v2`)

Já tínhamos `_priorizacao` no PR7; PR8 adiciona `_classificacao`. Cada eixo bumpa independentemente. Cargo pode estar em qualquer combinação `(v1|v2, v1|v2)` = 4 estados possíveis. Cada combinação tem implicações distintas (ex: `priorizacao=v2` + `classificacao=v1` = score com recência mas sem `arts_referencia`). Documentar tabela em EDITAIS.md §13 com os 4 estados + comportamento esperado de cada. Sem alteração de código.

---

## 12. Pendências de fase 2 (não escopadas aqui)

Ficam fora desta sprint, listadas pra retomar em sessão futura:

- **F2-1** — Endpoint novo no `back_leges` (`POST /questoes/disponibilidade-por-arts`) com aggregation por `id_art.keyword` em `INDEX_MAIN` filtrando só `id_law` (sem `id_user`). Retorna `{ por_artigo: [{id_art, count}] }`. Permite granularidade fina (saber quais arts específicos do chunk têm questões) — hoje MVP pega só "ao menos 1 questão pra arts agregados". Threshold configurável (≥ 1 default, ≥ 5 stricter) também entra aqui.
- **F2-9** — Endpoint novo `GET /disciplinas/by-name` no `back_leges` + helper `resolverIdDisciplina` cacheado no `backend-express`. Resolve `nomeDisciplina → idDisciplina` automaticamente, popula `formQuestions.id_disciplina` na task `questoes`. Hoje MVP deixa vazio (mentor preenche).
- **F2-12** — Refatorar `confirmarMeta` (linhas 397-417 do `plano.generator.js`) pra schema explícito de campos persistidos (objeto `TASK_PERSISTIDO_SCHEMA` com mappers). Hoje cresce com cada PR via `t.campo ?? default` + whitelist implícito no `createDoc` — risco de campo silenciosamente descartado em PR9+. Identificado na 8ª rodada de revisão pós-implementação. Padrão sugerido em changelog do EDITAIS.md ou em PR dedicado.
- **F2-2** — Carga proporcional ao número de questões em task `questoes` (`Math.min(2, 0.5 + numQuestoes * 0.05)`)
- **F2-3** — Config `maxTasksPorMeta` se R3 virar problema
- **F2-4** — Heurística "1 task → orientação template" pra economizar IA em casos triviais (R7)
- **F2-5** — Estender parser de `arts_referencia` pra parágrafos / exceções (R5)
- **F2-6** — Batch script `popular_arts_referencia_em_cargos_existentes.js` (R2)
- **F2-7** — Fase 1 enriquecer estimativa de carga por sub-assunto explicitamente (R8)
- **F2-8** — Criação automática de disciplina em `back_leges` quando nome novo (R10)

---

## 13. Atualização de docs (parte da Fase 5)

Arquivos atualizados nesta spec:

1. **`boilerplate-vue/documentation/EDITAIS.md`**:
   - **Nova §14** — "Geração de tasks com quebra adaptável (PR8) — detalhes do modelo". ~80 linhas. Cobrir algoritmo, schema novo, integração back_leges, orientações coordenadas.
   - §12 (status) — adicionar bloco "PR8 — Quebra de assunto" com checklist Fase 1-7.
   - §13.3 (schema PR7) — adicionar nota "schema do task em PR8 ganha `_pr8` namespace; ver §14".
   - **Nova §13.8 (estados combinados de schema PR7×PR8)** — tabela de 4 estados possíveis (R13):

     | `schema_priorizacao` | `schema_classificacao` | Implicação |
     |---|---|---|
     | `v1` (PR6) | ausente/v1 | Cargo nunca reanalisado pós-PR7. Sem score com recência, sem arts_referencia. PR8 cai 100% no IA split. |
     | `v2` (PR7) | ausente/v1 | Cargo reanalisado pós-PR7 mas antes do PR8 (ou só priorização re-rodada). Tem score com recência, mas sem arts_referencia. PR8 cai no IA split. |
     | `v1` (PR6) | `v2` (PR8) | Estado raríssimo (provavelmente impossível em prática) — só Fase 1 atualizada sem reanalisar Fase 2. Documentar como "não esperado". |
     | `v2` (PR7) | `v2` (PR8) | Estado ideal pós-PR8. Quebra estrutural determinística + score com recência. |

   - Topo — bumpar "Última atualização" pra `2026-05-08 (PR7 + PR8)`.

2. **`legislacao/.claude/projects/.../memory/`** (a fazer no fim da sessão):
   - Novo `project_pr8_quebra_assunto_entregue.md` quando entregar.
   - `MEMORY.md` index atualizado.

---

## 14. Changelog

| Data | Mudança |
|------|---------|
| 2026-05-08 | Spec PR8 inicial (D29–D38; algoritmo `quebrarAssunto`, IA split, companion questões, orientações coordenadas) |
