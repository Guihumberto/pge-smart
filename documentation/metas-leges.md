# Metas Leges - Documentacao Completa

## Visao Geral

O **Metas Leges** e um sistema de gestao de planos de estudo para educacao juridica. Permite que mentores criem planos modulares com disciplinas, tarefas e metas, e que alunos se inscrevam, acompanhem seu progresso e estudem leis de forma interativa.

### Arquitetura

O sistema e composto por **4 aplicacoes** que compartilham o mesmo banco de dados Elasticsearch e o mesmo servidor de autenticacao OAuth2:

| Aplicacao | Pasta | Funcao |
|-----------|-------|--------|
| **Mentor Frontend** | `boilerplate-vue/` | Criacao de planos, tarefas, metas e gestao de alunos |
| **Mentor Backend** | `backend-express/` | API REST para operacoes do mentor |
| **Aluno Frontend** | `legislacao/` | Exploracao de planos, inscricao, execucao de tarefas |
| **Aluno Backend** | `back_leges/` | API REST para operacoes do aluno |

### Indices Elasticsearch

Todos os indices usam o prefixo `metas_leges_`:

| Indice | Conteudo |
|--------|----------|
| `metas_leges_plans` | Planos de estudo |
| `metas_leges_goals` | Metas (vinculadas a planos) |
| `metas_leges_tasks` | Tarefas (vinculadas a disciplinas) |
| `metas_leges_enrollments` | Inscricoes de alunos |
| `metas_leges_invite_links` | Links de convite |
| `metas_leges_disciplines` | Disciplinas |
| `metas_leges_orientations` | Orientacoes de estudo |

---

## Fluxo Completo

```
MENTOR                                          ALUNO
  |                                               |
  |  1. Cria plano                                |
  |  2. Cria disciplinas                          |
  |  3. Cria tarefas (PDF, Lei Seca, etc)         |
  |  4. Cria metas e arrasta tarefas              |
  |  5. Gera link de convite (global/single)      |
  |                                               |
  |  ----------- link de convite ------------>    |
  |                                               |
  |                                  6. Explora planos publicos
  |                                  7. Aceita convite
  |                                  8. Ve metas desbloqueadas
  |                                  9. Executa tarefas
  |                                 10. Lei Seca: importa norma e estuda
  |                                 11. Completa meta -> proxima desbloqueia
  |                                               |
  |  12. Acompanha progresso dos alunos           |
  |  13. Desbloqueia metas manualmente            |
  |  14. Pausa/bloqueia alunos                    |
```

---

## Estruturas de Dados

### Plano (`metas_leges_plans`)

```json
{
  "id": "nanoid",
  "title": "Sefaz MA 2027",
  "description": "Plano completo para o concurso",
  "mentorId": "uuid-do-mentor",
  "createdAt": "2026-03-29T...",
  "updatedAt": "2026-03-29T..."
}
```

### Meta (`metas_leges_goals`)

```json
{
  "id": "nanoid",
  "planId": "id-do-plano",
  "title": "Direito Tributario - Parte 1",
  "description": "Artigos 1 a 50 do CTN",
  "taskIds": ["task-1", "task-2", "task-3"],
  "order": 0,
  "createdAt": "2026-03-29T..."
}
```

### Tarefa (`metas_leges_tasks`)

```json
{
  "id": "nanoid",
  "disciplineId": "id-da-disciplina",
  "type": "lei_seca",
  "title": "Leitura dos artigos 1 a 50",
  "description": "Ler com atencao os artigos do CTN",
  "link": "",
  "orientationId": "id-da-orientacao",
  "lawSource": "1758624772077",
  "articles": {
    "raw": "1 a 50",
    "resolved": [1, 2, 3, ..., 50]
  },
  "filterLaw": {
    "idLaw": null,
    "compilado": false,
    "withTags": false,
    "tagsFilter": [],
    "withMarks": false,
    "withQuestions": true,
    "artsFilter": [1, 2, 3, ..., 50]
  },
  "formQuestions": {
    "typeRespQuestions": 2,
    "banca": ["FGV"],
    "ano": ["2024", "2025"],
    "favoritas": false,
    "id_disciplina": ["2"],
    "id_area": ["9"],
    "id_subject": [],
    "name_disciplina": []
  }
}
```

#### Tipos de Tarefa

| Tipo | Descricao | Campos Especificos |
|------|-----------|-------------------|
| `leitura_pdf` | Leitura de PDF | `link` |
| `questoes` | Resolver questoes | `formQuestions` |
| `video` | Assistir video | `link` |
| `revisao` | Revisao de conteudo | `link` |
| `lei_seca` | Estudo de lei seca | `lawSource`, `articles`, `filterLaw`, `formQuestions` |
| `outras` | Outros tipos | `link` |

