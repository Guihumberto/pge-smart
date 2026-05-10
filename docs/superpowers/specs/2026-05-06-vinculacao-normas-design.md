# Vinculação de Normas — Spec PR4

**Data:** 2026-05-06
**Status:** ✅ Aprovada — em implementação
**Escopo:** `boilerplate-vue` (frontend mentor) + `backend-express` (backend mentor)
**Pré-requisitos:** PR2 (bugs críticos da feature de Editais) já em produção
**Tamanho estimado:** 2-3 dias (1 dia backend, 1-2 dias frontend)

---

## 1. Motivação

Após o pipeline de **Análise** do cargo (Classificação + Priorização), o `cargo.priorizacao` traz dois campos textuais com menções a normas:

- `assunto.fontes_explicitas` (vindo do parse)
- `disciplina/assunto/sub_assunto.leis_referencia` (vindo da priorização)

Hoje são **strings livres** ("Lei nº 9.605/1998", "art. 5º da CF"). O usuário ainda precisa pesquisar manualmente cada uma na biblioteca de leis (`laws_v3` no Elasticsearch) para vincular ao plano de estudo.

**Objetivo:** automatizar essa vinculação. Após a priorização, o sistema lista todas as menções, busca em `laws_v3` e sugere o melhor candidato. O usuário só confirma (ou troca por outro candidato).

**Não-objetivos:**
- Cadastrar norma nova quando não houver match (esse fluxo já existe no `back_leges`).
- Vincular dispositivos (artigo, inciso) — só a norma raiz; dispositivos ficam como texto livre.
- Tier 3 semântico (kNN com embedding) — adiado para PR5 se necessário.

---

## 2. Decisões de design

| # | Decisão | Justificativa |
|---|---------|---------------|
| D1 | Backend-express lê `laws_v3` direto (sem proxy ao `back_leges`) | Decisão do usuário — front nunca fala com 2 backends. ES é compartilhado. |
| D2 | **BM25-only** no PR4 (sem kNN) | Backend-express não tem `OPENAI_API_KEY`. BM25 cobre 80%+ dos casos. Tier 3 vira PR5 se a precisão exigir. |
| D3 | Aba `vinculacao` posicionada **após** `priorizacao` | Não bloqueia quem só quer ver o plano. Usuário acessa quando estiver pronto pra refinar. |
| D4 | Cadastro de norma nova **fora de escopo** | Fluxo de cadastro é no `back_leges`. Aqui só marca `pendente` e o usuário cadastra externamente. |
| D5 | Filtros padrão na busca: `eficaz: true`, `revogado: false`, `exists(disciplina)`, `exists(ente)`, `exists(tipo)` | **Paridade exata com `back_leges/LawStoreService.js:76`**. **Não filtramos `concurso: true`** (revisão Rodada 2): o campo pode não estar populado em todas as normas válidas. Se a maioria das menções vier vazia, ligar o filtro depois (instrumentação na §11 R2). |
| D6 | Vincula só **norma raiz**; dispositivos (`art. 5º`, etc) ficam como texto livre no doc da menção | Decisão do usuário (escopo controlado). Resolver dispositivos pode virar PR futuro. |
| D7 | Threshold de auto-sugestão: `top1.score / top2.score >= 1.5` → "destaca-se claramente" (verde); senão amarelo "ambígua" | Heurística sem precisar calibração inicial. Funciona porque BM25 retorna scores absolutos comparáveis. |
| D8 | **Cache persistido** dos candidatos no `cargo.leis_vinculadas` | Aba abre instantânea na 2ª visita. Botão "Recalcular sugestões" força refresh manual. |
| D9 | Match score guardado é o do ES (BM25 raw), não normalizado | Permite reranking futuro com kNN sem perder dado. |

---

## 3. Modelo de dados

### Novo campo no doc do cargo (`metas_leges_edital_cargos`):

