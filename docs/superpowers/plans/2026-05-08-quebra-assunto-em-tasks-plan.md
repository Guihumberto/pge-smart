# Plano de Implementação — PR8 Quebra de Assunto em Tasks

**Spec canônica:** [2026-05-08-quebra-assunto-em-tasks-design.md](../specs/2026-05-08-quebra-assunto-em-tasks-design.md)
**Data:** 2026-05-08
**Status:** 🟡 Pronto pra execução

> Plano alinhado com §9 da spec mas com granularidade de tarefa atômica, dependências, deliverables verificáveis e checkpoints de revisão dupla obrigatórios por fase (regra `feedback_revisao_dupla_por_fase` da memória `legislacao`).

## Princípios

- **Sem push entre fases** — deploy em batch ao fim da sprint, validação local primeiro (`feedback_deploy_batch_validacao_local`).
- **Sem commit progressivo** — commits agrupados ao fim da sprint ou quando o usuário pedir (`feedback_commit_push_batch_fim_sessao`).
- **Revisão dupla pós cada fase** — `feedback_revisao_dupla_por_fase`. Auto + Agent Explore com olhar fresco.
- **Falsos positivos esperados** (~30%) — `#PROC-26`. Cada achado avaliado caso-a-caso com justificativa.
- **`node --check` antes de `npm test`** em cada arquivo modificado (sintaxe primeiro).
- **Verificar antes de afirmar** — `feedback_verificar_antes_afirmar`. Premissas marcadas como "a verificar" abaixo precisam ser checadas no início da fase respectiva.

## Pré-requisitos de descoberta (a verificar antes de começar)

Premissas da spec que precisam validação **antes da Fase 1**:

- [ ] **P1** — Endpoint `POST /questoes/estatistica-artigo` no `back_leges` aceita `{ id_law: [string] }` no body e retorna stats por artigo (referência: `QuestoesStoreController.js:511`). Confirmar shape exato do retorno via grep no service `QuestoesStoreService.getEstatisticaArtigo`.
- [ ] **P2** — Endpoint pra resolver `nomeDisciplina → id_disciplina` no `back_leges` existe? (Spec §6.5 lista como "premissa a verificar"). Provável: `GET /disciplinas?name=...` ou similar. Se não existir, considera-se 2 opções: (a) criar endpoint novo no `back_leges` (escopo expandido) ou (b) deixar `id_disciplina: []` e mentor preenche manual no ModalTask (degradação graciosa, escopo enxuto). **Decidir antes da Fase 3.**
- [ ] **P3** — `parseArticles` no front (`boilerplate-vue/src/utils/parseArticles.js`) atende todos os formatos esperados (`"142-150"`, `"1, 5 a 10, 100"`)? Ler arquivo, confirmar suporte. Se faltar formato (`"art X, §Y"`), spec tolera (cai no IA split).
- [ ] **P4** — Função `chamarIA` em `backend-express/src/utils/iaProvider.js` aceita prompt + retorna JSON parseado? Ou requer pós-processamento? Confirmar shape pra usar uniforme em `iaSplit` e `gerarOrientacoesCoordenadas`.
- [ ] **P5** — Schema persistido em `INDEX.TASKS` aceita campos arbitrários (ES é schemaless por default)? Verificar mapping. Se for strict, `_pr8` precisa entrar no mapping antes do primeiro write.

**Custo estimado da fase de descoberta**: ~1-2h (greps + leitura de 4-5 arquivos pontuais). Reduz risco de Fase 3 travar por surpresa.

---

## Fase 1 — Helpers puros + testes (`quebrarAssunto`)

**Objetivo**: entregar a engine de quebra como módulo puro, totalmente testável sem ES e sem IA real.

### Tarefas

1. **Mover/duplicar `parseArticles.js` para o backend**
   - Ler `boilerplate-vue/src/utils/parseArticles.js`.
   - Criar `backend-express/src/utils/parseArticles.js` com a mesma implementação (duplicação; sincronização manual aceita — código pequeno, mudanças raras).
   - **Não removo do front**, evita romper imports lá.
   - Decisão alternativa (descartada): symlink ou import cross-repo — mais frágil que duplicação.