### Link de Convite (`metas_leges_invite_links`)

```json
{
  "id": "nanoid",
  "planId": "id-do-plano",
  "mentorId": "uuid-do-mentor",
  "token": "nanoid-32-chars",
  "type": "global",
  "usedBy": null,
  "usedAt": null,
  "expiresAt": null,
  "createdAt": "2026-03-29T..."
}
```

- **global**: Reutilizavel por multiplos alunos
- **single**: Uso unico, marca `usedBy` ao consumir

### Enrollment (`metas_leges_enrollments`)

```json
{
  "id": "nanoid",
  "planId": "id-do-plano",
  "userId": "uuid-do-aluno (sub do JWT)",
  "userName": "Nome do Aluno",
  "userEmail": "aluno@email.com",
  "mentorId": "uuid-do-mentor",
  "inviteToken": "token-usado",
  "status": "active",
  "releaseConfig": { "mode": "sequential" },
  "goalProgresses": [
    {
      "id": "gp_timestamp_0",
      "goalId": "id-da-meta",
      "status": "unlocked",
      "taskProgresses": [
        { "taskId": "id-da-tarefa", "done": false, "doneAt": null }
      ],
      "unlockedAt": "2026-03-29T...",
      "completedAt": null,
      "scheduledUnlockAt": null
    }
  ],
  "enrolledAt": "2026-03-29T...",
  "updatedAt": "2026-03-29T..."
}
```

#### Status do Enrollment

| Status | Descricao |
|--------|-----------|
| `active` | Aluno progredindo normalmente |
| `paused` | Pausado pelo mentor |
| `blocked` | Bloqueado pelo mentor |
| `completed` | Todas as metas concluidas |

#### Status da Meta (goalProgress)

| Status | Descricao |
|--------|-----------|
| `locked` | Bloqueada, aguardando desbloqueio |
| `unlocked` | Desbloqueada, nenhuma tarefa iniciada |
| `in_progress` | Pelo menos 1 tarefa concluida |
| `completed` | Todas as tarefas concluidas |

---

## Regra de Desbloqueio Sequencial

1. Ao se inscrever, apenas a **primeira meta** e desbloqueada automaticamente
2. Quando o aluno **completa todas as tarefas** de uma meta:
   - A meta muda para `completed`
   - Se houver menos de 2 metas pendentes (unlocked/in_progress), a proxima meta `locked` e desbloqueada
3. O mentor pode **desbloquear manualmente** metas para um aluno ou para todos os alunos

---

## API Endpoints

### Mentor Backend (`backend-express`)

#### Planos
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/plans` | Listar planos do mentor |
| POST | `/api/plans` | Criar plano |
| PATCH | `/api/plans/:id` | Atualizar plano |
| DELETE | `/api/plans/:id` | Deletar plano (cascata) |

#### Metas
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/plans/:planId/goals` | Listar metas do plano |
| POST | `/api/plans/:planId/goals` | Criar meta |
| PATCH | `/api/plans/:planId/goals/:id` | Atualizar meta |
| DELETE | `/api/plans/:planId/goals/:id` | Deletar meta |
| POST | `/api/plans/:planId/goals/:goalId/tasks` | Adicionar tarefa a meta |
| DELETE | `/api/plans/:planId/goals/:goalId/tasks/:taskId` | Remover tarefa da meta |

#### Convites
| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/plans/:planId/invites` | Mentor | Listar links do plano |
| POST | `/api/plans/:planId/invites` | Mentor | Criar link |
| DELETE | `/api/plans/:planId/invites/:id` | Mentor | Revogar link |
| GET | `/api/invites/public` | Nao | Listar planos publicos |
| GET | `/api/invites/:token/validate` | Nao | Validar link com preview |

#### Enrollments
| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/enrollments/me` | Aluno | Meus enrollments |
| POST | `/api/enrollments/enroll` | Aluno | Inscrever via token |
| GET | `/api/enrollments/:id` | Auth | Detalhe do enrollment |
| POST | `/api/enrollments/:id/task-done` | Aluno | Marcar tarefa feita |
| POST | `/api/enrollments/:id/unlock-next` | Mentor | Desbloquear proxima meta |
| POST | `/api/enrollments/plan/:planId/unlock-all` | Mentor | Desbloquear para todos |
| PATCH | `/api/enrollments/:id/status` | Mentor | Mudar status do aluno |

