# Tarefas - Funcionalidade de Criação (foco em Lei Seca)

## Visão Geral

O componente `ModalTask.vue` (`src/components/workspace/ModalTask.vue`) é responsável pela criação e edição de tarefas de estudo dentro de uma disciplina. Ele suporta 6 tipos de tarefa:

| Tipo | Valor interno | Descrição |
|------|---------------|-----------|
| PDF | `leitura_pdf` | Leitura de material em PDF |
| Questões | `questoes` | Resolução de questões |
| Vídeo | `video` | Aula em vídeo |
| Revisão | `revisao` | Revisão de conteúdo |
| **Lei Seca** | `lei_seca` | Leitura de texto legal com filtros avançados |
| Outras | `outras` | Tarefa genérica |

---

## Campos Comuns a Todos os Tipos

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| `type` | Sim | Tipo da tarefa (enum acima) |
| `title` | Sim | Título descritivo |
| `description` | Não | Contexto ou observações |
| `link` | Não | URL de referência |
| `orientationId` | Não | Vinculação a uma orientação de execução cadastrada |

---

## Tipo Lei Seca — Campos Exclusivos

Quando `type === 'lei_seca'`, o modal exibe uma seção adicional com os seguintes campos:

### 1. Seleção da Lei/Norma (autocomplete)

- Campo de busca com debounce de 400ms.
- Chama `lawService.search(query, disciplina)` → `GET /laws/search?q=...&disciplina=...`.
- Retorna lista de `{ id, name }`.
- Ao selecionar, preenche:
  - `filterLaw.idLaw` → ID da lei
  - `lawSource` → ID da lei (usado como referência nos filtros de questões)

### 2. Artigos a Estudar (`articlesRaw`)

- Input de texto livre com sintaxe: `1 a 5, 45, 100 a 102`.
- Processado pelo utilitário `parseArticles()` que retorna `{ resolved: number[], error: string | null }`.
- Os artigos resolvidos são sincronizados com `filterLaw.artsFilter`.
- Limite de 500 artigos por intervalo para evitar travamento do DOM.

### 3. Configuração de Visualização (`filterLaw`)

```ts
filterLaw: {
  idLaw:         string | null   // ID da lei selecionada
  compilado:     boolean         // Versão compilada da lei
  withTags:      boolean         // Ativar filtro por tags
  tagsFilter:    string[]        // Lista de tags aplicadas
  withMarks:     boolean         // Exibir com marcações do usuário
  withQuestions: boolean         // Incluir questões vinculadas
  artsFilter:    number[]        // Artigos resolvidos (gerado automaticamente)
}
```

### 4. Filtro de Questões (`formQuestions`)

**Disponível apenas quando `filterLaw.withQuestions === true`.**

Este é o filtro central para selecionar questões de concurso vinculadas aos artigos da lei:

```ts
formQuestions: {
  typeRespQuestions: number    // 1 = Múltipla escolha, 2 = Certo/Errado, 3 = Discursiva
  banca:            string[]   // Ex: ["CESPE", "FCC"]
  ano:              number[]   // Ex: [2020, 2021, 2022]
  favoritas:        boolean    // Apenas questões marcadas como favoritas
  id_disciplina:    number[]   // IDs das disciplinas filtradas
  id_subject:       number[]   // IDs dos assuntos
  id_area:          number[]   // IDs das áreas de atuação
  name_disciplina:  string[]   // Nomes das disciplinas (auxiliar)
}
```

**Contagem em tempo real:** Ao alterar qualquer filtro, um debounce de 700ms dispara `questionService.countByFilters()` → `GET /questions/count`. Só executa se `lawSource` estiver preenchido.

---

## Orientação IA (substituiu o antigo "Gerar PDF de Estudo")

Quando há questões encontradas e a tarefa já está salva, o usuário pode gerar uma **orientação estratégica de estudo com IA** (OpenRouter). A orientação não é material de estudo — é um guia que responde: "O que eu preciso saber para não errar questões desse assunto nessa banca?"

### Botão no Modal

