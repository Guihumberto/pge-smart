# Sistema de Gestão de Editais e Plano de Estudo — Spec Completa

**Data:** 2026-04-08 (atualizado)
**Backend:** backend-express
**IA:** OpenRouter (GLM-5) para priorização/parse + Ollama local como fallback
**Frontend:** boilerplate-vue (Vue 3 + Pinia + Tailwind + Vuetify)

---

## Visão Geral do Pipeline

```
Edital → Parse (regex + IA) → Estatísticas de Questões → Análise (Classificar + Priorizar) → Reorganizar → Plano de Estudo Incremental
```

---

## 1. Módulos Implementados

### 1.1 Dicionários (`dicts`)

Índice unificado para bancas, disciplinas, áreas e cargos.

- **Índice ES:** `metas_leges_dicts`
- **Campos:** `tipo` (keyword), `nome` (text+keyword), `metadata` (object)
- **Seed:** Populado com 9 bancas, 39 disciplinas, 11 áreas do `questionDicts.js`
- **Endpoints:** `GET/POST/PATCH/DELETE /api/dicts` + `POST /api/dicts/seed`
- **Frontend:** Usado nos autocompletes com opção de criar inline

### 1.2 Editais

CRUD de editais de concurso com auto-parse do nome.

- **Índice ES:** `metas_leges_editais`
- **Campos:** `nome`, `ano`, `orgao`, `estado`, `banca`, `link`, `data_prova`, `userId`
- **Endpoints:** `GET/POST/PATCH/DELETE /api/editais`
- **Frontend:** `EditaisView` — grid de cards com countdown até a prova, modal criar/editar
- **Auto-parse:** Ao colar "EDITAL Nº 1 – PGE/AL, DE 31 DE MARÇO DE 2026" extrai órgão, estado e ano

### 1.3 Cargos do Edital

Cargos vinculados a um edital, com conteúdo parseado, priorização e classificação.

- **Índice ES:** `metas_leges_edital_cargos`
- **Campos:** `editalId`, `nome`, `nivel`, `area`, `formacao`, `conteudo_bruto`, `conteudo_parseado`, `parse_status`, `priorizacao`, `priorizacao_status`, `analise_status`, `userId`
- **Endpoints:**
  - CRUD: `GET/POST/PATCH/DELETE /api/editais/:editalId/cargos`
  - Parse: `POST .../parse`, `GET .../parse-status`
  - Análise: `POST .../analisar` (pipeline classificar→priorizar)
  - Priorizar: `POST .../priorizar` (standalone)
  - Classificar: `POST .../classificar` (standalone)
  - Reorganizar: `POST .../reorganizar`, `POST .../aplicar-reorganizacao`
- **Frontend:** `EditalCargosView` + `CargoConteudoView` (4 estados)

### 1.4 Estatísticas de Questões

Importação de dados de frequência de questões por banca/área/ano.

- **Índice ES:** `metas_leges_estatisticas_questoes`
- **Campos:** `banca`, `area`, `ano`, `descricao`, `dados` (object, enabled:false), `userId`
- **Endpoints:** `GET/POST/PATCH/DELETE /api/estatisticas` (com filtros por banca/área/ano)
- **Frontend:** `EstatisticasView` com 2 abas:
  - **Importações:** Cards com top 3 disciplinas, modal de importação com preview
  - **Tendências:** Gráficos de linha (evolução disciplinas), barras (variação assuntos), painéis alta/queda
- **Parser:** Suporta texto puro (pares nome/contagem) e HTML (inspect element do site de questões)

### 1.5 Plano de Estudo Incremental

Geração de plano meta por meta, integrado ao sistema existente de Plans/Goals/Tasks.

- **Endpoints:**
  - `POST .../plano/inicializar` — cria ou recupera Plan do cargo
  - `GET .../plano/:planId/estado` — metas criadas, assuntos cobertos/pendentes, projeção
  - `POST .../plano/:planId/sugerir` — preview da próxima meta com config
  - `POST .../plano/:planId/confirmar` — cria Goal + Tasks no ES
- **Frontend:** `PlanoEstudoBuilderView` com timeline, config ajustável, preview editável, drag-to-reorder

---

## 2. Pipeline de Parse do Conteúdo

### Fase 1 — Limpeza (regex, frontend)
Remove artefatos de PDF, normaliza espaços, remove caracteres soltos.