```json
{
  "leis_vinculadas": {
    "_meta": {
      "geradoEm": "2026-05-06T14:00:00Z",
      "ultimaAtualizacaoEm": "2026-05-06T14:30:00Z",
      "regenerando": false,
      "totalMencoes": 18,
      "confirmadas": 12,
      "sugeridas": 4,
      "pendentes": 2,
      "obsoletas": 1,
      "version": 1,
      "comment": "totalMencoes conta apenas menções ativas (não-obsoletas). geradoEm muda só em regeneração; ultimaAtualizacaoEm muda em qualquer mutação (vincular, desvincular, mudar status). regenerando: true durante a chamada POST /sugestoes."
    },
    "mencoes": [
      {
        "id": "men_a3f9b2",
        "nomeOriginal": "Lei nº 9.605/1998",
        "nomeNormalizado": "lei 9605 1998",
        "fontes": [
          { "origem": "fontes_explicitas", "disciplina": "Direito Ambiental", "assunto": "Crimes ambientais" },
          { "origem": "leis_referencia", "disciplina": "Direito Ambiental", "assunto": "Crimes ambientais", "sub_assunto": "Pena de prisão" }
        ],
        "dispositivos": ["art. 32", "art. 54"],
        "lawId": "LEI_9605_1998",
        "lawTitle": "Lei nº 9.605, de 12 de fevereiro de 1998",
        "lawSubtitle": "Dispõe sobre as sanções penais e administrativas...",
        "candidatos": [
          { "id": "LEI_9605_1998", "title": "Lei nº 9.605, de 12 de fevereiro de 1998", "subtitle": "Dispõe sobre...", "tipo": "lei", "ente": "federal", "ano": 1998, "score": 24.5 },
          { "id": "LEI_X", "title": "Outra lei", "subtitle": "...", "score": 8.2 }
        ],
        "status": "confirmada",
        "confirmadoEm": "2026-05-06T14:05:00Z"
      }
    ]
  }
}
```

### Estados (`status`)
- **`sugerida`** — top1.score/top2.score >= 1.5 → badge verde claro, candidato top já preenchido em `lawId` (mas `confirmadoEm: null`)
- **`ambigua`** — múltiplos candidatos próximos → badge amarelo, `lawId` vazio até confirmação
- **`confirmada`** — usuário confirmou → badge verde com check, `confirmadoEm` preenchido
- **`confirmada_obsoleta`** — menção foi confirmada anteriormente mas a regeneração detectou que o `nomeNormalizado` correspondente não aparece mais na priorização atual → badge laranja com aviso. `lawId` preservado para auditoria. UI mostra com label "**Confirmada anteriormente — verifique se ainda se aplica**".
- **`pendente`** — usuário marcou pra cadastrar externamente → badge cinza
- **`nao_encontrada`** — busca em laws_v3 retornou 0 resultados → badge vermelho

### Mapping ES (adicionar em `config/elasticsearch.js`)

```js
leis_vinculadas: {
  type: 'object',
  enabled: false  // não indexa — só leitura/escrita JSON
},
```

> **Decisão:** `enabled: false` evita explosão de campos dinâmicos. Não precisamos buscar dentro de `leis_vinculadas` por agora.

---

## 4. Endpoints novos

### Backend-express

#### 4.1 `GET /api/laws/search`

Busca livre em `laws_v3`. Útil pra autocomplete e pro endpoint de "trocar candidato" na UI.

**Query params:**
- `q` (string, required, min 2 chars)
- `size` (number, default 5, max 20)
- `tipo` (string, optional) — filtra por `tipo.keyword`
- `ente` (string, optional) — filtra por `ente.keyword`

**Response 200:**
```json
{
  "results": [
    {
      "id": "...",
      "title": "...",
      "subtitle": "...",
      "tipo": "lei",
      "ente": "federal",
      "estado": null,
      "ano": 1998,
      "aliases": ["..."],
      "score": 24.5
    }
  ]
}
```

**Implementação:** vide §5 (estratégia de match).

#### 4.2 `GET /api/editais/:editalId/cargos/:cargoId/leis/sugestoes`

**Leitura.** Retorna `cargo.leis_vinculadas` como está. Se `_meta.geradoEm` ausente (primeira visita), faz a primeira geração automaticamente.

**Response 200:**
```json
{
  "leis_vinculadas": { /* ... estrutura completa */ }
}
```

**Erros:**
- **400 — cargo não tem `analise_status === 'concluido'`** (priorização ainda incompleta — bloqueia para evitar sugestões com dados parciais)
- 403 — cargo não pertence ao usuário
- 404 — cargo não encontrado

#### 4.2.b `POST /api/editais/:editalId/cargos/:cargoId/leis/sugestoes`

**Regeneração explícita.** Re-extrai menções e busca candidatos novamente. Preserva confirmações via §7.

**Body:** `{}` (vazio — sem parâmetros)

**Response 200:** mesmo formato de 4.2.