- **Tarefa salva + com orientação:** botão "Ver Orientação" + link "Regenerar"
- **Tarefa salva + sem orientação:** botão "Gerar Orientação IA"
- **Tarefa nova (não salva):** botão desabilitado com tooltip "Salve a tarefa primeiro"

### Fluxo de Geração (Backend)

```
1. Recebe taskId
2. Busca a tarefa → lawSource, filterLaw, formQuestions, title, description
3. Busca o plano → editalId, cargoId
4. Busca edital → banca, concurso
5. Busca cargo → nome, área, disciplinas
6. Busca questões no ES com os filtros da tarefa (max 200)
7. Agrupa por norma + artigo + tipo_cobranca
8. Seleciona top 5 grupos, 1 questão representativa por grupo
9. Monta estatísticas (contagem por ano, distribuição tipo_cobranca)
10. Monta prompt e chama OpenRouter
11. Parseia resposta JSON em 5 seções
12. Salva no índice task_orientations (ES)
13. Atualiza tarefa com orientationDocId
```

### Agrupamento de Questões

As questões são agrupadas por `norma + id_art + tipo_cobranca`. De cada grupo, é selecionada a questão com justificativa mais completa ou que tenha jurisprudência/doutrina preenchida. Máximo 5 questões representativas são enviadas à IA.

### Estrutura do Documento Gerado

| Seção | Propósito |
|-------|-----------|
| **Diagnóstico Rápido** | Panorama do assunto, relevância, tendência de cobrança |
| **Como a Banca Cobra** | Padrões de cobrança extraídos das questões reais |
| **Armadilhas e Pegadinhas** | Exemplos concretos de onde candidatos erram |
| **Jurisprudência e Doutrina** | Só aparece se existir nos dados das questões |
| **Recomendações** | Ações concretas que viram itens do checklist |

### Checklist de Estudo (Subtarefas)

- A IA gera recomendações que se tornam itens do checklist (com prioridade alta/média/baixa)
- O usuário pode adicionar/remover itens próprios
- **O checklist é individual por usuário** — cada pessoa que acessa tem seu próprio progresso
- Armazenado em `userChecklists[userId]` dentro do documento de orientação
- Template base (`baseChecklist`) serve para inicializar novos usuários

---

## Modelo de Dados

### Índice ES: `task_orientations`

```ts
{
  id:              string
  taskId:          string          // FK para a tarefa
  planId:          string          // FK para o plano
  context: {
    lawName:       string
    articles:      number[]
    banca:         string
    cargo:         string
    editalId:      string
    cargoId:       string
    disciplina:    string
  }
  questionsUsed:   object[]        // Max 5 questões representativas usadas
  content:         string          // Markdown completo da orientação
  baseChecklist:   object[]        // Template dos itens gerados pela IA
  userChecklists:  {               // Progresso individual por usuário
    [userId]: [{ id, text, checked, source, prioridade }]
  }
  generatedAt:     number          // epoch_millis
  model:           string
  createdBy:       string          // userId do criador
}
```

### Campos adicionados na tarefa (índice TASKS)

- `orientationDocId: string | null` — aponta para o documento gerado

---

## Payload Enviado ao Salvar

A função `save()` monta o seguinte payload:

```ts
{
  disciplineId:     string
  type:             string
  title:            string
  description:      string
  link:             string
  orientationId:    string | null
  orientationTitle: string | null
  orientationBody:  string | null
  lawSource:        string | null
  articlesRaw:      string | undefined
  filterLaw:        object | undefined
  formQuestions:     object | undefined
}
```

---

## APIs

### Backend Express (`backend-express`)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/tasks/:taskId/orientation` | Gerar orientação (chama OpenRouter) |
| GET | `/api/tasks/:taskId/orientation` | Buscar orientação (retorna checklist do usuário) |
| PATCH | `/api/tasks/:taskId/orientation/checklist` | Atualizar checklist (toggle/add/remove) |
| DELETE | `/api/tasks/:taskId/orientation` | Excluir orientação |