### Aluno Backend (`back_leges`)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/metas-leges/public` | Nao | Planos publicos |
| GET | `/metas-leges/invite/:token` | Nao | Validar convite (com tasks) |
| POST | `/metas-leges/enroll` | Sim | Inscrever via token |
| GET | `/metas-leges/enrollments/me` | Sim | Meus enrollments (enriquecido) |
| GET | `/metas-leges/enrollments/:id` | Sim | Detalhe com plan+goals+tasks |
| POST | `/metas-leges/enrollments/:id/task-done` | Sim | Toggle tarefa feita/desfeita |

---

## Mentor Frontend (boilerplate-vue)

### Rotas

| Rota | View | Descricao |
|------|------|-----------|
| `/planos` | PlansView | Lista de planos com stats |
| `/workspace` | WorkspaceView | Editor de plano (3 paineis) |
| `/mentor/plano/:id` | PlanManageView | Gestao de alunos e links |
| `/mentor/alunos` | MentorStudentsView | Visao geral de todos os alunos |
| `/explorar` | PublicPlansView | Planos publicos (preview) |
| `/convite/:token` | InviteView | Aceitar convite |
| `/metas` | StudentGoalsView | Minhas metas (aluno no mentor app) |

### Workspace (Editor de Plano)

O workspace e dividido em 3 paineis:

1. **Disciplinas** (esquerda): Lista de disciplinas com cores. Selecionar filtra tarefas.
2. **Tarefas** (centro): Tarefas da disciplina selecionada. Arrastavel para metas.
3. **Metas** (direita): Metas do plano com tarefas vinculadas. Drop zone para tarefas.

#### Criacao de Tarefa (ModalTask)

O modal suporta 6 tipos de tarefa. Para **Lei Seca**, o formulario inclui:

- **Lei fonte** (`lawSource`): ID da norma no Elasticsearch
- **Artigos** (`articlesRaw`): Range como "1 a 5, 45" que e parseado para [1,2,3,4,5,45]
- **Filtros da lei**: compilado, com marcacoes, com tags, filtro de tags
- **Questoes vinculadas**: tipo de resposta, banca, ano, disciplina, area, favoritas
- **Orientacao**: Texto de orientacao para o aluno

### Gestao de Alunos (PlanManageView)

3 abas:
- **Alunos**: Tabela com nome, status, progresso, meta atual, acoes (desbloquear, pausar, bloquear)
- **Links**: Links de convite com stats de uso, copiar URL, revogar
- **Liberacao**: Desbloqueio em massa e fila de agendamentos

---

## Aluno Frontend (legislacao)

### Rotas

| Rota | View | Descricao |
|------|------|-----------|
| `/metas/explorar` | ExplorarPlanos | Planos publicos disponiveis |
| `/metas/convite/:token` | ConviteView | Aceitar convite com preview |
| `/metas/minhas` | MeusPlanos | Planos em que esta inscrito |
| `/metas/plano/:enrollmentId` | MinhasMetasView | Metas de um plano especifico |
| `/metas/detalhe/:enrollmentId/:goalProgressId` | MetaDetalheView | Tarefas de uma meta |
| `/metas/lei-seca/:enrollmentId/:goalProgressId/:taskId` | LeiSecaReaderView | Leitor de lei seca |

### Fluxo do Aluno

1. **Explorar** (`/metas/explorar`): Ve cards de planos publicos em grid 3 colunas
2. **Convite** (`/metas/convite/:token`): Preview do plano com accordion de metas/tarefas
   - Se logado: inscreve direto
   - Se nao logado: redireciona para login
3. **Meus Planos** (`/metas/minhas`): Cards dos planos inscritos com progresso geral
4. **Metas do Plano** (`/metas/plano/:id`): Lista sequencial de metas com status (bloqueada/desbloqueada/em progresso/completa)
5. **Detalhe da Meta** (`/metas/detalhe/:eid/:gpid`): Lista de tarefas com checkbox, tipo badge, orientacao, botoes de acao
6. **Lei Seca** (`/metas/lei-seca/:eid/:gpid/:tid`): Leitor com artigos, progresso de leitura, e botao "Iniciar Estudo"

### Integracao com Lei Seca

A tarefa tipo `lei_seca` e a funcionalidade principal. O fluxo de "Iniciar Estudo":