#### 4.3 `POST /api/editais/:editalId/cargos/:cargoId/leis/vincular`

Confirma a vinculação de uma menção a uma lei específica (escolhida da lista de candidatos OU buscada manualmente via `/laws/search`).

**Body:**
```json
{
  "mencaoId": "men_xxx",
  "lawId": "LEI_9605_1998"
}
```

**Lógica:**
1. **Valida que `lawId` existe em `laws_v3`** via `findLawById(lawId)` — se não existir, **400** com `"Lei não encontrada no índice"`. Evita vinculação a id fabricado.
2. Localiza a menção pelo id; **404** se não existir.
3. Popula `lawId`, `lawTitle`, `lawSubtitle` (vinda do `_source` no ES), seta `status: 'confirmada'`, `confirmadoEm: now`.
4. Mantém `candidatos` (auditoria).
5. Atualiza `leis_vinculadas._meta.ultimaAtualizacaoEm`.

**Response 200:** `{ mencao: { /* atualizada */ } }`

#### 4.4 `PATCH /api/editais/:editalId/cargos/:cargoId/leis/:mencaoId/status`

Muda apenas o status (sem vincular). Para casos `pendente` (cadastrar fora) ou `nao_encontrada` (sem opção válida).

**Body:**
```json
{ "status": "pendente" | "nao_encontrada" | "ambigua" }
```

**Response 200:** `{ mencao: { /* atualizada */ } }`

#### 4.5 `POST /api/editais/:editalId/cargos/:cargoId/leis/:mencaoId/desvincular`

Desfaz vinculação — limpa `lawId`/`lawTitle`/`lawSubtitle`. **Recalcula** o status com base nos candidatos cached: se top1/top2 ≥ 1.5 volta a `sugerida`, senão `ambigua`. Se não há candidatos cached, vira `nao_encontrada`.

> **Por que POST e não DELETE:** semanticamente não estamos deletando a menção (ela continua existindo no array, podendo ser re-vinculada depois). Estamos limpando um campo dela.

**Response 200:** `{ mencao: { /* atualizada */ } }`

### Routes (montagem em `app.js`):
```js
import lawsRoutes from './modules/laws/laws.routes.js'
import lawsCargoRoutes from './modules/edital-cargos/leis-cargo.routes.js'

app.use('/api/laws', lawsRoutes)
app.use('/api/editais/:editalId/cargos/:cargoId/leis', lawsCargoRoutes)
```

---

## 5. Estratégia de match (BM25)

Replicação fiel do padrão de `back_leges/LawStoreService.js:64-206` (`searchLaws`):

```js
function buildSearchQuery(textoMencao, anoExtraido) {
  const should = [
    {
      multi_match: {
        query: textoMencao,
        fields: [
          'aliases^20',
          'title^6',
          'subtitle^4',
          'disciplina^2',
          'ente^1.5',
          'description_norm',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    },
  ]

  // Boost adicional quando o ano é detectado na menção (replica back_leges)
  if (anoExtraido) {
    should.push({ term: { ano: { value: anoExtraido, boost: 2 } } })
  }

  return {
    bool: {
      must: [{ bool: { should, minimum_should_match: 1 } }],
      filter: [
        { term: { eficaz: true } },
        { bool: { must_not: { term: { revogado: true } } } },
        { exists: { field: 'disciplina' } },
        { exists: { field: 'ente' } },
        { exists: { field: 'tipo' } },
      ],
    },
  }
}
```

> **Cuidado com fuzziness em números:** `fuzziness: 'AUTO'` em campos de texto não afeta termos numéricos puros. `aliases` é keyword (sem fuzzy), `title.clean` é text com analyzer `numeric_only` — match numérico exato. Risco baixo.

### Pré-processamento da menção (algoritmo determinístico)

```js
function normalizarMencao(textoBruto) {
  let s = String(textoBruto || '')
  // 1. Trim
  s = s.trim()
  // 2. Lowercase + remove acentos (NFD)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  // 3. Remove prefixos de norma comuns (não muda o texto da menção, mas extrai pra busca limpa)
  s = s.replace(/^(lei|decreto|portaria|resolu[cç][aã]o|s[uú]mula|medida\s+provis[oó]ria|emenda)\s*(complementar|delegada)?\s*(n[º°o]\.?)?\s*/i, '')
  // 4. Remove pontuação intra-numérica: 9.605 → 9605, 8.112 → 8112
  s = s.replace(/(\d)\.(\d)/g, '$1$2')
  // 5. Remove pontuação restante (mantém / e -)
  s = s.replace(/[,;:()]/g, ' ')
  // 6. Collapse espaços
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

function extrairAno(textoBruto) {
  const m = String(textoBruto || '').match(/\b(19\d{2}|20\d{2})\b/)
  return m ? parseInt(m[1]) : null
}
```