### Backend Leges (`back_leges`)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/metas-leges/orientation/:taskId` | Buscar orientação (checklist individual) |
| PATCH | `/metas-leges/orientation/:taskId/checklist` | Atualizar checklist do usuário |
| GET | `/metas-leges/enrollments/:id/edital` | Buscar/inicializar edital checklist (lazy init) |
| PATCH | `/metas-leges/enrollments/:id/edital` | Toggle check de item do edital `{ path, checked }` |
| PATCH | `/metas-leges/enrollments/:id/archive` | Arquivar plano (preserva progresso) |
| PATCH | `/metas-leges/enrollments/:id/unarchive` | Desarquivar plano |
| DELETE | `/metas-leges/enrollments/:id` | Excluir plano permanentemente |

---

## Visualização

### Workspace (boilerplate-vue)

- **`OrientacaoView.vue`** — página dedicada em `/workspace/orientacao/:taskId`
- Markdown renderizado com tipografia de leitura
- Checklist interativo com barra de progresso
- Botão PDF via `window.print()` com CSS otimizado
- Botão Regenerar (exclui e gera novamente)

### Metas do Aluno (legislacao)

- **`MetaDetalheView.vue`** — redesenhado com **split panel** (estilo Claude Artifacts)
- **Esquerda:** lista de tarefas com checkbox de conclusão
- **Direita:** painel de orientação que desliza ao clicar no chip "Orientação"
- Cada tarefa com `orientationDocId` mostra um chip roxo clicável
- O painel exibe: documento markdown + checklist individual do usuário
- Animação suave de entrada/saída
- Responsivo: em mobile o painel aparece abaixo
- Print: imprime apenas a orientação

### PanelTasks.vue — Funcionalidades

O painel de tarefas oferece operações individuais e em lote:

**Operações individuais (por card):**
- Editar (ícone lápis) → abre ModalTask com dados preenchidos
- Excluir (ícone lixeira) → confirmação + `taskStore.remove`
- Drag-and-drop → arrastar tarefa para uma meta no PanelGoals

**Seleção em lote (checkboxes):**
- Checkbox individual por tarefa + "selecionar todas" no header
- **Excluir em lote**: botão vermelho "Excluir (N)" — executa `taskStore.remove` em paralelo para todos os selecionados
- **Duplicar em lote**: botão roxo "Duplicar (N)" — cria cópias das tarefas selecionadas via `taskStore.create`, com título acrescido de "(cópia)". Remove `id`, `createdAt`, `updatedAt` e `orientationDocId` da cópia

**Badges nos cards:**
- Badge colorido por tipo de tarefa (PDF azul, Questões verde, Vídeo âmbar, Revisão rosa, Lei Seca roxo, Outras cinza)
- Badge roxo "Ver Orientação" clicável quando a tarefa tem `orientationDocId` — navega para a página dedicada
- Preview de artigos resolvidos + nome da lei para tarefas Lei Seca

### ModalTask.vue — Salvar sem fechar

O footer do modal possui dois botões de salvamento:
- **"Salvar alterações"** (btn-primary): salva e fecha o modal (`emit('saved')`)
- **Ícone de disquete** (btn-save-stay): salva sem fechar, mantendo o modal aberto para continuar editando

A função `save(closeAfter)` recebe um booleano — quando `false`, não emite o evento `saved` que o componente pai usa para fechar o modal.

### ModalTask.vue — Fix do watcher ao editar

O watcher `watch(props.task, ..., { immediate: true })` roda durante o setup do componente, **antes** dos watchers de `articlesRaw` e `formQuestions` serem registrados. Por isso, ao abrir para edição:

- Os "Artigos identificados" não apareciam automaticamente
- A contagem de questões vinculadas não era carregada

**Solução:** ao final do watcher de `props.task`, chama `validateArticles()` e `fetchQuestionCount()` via `nextTick()`, garantindo que os dados derivados sejam recalculados mesmo sem a detecção automática dos watchers subsequentes.

---

## Arquivos do Sistema

### Backend Express