2. **Criar `backend-express/src/modules/plano-estudo/quebrarAssunto.helpers.js`**
   - Função pura `quebrarAssunto({ assunto, disciplina, opts, iaSplit })` — assinatura §4.1 da spec.
   - Implementar árvore de decisão §4.2: 5 caminhos (íntegro / íntegro com arts no pai / estrutural / IA split / tempo proporcional).
   - Implementar mapeamento `chunk → tipoTask` da §4.4.1 (helper interno).
   - Validação do retorno do `iaSplit` callback (array não-vazio, arts no range, rotulo string).
   - Defaults: `pisoH=1, tetoH=2`, `assunto.carga` ausente → 1.5h + warn.
   - Multi-lei: divisão proporcional + chunks separados por lei (§4.2).

3. **Criar `quebrarAssunto.helpers.test.js` com ~15 casos**
   - Caso 1 (íntegro): carga ≤ 2h + 1 lei → 1 chunk
   - Caso 2 (íntegro com arts no pai): assunto sem subs + `arts_referencia` no nível pai (§4.2 caso 2b)
   - Caso 3 (estrutural): subs com `arts_referencia` → N chunks
   - Caso 4 (sub > tetoH): sub com carga > 2h → divide proporcional internamente
   - Caso 5 (IA split feliz): mock retorna shape válido
   - Caso 6 (IA split lixo): mock retorna arts fora do range → fallback proporcional
   - Caso 7 (IA split timeout): mock rejeita → fallback proporcional
   - Caso 8 (tempo proporcional doutrinário): sem leis → chunks de tempo
   - Caso 9 (tempo proporcional com leis IA falhou): subs sem arts + IA falha → divisão contígua de arts
   - Caso 10 (multi-lei): 2 leis → chunks separados por lei
   - Caso 11 (carga ausente): defaults pra 1.5h + warn
   - Caso 12 (carga 0 ou negativa): defaults
   - Caso 13 (parser arts_referencia tolerante): "142-150" + "1, 5 a 10" + "art 142, §1 a §3" (não-parseável → cai no IA split)
   - Caso 14 (subs sobrepostos): mantém como classificado
   - Caso 15 (mapeamento tipoTask): chunk com idLaw → 'lei_seca'; chunk doutrinário → 'leitura_pdf'; chunk teoria → 'leitura_pdf'

### Deliverables

- [ ] `parseArticles.js` no backend duplicado e testes do front continuam passando (confirma que não quebrei o front).
- [ ] `quebrarAssunto.helpers.js` exporta a função.
- [ ] `node --check` em ambos os arquivos novos.
- [ ] `npm test` no backend-express verde — esperado **~117 testes** (102 PR7 + 15 PR8).
- [ ] Cobertura visual (não automatizada): todas as 5 branches da árvore de decisão exercitadas pelo menos por 1 teste.

### Checkpoint de revisão dupla pós-Fase 1

- **Auto**: reler o helper procurando inconsistência matemática, NaN propagation, divisão por zero, missing branch coverage.
- **Agent Explore**: prompt focado em "casos edge da árvore de decisão" + "comportamento quando `iaSplit` retorna shape malformado mas array não-vazio" + "validação dos defaults".
- **Aplicar fixes**: blockers obrigatórios; warns avaliados; nits ignorados.
- **Antes de avançar**: spec/plano precisam ajuste? Se sim, atualiza spec + este plano.

### Custo

- Implementação: ~1.5d (helper + testes + duplicação parseArticles)
- Revisão dupla pós-fase: ~1h
- **Total Fase 1: ~1.5d**

### Dependências

- P3 (parseArticles cobre formatos esperados) — confirmar antes.

---

## Fase 2 — Cross-service `back_leges` + orientações IA

**Objetivo**: entregar 2 helpers de side-effect (HTTP + IA) com falha grácil testada.

### Tarefas

1. **Criar `backend-express/src/utils/questoesArtClient.js`**
   - `arasComQuestoes({ idLaw, arts, cpf })` — wrapper sobre `POST /questoes/estatistica-artigo` no `back_leges`.
   - Retorna `{ artsComQuestoes, totalPorArt: Map, _explicitlyEmpty?: true }` (§7.4 da spec).
   - Falha grácil: erro de rede / 4xx / 5xx / timeout → retorna estrutura vazia sem `_explicitlyEmpty` (não-cacheado por caller).
   - Threshold `≥ 1`: filtra `arts.filter(a => totalPorArt.get(a) >= 1)`.

2. **Criar `questoesArtClient.test.js` com 3 casos**
   - Caso 1 (feliz): mock fetch retorna 200 com stats → filtra arts requeridos corretamente, retorna `_explicitlyEmpty: false` ou ausente.
   - Caso 2 (lei vazia): mock fetch retorna 200 com `por_artigo` vazio → retorna `_explicitlyEmpty: true`.
   - Caso 3 (erro de rede): mock fetch rejeita → retorna estrutura vazia sem `_explicitlyEmpty` + warn.

