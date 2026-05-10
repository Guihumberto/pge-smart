# Editais — Cadastro, Conteúdo Programático, Priorização e Vinculação de Normas

> Funcionalidade que permite ao mentor cadastrar um **edital de concurso**, listar seus **cargos**, importar e estruturar o **conteúdo programático** de cada cargo, gerar uma **priorização** (com scores baseados em histórico de questões) e **vincular as normas mencionadas a leis reais do índice `laws_v3`**. É o ponto de entrada para todo o fluxo "do edital ao plano".

**Última atualização:** 2026-05-08 (PR7 + PR8 — recência no score + quebra adaptativa de assunto em N tasks)

## Sumário

1. [Visão geral do fluxo](#1-visão-geral-do-fluxo)
2. [Modelo de dados](#2-modelo-de-dados)
3. [Telas e arquivos](#3-telas-e-arquivos)
4. [Estados internos da `CargoConteudoView`](#4-estados-internos-da-cargoconteudoview)
5. [Parsing local (`utils/editalParser.js`)](#5-parsing-local-utilseditalparserjs)
6. [Operações com IA (Express)](#6-operações-com-ia-express)
7. [Endpoints consumidos](#7-endpoints-consumidos)
8. [Stores Pinia envolvidas](#8-stores-pinia-envolvidas)
9. [Persistência e cache](#9-persistência-e-cache)
10. [Pontos de atenção](#10-pontos-de-atenção)
11. [Vinculação de normas (PR4 + PR5)](#11-vinculação-de-normas-pr4--pr5)
12. [Status (após PR7)](#12-status-após-pr7--2026-05-08)
13. [Priorização determinística (PR6+PR7) — detalhes do modelo](#13-priorização-determinística-pr6--detalhes-do-modelo)

---

## 1. Visão geral do fluxo

```
[1] /editais                                 → cadastra edital (nome, órgão, banca, data da prova)
       ↓ click no card
[2] /editais/:id/cargos                      → cadastra cargos do edital (nível, área, formação)
       ↓ click no card
[3] /editais/:id/cargos/:cargoId             → conteúdo programático (4 estados internos)
       ├─ entrada       (cola texto bruto)
       ├─ preview       (regex local segmenta em disciplinas → manda pra IA)
       ├─ resultado     (árvore disc → ass → sub_ass → sub_sub_ass; valida completude; analisa)
       └─ priorizacao   (scores, tendências, fontes, carga horária, reorganização)
       ↓ botão "Plano de Estudo"
[4] /editais/:id/cargos/:cargoId/plano       → gerador de metas (PlanoEstudoBuilderView)
```

Cada passo persiste no Elasticsearch via `backend-express` (índices `metas_leges_editais`, `metas_leges_edital_cargos`).

## 2. Modelo de dados

### Edital
```js
{
  id, nome,
  orgao,       // "PGE/AL"
  estado,      // "AL"
  ano,         // 2026
  banca,       // "FCC"
  link,        // URL pública do edital
  data_prova,  // ISO date
  criado_em, atualizado_em,
}
```

### Cargo
```js
{
  id, edital_id,
  nome,                  // "Procurador do Estado"
  nivel,                 // "Superior" | "Médio" | "Técnico"
  area,                  // "Direito"
  formacao,              // "Direito"

  // Conteúdo programático
  conteudo_bruto,        // texto colado pelo usuário (string)
  conteudo_parseado,     // árvore estruturada (ver abaixo)
  parse_status,          // "pendente" | "processando" | "concluido" | "erro"

  // Priorização (pós análise)
  priorizacao,           // ver abaixo
}
```

### `conteudo_parseado`

```js
{
  disciplinas: [
    {
      nome: "Direito Administrativo",
      assuntos: [
        {
          nome: "Atos administrativos",
          fontes_explicitas: ["Lei 9.784/99"],   // tags livres
          sub_assuntos: [
            {
              nome: "Vícios e nulidades",
              sub_sub_assuntos: ["string", "string"]   // folhas
            }
          ]
        }
      ]
    }
  ]
}
```

### `priorizacao`

```js
{
  _meta: {
    bancaAlvo,                  // "FCC"
    temDadosBancaAlvo,          // boolean
    qtdAnosBancaAlvo,           // 5
    bancasSimilares: [],
    qtdAnosBancaSimilar,
  },
  disciplinas: [
    {
      nome,
      score,                    // 0..1
      tendencia,                // "crescente" | "estavel" | "decrescente"
      tipo_fonte: ["legislacao", "jurisprudencia", "doutrina", "teoria"],
      fonte,                    // "banca_alvo" | "banca_similar" | "ambas"
      carga_estimada_horas,
      sugestao_semana,          // 1..N
      peso,                     // multiplicador editável (0.5..2.5)
      assuntos: [
        {
          nome, score, tendencia, tipo_fonte, fonte,
          carga_estimada_horas, sugestao_semana,
          equivalente_historico,    // nome canônico no histórico de questões
          justificativa,            // string explicando o score
          leis_referencia: [],
          sub_assuntos: [
            { nome, score, tendencia, tipo_fonte, fonte, justificativa, leis_referencia: [] }
          ]
        }
      ]
    }
  ]
}
```

## 3. Telas e arquivos

| Rota | View | Componentes auxiliares |
|------|------|------------------------|
| `/editais` | [src/views/EditaisView.vue](../src/views/EditaisView.vue) | — |
| `/editais/:id/cargos` | [src/views/EditalCargosView.vue](../src/views/EditalCargosView.vue) | — |
| `/editais/:id/cargos/:cargoId` | [src/views/CargoConteudoView.vue](../src/views/CargoConteudoView.vue) | [ProviderToggle](../src/components/common/ProviderToggle.vue) |
| `/editais/:id/cargos/:cargoId/plano` | [src/views/PlanoEstudoBuilderView.vue](../src/views/PlanoEstudoBuilderView.vue) | — |

Helpers/util:
- [src/utils/editalParser.js](../src/utils/editalParser.js) — `limpar()`, `segmentar()`, `detectarPadraoDominante()`, `detectarAnomalias()`, `parseNomeEdital()`

Stores:
- [src/stores/useEditalStore.js](../src/stores/useEditalStore.js)
- [src/stores/useCargoStore.js](../src/stores/useCargoStore.js)
- [src/stores/useDictsStore.js](../src/stores/useDictsStore.js) (bancas, áreas, disciplinas, cargos canônicos)

Services:
- [src/services/edital.service.js](../src/services/edital.service.js)
- [src/services/cargo.service.js](../src/services/cargo.service.js)
- [src/services/dicts.service.js](../src/services/dicts.service.js)

## 4. Estados internos da `CargoConteudoView`

Variável reativa: `estado: 'entrada' | 'preview' | 'resultado' | 'priorizacao'`. A view escolhe o estado inicial em `onMounted` baseado no que o cargo já tem persistido.

### `entrada`
- `textarea` para colar o conteúdo bruto.
- Auto-persiste no `localStorage` a cada digitação (`onTextoBrutoChange`) com chave `edital_conteudo_${editalId}_${cargoId}`.
- Botão **"Processar Regex"** chama `processarRegex()` → roda `limpar()` + `segmentar()` localmente e vai pro `preview`.

### `preview`
- Layout 2 colunas:
  - Esquerda: texto original com highlights (`textoHighlighted` computed) — disciplinas em azul, anomalias em laranja com tooltip.
  - Direita: cards editáveis das disciplinas detectadas (input de nome, textarea do conteúdo, contador de chars com avisos > 18k / > 20k, anomalias listadas).
- Modo de envio:
  - **`all`** — manda todas de uma vez.
  - **`by_discipline`** — manda uma por uma com checkbox de seleção.
- `ProviderToggle` para escolher `local` (Ollama) ou `openrouter` (default `'openrouter'`).
- **"Enviar para IA"** chama `cargoStore.enviarParse()` (timeout 5min). Após sucesso, refaz `fetchCargo` e popula `conteudoParseado`, indo pro estado `resultado`.

### `resultado`
- Árvore editável de 4 níveis:
  - disciplina → assuntos → sub_assuntos → sub_sub_assuntos (folhas string).
  - Cada nó tem input de nome, botão remover. Disciplinas e assuntos com filhos têm chevron de expand/collapse.
  - Estado de expansão em `treeState.value = { discs: {idx: bool}, assuntos: {'di-ai': bool} }`.
- **Painel de validação de completude** (`validacao` computed):
  - Extrai itens numerados do texto bruto via regex (`\d{1,2}(?:\.\d{1,2}){0,2}\s+`).
  - Compara com nomes na árvore parseada.
  - Lista o que possivelmente ficou de fora.
- Seleção de disciplinas para análise:
  - Cada disc tem `_selecionado`, `_analiseStatus` (`null` | `'aguardando'` | `'processando'` | `'concluido'` | `'erro'`), `_analiseFase`.
  - **"Analisar (N)"** chama `cargoStore.analisarConteudo()` em fila (uma disciplina por vez, timeout 10min cada). Mostra barra de progresso `filaProcessadas / filaTotalSelecionadas`.
- **"Salvar conteúdo"** persiste `conteudoParseado` no backend e volta para `/editais/:id/cargos`.

### `priorizacao`
- Cards de resumo: carga total, semanas sugeridas, semanas disponíveis (`semanasDisponiveisCalc` = dias até prova / 7 − semanas de revisão), nº disciplinas.
- Banner verde/vermelho conforme `temAlertaSemanas`.
- **Painel de reorganização** (`showReorganizar`):
  - Inputs `horasPorDia` (1–10), `diasPorSemana` (1–7), `semanasRevisao` (0–6).
  - **"Calcular opções"** → `cargoService.reorganizar()` retorna `{ diagnostico, opcoes: [{ tipo, descricao, totalSemanas, assuntosMantidos, assuntosCortados, aviso }] }`. Tipos: `ok`, `aumentar_horas`, `cortar_conteudo`, `reduzir_revisao`. Auto-seleciona `cortar_conteudo` quando há déficit.
  - **"Aplicar reorganização"** → `cargoService.aplicarReorganizacao({ opcao, config })`.
- Lista de disciplinas com scores, tendência, tipos de fonte, peso (select 0.5x–2.5x), carga (recalculada com peso via `cargaComPeso`), semana sugerida.
- Drill-down até sub-assunto: justificativa, equivalente histórico, leis de referência.
- Legenda de cores (alto 80+, médio 40–79, baixo 1–39, sem dados) e tipos (Lei, Jur, Dou, Teo).

## 5. Parsing local (`utils/editalParser.js`)

Roda inteiramente no browser, **antes** de mandar para IA. Duas fases.

### Fase 1 — `limpar(texto)`
- Remove numeração de página (`Página X de Y`, dígitos isolados).
- Remove headers/footers que se repetem 3+ vezes.
- Normaliza espaços, tabs, quebras múltiplas.
- Remove bullets unicode.
- Trim por linha.

### Fase 2 — `segmentar(textoLimpo, disciplinasConhecidas)`
- Usa `disciplinasConhecidas` (vindas de `useDictsStore.disciplinas`) como dicionário para detectar nomes de disciplina mesmo quando o texto está colado em uma única linha.
- Detecta padrão dominante (numeração: decimal/romano/arábico/letra; separador: `;` `.` ou quebra de linha).
- Para cada linha:
  - `matchDisciplina()` testa 3 padrões regex (numeração romana, numeração arábica + caixa alta, caixa alta solitária com 10+ chars) **e** match contra `disciplinasConhecidas`.
  - Se for disciplina, abre novo bloco. Se não, anexa ao bloco atual.
  - Texto antes da primeira disciplina vira bloco especial `_NAO_IDENTIFICADO`.
- `juntarQuebrasDePdf()` reagrupa linhas cortadas pela quebra do PDF (heurística: linha não começa com numeração e a anterior não termina com `.;:)`).
- Merge de blocos com mesmo nome (case-insensitive).
- `detectarAnomalias()`:
  - **`disciplina_embutida`** — disciplina aparente dentro de bloco de assuntos.
  - **`quebra_numeracao`** — `4.1 → 4.3` sem o `4.2`. Ignora "Lei nº 9.605", numeração de 3 níveis e sub > 30.

### `parseNomeEdital(nome)`
- Extrai órgão (`PGE/AL`, `TRF-3`), estado (sigla 2 letras quando vem após `/`) e ano (4 dígitos começando com 20). Usado em [EditaisView.vue:220-225](../src/views/EditaisView.vue#L220-L225) para auto-preencher campos do formulário ao colar o nome do edital.

## 6. Operações com IA (Express)

Cada chamada do front passa pelo `backend-express`, que abstrai o provider em `iaProvider.js` (`local` → FastAPI/Ollama; `openrouter` → cloud). O front nunca fala com IA direto — sempre via Express.

| Operação | Endpoint | Timeout | O que faz |
|----------|----------|---------|-----------|
| **Parse** | `POST /editais/:id/cargos/:cargoId/parse` | 5 min | Recebe texto pré-segmentado por disciplina e devolve a árvore estruturada (`conteudo_parseado`) |
| **Analisar** | `POST /editais/:id/cargos/:cargoId/analisar` | 10 min | Pipeline de **2 fases**: classificação (tipo_fonte por assunto via IA local) + priorização (scores via OpenRouter cruzando histórico de questões) |
| **Classificar** | `POST .../classificar` | 5 min | Apenas a fase 1 isolada |
| **Priorizar** | `POST .../priorizar` | 5 min | Apenas a fase 2 isolada |
| **Reorganizar** | `POST .../reorganizar` | default | Não usa IA — calcula opções determinísticas com base em horas/dias/revisão |
| **Aplicar reorganização** | `POST .../aplicar-reorganizacao` | default | Persiste a opção escolhida (corte de assuntos, ajuste de horas, etc) |

### Payload do parse
```js
POST /editais/:id/cargos/:cargoId/parse
{
  mode: 'all' | 'by_discipline',
  blocos: [{ disciplina: string, texto: string }],
  provider: 'local' | 'openrouter'
}
```

### Payload da análise
```js
POST /editais/:id/cargos/:cargoId/analisar
{
  area: string,                 // do cargo (ex: "Direito")
  disciplinas: string[],        // nomes selecionados
  provider: 'local' | 'openrouter'
}
```

### Padrão de espera (sem polling no front)
A view **bloqueia na requisição** com loading spinner em vez de polling — por isso os timeouts altos no axios. As rotas `parse-status` e `analise-status` existem no backend mas hoje não são usadas pelo front.

## 7. Endpoints consumidos

```
# Editais
GET    /api/editais
POST   /api/editais
GET    /api/editais/:id
PATCH  /api/editais/:id
DELETE /api/editais/:id

# Cargos
GET    /api/editais/:id/cargos
POST   /api/editais/:id/cargos
GET    /api/editais/:id/cargos/:cargoId
PATCH  /api/editais/:id/cargos/:cargoId
DELETE /api/editais/:id/cargos/:cargoId

# Conteúdo programático e priorização (com IA)
POST   /api/editais/:id/cargos/:cargoId/parse                       (5 min)
GET    /api/editais/:id/cargos/:cargoId/parse-status                (não usado pelo front)
POST   /api/editais/:id/cargos/:cargoId/analisar                    (10 min)
GET    /api/editais/:id/cargos/:cargoId/analise-status              (não usado pelo front)
POST   /api/editais/:id/cargos/:cargoId/classificar                 (5 min)
POST   /api/editais/:id/cargos/:cargoId/priorizar                   (5 min)
POST   /api/editais/:id/cargos/:cargoId/reorganizar
POST   /api/editais/:id/cargos/:cargoId/aplicar-reorganizacao
POST   /api/editais/:id/cargos/:cargoId/gerar-plano                 (60s — usado pelo PlanoEstudoBuilder)

# Dicionários (autocomplete)
GET    /api/dicts?tipo=banca|disciplina|area|cargo
POST   /api/dicts
```

## 8. Stores Pinia envolvidas

### `useEditalStore`
- Estado: `editais`, `editalAtual`, `loading`.
- Ações: `fetchEditais`, `fetchEdital`, `createEdital`, `updateEdital`, `removeEdital`.
- Helper: `countdown(dataProva)` → `{ semanas, dias, total, passado }` para os badges de prazo.
- Persistido (paths: `['editais']`).

### `useCargoStore`
- Estado: `cargos`, `cargoAtual`, `loading`, `parseStatus`.
- CRUD: `fetchCargos`, `fetchCargo`, `createCargo`, `updateCargo`, `removeCargo`.
- Operações pesadas: `enviarParse`, `salvarConteudo`, `analisarConteudo`, `priorizarConteudo`, `classificarConteudo`.
- Status helpers: `checkParseStatus`, `checkAnaliseStatus` (pré-fiados, atualmente sem caller).
- Persistido (paths: `['cargos']`).

### `useDictsStore`
- Carrega listas canônicas para autocomplete: `bancas`, `disciplinas`, `areas`, `cargos`.
- Ações: `fetchByTipo(tipo)`, `fetchAll`, `create`, `update`, `remove`, `seed`.
- `disciplinas` é fundamental para o `segmentar()` reconhecer nomes de disciplina mesmo em linhas longas tipo "DIREITO EMPRESARIAL: 1 Fundamentos…".
- Persistido (paths: `['items']`).

## 9. Persistência e cache

| Camada | Chave / paths | Quando é limpa |
|--------|---------------|----------------|
| Pinia persist | `editais`, `cargos`, `dicts` no localStorage | Logout (manual) ou troca de usuário |
| `localStorage.edital_conteudo_${editalId}_${cargoId}` | Texto bruto da `entrada` | `salvarConteudo` (após sucesso) e `iniciarAnalise` |
| Backend ES | `cargo.conteudo_bruto`, `cargo.conteudo_parseado`, `cargo.priorizacao`, `cargo.parse_status` | Persistido por `update`/`salvarConteudo`/`analisar` |

Boot da `CargoConteudoView` (`onMounted`):
1. Se `cargo.priorizacao.disciplinas.length` > 0 → entra direto em `priorizacao`.
2. Senão, se `cargo.conteudo_parseado.disciplinas.length` > 0 → entra em `resultado`.
3. Caso contrário → `entrada`. Restaura texto bruto do localStorage (prioridade) ou de `cargo.conteudo_bruto`.

## 10. Pontos de atenção

- **Pinia persist + edição em múltiplas abas** — duas abas editando o mesmo cargo viram race no localStorage. Sem conflict resolution.
- **Sem polling de status** — para parse/análise, a view depende inteiramente do timeout do axios (5–10 min). Se a conexão cair, o usuário não tem como retomar pelo `parse-status`/`analise-status` (existem no back, mas o front nunca chama).
- **Limite de 20k chars por disciplina** no preview — sinalizado visualmente (`char-count--warn` > 18k, `char-count--over` > 20k) mas **não bloqueia o envio**. Trata-se de heurística para evitar estouro de prompt.
- **`conteudo_parseado` é deep-cloneado via `JSON.parse(JSON.stringify(...))`** para não mutar a referência do store. Cuidado ao adicionar campos circulares (Date, funções).
- **`_meta` da priorização não é tipada** — vem como `priorizacao._meta` direto do backend, contém `bancaAlvo`, `temDadosBancaAlvo`, `qtdAnosBancaAlvo`, `bancasSimilares`, `qtdAnosBancaSimilar`. Mudanças no back precisam ser refletidas aqui.
- **`onPesoChange` é placeholder** — só faz comentário; o peso só é efetivamente persistido em `aplicarReorganizacao`. Se o usuário mexer no peso e sair sem reorganizar, a mudança se perde.
- **Erros silenciosos no parse "all"** — se uma das disciplinas falhar dentro do bloco único, todo o lote é marcado como erro sem detalhar qual. Modo `by_discipline` é o caminho seguro para texto problemático.
- **`disc._aberto`, `_selecionado`, `_parseStatus`, `_analiseStatus`, `_analiseFase`, `_parseErro`** são flags **só de UI** — não devem ser enviadas em `salvarConteudo`. Hoje vão junto no JSON.parse/stringify; o back ignora, mas é dívida.
- **`disciplinasConhecidas` precisa estar carregado antes do `processarRegex`** — `onMounted` faz `Promise.all` mas se o usuário mudar de cargo via SPA navigation antes do fetch terminar, a segmentação fica pior. `dictsStore` é persistido para mitigar.

## 11. Vinculação de normas (PR4 + PR5)

A aba `vinculacao` (5º estado de `CargoConteudoView`) permite vincular menções de normas no edital com leis reais do índice externo `laws_v3` (gerenciado pelo `back_leges`).

### Modelo norma-centric (PR5 — vigente)

Cada norma única tem **uma entrada** em `cargo.leis_vinculadas.normas[]`. O campo `abarca[]` agrega TODOS os pontos do edital onde a norma aparece, organizados por disciplina:

```js
{
  id: 'norm_<sha1(nomeNormalizado)>',
  nomeOriginal: 'Lei nº 5.172/1966',
  nomeNormalizado: '5172/1966',          // chave canônica de dedupe
  ano: 1966,
  abarca: [
    {
      disciplina: 'Direito Tributário',
      assuntos: ['Obrigação tributária', 'Crédito tributário'],
      sub_assuntos: ['Lançamento', 'Suspensão'],
      dispositivos: ['art. 113', 'art. 142'],
    },
    {
      disciplina: 'Direito Constitucional',
      assuntos: ['Sistema tributário'],
      sub_assuntos: [],
      dispositivos: [],
    },
  ],
  lawId: 'abc123',                       // id real em laws_v3
  lawTitle: 'Lei nº 5.172, de 25 de outubro de 1966',
  lawSubtitle: 'Dispõe sobre o Sistema Tributário Nacional',
  candidatos: [{ id, title, score }],    // top 5 do BM25
  status: 'confirmada' | 'sugerida' | 'ambigua' | 'pendente' | 'nao_encontrada' | 'confirmada_obsoleta',
  confirmadoEm: '2026-05-06T...',
}
```

`_meta.schema = 'norma_centric_v1'` distingue do shape antigo (PR4).

### Algoritmo de busca

`searchLaws(textoMencao)` em [law.service.js](../../../backend-express/src/modules/laws/law.service.js):
- BM25 multi_match em `aliases^20`, `title^6`, `subtitle^4`, `disciplina^2`, `ente^1.5`, `description_norm`
- Boost adicional de ano se detectado na menção
- Filtros padrão: `eficaz: true`, `revogado: false`, `exists(disciplina/ente/tipo)`
- Concorrência limitada a 5 buscas paralelas

### Normalização canônica

`normalizarMencao` extrai apenas `número/ano` quando a IA escreve com descrição:
- `"Lei nº 9.605/1998 — Crimes ambientais"` → `9605/1998`
- `"Lei 9605/98"` → `9605/1998` (expande ano 2 dígitos)
- `"CTN"` → `ctn` (caso sem número)

### Migração automática (PR4 → PR5)

Cargos que tinham `leis_vinculadas.mencoes[]` (PR4) migram **automaticamente** ao primeiro `getLeisVinculadas`. As confirmadas são preservadas pelo `nomeNormalizado`.

### UX da aba

- **Grupos por status**: ambíguas > sugeridas > sem-match > obsoletas > pendentes > confirmadas
- **Sub-seção "Por disciplina"** (default aberta): lista normas confirmadas agrupadas por disciplina, com granularidade de assuntos/sub-assuntos/dispositivos. Botão "Copiar (agrupado por disciplina)" exporta texto plain.
- **Sub-seção "Lista final consolidada"** (default fechada): lista linear dedupada por `lawId` real (uma entrada por lei distinta, mesmo se múltiplas menções vincularam à mesma)
- **Modal "Buscar manualmente"**: input + debounce, dispara `/laws/search`

### Componentes

| Arquivo | Função |
|---------|--------|
| [src/components/workspace/NormaCard.vue](../src/components/workspace/NormaCard.vue) | Card individual com 6 estados visuais + bloco "Abarca" expansível |
| [src/components/workspace/BuscarLeiModal.vue](../src/components/workspace/BuscarLeiModal.vue) | Modal de busca livre com cleanup de debounce em `onUnmounted` |
| [src/components/workspace/LeisVinculacaoPanel.vue](../src/components/workspace/LeisVinculacaoPanel.vue) | Container com header, agrupamentos, sub-seções de exportação |

---

## 12. Status (após PR7 + PR8 — 2026-05-08)

### PR8 — Quebra adaptativa de assunto em N tasks de 1-2h — ✅ CÓDIGO ENTREGUE (validação manual pendente)

Spec D29-D38 implementada após brainstorming + 2 rodadas de revisão pós-spec + descoberta P1-P5 + revisão crítica final pós-implementação. 138 testes verdes (38 novos PR8 + 100 base).

**Arquivos:**
- Spec: [docs/superpowers/specs/2026-05-08-quebra-assunto-em-tasks-design.md](../docs/superpowers/specs/2026-05-08-quebra-assunto-em-tasks-design.md)
- Plano: [docs/superpowers/plans/2026-05-08-quebra-assunto-em-tasks-plan.md](../docs/superpowers/plans/2026-05-08-quebra-assunto-em-tasks-plan.md)
- Backend helpers: `quebrarAssunto.helpers.js` + `orientacoesCoordenadas.js` + `questoesArtClient.js` em [`backend-express/src/modules/plano-estudo/`](../../backend-express/src/modules/plano-estudo/) e [`backend-express/src/utils/`](../../backend-express/src/utils/)
- Backend orquestrador: refator de `sugerirProximaMeta` + `confirmarMeta` em [`plano.generator.js`](../../backend-express/src/modules/plano-estudo/plano.generator.js)
- Backend Fase 1 análise: prompt PR8 em [`cargo.service.js`](../../backend-express/src/modules/edital-cargos/cargo.service.js) (linha ~925) + bump `_meta.schema_classificacao = 'v2'`
- Backend mapping: `_pr8` + `orientacao` declarados em [`elasticsearch.js`](../../backend-express/src/config/elasticsearch.js)
- Validação `arts_referencia`: tolerante em `mergeMetricasNoOutput` ([priorizacao.helpers.js](../../backend-express/src/modules/edital-cargos/priorizacao.helpers.js))

**Validação:**
- 138/138 testes unitários passing (`npm test` no backend-express, ~390ms)
- Sintaxe back validada via `node --check` em todos os arquivos modificados
- Validação manual end-to-end: pendente — ver checklist abaixo

**Checklist de validação manual (Fase 6 do plano PR8):**
1. Cargo PR7-puro (sem reanálise pós-PR8): clicar em "Sugerir próxima meta" → tasks geradas têm `_pr8.chunkOrigem='ia_split'` na maioria. IA split foi chamado (custo IA visível nos logs). Carga em [0.5, 2.5]h aproximadamente. Companion `questoes` aparece nos arts disponíveis.
2. Reanalisar 1 cargo (Fase 4 pós-PR8): conferir `_meta.schema_classificacao = 'v2'` no JSON. Subs com `arts_referencia` populado quando a IA reconhece (tributário, civil, penal — disciplinas regidas por norma).
3. Sugerir meta nesse cargo: tasks têm `_pr8.chunkOrigem='sub_assunto'` em maioria. Custo IA menor (sem IA splits).
4. Cargo com assuntos curtos (carga ≤ 2h): tasks `_pr8.chunkOrigem='integro'`, sem quebra.
5. Editar 1 task gerada no ModalTask: `filterLaw.artsFilter` chega populado, mentor edita, salva → `_pr8` preservado no roundtrip.
6. Reorganizar a meta (`reorganizarPriorizacao`): cortes funcionam com tasks novas (consumer downstream).

### Pendências PR8 fase 2 (não escopadas nesta sprint)

- **F2-1** — Endpoint novo no `back_leges` (`POST /questoes/disponibilidade-por-arts`) com agregação por art, sem filtro de user. Permite granularidade fina (saber quais arts específicos têm questões) — hoje MVP pega só "ao menos 1 questão pra arts agregados". Threshold configurável (≥1 / ≥5).
- **F2-2** — Carga proporcional ao número de questões em task `questoes` (vs 1h fixo MVP).
- **F2-3** — Config `maxTasksPorMeta` se R3 virar problema (meta dominada por 1 assunto).
- **F2-4** — Heurística "1 task → orientação template" pra economizar IA em casos triviais.
- **F2-5** — Estender parser `arts_referencia` (parágrafos `§`, exceções).
- **F2-6** — Batch script `popular_arts_referencia_em_cargos_existentes.js` pra cargos legados.
- **F2-7** — Carga estimada por sub-assunto explicitamente na Fase 1.
- **F2-8** — Criação automática de disciplina em `back_leges` quando nome novo.
- **F2-9** — Endpoint `GET /disciplinas/by-name` + helper `resolverIdDisciplina` cacheado. Hoje MVP deixa `id_disciplina: []` (mentor preenche manual no ModalTask).
- **F2-10** — Cache do `questoesCache` por `idLaw` apenas (não `(idLaw, arts)`) pra hit rate maior. Trade-off com granularidade.
- **F2-11** — Teste de integração `sugerirProximaMeta` → `confirmarMeta` roundtrip validando `_pr8`/`formQuestions`/`orientacao` persistidos.

---

### PR7 — Recência adicionada ao score — ✅ CÓDIGO ENTREGUE (validação manual pendente)

Spec implementada após **3 rodadas de revisão pós-spec** (self + Agent Explore + consistência interna pós-edits) + **revisão dupla pós-Fase 1** (regra `feedback_revisao_dupla_por_fase`). Ver [§13.6](#136-recência-pr7--detalhes-do-modelo) para detalhes do modelo.

**Arquivos:**
- Spec: [docs/superpowers/specs/2026-05-08-priorizacao-com-recencia-design.md](../docs/superpowers/specs/2026-05-08-priorizacao-com-recencia-design.md) (D21–D28, D2 alterada; soma com D1–D20 do PR6)
- Backend helpers: [`priorizacao.helpers.js`](../../backend-express/src/modules/edital-cargos/priorizacao.helpers.js) — `WEIGHTS`, `WEIGHTS_V1`, `calcularRecencia`, `obterJanelaRecente`, `calcularScoreV1` + `calcularScore` (signature nova c/ recência) + `montarHistoricoEnriquecido` e `mergeMetricasNoOutput` propagam `score_v1`
- Backend service: [`cargo.service.js`](../../backend-express/src/modules/edital-cargos/cargo.service.js) — bumpa `schema_priorizacao` pra `'deterministic_v2'` + grava `_meta.weights` snapshot
- Backend tests: [`priorizacao.helpers.test.js`](../../backend-express/src/modules/edital-cargos/priorizacao.helpers.test.js) — 99 testes verdes (64 PR6 + 35 PR7 novos/migrados)
- Frontend: [`CargoConteudoView.vue`](../src/views/CargoConteudoView.vue) — badges recência (R:X/Y) em disciplina/assunto/sub + linha `v1: ... → v2: ... (Δ ±X)` no expand + null-guards pra cargos legados
- Aprendizado de processo: [#PROC-30 em aprendizados-revisao-pos-spec.md](../../legislacao/docs/superpowers/aprendizados-revisao-pos-spec.md) — "legacy aliases congelam o nome mas não o valor — armadilha quando a constante muda"

**Validação:**
- 99/99 testes unitários passing (`npm test` no backend-express, ~220ms)
- Sintaxe back validada via `node --check` (helpers.js + cargo.service.js)
- Build local front impossibilitado por Node 18 (vite quer 20+) — sintaxe Vue/JS validada via releitura crítica seguindo padrão da view
- Validação manual end-to-end: pendente — checklist abaixo

**Checklist de validação manual (Fase 5 da spec PR7):**
1. Reanalisar cargo → priorização carrega com `schema=deterministic_v2`, `_meta.weights` populado
2. Expandir 5 assuntos com perfis diferentes (sólido / subindo / sumindo / raro / fundo de programa) — conferir badges recência batem com julgamento
3. Comparar `v1 → v2` em pelo menos 10 assuntos: 2-3 movimentos que **fazem sentido**, 0-2 que **soaram estranhos**
4. Re-rodar gerador de plano: ranking mudou? Reordenação faz sentido pedagógico?
5. Cargo PR6 puro (sem reanálise): badges recência ausentes (não renderizam), linha v1→v2 ausente — UX ainda faz sentido
6. Cargo misto pós-reanálise parcial: disciplinas reanalisadas mostram recência + v1→v2; disciplinas mantidas mostram só os campos PR6 — sem renderização quebrada

### Pendências PR7 fase 2 (não escopadas nesta sprint)

- **F2-1** — `PlanoEstudoBuilderView` consome recência (filtro "só recência ≥ N%", tipo de tarefa modulado, distribuição temporal). Spec §10 PR7.
- **F2-2** — UI de admin pra configurar `WEIGHTS` (substitui edit manual em código + reanalisar batch).
- **F2-3** — Banner em CargoConteudoView quando `schema=deterministic_v1` ("este cargo precisa ser reanalisado pra ganhar recência").
- **F2-4** — Engine compartilhada front+back (`recurrenceAnalysis.js` ↔ `priorizacao.helpers.js`). Caminho C da memória `project_priorizacao_analise_integracao` (legislacao). Adiado.

### PR6 — Priorização determinística — ✅ ENTREGUE (validação manual pendente)

Spec implementada após **6 passagens de revisão** (3 antes de codar + revisões duplas pós cada fase + revisão cross-fase final). Ver [§13](#13-priorização-determinística-pr6--detalhes-do-modelo) para detalhes do modelo.

**Arquivos:**
- Spec: [docs/superpowers/specs/2026-05-06-priorizacao-deterministica-design.md](../docs/superpowers/specs/2026-05-06-priorizacao-deterministica-design.md)
- Backend: [`backend-express/src/modules/edital-cargos/priorizacao.helpers.js`](../../backend-express/src/modules/edital-cargos/priorizacao.helpers.js) + refator do `cargo.service.js`
- Backend tests: [`backend-express/src/modules/edital-cargos/priorizacao.helpers.test.js`](../../backend-express/src/modules/edital-cargos/priorizacao.helpers.test.js) (64 testes, `npm test` no backend-express)
- Frontend: [`src/views/CargoConteudoView.vue`](../src/views/CargoConteudoView.vue)
- Roteiro de testes manuais: [PR6-TESTES-MANUAIS.md](./PR6-TESTES-MANUAIS.md) (19 cenários)

**Validação:**
- 64/64 testes unitários passing (helpers puros + integração)
- Sintaxe back+front OK
- Validação manual end-to-end: pendente (rodar PR6-TESTES-MANUAIS.md)

### Follow-ups conhecidos (não bloqueiam canary, registrados na revisão dupla pós-Fase 2 + cross-fase)

- **P2-2** — Recálculo parcial silencioso quando IA trunca JSON (depende da estabilidade do OpenRouter; se virar problema, retornar `metaParcial.disciplinasFaltantes` no backend e mostrar toast laranja)
- **P2-3** — `_meta.bancaAlvo` sobrescrito a cada `analisarConteudo` pode dessincronizar com disciplinas mantidas se mentor mudou banca pós-análise (caso edge raro)
- **P2-1** — Tooltip da tendência da disciplina é da disciplina equivalente histórica, não dos assuntos do edital (label aprimorável)
- **P3-1** — `_meta.anosUniverso`/`schema_priorizacao` gravados mas não lidos pelo front (debug futuro)
- **P3-2** — Naming `disc.tendencia` vs `disc.metricas.tendencia` ambos gravados — débito técnico
- **P3-3 a P3-7** — refinamentos UX (cobertura média esconde dispersão, recalcularTudoPR6 com órfãs, escala mista pré-recalcular, prioState reset, score=0 vs "—"). Ver §10 da spec PR6.

### Calibração pós-deploy (§10.3 da spec)

Após implementação, coletar feedback nos primeiros 5-10 cargos analisados:
- Os scores fazem sentido pra você?
- Algum assunto crítico ficou com score baixo demais?
- Pesos 45/35/20 vão precisar de ajuste? Se sim, parametrizar via env ou UI.

### Bug histórico — toggle "Ordenar por relevância" (resolvido pré-PR6, contexto)

**Causa-raíz**: IA retornava `score: null` para todas as disciplinas quando banca sem histórico. Sort `score ?? -1` + desempate alfabético resultava em ordem aparentemente igual à do edital.

**Fix pré-PR6**: toggle desabilita automaticamente quando todos os scores são null.

**Resolução natural via PR6**: scores agora são SEMPRE numéricos (determinísticos), eliminando o cenário "todos null". Toggle volta a ser sempre útil. **Adicionalmente**, novo `todosScoresIguais` detecta o caso patológico onde todos scores são idênticos (ex: todos "Mapeado/nunca cobrado" = 0.10) e mostra tooltip explicativo (P2-3 fix).

### Trade-offs registrados (não bugs, decisões de design)

- **Re-análise parcial mantém scores antigos das disciplinas não selecionadas**: o merge atual em `cargo.priorizacao.disciplinas` substitui só as reanalisadas. Comportamento intencional (análise incremental). Se virar problema, adicionar `analisadoEm` por disciplina no PR6.
- **`cargoAtual.priorizacao` não é persistido** no localStorage (só `cargos[]`). Recarrega da API. Aceitável — design para evitar staleness cross-session.
- **`legislacaoPorDisciplina(disc)` recalcula a cada render** (não é computed). Em listas típicas (8-20 disciplinas) não é gargalo. Se virar lento, transformar em Map cacheado por `disc.nome`.

### Já implementado nesta sessão (2026-05-06)

| PR | Status | O que entregou |
|----|--------|----------------|
| **PR1** | ✅ Validado | Desconectou IA local (FastAPI/Ollama), removeu `ProviderToggle.vue`, removeu rotas/imports `study-pdf`/`/qa`. Tudo via OpenRouter |
| **PR2** | ✅ Validado | Pipeline IA sequencial (não mais "tudo de uma vez"), validador de completude robusto, banca/área vazias, memory leaks em 3 views, sanitização `_*` antes de salvar, gate de `userId`, persistir `conteudo_bruto` |
| **PR3** | (absorvido em PR2/PR4 conforme conveniência) | — |
| **PR4** | ✅ Implementado | Vinculação de normas: aba `vinculacao`, busca BM25 em `laws_v3`, agrupamentos por status, modal de busca manual, "Lista final" |
| **PR5** | ✅ Implementado | Refactor norma-centric: `mencoes[]` → `normas[]`, dedupe por `lawId`, sub-seção "Por disciplina" com agregação de assuntos/sub-assuntos/dispositivos, threshold 2.0, expansão de ano 2-dígitos |
| **UX da priorização** | ✅ Parcial | Toggle ordenação relevância (com bug — não funciona), tabs Assuntos/Legislação dentro da disciplina, badges com `@click.stop` para não disparar dropdown |

### Roadmap futuro (sem prioridade definida)

- **PR6 (priorização determinística)** — ✅ entregue em 2026-05-07. Ver §13.
- **Polling assíncrono** — usar `parse-status` / `analise-status` em vez de timeout 5–10min. Permite recuperar resultado se a aba fechar.
- **Streaming SSE** durante o parse — disciplinas chegando uma a uma em tempo real
- **Detectar e separar tipo de campo no `parse`** — `fontes_explicitas` editável (só removível hoje)
- **Validação de completude no preview** (não só no `resultado`) — sinalizar imediatamente os itens que a IA pode ignorar
- **Versão "lite" do parse local** — evoluir regex para gerar árvore plausível sem chamar IA em editais bem-formatados
- **kNN semântico em `laws_v3`** (Tier 3 do PR4) — para casos onde BM25 não acha. Requer `OPENAI_API_KEY` no `backend-express`
- **Configuração de pesos de score via UI** — promovido pra pendência PR7 fase 2 (F2-2 acima)

---

## 13. Priorização determinística (PR6) — detalhes do modelo

> Decisões D1-D20 documentadas na [spec PR6](../docs/superpowers/specs/2026-05-06-priorizacao-deterministica-design.md). Esta seção sumariza o modelo entregue.

### 13.1 Pipeline de análise pós-PR6

```
[Frontend] CargoConteudoView.vue
  └─> cargoStore.analisarConteudo({ disciplinas: [...] })
        └─> POST /editais/:id/cargos/:cargoId/analisar (timeout 10min)
[Backend] cargo.service.js — analisarConteudo()
  ├─ FASE 1: Classificação IA (tipo_fonte, leis_referencia, carga_estimada_horas)
  ├─ FASE 2A: Cascata por disciplina (D14)
  │   selecionarUniversoCascata(allStats, { bancaAlvo, areaAlvo })
  │     • Nível 1: banca alvo + área alvo (ideal)
  │     • Nível 2: banca alvo + qualquer área
  │     • Nível 3: outras bancas + área alvo
  │     • Nível 4: qualquer (último recurso, header avisa)
  ├─ FASE 2B: Janela de anos (D7 gap-skip + cap 5)
  │   construirJanelaAnos(docs)
  │     • gaps preservados ({2020,2023,2024} → 3 anos, não 4)
  │     • exclui ano corrente parcial
  ├─ FASE 2C: Histórico enriquecido (D11/D18)
  │   montarHistoricoEnriquecido(docs, anos)
  │     • 3 níveis: disciplina, assunto, sub-assunto
  │     • peso_medio_normalizado tem 2 escopos: max_peso_assuntos, max_peso_sub_assuntos
  ├─ FASE 2D: Mapping IA (D17 — 1 chamada com blocos por disciplina)
  │   buildMappingPrompt({ editalCompacto, historicosPorDisc, fontesPorDisc, ... })
  │     • prompt envia só NOMES de candidatos por disciplina (não históricos completos)
  │     • IA retorna apenas equivalente_historico ou null
  └─ FASE 2E: Merge determinístico
      mergeMetricasNoOutput({ iaOutput, historicosPorDisc, classificacao, fontesPorDisc, janelasPorDisc })
        • D16: lookup restritivo cross-disciplina (disc.equiv null ⇒ todos assuntos null)
        • D13: disc.score = mean(scores assuntos não-null)
        • D19: sempre escreve metricas (com sem_match: true se disc não mapeou)
        • Calcula cobertura_match e fonte_cascata_majoritaria
```

### 13.2 Métricas determinísticas (§3 da spec)

Para cada nó (disciplina, assunto, sub-assunto):

| Métrica | Fórmula | Captura |
|---------|---------|---------|
| `presenca` | `anos_que_cobraram / anos_com_prova` | "Sempre cai" vs "caiu uma vez" |
| `peso_medio` | `mean(pct[ano])` apenas anos com `qtd > 0` | Quão pesado quando aparece (porcentagem 0..100) |
| `peso_no_universo` | `presenca × peso_medio` | Importância "real" |
| `tendencia` | regressão linear (ano calendário) — `'estavel'` se `\|anos\| < 2` (D12) | Crescente/estável/decrescente |
| `consistencia` | `1 − stdev/max(0.01, mean)` clamp [0,1] | Volatilidade |

**Score PR6 (D2 original — fórmula imutável, persistida em `score_v1` pós-PR7):** `0.45 × presenca + 0.35 × peso_medio_normalizado + 0.20 × componente_tendencia`

**Score PR7 (D2 alterada — fórmula atual):** `0.30 × presenca + 0.20 × recencia + 0.30 × peso_medio_normalizado + 0.20 × componente_tendencia` — ver §13.4 abaixo.

### 13.3 Schema do `cargo.priorizacao` pós-PR7

```js
{
  disciplinas: [
    {
      nome,
      score,                            // mean dos assuntos (D13) — PR7 fórmula
      score_v1,                         // PR7 D24 — mean dos score_v1 dos assuntos (PR6 fórmula imutável)
      tendencia,                        // null se sem_match
      tipo_fonte: [...],                // da Fase 1
      carga_estimada_horas,             // P1-2: fallback sum(assuntos)
      fonte_cascata,                    // 'banca_alvo_area_alvo' | ... (D14)
      equivalente_historico,            // null se sem match
      metricas: {                       // D19: SEMPRE presente em PR6+
        score, score_v1,                // ambos persistidos (PR7 D24)
        presenca, peso_medio, peso_medio_normalizado, peso_no_universo,
        tendencia, tendencia_slope, consistencia,
        recencia,                       // PR7 D21 — fração 0..1
        recencia_anos_cobertos,         // PR7 — numerador absoluto, 0..min(3, |universo|)
        recencia_anos_total,            // PR7 — denominador real, = min(3, |universo|)
        anos_com_prova, anos_que_cobraram,
        anos_corrente_qtd_parcial, anos_corrente_excluido,
        cobertura_match,                // 0..1, % assuntos com match (D19)
        sem_match,                      // true se disc.equivalente_historico null (D16)
        fonte_cascata,
      },
      assuntos: [
        {
          nome, score, score_v1, tendencia, equivalente_historico,
          tipo_fonte, leis_referencia, carga_estimada_horas,
          metricas: {...} | null,       // null quando IA não achou equivalente do assunto (PR7 D27b)
          sub_assuntos: [{ nome, score, score_v1, tendencia, metricas, ... }],
        }
      ]
    }
  ],
  _meta: {
    // legados (D15 — preservados pra não quebrar front antigo)
    bancaAlvo, areaAlvo, bancasSimilares,
    temDadosBancaAlvo, qtdAnosBancaAlvo, qtdAnosBancaSimilar,
    classificacaoLocal, processadoEm,
    // PR7 D24/D25
    schema_priorizacao: 'deterministic_v2',  // bumpa pra v2 quando cargo é (re)analisado pós-PR7
    weights: { presenca: 0.30, recencia: 0.20, peso_medio: 0.30, tendencia: 0.20 },  // snapshot dos pesos no momento da análise
    fonte_cascata_majoritaria,
    anosUniverso: [...],
  }
}
```

**Compatibilidade:** cargos pré-PR7 (`schema=deterministic_v1`) não têm `recencia*`/`score_v1`/`weights`. Front (CargoConteudoView, [§13.4 abaixo](#134-componentes-de-ui-novos-§6-da-spec)) trata via null-guards — campo ausente → não renderiza. Re-análise parcial pós-PR7 sobre cargo PR6 produz mix: disciplinas reanalisadas com campos novos + disciplinas mantidas sem. `_meta` é sempre recalculado e bumpa pra v2.

### 13.4 Componentes de UI novos (§6 da spec)

Em [`CargoConteudoView.vue`](../src/views/CargoConteudoView.vue), `estado === 'priorizacao'`:

- **Banner amarelo "Recalcular tudo"** — aparece quando `disciplinas.some(d => !d.metricas)` (cargo legado ou misto). Critério distingue PR6 sem_match (`metricas` existe com flag) de cargo legado (`metricas` ausente).
- **Aviso de fonte cascata** (azul/laranja) — aparece quando `_meta.fonte_cascata_majoritaria !== 'banca_alvo_area_alvo'` ou há mistura entre disciplinas. Texto reflete o nível.
- **`prio-meta` atualizado (D20)** — vocabulário "N provas importadas" (não "N anos"). Mostra cobertura média quando < 100%.
- **Badges de qualidade** (§6.4):
  - "Disc. sem match" (header da disciplina, D16)
  - "Sem match" (assunto — oculto quando disc inteira sem_match, P3-1)
  - "Nunca cobrado" (`anos_que_cobraram === 0`, score 0.10)
  - "Amostra pequena" (`anos_que_cobraram === 1`)
- **Badge Presença** "P:N/M" (verde) ao lado do score, com tooltip detalhado
- **`<details>` "Métricas detalhadas"** colapsado — disponível em assunto E sub-assunto (P2-2 fix)
- **Tooltip enriquecido no score** — fórmula completa: `Score: X — Presença Y% × Peso Z.Z% × Tendência W` (D10 — peso direto, sem `× 100`)
- **Cobertura individual no expand da disciplina** — "X% dos assuntos com match histórico" (P3-2 fix)

### 13.5 Acoplamento com reorganização

`reorganizarPriorizacao` e `aplicarReorganizacao` ([`cargo.service.js`](../../backend-express/src/modules/edital-cargos/cargo.service.js)) ainda usam `ass.score` para decidir cortes:

- **Cargo PR6 puro:** scores determinísticos garantem corte coerente
- **Cargo misto** (P1-3 fix): ordenação trata `score === null` primeiro (sem match cortado antes de score baixo); descrição separa "X sem match histórico + Y assuntos com score abaixo de Z%"
- **Lista de cortados** (P2-4 fix): mostra "sem match" em vez de "score 0" para itens com score null

### 13.6 Recência (PR7) — detalhes do modelo

**Spec canônica:** [docs/superpowers/specs/2026-05-08-priorizacao-com-recencia-design.md](../docs/superpowers/specs/2026-05-08-priorizacao-com-recencia-design.md) (decisões D21-D28, D2 alterada).

**Motivação:** PR6 não distinguia "assunto novo subindo" (FGV/OAB pós-Reforma) de "assunto sólido histórico". A regressão linear em 5 pontos é frágil; recência binária (cobertura nos últimos 3 dos 5 anos do universo) é robusta e captura "está vivo agora?".

**Definição (D21/D22):**
- `janelaRecente = anosUniverso.slice(-3)` — últimos 3 anos do universo PR6 (relativo, **com gap-skip**, não calendário). Universo curto (1-2 anos) → janela degenerada com mesmo tamanho.
- `recencia = anosCobertosNaJanela / janela.length` — fração 0..1.
- Aplica-se a disciplina (sobre `disc.totalPorAno`, D28), assunto e sub-assunto (D27).

**Fórmula do score atual (D2 alterada):**
```
score = 0.30 × presenca + 0.20 × recencia + 0.30 × peso_medio_normalizado + 0.20 × componente_tendencia
```

**Constantes (D25 — `priorizacao.helpers.js`):**
```js
WEIGHTS    = { presenca: 0.30, recencia: 0.20, peso_medio: 0.30, tendencia: 0.20 }  // PR7 atual
WEIGHTS_V1 = { presenca: 0.45,                  peso_medio: 0.35, tendencia: 0.20 }  // PR6 imutável
```

Ajustar pesos = mudar `WEIGHTS` + reanalisar cargos. Sem env var, sem UI nesta sprint (F2-2 da spec).

**`score_v1` lado-a-lado (D24):** `calcularScoreV1` mantém algoritmo PR6 imutável (usa `WEIGHTS_V1`). Cada nó da priorização (disciplina/assunto/sub-assunto) persiste `score` (PR7) **e** `score_v1` (PR6) — front mostra discreto no expand: `v1: 0.55 → v2: 0.61 (Δ +0.06)` pra calibração visual contínua. `score_v1` não afeta ordenação.

**Casos extremos:**
- **Sem match disc (D16/D27a):** `disc.metricas.recencia = 0`, `score = null`, `score_v1 = null`, `sem_match: true` (objeto populado, mantém convenção PR6).
- **Sem match assunto/sub (D27b):** `metricas: null` no nó (mantém convenção PR6 — não estendido).
- **Janela vazia / universo zero anos:** `recencia = 0` sem div/0 (testado).
- **Cargo legado pré-PR7:** sem campos `recencia*`/`score_v1`/`weights`. Front com null-guards renderiza gracefully (chip recência some, linha v1→v2 some).

**Mix `schema_v1` + `schema_v2` em cargos com re-análise parcial (R7):** cargo pode ter disciplinas reanalisadas pós-PR7 (com recência) + disciplinas mantidas pré-PR7 (sem). `_meta` é sempre recalculado e bumpa pra v2 ao re-analisar qualquer disc.

**Calibração:** pesos 30/20/30/20 são palpite informado (D23 — exceciona feedback `feedback_calibracao_threshold_empirico` por contexto dev solo). Calibração contínua via comparação visual `score_v1 → score` em produção. Recalibrar = mudar `WEIGHTS` + reanalisar cargos.

### 13.7 Diferença com o modelo legado (PR4/PR5)

| Aspecto | Legado | PR6 | PR7 |
|---------|--------|-----|-----|
| Score | IA calcula subjetivamente | Backend determinístico (3 dimensões) | Backend determinístico (4 dimensões com recência) |
| Tendência | IA chuta | Regressão linear 5 pontos | Idem PR6 (sem mudança) |
| Recência | — | — | Cobertura últimos 3 do universo (D21) |
| Universo | Janela arbitrária | 5 anos com gap-skip | Idem PR6 |
| Cascata | Mistura 70/30 | Substituição em 4 níveis | Idem PR6 |
| Sub-assuntos | Herdado vago | Métrica própria | Idem PR6 + recência |
| `equivalente_historico` | Pode cross-disc | Restrito (D16) | Idem PR6 |
| Determinismo | Não | Sim | Sim |
| Cobertura | Implícita | Explícita | Idem PR6 |
| Auditoria histórica | — | — | `score_v1` lado-a-lado + `_meta.weights` snapshot |

### 13.7 Como retomar trabalho no PR6 (próxima sessão)

**Para validar manualmente:**
1. [PR6-TESTES-MANUAIS.md](./PR6-TESTES-MANUAIS.md) — 19 cenários estruturados
2. Reportar falhas no formato listado no doc

**Para corrigir follow-ups (P2-1, P2-2, P3-3 a P3-7):**
1. Spec §10 (follow-ups conhecidos)
2. Cada follow-up tem causa + sugestão de fix

**Para calibrar pesos pós-canary:**
1. Spec §10.3 (calibração 45/35/20)
2. Coletar feedback de 5-10 cargos reais analisados
3. Considerar parametrização via env ou UI

## 14. Follow-up: integrar Recência (Aba Análise) ao score do PR6

Sub-projeto 2 (Aba Análise em [ESTATISTICAS.md §"Aba Análise"](ESTATISTICAS.md)) calcula uma métrica que **NÃO existe no PR6**: **Recência** (% de cobertura nos últimos 3 anos do dataset). Hoje o score do PR6 só vê `presença` (cobertura média dos 5 anos), `peso_medio` e `tendência (label)`. Em programas amplos com edições heterogêneas (FGV/OAB), assuntos "subindo" (recorrência baixa MAS presentes nos últimos 3 anos) recebem score baixo demais.

### 14.1 Objetivo de produto

Lembrar do fluxo: priorização **alimenta** o gerador de plano (`PlanoEstudoBuilderView`) → metas + tarefas → consumidas pelo aluno em outro app. Recência melhor → score melhor → plano melhor → estudo do aluno mais eficiente.

### 14.2 Caminhos de integração

Detalhamento completo em `project_priorizacao_analise_integracao.md` (memória). Resumo:

- **Caminho A (recomendado):** adicionar Recência como 4ª dimensão do score
  ```
  score = 0.30 × presenca + 0.20 × recencia + 0.30 × peso_medio_normalizado + 0.20 × tendencia
  ```
  (calibrar empiricamente com 5-10 cargos reais — `feedback_calibracao_threshold_empirico`)
- **Caminho B:** botão "Auditar com Análise" no `CargoConteudoView` → abre `/estatisticas?tab=analise&banca=X&area=Y&disc=Z`
- **Caminho C:** engine compartilhada (refactor maior, vale só se houver mais consumidores)

Recomendação: A+B juntos. C fica pra demanda futura.

### 14.3 Adaptações esperadas no `PlanoEstudoBuilderView`

Ainda não implementadas — ponto de partida na próxima sessão:

1. Considerar Recência na ordenação de tasks geradas (assuntos recentes-altos primeiro)
2. Tipo de tarefa pode depender da métrica (assunto recente subindo → priorizar `questoes`; sólido histórico → `lei_seca`; descendente → `revisao` rápida)
3. Filtro novo na config: "só assuntos com recência ≥ N%"
4. Display visual: mostrar Recência junto do score na seleção de disciplinas
5. Carga estimada modulada por Recência (assuntos recentes-alvo recebem mais carga de questões)

### 14.4 Pré-requisitos antes de codar

- Calibração empírica com 5-10 cargos reais (já analisados pelo mentor)
- Decisão sobre janela: PR6=5 vs Análise=3. Hipótese: manter PR6=5 + Recência=últimos 3 dos 5 (não conflita)
- Decisão se altera score atual OU adiciona `score_v2` lado-a-lado pra comparação
- Spec nova: `boilerplate-vue/docs/superpowers/specs/2026-MM-DD-priorizacao-com-recencia-design.md`

> **Status:** ✅ Esta §14 foi implementada como PR7 em 2026-05-08. Ver §12 status PR7 + spec [2026-05-08-priorizacao-com-recencia-design.md](../docs/superpowers/specs/2026-05-08-priorizacao-com-recencia-design.md). Mantido como histórico de planejamento.

---

## 15. Quebra adaptativa de assunto em N tasks de 1-2h (PR8 — entregue 2026-05-08)

> Spec canônica: [docs/superpowers/specs/2026-05-08-quebra-assunto-em-tasks-design.md](../docs/superpowers/specs/2026-05-08-quebra-assunto-em-tasks-design.md). Decisões D29-D38 + Riscos R1-R13.

### 15.1 Motivação

PR6/PR7 entregam priorização (score por assunto). `sugerirProximaMeta` antigo gerava **1 task = 1 assunto**, ignorando regra do produto "1-2h por task". Assunto longo (5h) virava 1 task de 5h (violação). Mentor compensava editando manualmente. PR8 automatiza: assunto longo → N tasks coerentes pedagogicamente, respeitando 1-2h por task (soft).

### 15.2 Arquitetura

```
sugerirProximaMeta (refatorado)
  ├── ctx { questoesCache, iaSplitFn, banca, orgao, concurso, cargo, chamarIAFn }
  ├── Round-robin (1 ASSUNTO por iteração — limites contam assuntos, não tasks)
  │     └── gerarTasksDoAssunto(assunto, ctx)
  │           ├── quebrarAssunto({ assunto, disciplina, opts, iaSplit }) → chunks[]
  │           │     ├── árvore de decisão 5 caminhos:
  │           │     │   1. íntegro (carga ≤ 2h, 1 lei)
  │           │     │   2. estrutural (subs com arts_referencia preenchido)
  │           │     │   3. IA split (subs sem arts ou sem subs) — callback IA
  │           │     │   4. tempo proporcional (fallback do fallback)
  │           │     │   5. multi-lei (recursivo, 1 lei por chamada)
  │           │     └── retorna chunks com { rotulo, arts, idLaw, cargaEstimadaH, origem, tipoTask }
  │           ├── pra cada chunk lei_seca: verificarQuestoesDisponiveis(idLaw, arts)
  │           │     └── ES direto em questoes_v2 (sem hop HTTP no back_leges)
  │           │     └── threshold "array não-vazio" → companion `questoes` gerada
  │           └── gerarOrientacoesCoordenadas(tasks) — 1 chamada IA → N orientações
  └── revisão semanal task (mantido)

confirmarMeta (atualizado)
  ├── Aceita t.filterLaw / t.formQuestions pré-montados (PR8)
  └── Persiste _pr8 + orientacao na task (mapping ES atualizado)
```

### 15.3 Schema da task gerada (PR8)

```js
{
  // Comuns
  type: 'lei_seca' | 'leitura_pdf' | 'questoes' | 'outras',
  title, description, link, orientationId,

  // Específicos lei_seca (compat ModalTask)
  filterLaw: {
    idLaw,                       // chunk.idLaw
    compilado, withTags, tagsFilter, withMarks,
    withQuestions: false,        // companion vira task separada PR8
    artsFilter,                  // chunk.arts
  },
  formQuestions: null | { ... }, // populado em companion `questoes`

  // Plano
  disciplina, cargaMinutos, tipoFonte, leisReferencia, score,
  orientacao: '...',             // texto curto IA coordenada

  // PR8 D36 — auditoria de chunk
  _pr8: {
    chunkOrigem: 'integro' | 'sub_assunto' | 'ia_split' | 'tempo_proporcional' | 'questoes_companion',
    chunkIndex, chunkTotal,
    assuntoOriginal,
    artsRequested,               // companion only
  },
}
```

Mapping ES (`elasticsearch.js`) declara `_pr8` e `orientacao` explicitamente. Permite filtro de auditoria tipo "tasks com `_pr8.chunkOrigem='ia_split'`" pra revisão.

### 15.4 Schema bumps acumulados (R13 da spec PR7 + PR8)

| `schema_priorizacao` | `schema_classificacao` | Implicação |
|---|---|---|
| ausente / `v1` (PR6) | ausente / `v1` | Cargo nunca reanalisado pós-PR7. Sem score com recência, sem `arts_referencia`. PR8 cai 100% no IA split. |
| `v2` (PR7) | ausente / `v1` | Reanalisado pós-PR7 mas pré-PR8. Score com recência, sem `arts_referencia`. PR8 cai no IA split. |
| `v1` (PR6) | `v2` (PR8) | Estado raríssimo (só Fase 1 sem Fase 2). Não esperado. |
| `v2` (PR7) | `v2` (PR8) | Estado ideal pós-PR8. Quebra estrutural determinística + score com recência. |

Reanálise parcial pós-PR8 cria mix dentro do mesmo cargo (algumas disc com `arts_referencia`, outras sem). Comportamento aceito (R11 spec PR8). Mentor pode reanalisar todo o cargo pra homogeneizar.

### 15.5 Custo IA por meta

| Cenário | Orientações coordenadas | IA splits | Total |
|---|---|---|---|
| Cargo PR8-completo (Fase 1 reanalisada) | 1 por assunto (~6) | 0 | ~6 |
| Cargo legado (PR6/PR7) sem reanálise | 1 por assunto (~6) | 1 por assunto longo (~3-5) | ~9-11 |

Custo IA total por meta: **~9-11 calls** (vs ~12 calls do PR7 com 1 call por task). Igual ou ligeiramente menor, qualidade pedagógica superior (orientações encadeadas).

### 15.6 Pendências F2 (não escopadas)

Listadas em §12 acima — F2-1 a F2-11. Principais: granularidade fina por art (precisa endpoint novo no `back_leges`), resolverIdDisciplina automatizado, teste de integração roundtrip, cache `idLaw`-only pra hit rate maior.