1. Verifica se a norma (`lawSource`) esta importada no `group_forum` do usuario (via `forumStore.isGroupImported(lawId)` que busca por `idLaw` + `created_by` = CPF)
2. **Se nao importada**: Mostra aviso e botao "Importar Norma" que redireciona para `/avancado/:lawId`
3. **Se importada**: Navega para `/avancado/forumlaw/:groupId` com query params:
   - `arts=6&arts=7&arts=8` — artigos filtrados (array, cada um separado)
   - `split=true` — tela dividida
   - `tab=5` — aba de questoes
   - `banca`, `ano`, `disc`, `area`, `typeResp` — filtros de questoes (lidos pelo componente `questoes.vue` via `restoreFormFromRoute()`)

**Importante**: Quando `split=true && tab=5`, os filtros de questoes na query **nao ativam** `withQuestions` no painel da lei (artigos ficam limpos). Os filtros sao aplicados apenas na tab de questoes.

### Persistencia Local

- Artigos lidos sao salvos no `localStorage` com chave `lei_seca_read_{taskId}`
- Ao voltar para a mesma tarefa, o progresso de leitura e restaurado

---

## Menu do Aluno (legislacao)

No sidebar (`MenuUser.vue`), dois itens foram adicionados:

- **Planos de Estudo** (icone: `mdi-compass-outline`) → `/metas/explorar`
- **Meus Planos** (icone: `mdi-target`) → `/metas/minhas`

---

## Autenticacao

- Ambos os backends usam JWT via OAuth2 (mesmo servidor: `auth.studialex.com.br`)
- O `userId` no enrollment e o `sub` do JWT (UUID do OAuth)
- O `back_leges` tambem envia o CPF via header `x-user-cpf` para operacoes legadas
- Links publicos (`/public`, `/invite/:token`) nao requerem autenticacao

---

## Permissoes

| Operacao | Quem pode |
|----------|-----------|
| Criar/editar planos, metas, tarefas | Mentor (dono do plano) |
| Criar/revogar links de convite | Mentor (dono do plano) |
| Desbloquear metas, mudar status | Mentor (dono do plano) |
| Explorar planos publicos | Qualquer pessoa |
| Aceitar convite | Qualquer usuario logado |
| Ver/completar tarefas | Aluno inscrito no plano |
| Marcar tarefa como feita | Aluno (dono do enrollment) |

---

## Orientacoes de Estudo

O mentor pode criar orientacoes reutilizaveis que sao vinculadas a tarefas. Servem como instrucoes de como o aluno deve executar a tarefa.

### Estrutura (`metas_leges_orientations`)

```json
{
  "id": "nanoid",
  "title": "Como estudar Lei Seca",
  "body": "Leia cada artigo pausadamente, grife os termos-chave e anote duvidas...",
  "mentorId": "uuid-do-mentor",
  "createdAt": "2026-03-29T...",
  "updatedAt": "2026-03-29T..."
}
```

### Fluxo

1. No **ModalTask** (mentor), o campo "Orientacao" permite selecionar uma orientacao existente ou criar uma nova inline
2. O `orientationId` e salvo na tarefa
3. No lado do aluno (**MetaDetalheView** e **LeiSecaReaderView**), a orientacao aparece como um alerta com titulo e corpo
4. O backend do aluno (`back_leges`) retorna as orientacoes junto com as tasks no endpoint `GET /metas-leges/enrollments/:id`

### Store e API (mentor)

- Store: `useOrientationStore` em `boilerplate-vue/src/stores/useOrientationStore.js`
- API: `GET/POST/PATCH/DELETE /api/orientations`
- Acoes: `fetchAll()`, `add(title, body)`, `update(id, patch)`, `remove(id)`

---

## Disciplinas

Disciplinas organizam as tarefas por area de conhecimento. Cada disciplina tem uma cor para identificacao visual.

### Estrutura (`metas_leges_disciplines`)

```json
{
  "id": "nanoid",
  "name": "Direito Tributario",
  "color": "#534AB7",
  "mentorId": "uuid-do-mentor",
  "createdAt": "2026-03-29T..."
}
```

### Paleta de cores disponiveis

`#534AB7` (roxo), `#0F6E56` (verde), `#854F0B` (marrom), `#A32D2D` (vermelho), `#1a1a2e` (escuro), `#2563eb` (azul), `#7c3aed` (violeta), `#059669` (esmeralda)

### Store e API (mentor)

- Store: `useDisciplineStore` em `boilerplate-vue/src/stores/useDisciplineStore.js`
- API: `GET/POST/PATCH/DELETE /api/disciplines`
- Acoes: `fetchAll()`, `add(name, color)`, `update(id, patch)`, `remove(id)`
- Persistencia: `disciplines` salvo no localStorage via Pinia persist