**Idempotência garantida:** chamar `normalizarMencao(normalizarMencao(x))` retorna o mesmo valor.

**Exemplos:**
| Input | `nomeNormalizado` | `ano` |
|-------|------------------|-------|
| `"Lei nº 9.605/1998"` | `"9605/1998"` | `1998` |
| `"Lei 8.112, de 1990"` | `"8112 de 1990"` | `1990` |
| `"CLT"` | `"clt"` | `null` |
| `"Estatuto do Servidor"` | `"estatuto do servidor"` | `null` |

### Boost de ano

```js
if (anoExtraido) {
  should.push({ term: { ano: { value: anoExtraido, boost: 2 } } })
}
```

### Instrumentação de score (para calibrar threshold em produção)

Em cada chamada de `searchLaws`, log estruturado:
```js
console.log('[laws.search]', JSON.stringify({
  mencao: textoBruto,
  ano: anoExtraido,
  total: hits.length,
  top1_score: hits[0]?._score,
  top2_score: hits[1]?._score,
  ratio: hits[1] ? hits[0]._score / hits[1]._score : null,
}))
```

Após coleta de 100+ chamadas reais, calibrar o threshold de **1.5** se a distribuição de ratios indicar outro valor.

### Top-K
`size: 5` — top 5 candidatos por menção.

### Cálculo de status no momento da geração
```js
function calcularStatus(candidatos) {
  if (candidatos.length === 0) return 'nao_encontrada'
  if (candidatos.length === 1) return 'sugerida'
  const ratio = candidatos[0].score / candidatos[1].score
  return ratio >= 1.5 ? 'sugerida' : 'ambigua'
}
```

Quando `status === 'sugerida'`, **`lawId` já é pré-preenchido** com `candidatos[0].id` (mas `confirmadoEm: null`). UI mostra como "auto-sugerida" — ainda precisa do clique do usuário pra `confirmada`.

---

## 6. Extração de menções

### Fonte 1 — `cargo.conteudo_parseado.disciplinas[].assuntos[].fontes_explicitas`

Strings extraídas pelo parser (Fase 3 — IA). Geralmente formato `"Lei nº X/YYYY"`.

### Fonte 2 — `cargo.priorizacao.disciplinas[].leis_referencia` + `assuntos[].leis_referencia` + `sub_assuntos[].leis_referencia`

Mais agressivo (a IA infere mesmo quando o texto não cita explicitamente). Mistura nomes, números, apelidos ("CTN", "CLT", "Estatuto da Cidade").

### Algoritmo de mescla

```js
// Pré-compiladas no top do módulo (não dentro da função, evita recompilar)
const REGEX_DISPOSITIVO = /art\.?\s*\d+[º°o]?(?:[,\s]+(?:inc(?:iso)?|al(?:ínea|inea)|§|par(?:ágrafo|agrafo))\.?\s*[\w]+)*/gi

// Limitação conhecida (R9): não captura "§ X" ou "parágrafo único" sem "art." anterior.
// Caso comum cobre (art. X, § Y, inciso III). Expansão pra dispositivos isolados fica em PR futuro.
```

**Passos:**
```
1. Coletar todas as ocorrências de strings de norma das duas fontes
2. Para cada string, extrair:
   - nomeOriginal (texto cru)
   - nomeNormalizado (via normalizarMencao — vide §5)
   - ano (via extrairAno — vide §5)
   - dispositivos (matches da REGEX_DISPOSITIVO no nomeOriginal)
3. Deduplicar por nomeNormalizado (chave canônica)
4. Acumular fontes (de qual disciplina/assunto/sub_assunto cada menção veio)
5. Acumular dispositivos (union) — quem cita "art. 5º" e "art. 7º" vira ["art. 5º", "art. 7º"]
6. Gerar id determinístico: `men_<sha1(nomeNormalizado).slice(0,6)>`
```