3. **Criar `backend-express/src/modules/plano-estudo/orientacoesCoordenadas.js`**
   - `gerarOrientacoesCoordenadas({ assunto, disciplina, banca, orgao, concurso, cargo, tasks })` — §6.1 da spec.
   - Prompt como §6.2.
   - Validação do retorno: array de `{ taskIdx, orientacao }`. Aplica nas tasks que casam por `taskIdx`. Ignora extras.
   - Falha grácil: erro/timeout/JSON malformado → retorna `[]` + warn (caller decide, ver Fase 3).

4. **Criar `orientacoesCoordenadas.test.js` com ~6 casos**
   - Feliz: mock IA retorna shape válido alinhado com tasks → todas aplicadas.
   - Shape malformado (não-JSON): regex extract tenta `\[.*\]`; se falha, retorna `[]`.
   - Array curto (3 orientações pra 4 tasks): aplica 3, deixa 4ª sem.
   - Array longo (5 pra 4): aplica 4, ignora 5ª.
   - `taskIdx` inválido (10 sem task correspondente): warn + ignora.
   - Timeout / erro: retorna `[]`, sem crash.

### Deliverables

- [ ] `questoesArtClient.js` + 3 testes verdes.
- [ ] `orientacoesCoordenadas.js` + 6 testes verdes.
- [ ] `npm test` total ~126 testes verdes.

### Checkpoint de revisão dupla pós-Fase 2

- **Auto**: reler tratamento de erro nos 2 wrappers — algum caminho não-coberto? `_explicitlyEmpty` é semanticamente claro?
- **Agent Explore**: foco em "erros silenciosos não capturados" + "shape edge cases nas mockadas".
- **Aplicar fixes**.

### Custo

- Implementação: ~1d
- Revisão dupla: ~1h
- **Total Fase 2: ~1d**

### Dependências

- P1 (endpoint `back_leges` funciona como esperado) — confirmar antes.
- P4 (`chamarIA` shape) — confirmar antes.

---

## Fase 3 — Orquestrador (`plano.generator.js` refator)

**Objetivo**: integrar quebra + companion + orientações no fluxo existente. **Mais arriscada das fases** porque toca código em produção.

### Tarefas

1. **Backup mental do `sugerirProximaMeta` atual** — ler linhas 149-310 + entender 100% antes de tocar.

2. **Refatorar `sugerirProximaMeta`**:
   - Adicionar `ctx = { questoesCache: new Map(), idDisciplinaCache: new Map(), iaSplitFn, cpf }` no início.
   - Substituir loop antigo (linha 217-245 — round-robin que pusha 1 task por assunto) pelo novo: pra cada assunto pendente, chamar `gerarTasksDoAssunto(assunto, ctx)` (helper novo que retorna lista de tasks).
   - Manter task de revisão anterior (linha 180-189) e revisão semanal (linha 248-255) — não mudam.
   - Manter limites globais (`maxDisciplinas`, `maxHorasEstudo`, `maxAssuntosPorDisc`) — agora contam **assuntos**, não tasks (resposta a R3 da spec).

3. **Implementar `gerarTasksDoAssunto(assunto, ctx)`** dentro de `plano.generator.js`:
   - Chama `quebrarAssunto({ assunto, disciplina, opts, iaSplit: ctx.iaSplitFn })`.
   - Loop pelos chunks: monta task principal via `montarTaskDoChunk(chunk, ctx)` (helper novo); se `chunk.tipoTask === 'lei_seca'`, consulta `arasComQuestoes` (com cache via `ctx.questoesCache`), filtra arts disponíveis, monta `montarQuestoesTask` se houver.
   - Após todos os chunks: chama `gerarOrientacoesCoordenadas` 1x (try/catch), aplica orientações.

4. **Implementar `montarTaskDoChunk(chunk, ctx)`** — switch no `chunk.tipoTask`:
   - `lei_seca`: shape §8.1 da spec.
   - `leitura_pdf`: análogo a `lei_seca` mas sem `filterLaw` (só `link` ou `description` que apontem pro PDF — mentor pode preencher depois).
   - `outras`: shape minimo (title, description, carga).

5. **Implementar `montarQuestoesTask(chunk, artsComQ, ctx)`** — shape §8.2 da spec.