---

## Parseamento de Artigos

A funcao `parseArticles()` em `boilerplate-vue/src/utils/articleParser.js` e `backend-express/src/utils/articleParser.js` converte ranges textuais em arrays de numeros.

### Exemplos de entrada e saida

| Entrada (`articlesRaw`) | Saida (`resolved`) |
|--------------------------|-------------------|
| `"1 a 5"` | `[1, 2, 3, 4, 5]` |
| `"1, 3, 5"` | `[1, 3, 5]` |
| `"1 a 5, 10, 20 a 22"` | `[1, 2, 3, 4, 5, 10, 20, 21, 22]` |
| `"45"` | `[45]` |

### Onde e usado

- **ModalTask** (mentor): Ao digitar no campo "Artigos", valida em tempo real e mostra os artigos resolvidos
- **Backend**: Ao salvar a tarefa, o backend tambem parseia e salva `articles.resolved` e `filterLaw.artsFilter`
- **LeiSecaReaderView** (aluno): Usa `articles.resolved` para renderizar o grid de artigos com checkboxes

---

## Integracao Lei Seca com group_forum

Esta e a integracao principal do sistema. Conecta as tarefas de lei seca do Metas Leges com o leitor interativo de leis da aplicacao `legislacao`.

### Conceitos-chave

| Campo | Onde | Descricao |
|-------|------|-----------|
| `task.lawSource` | `metas_leges_tasks` | ID da lei no Elasticsearch (ex: `1758624772077`) |
| `group_forum.idLaw` | `group_forum` | Mesmo ID da lei, vinculado ao usuario que importou |
| `group_forum._id` | `group_forum` | ID do documento no ES, usado como `:id` na rota `/avancado/forumlaw/:id` |
| `group_forum.created_by` | `group_forum` | CPF do usuario que importou a norma |

### Fluxo completo "Iniciar Estudo"

```
1. Aluno clica "Iniciar Estudo" no LeiSecaReaderView
   |
2. Chama forumStore.isGroupImported(task.lawSource)
   |  -> Backend: GET /forumstore/isGroupImported/:idLaw
   |  -> Busca no ES: group_forum WHERE idLaw = :id AND created_by = :cpf AND active = true
   |  -> Retorna: { total: N, forum: "_id_do_documento" }
   |
3a. Se total > 0 (ja importada):
   |  -> groupId = forum (o _id do group_forum)
   |  -> Navega para /avancado/forumlaw/:groupId com query params
   |
3b. Se total = 0 (nao importada):
   |  -> Mostra card amarelo "Norma nao importada"
   |  -> Botao "Importar Norma" -> /avancado/:lawSource
   |  -> Aluno importa a norma pelo fluxo normal da aplicacao
   |  -> Volta ao LeiSecaReaderView e tenta novamente
```

### Query params na rota do leitor

```
/avancado/forumlaw/4i6k15wB8xATL96JJwK9?det=false&split=true&tab=5&page=1&perPage=15&arts=6&arts=7&arts=8&banca=FGV&ano=2024,2025&area=9&disc=2&typeResp=2
```

| Param | Descricao | Origem |
|-------|-----------|--------|
| `arts` | Artigos filtrados (multiplos: `&arts=6&arts=7&arts=8`) | `task.filterLaw.artsFilter` |
| `split` | Tela dividida (lei + questoes) | Fixo `true` |
| `tab` | Aba ativa no split (5 = questoes) | Fixo `5` |
| `banca` | Bancas separadas por virgula | `task.formQuestions.banca` |
| `ano` | Anos separados por virgula | `task.formQuestions.ano` |
| `disc` | IDs de disciplinas separados por virgula | `task.formQuestions.id_disciplina` |
| `area` | IDs de areas separados por virgula | `task.formQuestions.id_area` |
| `typeResp` | Tipo de resposta (1=multipla, 2=certo/errado, 3=discursiva) | `task.formQuestions.typeRespQuestions` |
| `page`, `perPage` | Paginacao | Fixo `1` e `15` |
| `det` | Modo detalhado | Fixo `false` |

### Regra especial: filtros de questoes no painel da lei

Nos componentes `DesktopLayout.vue` e `MobileLayout.vue`, quando os params `banca`/`area`/`disc` estao presentes na query, normalmente ativam `withQuestions = true` (filtro de questoes sobre os artigos da lei). Porem, **quando `split=true && tab=5`**, esses filtros sao ignorados pelo painel da lei e aplicados apenas na tab de questoes via `questoes.vue > restoreFormFromRoute()`.