> **Observação:** o `id` é **puramente determinístico** (hash do `nomeNormalizado`, sem timestamp). Em **regenerações** (POST /sugestoes), a mesma menção sempre gera o mesmo id, o que garante a preservação de vinculações confirmadas — vide §7.

### Trade-off: aliases vs número

A IA pode escrever a mesma norma de duas formas que **não dedupem automaticamente**:
- "Lei nº 8.112/90" → `nomeNormalizado: lei 8112 90`
- "Estatuto do Servidor" → `nomeNormalizado: estatuto servidor`

Resultado: 2 menções diferentes, ambas vinculando à mesma `lawId` no final. Aceito por simplicidade — UI pode oferecer "fundir menções" em PR futuro. Documenta-se em §11 (R-novo).

---

## 7. Regeneração de sugestões (refresh)

Quando o usuário clica "Recalcular sugestões" ou quando `_meta.geradoEm` é antigo:

1. Re-extrai menções da `priorizacao` atual
2. Para cada menção nova, busca o equivalente nas existentes por `nomeNormalizado`:
   - **Existente confirmada** → preserva `lawId`/`lawTitle`/`status: 'confirmada'`/`confirmadoEm`. Atualiza apenas `fontes` e `dispositivos`.
   - **Existente pendente/nao_encontrada** → preserva status e tenta nova busca; se achar candidatos novos, sobe pra `sugerida`.
   - **Não existia** → busca, calcula status normalmente.
3. Menções existentes que **não estão mais** na priorização atual:
   - Se `status === 'confirmada'` → vira **`confirmada_obsoleta`** (preserva `lawId` para auditoria e exibida com aviso na UI).
   - Caso contrário → marca `obsoleta: true` (oculta por default, auditável via toggle "Mostrar obsoletas").
4. `_meta.geradoEm` atualizado. `_meta.ultimaAtualizacaoEm` igual.

---

## 8. UX no frontend

### Posicionamento

Novo estado `vinculacao` em `CargoConteudoView.vue`:

```
entrada → preview → resultado → priorizacao → vinculacao
```

Acesso:
- **Botão "Vincular normas"** posicionado dentro do bloco de ações finais do estado `priorizacao` ([CargoConteudoView.vue linhas 593-609](../../src/views/CargoConteudoView.vue), próximo ao botão "Plano de Estudo"). Renderizado apenas quando `cargo.priorizacao?.disciplinas?.length > 0 && cargo.analise_status === 'concluido'`.
- Volta para `priorizacao` via botão "Voltar à priorização" no header da aba.
- Aceita também via URL direta `?estado=vinculacao` (deeplink).

### Loading states

| Cenário | UI |
|---------|-----|
| Primeira geração de sugestões (GET retorna `geradoEm: null`) | Skeleton da lista + spinner com texto `"Buscando candidatos..."` |
| Recálculo manual (POST /sugestoes) | `_meta.regenerando: true` no doc → botões "Confirmar/Trocar/Pendente" desabilitados, header com spinner + texto `"Atualizando sugestões..."` |
| Vincular/desvincular/mudar status (POST individuais) | Botão clicado vira spinner; outros botões da mesma menção desabilitados; demais menções permanecem ativas |
| Busca manual via `BuscarLeiModal` | Input com debounce 300ms; spinner ao lado do input enquanto a busca está em andamento |
| Erro 5xx do backend | `toast.error` + manter UI no estado anterior; botão "Tentar novamente" no banner |

### Layout da aba

```
┌──────────────────────────────────────────────────┐
│ Vinculação de Normas                             │
│ 18 menções identificadas — 12 confirmadas, ...   │
│                          [Recalcular sugestões] │
├──────────────────────────────────────────────────┤
│ ✓ Lei nº 9.605/1998                              │
│   Direito Ambiental → Crimes ambientais          │
│   Dispositivos: art. 32, art. 54                 │
│   ┌─ Vinculada a: Lei nº 9.605/1998 ─────────┐   │
│   │ Dispõe sobre as sanções penais...        │   │
│   │ [Trocar] [Desfazer]                      │   │
│   └──────────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ 🟡 CLT (ambígua)                                 │
│   Direito do Trabalho → Princípios               │
│   Dispositivos: —                                │
│   Sugestões:                                     │
│   ○ Decreto-Lei 5.452/1943 (CLT)        24.5    │
│   ○ Lei 13.467/2017 (Reforma)           18.2    │
│   ○ Lei 6.019/1974 (Trabalho temp.)     14.1    │
│   [Buscar manualmente]                           │
├──────────────────────────────────────────────────┤
│ ⚠ Lei municipal nº 123/2020                      │
│   Direito Tributário → Tributos municipais       │
│   Sem candidatos no índice                       │
│   [Marcar pendente] [Buscar manualmente]         │
└──────────────────────────────────────────────────┘
```