6. **Implementar `iaSplitFn` (callback IA)** dentro do orquestrador:
   - Função fechada que chama `chamarIA` com prompt do §4.2 caso 4 da spec.
   - Recebe `(assunto, faixaArts, contextoLeis)`, retorna `Promise<[{rotulo, arts, idLaw?}]>`.
   - Erro/timeout → throw (caller `quebrarAssunto` faz fallback proporcional).

7. **Implementar `resolverIdDisciplina(nomeDisciplina, cpf, cache)`** §6.5:
   - Se P2 (endpoint) confirmado: chama o endpoint.
   - Se P2 não disponível: retorna `null` direto sem chamar (degradação aceita).
   - Cacheia em `Map<nomeDisciplina, idDisciplina>`.

8. **Modificar `confirmarMeta` (linhas 330-437)** §6.4:
   - Adicionar `_pr8: t._pr8 || null` ao objeto do `createDoc(INDEX.TASKS, ...)`.
   - Mudar `formQuestions: isLeiSeca ? {...} : null` pra `formQuestions: t.formQuestions ?? (isLeiSeca ? buildFormQuestionsDefault(t) : null)`.
   - Se `t.formQuestions` chegar populado, respeita; senão usa default antigo (compat retroativa).

9. **Depreciar `gerarOrientacoesTasks` (linhas 453-508)**:
   - Mantém função no arquivo (sem chamar) por 1 ciclo pra rollback fácil.
   - Adicionar comentário `@deprecated PR8 — substituído por orientacoesCoordenadas`.

10. **Criar `plano.generator.integration.test.js`** com ~6 casos:
    - Feliz: assunto curto (carga 1h) com leis → 1 lei_seca + 1 questoes (mockado disponível).
    - Assunto longo com 4 subs anotados (mockado): 4 lei_seca + 4 questoes (mockado todos com disponibilidade).
    - Assunto longo sem subs: IA split mockado retorna 3 chunks → 3 lei_seca + 3 questoes.
    - Doutrinário (sem leis): fallback tempo, sem task questoes auto.
    - Cache funcionando: 2 assuntos com mesma lei → 1 fetch ao back_leges (mock counter).
    - Degradação completa: IA split mock falha + back_leges mock falha → ainda gera lei_seca por divisão proporcional, sem questoes.

### Deliverables

- [ ] `sugerirProximaMeta` refatorado, smoke test manual rodando geração de meta em 1 cargo de teste local com IA real (custo de tokens registrado).
- [ ] `confirmarMeta` aceita `_pr8`, `formQuestions` pré-montado, `id_disciplina` resolvido (verificável via `findDoc(INDEX.TASKS, taskId)` pós-confirmação).
- [ ] `npm test` total ~132 testes verdes.

### Checkpoint de revisão dupla pós-Fase 3

- **Auto**: integração end-to-end mental — task gerada chega ao ModalTask sem campos quebrados? `_pr8` preservado no roundtrip persistência? Re-análise parcial não regrida?
- **Agent Explore**: foco em "consumers downstream do `plano.generator.js`" — `gerarSugestaoCorte`, `reorganizarPriorizacao`, `confirmarMeta` chamado por outras rotas; algum quebra com shape novo das tasks?
- **Verificar regressão de PR6/PR7**: `npm test` em `priorizacao.helpers.test.js` ainda 102 verdes, sem alteração.

### Custo

- Implementação: ~1.5d
- Revisão dupla: ~1.5h (mais densa que outras fases)
- **Total Fase 3: ~1.5-2d**

### Dependências

- Fase 1 e Fase 2 verdes.
- P2 (decisão sobre `id_disciplina`) — pode entrar como degradação se endpoint não existir.
- P5 (mapping ES schemaless) — confirmar antes de testar persistência.

---

## Fase 4 — Fase 1 da análise (prompt + schema bump)

**Objetivo**: instruir IA da classificação a anotar `arts_referencia` por sub-assunto, bump `schema_classificacao = 'v2'`.

### Tarefas

1. **Localizar prompt da Fase 1 em `cargo.service.js`** ou arquivo extraído (provável `cargo.classificacao.prompt.js`). Se não extraído, considera-se extrair pra arquivo dedicado nessa fase (refator paralelo).

2. **Adicionar instrução de `arts_referencia` no prompt** — texto preciso da §5.2 da spec.

3. **Atualizar schema esperado da resposta IA** — sub-assunto pode incluir campo `arts_referencia` (string) opcional.

