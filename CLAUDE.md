# CLAUDE.md — Boilerplate Vue (Frontend Mentor — Metas Leges)

Guia operacional para sessões de Claude Code trabalhando neste repositório. Orienta antes de qualquer alteração. Para visão de produto e arquitetura cross-app, ver [documentation/metas-leges.md](documentation/metas-leges.md).

## Visão geral

Frontend Vue 3 do **Metas Leges**, painel do **mentor** que cria planos de estudo modulares para concursos públicos. O fluxo central é: mentor seleciona um edital/cargo → cria um plano → gera metas (com auxílio de IA) → metas viram tarefas distribuídas por disciplina → aluno é convidado por link e progride na execução.

Esta é uma das 4 aplicações da stack:

| App | Pasta | Papel |
|-----|-------|-------|
| Mentor Frontend (este) | `boilerplate-vue/` | UI do mentor |
| Mentor Backend | `../backend-express/` | API REST do mentor (Node + Express + ES) |
| Aluno Frontend | `../legislacao/` | UI do aluno (já em produção) |
| Aluno Backend | `../back_leges/` | API REST do aluno |
| IA local (a substituir) | `../backend_ia_proccess/` | FastAPI + Ollama — **será desligado** |

Banco compartilhado: **Elasticsearch** (índices `metas_leges_*`). Auth compartilhada: **OAuth2/OIDC** em `auth.studialex.com.br`.

## Stack

- **Vue 3.5** (Composition API, `<script setup>`) + **Vite 7**
- **Pinia 3** + `pinia-plugin-persistedstate` (algumas stores persistem em localStorage)
- **Vue Router 4** (com guard global de auth + nprogress)
- **Axios** (instância única em `src/services/http.js` com Bearer interceptor + 401 → logout)
- **TailwindCSS 4** + Sass (utilitárias + componentes com escopo)
- **vue-i18n 9** (configurado mas com poucas mensagens — ver §Riscos)
- **Tiptap 3** (rich text editor, usado em orientações e tasks)
- **vue-sonner** (toasts — `toast.success` / `toast.error`)
- **oidc-client-ts 3.5** (login OAuth2 PKCE)
- **Chart.js + vue-chartjs**, **marked + dompurify** (markdown safe), **Zod 4** (validações pontuais)

## Comandos

```bash
npm run dev      # Vite dev server (porta 3000 por padrão)
npm run build    # Build de produção em dist/
npm run preview  # Servir build local
```

Dependências: backend Express deve estar rodando em `VITE_API_URL` (default `http://localhost:3333/api`).

## Estrutura de `src/`

```
src/
├── main.js                # Bootstrap: Pinia + Router + i18n
├── App.vue                # Layout raiz, Toaster, ticker de releases
├── auth/oidcConfig.js     # Config OIDC (issuer, audience, redirect)
├── router/                # routes.js + index.js (guard de auth)
├── services/              # Camada HTTP — usar SEMPRE em vez de axios direto
│   ├── http.js            # Instância Axios canônica (Bearer + 401)
│   ├── plan.service.js    # /api/plans
│   ├── goal.service.js    # /api/plans/:planId/goals
│   ├── task.service.js    # /api/plans|disciplines/:id/tasks
│   ├── planoEstudo.service.js  # /api/editais/.../plano/{inicializar,sugerir,confirmar} ← IA
│   ├── enrollment.service.js   # /api/enrollments
│   ├── invite.service.js       # /api/invites + getLinkUrl()
│   ├── edital.service.js  # /api/editais
│   ├── cargo.service.js   # /api/editais/:id/cargos
│   └── … (orientation, discipline, law, question, dicts, estatistica, taskOrientation, storage)
├── stores/                # Pinia — ver mapa abaixo
├── views/                 # 20+ páginas (ver mapa abaixo)
├── components/
│   ├── workspace/         # Painéis principais do mentor (ModalTask, PanelGoals, PanelTasks, FileUpload, …)
│   ├── mentor/            # Componentes específicos do mentor
│   ├── features/          # Componentes por feature
│   ├── common/ ui/        # Atoms reutilizáveis
├── composables/           # useConnectionStatus.js (online/offline). useApi/useAuth estão vazios — não copiar como referência.
├── utils/                 # releaseEngine.js, editalParser.js, articleParser.js, statsParser.js, questionDicts.js
├── plugins/i18n.js axios.js
└── layouts/
```

### Mapa de Stores Pinia (`src/stores/`)