```
src/modules/task-orientations/
  ├── orientation.service.js      # Agrupamento, geração, CRUD, checklist
  ├── orientation.prompt.js       # Template do prompt para OpenRouter
  ├── orientation.controller.js   # 4 endpoints
  └── orientation.routes.js       # Rotas autenticadas
src/config/elasticsearch.js       # Índice TASK_ORIENTATIONS + campo orientationDocId
src/app.js                        # Registro da rota
```

### Backend Leges

```
src/Service/MetasLegesService.js         # Orientação, edital checklist, archive/delete enrollment
src/Controllers/MetasLegesController.js  # Handlers para todos os endpoints
src/Routes/MetasLegesRoutes.js           # Rotas de orientação, edital, archive/delete
```

### Frontend boilerplate-vue

```
src/services/taskOrientation.service.js  # Cliente HTTP (timeout 120s)
src/views/OrientacaoView.vue             # Página dedicada
src/components/workspace/ModalTask.vue   # Criação/edição de tarefas, Orientação IA, salvar sem fechar
src/components/workspace/PanelTasks.vue  # Listagem, seleção em lote, duplicar, excluir, badges
src/components/workspace/PanelDisciplines.vue  # Seleção de disciplina ativa
src/components/workspace/PanelGoals.vue  # Metas com drop zone para tarefas
src/stores/useTaskStore.js               # CRUD tarefas, fetch por disciplina/plano
src/stores/useDisciplineStore.js         # CRUD disciplinas
src/stores/useOrientationStore.js        # CRUD orientações de execução
src/utils/articleParser.js               # parseArticles() — resolve ranges textuais
src/router/routes.js                     # Rota /workspace/orientacao/:taskId
```

### Frontend legislacao

```
src/store/MetasLegesStore.js             # Actions de orientação, edital, archive/delete
src/views/metas/MetaDetalheView.vue      # Split panel orientação (resize, scroll, print)
src/views/metas/MinhasMetasView.vue      # Split panel edital + archive/delete planos
src/views/metas/MeusPlanos.vue           # Listagem com abas Ativos/Arquivados, excluir/arquivar
src/views/metas/LeiSecaReaderView.vue    # Fix: valida filterLaw.idLaw antes de iniciar estudo
```

---

## Fluxo Completo: Criação de Tarefa Lei Seca com Orientação IA

```
1. Mentor seleciona tipo "Lei Seca" no ModalTask
2. Busca e seleciona a lei/norma (autocomplete)
3. Informa os artigos: "1 a 5, 45"
4. Ativa "Incluir questões vinculadas"
5. Configura filtros: banca, disciplina, área, ano, tipo
6. Visualiza contagem de questões em tempo real
7. Salva a tarefa
8. Clica em "Gerar Orientação IA"
9. Backend agrupa questões, monta estatísticas, chama OpenRouter
10. Documento de orientação é salvo e vinculado à tarefa
11. Mentor é redirecionado para a página de orientação
---
12. Aluno importa o plano via convite
13. Abre uma meta → vê lista de tarefas
14. Tarefa com orientação mostra chip "Orientação"
15. Clica → painel split abre à direita
16. Vê diagnóstico, pegadinhas, jurisprudência, recomendações
17. Marca itens do checklist conforme estuda (progresso individual)
18. Pode adicionar itens próprios ao checklist
19. Pode imprimir a orientação em PDF
```

---

## Edital Checklist

Quando um plano é criado a partir de um edital/cargo, o conteúdo programático do edital pode ser usado como checklist de progresso para o aluno.

### Conceito

- **Importação automática**: ao importar o plano, `editalId`/`cargoId` são salvos no enrollment
- **Lazy init**: o checklist só é montado quando o aluno abre o painel pela primeira vez
- **Individual por enrollment**: cada aluno tem seu próprio progresso no edital
- **Auto-check**: ao concluir uma tarefa, o assunto correspondente é auto-marcado (match por título, case-insensitive)
- **Unidirecional**: tarefa → edital. Marcar no edital não marca a tarefa (é conhecimento prévio)

### Estrutura do Edital

O `conteudo_parseado` do cargo tem até 4 níveis:
```
Disciplina > Assunto > Sub-assunto > Sub-sub-assunto
```