---

## Convites: Criacao e Tipos

### ModalNewLink (mentor)

O mentor cria links de convite em `PlanManageView > aba Links`:

| Campo | Descricao |
|-------|-----------|
| `type` | `global` (multiplos usos) ou `single` (uso unico) |
| `expiresInDays` | Dias ate expirar (null = sem expiracao) |

### Ciclo de vida do link

```
Criado -> Ativo
  |
  |-- (global) Multiplos alunos usam, link permanece ativo
  |-- (single) 1 aluno usa -> usedBy preenchido -> link consumido
  |-- (expirado) expiresAt < now -> link invalido
  |-- (revogado) Mentor clica revogar -> expiresAt = now
```

### Links publicos vs privados

- Links **global** aparecem na pagina "Explorar Planos" (endpoint `/api/invites/public` e `/metas-leges/public`)
- Links **single** so funcionam para quem receber o URL diretamente
- A query de planos publicos filtra: `type = 'global' AND expiresAt NOT < now`

---

## Persistencia Pinia (localStorage)

### Mentor (boilerplate-vue)

| Store | Chave localStorage | Campos persistidos |
|-------|-------------------|-------------------|
| `usePlanStore` | `plans` | `plans`, `goals` |
| `useTaskStore` | `tasks` | `tasks` |
| `useEnrollmentStore` | `enrollments` | `enrollments`, `inviteLinks` |
| `useDisciplineStore` | `disciplines` | `disciplines` |
| `useOrientationStore` | `orientations` | `orientations` |

### Aluno (legislacao)

| Store | Persistencia |
|-------|-------------|
| `MetasLegesStore` | Nao persiste (carrega sempre da API) |

### Persistencia avulsa (localStorage)

| Chave | Conteudo |
|-------|----------|
| `lei_seca_read_{taskId}` | Objeto `{ artigo: true/false }` com progresso de leitura por tarefa |

---

## Preview de Meta (GoalPreviewView)

O mentor pode visualizar como o aluno vera uma meta antes de publicar.

- **Rota**: `/workspace/preview/:planId/:goalId`
- **View**: `GoalPreviewView.vue`
- Mostra o titulo da meta, descricao, e a lista de tarefas com seus tipos e detalhes
- Tarefas de lei seca mostram os artigos e filtros configurados
- Rota de lei seca no preview: `/workspace/preview/:planId/:goalId/lei-seca/:taskId`

---

## MentorStudentsView (Visao Cross-Plano)

Rota `/mentor/alunos` mostra **todos os alunos** de **todos os planos** do mentor em uma unica tela.

### Funcionalidades

- Agrupamento por `userId` (um aluno pode estar em multiplos planos)
- Nome e email vindos do enrollment (`userName`, `userEmail`)
- Status dominante: `active` > `paused` > `blocked` > `completed`
- Para cada aluno, mostra chips dos planos com barra de progresso
- Busca por nome ou email
- Clique abre `StudentDrawer` com detalhes

### StudentDrawer

Componente lateral que mostra detalhes de um enrollment especifico:
- Dados do aluno (nome, email, status)
- Lista de metas com progresso individual
- Acoes: desbloquear proxima meta, pausar, bloquear, reativar

---

## Variaveis de Ambiente

### boilerplate-vue (.env)

```env
VITE_API_URL=http://localhost:3333/api
VITE_OAUTH2_URL=https://auth.studialex.com.br
VITE_OAUTH2_CLIENT_ID=metas-leges-client
VITE_STUDENT_APP_URL=http://localhost:3000
```

### backend-express (.env)

```env
ES_NODE=https://es-api.studialex.com.br
ES_USERNAME=elastic
ES_PASSWORD=***
ES_INDEX_PREFIX=metas_leges
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
OAUTH2_JWKS_URI=https://auth.studialex.com.br/oauth2/jwks
OAUTH2_ISSUER=https://auth.studialex.com.br
```

### legislacao (.env)

```env
VITE_CHATENDPOINT2=https://localhost:3001
VITE_OIDC_AUTHORITY=https://auth.studialex.com.br
VITE_OIDC_CLIENT_ID=legislacao-client
```

### back_leges (.env)

```env
ELASTIC_NODE=https://es-api.studialex.com.br
ELASTIC_USER=elastic
ELASTIC_PASSWORD=***
AUTH_SERVER_URL=https://auth.studialex.com.br
NODE_ENV=dev
PORT=3001
```

---

## Desbloqueio Agendado (scheduledUnlockAt)