| Store | Domínio | Persistido? |
|-------|---------|-------------|
| `auth.store.js` | user, token, login(), handleCallback(), restoreSession(), logout() | sim |
| `usePlanStore.js` | Plans + Goals (CRUD, addTaskToGoal) | sim |
| `useGoalStore.js` | Helper minimal (computed) — lógica real está em planStore | — |
| `useTaskStore.js` | Tasks (fetchByPlan / fetchByDiscipline / CRUD) | sim |
| `useEnrollmentStore.js` | Enrollments + invite links + scheduled releases | sim |
| `useDisciplineStore.js` | Disciplinas (cores/nomes) | — |
| `useOrientationStore.js` | Orientações de estudo | — |
| `useEditalStore.js` | Editais (índice nacional) | — |
| `useCargoStore.js` | Cargos do edital + priorização | — |
| `useEstatisticaStore.js` | Stats por disciplina/lei/questão | — |
| `useDictsStore.js` | Dicionários jurídicos | — |
| `useStudentStore.js` | Dados do aluno (visão mentor) | — |
| `useUserStore.js` / `user.store.js` | **Redundância** — preferir o que já está em uso no fluxo tocado | — |
| `workspaces.store.js` | Workspaces compartilhados | — |
| `search.store.js` | Busca global | — |

Convenção: composition API (`defineStore('xxx', () => { … })`) com `ref()` + `async function`. Ações fazem `try/catch` e usam `toast.error(err.message)`.

### Mapa de Views (`src/views/`)

| View | Função |
|------|--------|
| `PlansView.vue` | Dashboard do mentor (lista planos) |
| `PlanManageView.vue` | Gestão de plano (goals, tasks, progresso) |
| `PlanoEstudoBuilderView.vue` | **Gerador de metas via IA** — fluxo edital → sugerir → confirmar |
| `EditaisView.vue` / `EditalCargosView.vue` / `CargoConteudoView.vue` | Browse + priorização de editais |
| `EstatisticasView.vue` | Estatísticas |
| `LeiSecaReaderView.vue` | Leitor de lei seca com filtro de questões |
| `MentorStudentsView.vue` | Gestão de alunos |
| `StudentGoalsView.vue` / `StudentGoalDetailView.vue` / `GoalPreviewView.vue` | Espelhos da experiência do aluno |
| `InviteView.vue` / `InviteCallbackView.vue` | Aceite de convite |
| `auth/Login.vue Register.vue Callback.vue LogoutCallback.vue` | OAuth2 |
| `WorkspaceView.vue UserArea.vue PublicPlansView.vue Home.vue About.vue NotFound.vue OrientacaoView.vue` | Demais |

## Convenções

- **Idioma:** identificadores e UI em **pt-BR** (`planId`, `metaAtual`, `editalId`); estrutura técnica em en-US (imports, classes externas).
- **Naming:** stores `useXxxStore.js`, views `XxxView.vue`, components `PascalCase.vue`, services `xxxService` ou `xxx.service.js`.
- **Networking:** sempre via `services/*.service.js`; nunca chamar `axios` direto fora dos services.
- **Loading:** `const loading = ref(false)` antes do `try`, `finally { loading.value = false }`. Sem `AbortController` por padrão.
- **Erros:** `try/catch` na store ou no componente, `toast.error(err.message)`.
- **Persistência Pinia:** `persist: { key, paths }` na última linha do `defineStore`. Atenção a desincronização entre abas.
- **Auth guard:** sem `access_token` em `localStorage` → `/auth/login`. Token expirado/401 → interceptor faz logout automático.
- **Timeouts especiais:** `planoEstudoService.sugerir()` e `.confirmar()` usam **120s** (o backend chama IA externa).
- **Markdown seguro:** sempre `marked` + `dompurify` antes de injetar HTML.
- **Sem emojis em código/docs** salvo se o usuário pedir explicitamente.

## Variáveis de ambiente (`.env`)

Frontend lê apenas `VITE_*`:

```
VITE_API_URL=http://localhost:3333/api      # Backend Express (mentor)
VITE_APP_NAME=Metas Concurso
VITE_STUDENT_APP_URL=http://localhost:3000  # Frontend do aluno (legislacao)
OAUTH2_JWKS_URI=https://auth.studialex.com.br/oauth2/jwks
OAUTH2_ISSUER=https://auth.studialex.com.br
OAUTH2_AUDIENCE=legis-app
```

Não commitar `.env` com chaves reais.

## Integração com IA (estado atual e ponto de migração)

> **Decisão de arquitetura:** o `backend_ia_proccess` (FastAPI + Ollama) está sendo **desligado** e substituído por **Claude API / OpenRouter / OpenAI**. Hoje, na prática, o caminho de IA já vai pelo OpenRouter — a FastAPI ficou subutilizada.

### Fluxo atual da única chamada de IA exposta hoje