Cada item tem checkbox individual. Assuntos podem ter dados de priorização do campo `priorizacao`:
- `score` (0.0–1.0) — relevância baseada em histórico de questões
- `tendencia` (crescente/estável/decrescente)
- `tipo_fonte` (legislação, jurisprudência, doutrina)
- `carga_estimada_horas`

### Visualização (MinhasMetasView)

- **Botão "Edital"** no header do plano (só aparece se tem `editalId` ou `plan.editalId`)
- **Split panel à direita** com resize arrastável e scroll isolado
- **Accordion por disciplina** com contador e mini barra de progresso
- **Toggles**: mostrar/ocultar relevância, ordenar por score
- **Chip "via tarefa"** em assuntos marcados automaticamente
- **Progresso geral** sticky no rodapé
- **Print/PDF** com cabeçalho do plano/edital/banca

### Modelo de Dados (no enrollment)

```ts
{
  editalId:   string | null,    // salvo na importação
  cargoId:    string | null,    // salvo na importação
  editalProgress: {             // lazy init, mapping ES: enabled: false
    cargoNome:   string,
    editalNome:  string,
    banca:       string,
    disciplinas: [{
      nome:     string,
      checked:  boolean,
      assuntos: [{
        nome:        string,
        checked:     boolean,
        checkedBy:   'user' | 'task' | null,
        score:       number | null,
        tendencia:   string | null,
        tipo_fonte:  string[] | null,
        carga_horas: number | null,
        sub_assuntos: [{
          nome: string, checked: boolean, checkedBy: string | null,
          score: number | null,
          sub_sub_assuntos: [{ nome: string, checked: boolean }]
        }]
      }]
    }]
  }
}
```

---

## Gestão de Planos (MeusPlanos)

### Arquivar

- Muda `status` do enrollment para `'archived'`
- Preserva todo o progresso (metas, tarefas, edital)
- Dialog de confirmação com mensagem clara
- Pode desarquivar a qualquer momento com progresso restaurado

### Excluir

- Exclusão física do enrollment no Elasticsearch
- Dialog com alerta: tarefas marcadas e progresso serão perdidos
- Informa que o edital marcado será preservado (serve de base para outros planos)
- Oferece "Arquivar" como alternativa no mesmo dialog

### Interface

- **Abas "Ativos" / "Arquivados"** — aba de arquivados só aparece se há planos arquivados
- **Menu de 3 pontos** em cada card: Ver metas, Arquivar, Excluir
- **Cards arquivados**: opacidade reduzida, sem hover, botão "Desarquivar"
- Ao desarquivar o último plano, aba retorna automaticamente para "Ativos"

---

## Segurança

### Verificações implementadas

| Endpoint | Verificação |
|----------|-------------|
| DELETE `/api/tasks/:taskId/orientation` | `createdBy === userId` (só o criador pode excluir) |
| GET/PATCH `/metas-leges/enrollments/:id/edital` | `enrollment.userId === userId` (ownership) |
| PATCH `/metas-leges/enrollments/:id/archive` | `enrollment.userId === userId` |
| DELETE `/metas-leges/enrollments/:id` | `enrollment.userId === userId` |
| PATCH `/api/tasks/:taskId/orientation/checklist` | Valida `Array.isArray(operations)` |
| PATCH `/metas-leges/enrollments/:id/edital` | Valida formato do `path` |

### Sanitização

- `v-html` com conteúdo da IA é sanitizado via `DOMPurify.sanitize(marked.parse(...))` em:
  - `OrientacaoView.vue` (boilerplate-vue)
  - `MetaDetalheView.vue` (legislacao)

---

## LeiSecaReaderView — Validação de Lei Vinculada

O botão "Iniciar Estudo" só aparece se a tarefa tem uma lei efetivamente vinculada (`filterLaw.idLaw` preenchido). Três estados possíveis:

1. **Sem lei vinculada** (`!filterLaw.idLaw`): mostra card cinza "Norma não vinculada"
2. **Lei vinculada mas não importada**: mostra card amarelo "Norma não importada" com botão para importar
3. **Lei vinculada e importada**: mostra "Iniciar Estudo"
```