### Fase 2 — Segmentação + Anomalias (regex, frontend)
- Detecta disciplinas por padrões: numeração + CAIXA ALTA, match contra dicts conhecidos
- Junta quebras de linha de PDF
- Detecta anomalias: quebra de numeração, disciplina embutida
- Ignora números de leis (Lei nº 9.605) e numeração de 3 níveis (4.1.1)
- **Preview:** texto original com highlights (azul=disciplina, laranja=anomalia) + cards editáveis

### Fase 3 — Normalização via IA (backend)
- **Provider toggle:** Local (Ollama) ou Cloud (OpenRouter)
- Processa por disciplina ou tudo de uma vez
- Retorna JSON: disciplina → assunto → sub_assunto → sub_sub_assunto (3 níveis)
- Merge acumulativo: disciplinas já parseadas são mantidas

### Validação de Completude
Painel que compara itens numerados do original vs estrutura da IA. Lista possíveis faltantes com match fuzzy.

---

## 3. Pipeline de Análise (Classificar + Priorizar)

### Fase 1 — Classificação (usa provider selecionado, fallback automático)
Classifica cada assunto/sub-assunto com:
- `tipo_fonte`: array de `["legislacao", "jurisprudencia", "doutrina", "teoria"]`
- `leis_referencia`: leis/artigos identificados (mesmo implícitos)
- `carga_estimada_horas`: estimativa de estudo

### Fase 2 — Priorização (usa provider selecionado)
Cruza edital com estatísticas de questões:
- **Banca alvo:** peso 70% | **Similares:** peso 30%
- Mapeamento semântico (nomes diferentes → mesmo assunto)
- Retorna: `score` (0-1), `tendencia`, `equivalente_historico`, `fonte`, `justificativa`
- `sugestao_semana` e `carga_estimada_horas` considerando tipo_fonte

### Processamento em Fila
- Disciplinas processadas uma por uma com feedback visual individual
- Cada disciplina mostra status: aguardando → processando → concluído/erro
- Barra de progresso global (3/11 disciplinas)
- Merge acumulativo com recálculo de semanas a cada adição

### Recálculo de Semanas
Função pura `calcularDistribuicaoSemanas(disciplinas, horasPorSemana, filtro, pesos)`:
- **Round-robin por disciplina:** agrupa assuntos por disciplina, ordena disciplinas pelo maior score, e distribui alternando entre disciplinas (1 assunto de cada por rodada)
- Dentro de cada disciplina, assuntos ficam ordenados por score desc
- Distribui nas semanas respeitando capacidade horária
- Suporta pesos por disciplina (0.5x a 2.5x)
- **Resultado:** cada semana contém assuntos mesclados de múltiplas disciplinas, priorizando os mais relevantes de cada uma

---

## 4. Reorganização da Priorização

Quando as semanas sugeridas excedem o prazo até a prova:

### Diagnóstico
- Calcula: diasAteProva, semanasEstudo, horasDisponíveis, totalHoras, déficit
- Banner automático: vermelho (excede) ou verde (cabe)

### 3 Opções
- **A) Aumentar horas/dia** (azul) — calcula necessário, mantém tudo
- **B) Cortar conteúdo** (amarelo, recomendada) — remove assuntos com menor score até caber, marca `cortado: true`
- **C) Reduzir revisão** (vermelho) — com aviso forte: "Prefira cortar conteúdo a sacrificar revisão"

### Pesos por Disciplina
Select em cada disciplina: 0.5x, 0.8x, 1x, 1.2x, 1.5x, 2x, 2.5x
Multiplica a carga de todos os assuntos da disciplina.

---

## 5. Plano de Estudo Incremental

### Conceito
Em vez de gerar tudo de uma vez, o plano é construído meta por meta:

1. **Configurar:** disciplinas/meta, assuntos/disciplina, duração, opcionalmente horas/dia
2. **Escolher disciplinas:** seletor com checkboxes mostrando pendentes e score de cada
3. **Gerar sugestão:** preview com tasks editáveis, orientações IA, projeção de tempo
4. **Ajustar:** adicionar/remover tasks, mudar tipo/carga/descrição/link, reordenar com drag
5. **Confirmar:** cria Goal + Tasks no ES, aparece na timeline
6. **Repetir:** próxima meta continua de onde parou

### Configurações