### Componentes
- `LeisVinculacaoPanel.vue` — container com header e lista
- `MencaoCard.vue` — card de uma menção (com 4 estados visuais)
- `BuscarLeiModal.vue` — input de busca livre + lista de resultados (chama `/laws/search`)

### Microcopy
- Verde "Confirmada": `"Vinculada a: <título>"`
- Verde "Sugerida": `"Sugerida: <título>"` + botão Confirmar (✓)
- Amarelo "Ambígua": `"Múltiplos candidatos — escolha um"` + lista
- Cinza "Pendente": `"Aguardando cadastro externo"`
- Vermelho "Não encontrada": `"Sem correspondência no índice"`

### Estado vazio
Se `cargo.priorizacao` ausente: mostrar `"Faça a análise primeiro pra ter normas a vincular"` com link de volta a `resultado`.

---

## 9. Plano de implementação

### Fase 0 — Pré-requisitos (~1h)
1. **Verificar acesso ao `laws_v3`** do `backend-express`: rodar query simples (`GET _count`) e confirmar que tem ≥ 100 docs com `disciplina` populado e flags `eficaz: true`. Sem isso, todos os testes vão dar `nao_encontrada` falsamente.
2. Confirmar que o cluster ES é o mesmo do `back_leges` (mesmo `ES_NODE`).
3. Sample query manual com a menção `"Lei 8.112/1990"` esperando o doc da CTN/Estatuto Federal.

### Fase 1 — Backend (1 dia, após Fase 0 ✓)
1. `config/elasticsearch.js` — adicionar `LAWS_V3: 'laws_v3'` em `INDEX`
2. Criar `modules/laws/`:
   - `laws.service.js`: `searchLaws(query, opts)`, `findLawById(id)`
   - `laws.controller.js`: `search`, `getById`
   - `laws.routes.js`: monta `GET /search`, `GET /:id`
3. Criar `modules/edital-cargos/leis-cargo.service.js`:
   - `normalizarMencao(text)` + `extrairAno(text)` (puras, testáveis isoladamente)
   - `calcularStatus(candidatos)` (pura — testável isolado, vide §10 unit tests)
   - `extractMencoes(cargo)` — junta + dedupe
   - `gerarSugestoes(cargo)` — pra cada menção, chama `searchLaws`
   - `vincularLei(cargoId, userId, { mencaoId, lawId })` — **valida lawId via findLawById** antes
   - `mudarStatus(cargoId, userId, mencaoId, status)`
   - `desvincular(cargoId, userId, mencaoId)` — recalcula status com `calcularStatus(candidatos cached)`
4. Criar `modules/edital-cargos/leis-cargo.controller.js` + routes (5 endpoints — vide §4)
5. Atualizar `app.js` com as 2 rotas
6. **Testes manuais:** curl em todos os 5 endpoints, conferir formato de resposta e gates (`req.user.id`)

### Fase 2 — Frontend (1-2 dias, **bloqueada até Fase 1 ✓ em dev**)
1. `services/laws.service.js` (novo) — `search(q, opts)`, `getById(id)`
2. `services/cargo.service.js` — adicionar `getLeisSugestoes`, `vincularLei`, `mudarStatusLei`, `desvincularLei`
3. `stores/useCargoStore.js` — actions correspondentes (sem toast no `getLeisSugestoes`)
4. `views/CargoConteudoView.vue`:
   - Adicionar estado `vinculacao` ao enum
   - Botão "Vincular normas" no fim da aba `priorizacao`
   - Componente `LeisVinculacaoPanel` no template do estado novo
5. Componentes novos:
   - `components/workspace/LeisVinculacaoPanel.vue`
   - `components/workspace/MencaoCard.vue`
   - `components/workspace/BuscarLeiModal.vue`
6. **Manual smoke test:** ciclo completo (criar edital → cargo → conteudo → analisar → vincular → trocar → marcar pendente)

### Fase 3 — Polimento e validação local (se necessário)
- Calibrar threshold de status conforme o que vier nos testes
- Mensagens de erro específicas (timeout, ES indisponível)
- Loading states nos botões