4. **Adicionar validação tolerante em `mergeMetricasNoOutput`** (`priorizacao.helpers.js`):
   - Se sub-assunto retorna `arts_referencia`, valida que é string. Se sim, mantém. Se não, descarta + log warn.
   - Conformação §5.3 da spec.

5. **Bumpar `_meta.schema_classificacao = 'v2'`** em `analisarConteudo` (cargo.service.js) — pós-PR8.

6. **Adicionar 2-3 testes em `priorizacao.helpers.test.js`** validando:
   - `arts_referencia` string mantida no shape.
   - `arts_referencia` não-string descartada.
   - `_meta.schema_classificacao` setado pra 'v2' em cargo recém-analisado (mock IA + roundtrip).

### Deliverables

- [ ] Prompt atualizado.
- [ ] Schema validation adicionada.
- [ ] `_meta.schema_classificacao = 'v2'` setado.
- [ ] Smoke test: reanalisar 1 cargo local + conferir via JSON inspector que `arts_referencia` aparece em pelo menos 1 sub-assunto + `_meta.schema_classificacao = 'v2'`.
- [ ] `npm test` total ~135 testes verdes (+3 novos).

### Checkpoint de revisão dupla pós-Fase 4

- **Auto**: prompt induz IA a preencher `arts_referencia` em casos legítimos? Não polui sub-assuntos puramente doutrinários?
- **Agent Explore**: foco em "premissas sobre comportamento da IA" — IA pode inventar `arts_referencia` em assuntos onde não cabe? Validação tolerante captura?
- **Verificar regressão**: cargo PR7 puro (analisado pré-PR8) ainda funciona normalmente — schema_classificacao ausente é tratado como v1 implícito.

### Custo

- Implementação: ~0.5d
- Revisão dupla: ~30min
- **Total Fase 4: ~0.5d**

### Dependências

- Nenhuma — pode rodar paralelo a Fase 3 se houver capacidade. Mas em fluxo serial, depois de Fase 3.

---

## Fase 5 — Documentação

**Objetivo**: sincronizar `EDITAIS.md` com o que foi entregue.

### Tarefas

1. **Bumpar topo do `EDITAIS.md`** pra `2026-05-08 (PR7 + PR8)`.

2. **Atualizar §12 (status)** com bloco "PR8 — Quebra de assunto":
   - Arquivos: links pra os 4 arquivos novos + 3 modificados.
   - Validação: testes verdes (135), sintaxe OK, smoke test pendente.
   - Checklist de validação manual (§9 Fase 6 da spec).
   - Pendências F2-1 a F2-8.

3. **Atualizar §13.3 (schema PR7)** com nota: "schema do task em PR8 ganha `_pr8` namespace; ver §14".

4. **Adicionar §13.8 (estados combinados PR7×PR8)** — tabela de 4 estados (§13 da spec).

5. **Adicionar §14 nova "Geração de tasks com quebra adaptável (PR8)"** — ~80 linhas:
   - Algoritmo (§4 da spec).
   - Schema do chunk + mapeamento tipoTask.
   - Schema da task gerada (lei_seca + questoes companion + outras).
   - Integração `back_leges` + cache.
   - Orientações coordenadas.
   - Schema bumps acumulados.

### Deliverables

- [ ] `EDITAIS.md` sincronizado.
- [ ] Linkagem cruzada coerente (§13.3 ↔ §14 ↔ §13.8).

### Checkpoint de revisão dupla pós-Fase 5

- **Auto**: linkagens funcionam? Schema descrito bate com código?
- **Agent Explore**: pula (doc pura, baixo risco).

### Custo

- ~30min.

### Dependências

- Fase 4 verde (precisa do schema final pra documentar).

---

## Fase 6 — Validação manual (você)

**Objetivo**: confirmar comportamento real em cargos de teste antes de commitar.

### Tarefas (suas)

1. **Cargo PR7-puro** (sem reanálise pós-PR8): clicar em "Sugerir próxima meta". Confirmar:
   - Tasks geradas têm `_pr8.chunkOrigem='ia_split'` na maioria.
   - IA split foi chamada (ver logs de tokens consumidos).
   - Tasks têm carga em [0.5, 2.5]h aproximadamente.
   - Companion questões aparecem nos arts disponíveis (testar com 1 cargo onde `back_leges` tem questões).