| Config | Tipo | Default | Descrição |
|--------|------|---------|-----------|
| `ignorarHoras` | boolean | `true` | Ignora limite de horas, monta meta só por quantidade de assuntos |
| `disciplinasPorMeta` | number | `4` | Quantas disciplinas distintas por meta |
| `assuntosPorDisciplina` | number | `2` | Quantos assuntos de cada disciplina por meta |
| `disciplinasEscolhidas` | string[] | `[]` | Filtra disciplinas (vazio = todas). Seletor visual com checkboxes |
| `duracaoMeta` | enum | `'semanal'` | `'semanal'` / `'quinzenal'` / `'custom'` |
| `diasCustom` | number | `7` | Dias quando duração é custom |
| `horasPorDia` | number | `4` | Só quando `ignorarHoras = false` |
| `diasPorSemana` | number | `6` | Só quando `ignorarHoras = false` |
| `semanasRevisaoFinal` | number | `2` | Semanas reservadas para revisão final |

### Algoritmo de Distribuição: Round-Robin por Disciplina

Em vez de ordenar todos os assuntos globalmente por score (que concentra disciplinas de score alto nas primeiras metas), o sistema usa round-robin:

1. Agrupa assuntos pendentes por disciplina (cada fila ordenada por score desc)
2. Ordena as disciplinas pelo maior score (disciplina mais relevante primeiro)
3. Filtra por `disciplinasEscolhidas` se especificado
4. Itera em rodadas: pega 1 assunto (o top por score) de cada disciplina por rodada
5. Para quando: atingir `assuntosPorDisciplina` em todas as filas, ou atingir `disciplinasPorMeta`, ou esgotar horas (se não ignorar)

**Exemplo:** 4 disciplinas × 2 assuntos = 8 tasks de estudo + revisões

### Tasks Geradas
- **Revisão da meta anterior** (20min) — primeira task de cada meta (a partir da meta 2)
- **Tasks de estudo** — tipo baseado em tipo_fonte:
  - `legislacao` → `lei_seca` (com filterLaw + formQuestions configurados)
  - `jurisprudencia` → `leitura_pdf`
  - `doutrina` → `leitura_pdf`
  - `teoria` → `revisao`
- **Revisão semanal** (20min) — última task de cada meta

### Orientações IA por Task

Ao gerar a sugestão, o sistema chama a IA (OpenRouter) para gerar orientações curtas (3-5 linhas) para cada task de estudo. Inclui:
- Artigos-chave e pontos mais cobrados pela banca
- Dicas específicas do assunto para o concurso/cargo/órgão
- Contexto enviado: banca, órgão, concurso, cargo, disciplina, tipo_fonte, leis_referencia, score

**Fallback:** se a IA falhar ou der timeout (60s), mantém descrição padrão (disciplina + score + carga)
**Timeout frontend:** 120s para chamadas `sugerir` e `confirmar` (vs 10s padrão do axios)

### Progresso por Disciplina

O endpoint `estado` retorna:
- `progressoPorDisciplina`: mapa `{ nome: { total, cobertos, pendentes, scoreMax } }` — contagem de tarefas, não horas
- `disciplinasDisponiveis`: lista ordenada por score das disciplinas com assuntos pendentes

**Frontend:** painel de cards com barra de progresso por disciplina (ex: "3/12 assuntos cobertos")

### Projeção
"Após esta meta: 15 assuntos restantes · ~4 metas · ~35 dias"
Alertas se tempo insuficiente.

### Feedback Visual
- **Loading spinner** enquanto carrega o plano
- **Banner "Plano criado!"** na primeira visita com instrução para gerar primeira meta
- **Toast de sucesso** quando sugestão é gerada ("X assuntos sugeridos. Revise e confirme.")
- **Banner "Meta criada!"** com link para Workspace

---

## 6. Infraestrutura de IA

### Provider Abstrato (`iaProvider.js`)
- Interface `chamarIA({ provider, system, user, max_tokens })`
- `provider: 'openrouter'` → GLM-5 via OpenRouter API
- `provider: 'local'` → Qwen 2.5:14b via Ollama/backend_ia_proccess
- Toggle visual no frontend (botões "Local" / "Cloud")

### OpenRouter Client (`openRouterClient.js`)
- Modelo padrão: `z-ai/glm-5`
- `reasoning: { effort: 'none' }` para evitar consumo de tokens em pensamento
- Fallback: extrai JSON do campo `reasoning` se `content` vier null