Cada `goalProgress` possui o campo `scheduledUnlockAt` que permite agendar o desbloqueio automatico de uma meta para uma data futura.

### Como funciona

1. O mentor define uma data de desbloqueio para uma meta especifica de um aluno
2. O campo `scheduledUnlockAt` e preenchido com a data ISO
3. A funcao `tickScheduledReleases()` no `useEnrollmentStore` verifica periodicamente se alguma meta agendada ja passou da data
4. Se `scheduledUnlockAt <= now` e `status === 'locked'`: desbloqueia automaticamente

### Onde aparece

- **PlanManageView > aba Liberacao**: Mostra fila de agendamentos (`scheduledQueue`) com usuario, meta, e data agendada
- **Fila ordenada** por data mais proxima primeiro

**Nota**: Este recurso esta implementado na estrutura de dados e na UI de visualizacao, mas o processamento automatico (cron/timer) depende de execucao periodica no frontend ou backend.

---

## Geracao de PDF de Estudo (Integracao com IA)

### Visao Geral

O sistema permite gerar um **Guia de Estudo para Concursos** em PDF a partir dos dados de uma tarefa lei_seca. O PDF e gerado por IA (Ollama local) e inclui analise de questoes, mapa mental, texto da lei e questoes com gabarito.

### Arquitetura da Geracao

```
ModalTask (mentor)                  backend-express              backend_ia_proccess (Python/FastAPI)
     |                                    |                              |
     | 1. Clica "Gerar PDF de Estudo"     |                              |
     | ---------------------------------> |                              |
     |    POST /api/questions/study-pdf   |                              |
     |    { norma, artsFilter, banca,     |                              |
     |      ano, lawName, articles }      |                              |
     |                                    | 2. Busca questoes (ES)       |
     |                                    |    Busca artigos da lei (ES) |
     |                                    |                              |
     |                                    | 3. Monta payload e envia     |
     |                                    | ----------------------------> |
     |                                    |    POST /api/v1/study-pdf    |
     |                                    |    { law_name, articles,     |
     |                                    |      law_texts, questions }  |
     |                                    |                              |
     |                                    | <--------------------------- |
     |                                    |    { task_id, poll_url }     |
     | <--------------------------------- |                              |
     |    { taskId, pollUrl }             |                              |
     |                                    |                              |
     | 4. Polling a cada 3s               |                              |
     | ---------------------------------> |                              |
     |    GET /api/questions/study-pdf     |                              |
     |        /:taskId/status             | 5. Consulta status           |
     |                                    | ----------------------------> |
     |                                    |    GET /api/v1/tasks/:id     |
     |                                    |                              |
     |    (repete ate completed/failed)   |    (IA processa em fila)     |
     |                                    |                              |
     | 6. Download                        |                              |
     | ---------------------------------> |                              |
     |    GET /api/questions/study-pdf     |                              |
     |        /:taskId/download           | 7. Retorna PDF               |
     |                                    | ----------------------------> |
     |                                    |    GET /api/v1/tasks/:id     |
     |                                    |        /download             |
     | <--------------------------------- |                              |
     |    Blob (PDF)                      |                              |
```

### Aplicacao Python: `backend_ia_proccess`

| Item | Detalhe |
|------|---------|
| **Framework** | FastAPI |
| **Porta padrao** | 8100 |
| **Pasta** | `backend_ia_proccess/` |
| **IA local** | Ollama (modelo configuravel) |
| **Fila de tarefas** | SQLite (`tasks.db`) com workers async |
| **Geracao PDF** | Biblioteca `fpdf2` |
| **Mapa mental** | Graphviz (PNG renderizado e embutido no PDF) |