---

## 10. Testes de aceitação (golden path)

| # | Cenário | Esperado |
|---|---------|----------|
| T1 | Cargo com priorização contendo "Lei nº 9.605/1998" | Aparece como `sugerida` (verde), candidato top com `id: LEI_9605_1998` |
| T2 | Menção "CLT" sem ano | Aparece como `ambigua` (amarelo) com Decreto-Lei 5.452 entre os top 3 |
| T3 | Menção "Lei municipal nº 999/2099" inexistente | Aparece como `nao_encontrada` (vermelho), 0 candidatos |
| T4 | Confirmar uma sugerida | `status: confirmada`, badge muda para verde com check, `confirmadoEm` populado |
| T5 | Trocar candidato (escolher outro do top-5) | `lawId` atualizado, `status: confirmada` |
| T6 | Buscar manualmente via modal e escolher | Mesma `vincularLei` é chamada, vinculação fecha o modal |
| T7 | Marcar pendente | `status: pendente`, `lawId` segue null, badge cinza |
| T8 | Desvincular uma confirmada | `lawId`/`lawTitle`/`lawSubtitle` limpos. `status` recalculado dos `candidatos` cached: ratio top1/top2 ≥ 1.5 → `sugerida`; senão `ambigua`. Sem candidatos → `nao_encontrada`. |
| T9 | Recalcular sugestões | Menções confirmadas preservadas; novas sugestões pra pendentes/nao_encontradas |
| T10 | Acesso via URL direta `?estado=vinculacao` sem priorização | Mensagem de estado vazio + link para `resultado` |
| T11 | Confirmar menção → voltar a `resultado` → re-rodar `analisar` (gera nova priorização) → voltar a `vinculacao` → POST /sugestoes implícito ou explícito | Menções com `nomeNormalizado` ainda presentes na nova priorização → preservam `status: confirmada` e `lawId`. Menções que sumiram → viram `confirmada_obsoleta` (com aviso visível). Menções novas → entram com `sugerida`/`ambigua`/`nao_encontrada` |
| T12 | Idempotência da normalização: rodar `normalizarMencao(normalizarMencao(x))` em 20 inputs variados | Resultado idêntico à 1ª passada |

### Unit tests (helpers puros, fora dos testes de aceitação)

| # | Função | Casos |
|---|--------|-------|
| U1 | `normalizarMencao` | "Lei nº 9.605/1998" → "9605/1998"; "CLT" → "clt"; "  Lei  8.112/90  " → "8112/90"; idempotente |
| U2 | `extrairAno` | "9605/1998" → 1998; "CLT" → null; "Lei 8.112/90" → null (90 não é 4 dígitos); "Lei 8.112/1990" → 1990 |
| U3 | `calcularStatus` | `[]` → `nao_encontrada`; `[{score:10}]` → `sugerida`; `[{score:24},{score:8}]` → `sugerida` (ratio 3); `[{score:24},{score:20}]` → `ambigua` (ratio 1.2) |

### Testes de segurança
- T-Sec1 — Cargo de outro usuário: 403 em todos os 4 endpoints da `/leis`
- T-Sec2 — Cargo inexistente: 404
- T-Sec3 — `lawId` que não existe no `laws_v3`: 400 em `vincular`
- T-Sec4 — `mencaoId` inválido: 404 em `vincular`/`mudarStatus`/`desvincular`

---