### Parser de JSON Robusto (`extractGenericJson`)
- **Tentativa 1:** Parse direto do texto limpo (sem markdown fences)
- **Tentativa 2:** Busca `"disciplinas"` no texto, volta para o `{` de abertura, bracket matching com awareness de strings (ignora `{`/`}` dentro de strings JSON)
- **Tentativa 3:** JSON truncado — volta ao último `}`/`]` fechado corretamente (ponto seguro), descarta texto parcial (strings abertas, valores incompletos), reconta brackets e fecha o que falta
- **max_tokens:** 16000 para priorização (disciplinas grandes como Direito Civil geram ~40k chars de resposta)
- Lida com: markdown code fences, quebras de linha antes de `"disciplinas"`, strings cortadas no meio, vírgulas pendentes

---

## 7. Frontend — Rotas e Menu

### Rotas
```
/editais                               → EditaisView
/editais/:id/cargos                    → EditalCargosView
/editais/:id/cargos/:cargoId           → CargoConteudoView (4 estados)
/editais/:id/cargos/:cargoId/plano     → PlanoEstudoBuilderView
/estatisticas                          → EstatisticasView (2 abas)
```

### Menu Lateral (seção Mentor)
- Editais (FileText)
- Estatísticas (BarChart3)

### CargoConteudoView — 4 Estados
1. **Entrada:** textarea para colar conteúdo bruto (persiste no localStorage)
2. **Preview regex:** texto com highlights + cards de disciplinas editáveis + detecção de anomalias
3. **Resultado (árvore):** disciplinas colapsáveis → assuntos → sub-assuntos + validação de completude + seleção para análise + provider toggle
4. **Priorização:** scores coloridos + badges de fonte + leis referência + carga + semana + pesos + reorganização

---

## 8. Workspace — Melhorias

### Batch Actions — Tasks
- Checkbox em cada task card + "selecionar todas" no header
- Botão "Excluir (X)" para deletar selecionadas em paralelo
- Botão "Duplicar (X)" para copiar selecionadas (adiciona " (cópia)" ao título)

### Batch Delete — Metas
- Checkbox em cada goal card + "selecionar todas" no header do painel Metas
- Botão "Excluir (N)" aparece quando há seleção, com confirm dialog
- Deleta em paralelo com `Promise.all`
- **Bug fix:** `removeGoal` corrigido para passar `(planId, goalId)` — antes passava apenas `goalId` como `planId`, causando erro 404 na API

### Tasks Enriquecidas
- Tasks do plano criadas com campos completos do ModalTask
- `filterLaw` e `formQuestions` pré-configurados para `lei_seca`
- Editáveis via ModalTask (click no lápis)
- Descrições com orientações IA (artigos-chave, padrões da banca, dicas práticas)

### Permissões
- `requireMentor` removido de plans, goals, tasks, disciplines, editais, cargos, dicts, estatisticas
- Proteção de ownership mantida no service layer (`userId`/`mentorId` check)

---

## 9. Índices Elasticsearch

| Índice | Campos principais |
|--------|-------------------|
| `metas_leges_dicts` | tipo, nome, metadata |
| `metas_leges_editais` | nome, ano, orgao, estado, banca, link, data_prova, userId |
| `metas_leges_edital_cargos` | editalId, nome, nivel, area, conteudo_parseado, priorizacao, parse_status, analise_status |
| `metas_leges_estatisticas_questoes` | banca, area, ano, descricao, dados |
| `metas_leges_plans` | title, description, mentorId, editalId, cargoId |
| `metas_leges_goals` | planId, title, description, taskIds, order |
| `metas_leges_tasks` | planId, disciplineId, type, title, description, link, filterLaw, formQuestions |
| `metas_leges_disciplines` | name, color, mentorId |

---

## 10. Pendências (Sprints Futuros)

### Sprint 2 — Polimento
- [ ] Indicador de confiança nos scores (alta/média/baixa)
- [ ] Validação cruzada edital × estatísticas (cobertura)
- [ ] Versionamento da priorização (histórico de scores)
- [ ] Cache de classificação (evitar rechamar IA)
- [ ] PDF export do plano

### Sprint 3 — Avançado
- [ ] Comparativo entre editais/cargos (sobreposição)
- [ ] Curva de esquecimento como sugestão
- [ ] Meta de questões por assunto (baseado nas estatísticas)
- [ ] Semanas flexíveis (arrastar metas)
- [ ] Discursiva integrada ao plano (treino cronometrado)
- [ ] Geração de metas de revisão automática (D+1, D+7, D+21)

### Sprint 4 — Integração
- [ ] Integrar plano com sistema de enrollments (alunos seguindo o plano)
- [ ] Fallback automático OpenRouter → Ollama
- [x] ~~Orientações de IA por task (baseado nas questões do assunto)~~ — implementado na geração de metas