#### Endpoints da API Python

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/v1/study-pdf` | Enfileira geracao do PDF (retorna `task_id`) |
| GET | `/api/v1/tasks/:id` | Consulta status da tarefa (`queued`/`processing`/`completed`/`failed`) |
| GET | `/api/v1/tasks/:id/download` | Download do PDF gerado |

#### Autenticacao

A API Python usa autenticacao por API Key via header `X-API-Key`. A chave e configurada em:
- `backend-express`: variavel `IA_API_KEY` no `.env`
- `backend_ia_proccess`: variavel correspondente no config

#### Fila de Tarefas (`task_queue.py`)

As tarefas sao processadas de forma assincrona:

1. `POST /study-pdf` cria um registro no SQLite com status `queued`
2. Um worker async pega a tarefa da fila
3. Muda status para `processing`
4. Executa o pipeline: preprocessamento → prompt IA → parse JSON → render mindmap → gera PDF
5. Salva resultado como `pdf_base64` no registro
6. Muda status para `completed` (ou `failed` se der erro)

#### Schema da Request (`StudyPdfRequest`)

```python
{
    "law_name": "CTN - Codigo Tributario Nacional",
    "articles": ["1", "2", "3", "4", "5"],
    "law_texts": [
        {
            "art": 1,
            "artLetter": null,
            "textlaw": "O tributo e toda prestacao pecuniaria...",
            "order": 1
        }
    ],
    "questions": [
        {
            "pergunta": "O CTN define tributo como...",
            "resposta": "Verdadeiro",
            "justificativa": "Conforme art. 3 do CTN...",
            "just_detalhada": "O conceito de tributo esta...",
            "norma": "CTN",
            "assunto": "Conceito de Tributo",
            "disciplina": "Direito Tributario",
            "banca": "FGV",
            "ano": "2024",
            "arts_list": ["3"],
            "tipo_cobranca": "literal",
            "doutrina": "",
            "jurisprudencia": ""
        }
    ]
}
```

### Pipeline de Processamento

```
1. PREPROCESSAMENTO (preprocess_questions)
   - Conta questoes por artigo, assunto, banca, ano
   - Extrai justificativas unicas (max 6, ate 300 chars cada)
   - Gera objeto `stats` com distribuicoes

2. CONSTRUCAO DO PROMPT (build_prompt)
   - Monta texto com estatisticas e justificativas
   - Trunca para ~5000 tokens

3. GERACAO IA (Ollama)
   - System prompt: especialista em concursos
   - Retorna JSON com:
     - relevance_summary
     - most_tested_topics (tema, frequencia, artigos, dica)
     - study_tips
     - mindmap (arvore hierarquica)
     - justification_drops (resumo por artigo)
     - key_insights

4. RENDER DO MAPA MENTAL (render_mindmap_png)
   - Usa Graphviz para gerar PNG da arvore
   - Cores por nivel de profundidade

5. GERACAO DO PDF (generate_pdf)
   3 secoes no PDF:

   PARTE 1 - ANALISE IA
   - Relevancia dos artigos
   - Temas mais cobrados (com frequencia e dicas)
   - Mapa mental (imagem PNG embutida)
   - Orientacoes de estudo
   - Resumo das justificativas por artigo
   - Insights das justificativas

   PARTE 2 - TEXTO DA LEI
   - Layout duas colunas: texto da lei (esquerda) + espaco para anotacoes (direita)
   - Artigos ordenados com headers destacados
   - Linha divisoria vertical

   PARTE 3 - QUESTOES
   - Enunciado da questao com banca e ano
   - Espaco antes da resposta (para o aluno cobrir)
   - Resposta (Verdadeiro/Falso com cor)
   - Justificativa em italico
   - Divisor entre questoes
```

### Fluxo no Frontend (ModalTask.vue)

1. O mentor configura uma tarefa lei_seca com `lawSource`, `articles` e `formQuestions`
2. Se houver questoes encontradas (`questionCount > 0`), aparece o botao **"Gerar PDF de Estudo"**
3. Ao clicar:
   - `requestStudyPdf()` envia os filtros para `POST /api/questions/study-pdf`
   - O backend busca as questoes e artigos da lei no Elasticsearch
   - Envia para a API Python que enfileira a geracao
   - Retorna `taskId`
4. `pollPdfStatus(taskId)` faz polling a cada 3 segundos via `GET /api/questions/study-pdf/:taskId/status`
5. Quando `status === 'completed'`:
   - Mostra toast "PDF de estudo gerado com sucesso!"
   - Habilita botao **"Baixar PDF de Estudo"**
6. `downloadStudyPdf()` faz `GET /api/questions/study-pdf/:taskId/download`
   - Recebe Blob do PDF
   - Cria link de download: `guia_estudo_{nome_da_lei}.pdf`

### Dados usados na geracao

| Fonte | Indice ES | Campos |
|-------|-----------|--------|
| Questoes | `questoes_v2` | pergunta, resposta, justificativa, just_detalhada, norma, assunto, disciplina, banca, ano, arts_list, tipo_cobranca, doutrina, jurisprudencia |
| Artigos da lei | `law_forum` | art, artLetter, textlaw, order (filtrado por idGroup + lista de artigos) |

### Variaveis de ambiente adicionais

```env
# backend-express
IA_API_URL=http://localhost:8100/api/v1
IA_API_KEY=chave-da-api-ia

# backend_ia_proccess
PORT=8100
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```