## 11. Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | BM25 sozinho ter precisão baixa (muitos `ambigua`) | Média | Médio | Coletar feedback nas primeiras semanas. Se ratio de "ambigua/total" > 30%, ligar Tier 3 (kNN) num PR5 |
| R2 | Filtro de `eficaz/revogado/disciplina` esconder normas válidas (similar ao gap original de `concurso`) | Média | Alto | Logs de score (§5) capturam menções com 0 hits. Se taxa de `nao_encontrada` > 20%, considerar afrouxar `exists(disciplina)` ou `eficaz`. Decisão pós-deploy via análise dos logs. |
| R3 | Performance: 18 menções × `searchLaws` em série | Média | Médio | Usar `Promise.all` para paralelizar (ES aguenta). Se ainda lento, batch via `_msearch` em uma única call. |
| R4 | Muitos artigos/dispositivos extraídos como menções separadas | Baixa | Baixo | Regex de dispositivos é só para extração de texto — não vira menção separada. Garantido pelo algoritmo (§6.5) |
| R5 | Doc do cargo crescer demais com `candidatos` (5 por menção × 18 menções × 2KB cada = ~180KB) | Baixa | Médio | `enabled: false` no mapping (D9) impede explosão de fields. Tamanho do `_source` aceitável até ~1MB. |
| R6 | Quando o usuário re-gera a análise (volta para `resultado` e analisa de novo), as `leis_vinculadas` ficam stale | Alta | Médio | Não invalidar automaticamente — `nomeNormalizado` é a chave; se a menção continua existindo, a vinculação se mantém. Vide §7. |
| R7 | Mesma norma referenciada com nomes diferentes (ex: "Lei 8.112/90" e "Estatuto do Servidor") vira 2 menções | Alta | Baixo | Aceito como trade-off. Ambas vão vincular à mesma `lawId`. UI pode oferecer "fundir menções" em PR futuro. |
| R8 | Latência: 18 menções × searchLaws com `fuzziness: AUTO` em índice grande pode estourar timeout do front | Baixa | Médio | Paralelizar via `Promise.all`; medir em produção. Se ficar lento, opções: reduzir `fuzziness` para `'1'`, usar `_msearch` em batch único, ou limitar a primeira busca a 10 menções por vez (paginação). |
| R9 | Regex de dispositivos não captura `§ X` ou `parágrafo único` quando vêm sozinhos sem artigo anterior | Baixa | Baixo | Aceito por agora — o caso normal é `art. X, § Y`. Se aparecer demanda real, expandir regex em PR de polimento. |

---

## 12. Pontos abertos pra confirmar antes de implementar

1. **`enabled: false` no mapping** — ✅ confirmado (sem queries reversas no PR4; reversível depois se precisar de relatórios "lei X em N cargos").

2. **Comportamento na regeneração** — ✅ aceito (definido em §7 com 3 cenários).

3. **Filtro de ente / estado por cargo** — ✅ **fora do PR4**, fica como melhoria pós-deploy depois de medir precisão real.

4. **Botão "Buscar manualmente"** — ✅ confirmado (modal com input livre + `/laws/search`, UX em §8).

---

## 13. Status das decisões

### ✅ Confirmadas (via chat ou nas rodadas de revisão)

- **D1–D9** — decisões de design originais
- **R1 §4.2** — bloquear sugestões quando `analise_status !== 'concluido'`
- **R1 §5** — remover `concurso: true` do filtro padrão; alinhar com `back_leges`
- **R1 §3** — novo status `confirmada_obsoleta` para preservar auditoria
- **R1 §4.3** — validar `lawId` em `laws_v3` antes de vincular
- **R1 §3** — `_meta.ultimaAtualizacaoEm` e `_meta.regenerando`
- **R1 §6** — algoritmo determinístico de `normalizarMencao` + idempotente
- **R1 §5** — instrumentação de score para calibração pós-deploy
- **R1 §10** — T11, T12 + unit tests U1/U2/U3

### ⚠️ Aguardando OK do usuário

- **§12.1** — `enabled: false` no mapping
- **§12.3** — Filtro de ente/estado entra na Fase 1 ou polimento?

### Justificativa de itens descartados nas rodadas

| Achado | Origem | Justificativa de descarte |
|--------|--------|---------------------------|
| Latência `fuzziness: AUTO` (M1 da Rodada 2) | Explore | Mantém `AUTO` para paridade com `back_leges`. Documentado como R8 com plano de mitigação se aparecer. |
| TTL 7 dias para cache de candidatos (B2 da Rodada 2) | Explore | Overengineering — sem evidência de mudança frequente em `laws_v3` que justifique cache busting automático. |
| `mencaoId` com timestamp (Rodada 1 inicial) | Eu | Quebra preservação em regenerações. Trocado por hash determinístico do `nomeNormalizado`. |

---

## 14. Aprendizados acumulados (a serem registrados após o PR)

Conforme `feedback_revisao_pos_spec.md` (memória do projeto), após implementação atualizar `docs/superpowers/aprendizados-revisao-pos-spec.md` com:

- Como o BM25 do `laws_v3` se comporta na prática (taxas de ambígua/sem-match)
- Threshold real ideal para `top1.score / top2.score`
- Casos onde o regex de dispositivos falha
- Decisão final sobre Tier 3 (kNN) — entrou em PR5? Por quê?