```
[Frontend]
PlanoEstudoBuilderView.vue
  └─> planoEstudoService.sugerir({ editalId, cargoId, planId })   timeout 120s
        └─> POST /api/editais/:eid/cargos/:cid/plano/:pid/sugerir
[Backend Express]   ../backend-express/src/modules/plano-estudo/
  ├─ plano.controller.js
  └─ plano.generator.js
       └─ gerarOrientacoesTasks()  ← chamarIA({ provider: 'openrouter', system, user, max_tokens: 4000 })
              ├─ utils/iaProvider.js  (abstração local | openrouter)
              ├─ utils/openRouterClient.js  (POST openrouter.ai/api/v1/chat/completions)
              └─ utils/iaClient.js          (POST FastAPI /api/v1/qa — provider 'local')
[FastAPI — a desligar]
  POST /api/v1/qa  →  Ollama llama3:8b
```

### Endpoints IA expostos pelo Express (consumidos pelo front)

- `POST /plano/inicializar` — cria/recupera plano para um cargo
- `GET  /plano/:planId/estado` — assuntos pendentes, cobertos, progresso
- `POST /plano/:planId/sugerir` — **sugere próxima meta (chama IA)**
- `POST /plano/:planId/confirmar` — persiste meta + tasks

### Endpoints da FastAPI hoje (e quem chama)

| Endpoint | Tipo | Chamado pelo front? | Chamado pelo Express? |
|----------|------|---------------------|------------------------|
| `/qa` (Ollama) | sync | não | sim, quando `provider='local'` em `iaProvider.js` |
| `/classify` `/extract` `/embeddings` | sync | não | não |
| `/summarize` `/mindmap` `/analyze` `/study_pdf` | async (task queue) | não | não |
| `/tasks/:id` `/tasks/:id/download` | sync | não | não |

A maior parte dos endpoints FastAPI **não tem caller** — checar antes de migrar para não criar UI para algo que vai morrer.

### Ao planejar a substituição

1. Foco mínimo da migração: trocar a chamada em `gerarOrientacoesTasks()` (Express) — o front **não fala diretamente com IA**.
2. Revisar `iaProvider.js` — a abstração local/openrouter já existe; basta adicionar `claude`/`openai` ou consolidar em um cliente único compatível com a OpenAI Chat Completions API.
3. Manter o contrato de retorno: a função espera **JSON parseável** (com fallback raw text). Mudança de provedor não pode quebrar o parse.
4. Conferir prompts em `prompts/*.py` (FastAPI) — caso vá-se migrar `/study_pdf` ou `/mindmap`, esses prompts são o ponto de partida; senão, podem ser arquivados.
5. Antes de remover o FastAPI, **buscar usos no Express** (`grep -R "iaClient\|IA_API_URL\|/api/v1/" backend-express/src`).

## Riscos conhecidos / dívida técnica

- **`useApi.js` e `useAuth.js`** estão vazios — não usar como referência; lógica real está em stores.
- **`useUserStore.js` vs `user.store.js`** — coexistem; conferir qual está vivo no fluxo antes de mexer.
- **`ModalTask.vue` ≈ 48KB** — refactor pendente. Evitar adicionar mais ramos sem extrair.
- **`plano.generator.js` (Express, ~500 linhas)** — concentra regra de negócio pesada da geração de metas. Ler antes de editar.
- **i18n incompleta** — `vue-i18n` carregado mas com poucas mensagens; a UI tem strings hardcoded em pt-BR.
- **Pinia persist + múltiplas abas** — sem conflict resolution. Cuidado ao persistir mais coisa.
- **Elasticsearch sem migrations** — qualquer novo campo precisa ser combinado com o mapping em `../backend-express/src/config/elasticsearch.js`.
- **OAuth2 obrigatório** — em dev o backend aceita `mock-token-{userId}`; o front precisa de token real do `auth.studialex.com.br`. Para testar offline, mockar `localStorage.access_token`.

## Diretrizes para alterações

1. **Antes de criar componente novo**, procurar em `components/workspace/`, `components/common/` e `components/ui/` — há reuso disponível.
2. **Antes de criar service novo**, conferir se existe um já cobrindo o domínio. Padronizar nome `xxxService` e exportar funções nomeadas.
3. **Antes de adicionar store**, verificar se cabe expandir uma existente (ex: tasks já estão em `useTaskStore`; goals em `usePlanStore`).
4. **Backend Express e Frontend evoluem juntos** — toda mudança de contrato (rota, payload, header) precisa de PR coordenado em `../backend-express/`.
5. **Não chamar a FastAPI direto do front.** O acoplamento de IA fica no Express. Se aparecer demanda de UI nova de IA, decidir primeiro o provider (Claude/OpenRouter/OpenAI) e atravessar o Express.
6. **Sempre usar `services/http.js`** — qualquer fetch fora dele perde Bearer + 401-handling.
7. **Toasts via `vue-sonner`** (`toast.success` / `toast.error`). Não introduzir outra lib de notificação.
8. **Markdown sempre sanitizado** com `dompurify` antes de injetar.
9. **Build/test antes de declarar pronto** — `npm run build` precisa passar; UI precisa ser exercitada no navegador para mudanças visuais.