2. **Cargo reanalisado pós-PR8** (Fase 4 já rodou nesse cargo): clicar em "Sugerir próxima meta". Confirmar:
   - Tasks têm `_pr8.chunkOrigem='sub_assunto'` em maioria (quebra estrutural funcionou).
   - Custo IA visivelmente menor (sem IA splits).

3. **Cargo com assuntos curtos** (carga média ≤ 2h): confirmar:
   - Tasks têm `_pr8.chunkOrigem='integro'` (sem quebra).
   - Comportamento idêntico ao PR7 (round-robin original).

4. **Editar 1 task gerada no ModalTask**: confirmar que `filterLaw.artsFilter` chega populado, mentor consegue editar, salvar via `confirmarMeta` preserva `_pr8`.

5. **Reorganizar a meta** (`reorganizarPriorizacao`): confirma que cortes funcionam com tasks novas (consumer downstream).

### Deliverables

- [ ] Documento curto (você) com observações + flag GO/NO-GO.
- [ ] Se NO-GO: fixes identificados + retorno pra Fase 3 ou 4 conforme escopo.

### Custo

- 1-2h (suas).

---

## Fase 7 — Commits + push em batch

**Objetivo**: empacotar tudo num batch coerente, push controlado.

### Tarefas

1. **Aguardar OK da Fase 6**.

2. **Commits agrupados por área** (ordem cronológica):
   - **Commit 1**: `feat(plano-estudo): helper puro quebrarAssunto + 15 testes (PR8 Fase 1)`
   - **Commit 2**: `feat(plano-estudo): wrappers questoesArtClient + orientacoesCoordenadas (PR8 Fase 2)`
   - **Commit 3**: `feat(plano-estudo): refator sugerirProximaMeta + confirmarMeta aceita _pr8/formQuestions (PR8 Fase 3)`
   - **Commit 4**: `feat(edital-cargos): prompt Fase 1 anota arts_referencia + schema_classificacao v2 (PR8 Fase 4)`
   - **Commit 5**: `docs(editais): §14 nova + §12 status PR8 + §13.8 estados combinados`

3. **Push em batch**: 1 push com 5 commits.

4. **Validar deploy** via GH Actions (auto-deploy backend-express + boilerplate-vue conforme fluxo do projeto).

### Deliverables

- [ ] 5 commits coerentes.
- [ ] Push com sucesso.
- [ ] Deploy verificado.

### Custo

- ~30min.

### Dependências

- Fase 6 com flag GO.

---

## Pendências fase 2 (não escopadas)

Listadas em §12 da spec (F2-1 a F2-8). Resumo pra continuidade:

| ID | Pendência | Trigger pra agendar |
|---|---|---|
| F2-1 | Threshold ≥5 questões configurável | Mentor sentir que ≥1 é ruim |
| F2-2 | Carga proporcional ao volume de questões | Mentor sentir tasks `questoes` sub/sobredimensionadas |
| F2-3 | `maxTasksPorMeta` config | R3 virar problema (meta dominada por 1 assunto) |
| F2-4 | Heurística "1 task → orientação template" | Custo IA virar problema |
| F2-5 | Estender parser `arts_referencia` (parágrafos, exceções) | Padrão recorrente em `_pr8.chunkOrigem='ia_split'` warn |
| F2-6 | Batch script popular_arts_referencia | Acúmulo grande de cargos legados |
| F2-7 | Carga estimada por sub-assunto (Fase 1) | R8 virar dor |
| F2-8 | Criação automática de disciplina em `back_leges` | R10 virar comum |

---

## Resumo executivo

| Fase | Custo (eu) | Deliverables principais |
|---|---|---|
| Pré-req descoberta | 1-2h | P1-P5 confirmados |
| Fase 1 — helper puro | 1.5d | quebrarAssunto + 15 testes |
| Fase 2 — wrappers | 1d | questoesArtClient + orientacoes + 9 testes |
| Fase 3 — orquestrador | 1.5-2d | sugerirProximaMeta refatorado + 6 integration tests |
| Fase 4 — Fase 1 análise | 0.5d | prompt + schema bump |
| Fase 5 — docs | 30min | EDITAIS.md sincronizado |
| Fase 6 — validação manual | (1-2h suas) | flag GO/NO-GO |
| Fase 7 — commits + push | 30min | deploy |
| **Total** | **~5d minhas + 1-2h suas** | ~135 testes verdes, prod-ready |

## Changelog

| Data | Mudança |
|---|---|
| 2026-05-08 | Plano inicial baseado na spec PR8 (D29-D38, R1-R13) |
