# Refactor Norma-Centric — Spec PR5

**Data:** 2026-05-06
**Status:** ✅ Aprovada — em implementação
**Escopo:** refactor do PR4 (vinculação de normas) — inverter modelo de menção→norma para norma→menções

---

## 1. Motivação

PR4 entregou um modelo **menção-centric** (`leis_vinculadas.mencoes[]`). Em uso real:
- 1 cargo gerou 287 menções (a IA repete a mesma norma em vários níveis: disciplina, assunto, sub_assunto)
- A mesma norma aparece como 3-17 menções diferentes ("CTN", "Lei 5.172", "Código Tributário", etc)
- Vincular uma a uma é inviável e duplica trabalho

**Decisão:** virar o modelo. **Norma é a entidade primária**. Cada norma única tem uma entrada e dentro dela um `abarca[]` listando todos os pontos do edital onde aparece.

---

## 2. Modelo de dados

### Schema novo (`cargo.leis_vinculadas`)

```json
{
  "_meta": {
    "schema": "norma_centric_v1",
    "geradoEm": "2026-05-06T...",
    "ultimaAtualizacaoEm": "2026-05-06T...",
    "regenerando": false,
    "totalNormas": 87,
    "confirmadas": 12,
    "confirmadas_obsoletas": 0,
    "sugeridas": 45,
    "ambiguas": 18,
    "pendentes": 8,
    "nao_encontradas": 4,
    "obsoletas": 2,
    "version": 2
  },
  "normas": [
    {
      "id": "norm_<sha1(nomeNormalizado).slice(0,8)>",
      "nomeOriginal": "Lei nº 5.172/1966",
      "nomeNormalizado": "5172/1966",
      "ano": 1966,
      "abarca": [
        {
          "disciplina": "Direito Tributário",
          "assuntos": ["Obrigação tributária", "Crédito tributário"],
          "sub_assuntos": ["Lançamento", "Suspensão"],
          "dispositivos": ["art. 113", "art. 142"]
        },
        {
          "disciplina": "Direito Constitucional",
          "assuntos": ["Sistema tributário nacional"],
          "sub_assuntos": [],
          "dispositivos": []
        }
      ],
      "lawId": "abc123",
      "lawTitle": "Lei nº 5.172, de 25 de outubro de 1966",
      "lawSubtitle": "Dispõe sobre o Sistema Tributário Nacional...",
      "candidatos": [{ "id": "...", "title": "...", "score": 14.2 }],
      "status": "confirmada",
      "confirmadoEm": "2026-05-06T..."
    }
  ]
}
```

### Mudanças de campo

| Antes (PR4) | Agora (PR5) |
|-------------|-------------|
| `mencoes[]` | `normas[]` |
| `mencoes[].id = "men_..."` | `normas[].id = "norm_..."` |
| `mencoes[].fontes[] = [{disciplina, assunto, ...}]` | `normas[].abarca[] = [{disciplina, assuntos, sub_assuntos, dispositivos}]` |
| `mencoes[].dispositivos[]` (string array no nível raiz) | dispositivos agora ficam **dentro** de `abarca[]` por disciplina (granularidade preservada) |
| `_meta.totalMencoes` | `_meta.totalNormas` |
| `_meta.schema` ausente | `_meta.schema = "norma_centric_v1"` para detectar versão |

### Status (mantém os 6)
`sugerida` | `ambigua` | `confirmada` | `confirmada_obsoleta` | `pendente` | `nao_encontrada`

---

## 3. Algoritmo de agregação (`extractNormas`)

```js
function extractNormas(cargo) {
  const map = new Map() // chave: nomeNormalizado

  function addOcorrencia(textoBruto, contexto) {
    // contexto = { disciplina, assunto?, sub_assunto?, dispositivos? }
    const nomeNormalizado = normalizarMencao(textoBruto)
    if (!nomeNormalizado || nomeNormalizado.length < 2) return

    let norma = map.get(nomeNormalizado)
    if (!norma) {
      norma = {
        id: `norm_${sha1(nomeNormalizado).slice(0, 8)}`,
        nomeOriginal: textoBruto.trim(),
        nomeNormalizado,
        ano: extrairAno(textoBruto),
        abarca: [], // array de blocos por disciplina
      }
      map.set(nomeNormalizado, norma)
    }

    // Localiza ou cria o bloco da disciplina (compara normalizado para dedupe case+acento)
    const discKey = normalizarNome(contexto.disciplina)
    let bloco = norma.abarca.find(b => normalizarNome(b.disciplina) === discKey)
    if (!bloco) {
      // Preserva o primeiro nome encontrado para exibição
      bloco = { disciplina: contexto.disciplina, assuntos: [], sub_assuntos: [], dispositivos: [] }
      norma.abarca.push(bloco)
    }

    // Helper local: normalizarNome(s) = lower + sem acento + trim
    function normalizarNome(s) {
      return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    }
    if (contexto.assunto && !bloco.assuntos.includes(contexto.assunto)) bloco.assuntos.push(contexto.assunto)
    if (contexto.sub_assunto && !bloco.sub_assuntos.includes(contexto.sub_assunto)) bloco.sub_assuntos.push(contexto.sub_assunto)
    for (const d of contexto.dispositivos || []) {
      if (!bloco.dispositivos.includes(d)) bloco.dispositivos.push(d)
    }
  }

  // Fonte 1 — fontes_explicitas no parse
  for (const disc of cargo?.conteudo_parseado?.disciplinas || []) {
    for (const assunto of disc.assuntos || []) {
      for (const f of assunto.fontes_explicitas || []) {
        addOcorrencia(f, {
          disciplina: disc.nome,
          assunto: assunto.nome,
          dispositivos: extrairDispositivos(f),
        })
      }
    }
  }

  // Fonte 2 — leis_referencia em 3 níveis
  for (const disc of cargo?.priorizacao?.disciplinas || []) {
    for (const lei of disc.leis_referencia || []) {
      addOcorrencia(lei, { disciplina: disc.nome, dispositivos: extrairDispositivos(lei) })
    }
    for (const assunto of disc.assuntos || []) {
      for (const lei of assunto.leis_referencia || []) {
        addOcorrencia(lei, { disciplina: disc.nome, assunto: assunto.nome, dispositivos: extrairDispositivos(lei) })
      }
      for (const sub of assunto.sub_assuntos || []) {
        for (const lei of sub.leis_referencia || []) {
          addOcorrencia(lei, {
            disciplina: disc.nome, assunto: assunto.nome, sub_assunto: sub.nome,
            dispositivos: extrairDispositivos(lei),
          })
        }
      }
    }
  }

  return Array.from(map.values())
}
```

**Saída esperada:** ~70-100 normas únicas (vs 287 menções na implementação anterior).

---

## 4. Migração automática

### Detecção de shape antigo (CRÍTICO)

`_meta.geradoEm` existe em ambos os shapes (PR4 e PR5). Não basta para distinguir. **Critério explícito:**

```js
const existente = cargo.leis_vinculadas
const isShapeAntigo = existente?.mencoes && !existente?.normas
const isShapeNovo = existente?.normas && existente?._meta?.schema === 'norma_centric_v1'
```

Em `getLeisVinculadas`:
```js
if (isShapeNovo && existente._meta?.geradoEm) {
  return existente // já está no shape novo, retorna direto
}
// Se shape antigo OU primeira geração, força regenerar:
return await regerarSugestoes(...)
```

Em `regerarSugestoes`, capturar confirmações antigas **antes** de extrair normas novas:
```js
const confirmacoesAntigas = new Map() // nomeNormalizado → { lawId, lawTitle, lawSubtitle, confirmadoEm }
if (isShapeAntigo) {
  for (const m of (existente.mencoes || [])) {
    if (m.status === 'confirmada' && m.lawId) {
      confirmacoesAntigas.set(m.nomeNormalizado, {
        lawId: m.lawId, lawTitle: m.lawTitle, lawSubtitle: m.lawSubtitle, confirmadoEm: m.confirmadoEm,
      })
    }
  }
}
// Idem para shape novo (preservar entre regenerações)
```

Para cada `norma` nova, busca em `confirmacoesAntigas` pelo `nomeNormalizado` e aplica os campos preservados.

**Sem botão extra** — usuário só clica "Vincular normas" e a primeira chamada migra automaticamente. O `mencoes[]` antigo é descartado.

---

## 5. Endpoints (mudanças mínimas)

| Endpoint | PR4 | PR5 |
|----------|-----|-----|
| `GET /sugestoes` | retorna `{ leis_vinculadas: { mencoes } }` | retorna `{ leis_vinculadas: { normas } }` |
| `POST /sugestoes` | regenera | idem |
| `POST /vincular` | body `{ mencaoId, lawId }` | body `{ normaId, lawId }` |
| `PATCH /:mencaoId/status` | path `:mencaoId` | path `:normaId` (mesma rota, novo nome de param) |
| `POST /:mencaoId/desvincular` | path `:mencaoId` | path `:normaId` |

> **Compat de URL:** mantenho os mesmos paths (mais simples), só renomeio o param interno. Como o front é o único caller e vamos atualizar junto, não há risco de break.

---

## 6. UX da aba

### `NormaCard.vue` (substitui `MencaoCard`)

```
📋 Lei nº 5.172/1966                                  [✓ Confirmada]
   Vinculada a: Lei nº 5.172, de 25 de outubro de 1966
   Dispõe sobre o Sistema Tributário Nacional...

   ▾ Abarca 2 disciplinas, 4 assuntos, 2 sub-assuntos
     · Direito Tributário
       Assuntos: Obrigação tributária, Crédito tributário
       Sub-assuntos: Lançamento, Suspensão
       Dispositivos: art. 113, art. 142
     · Direito Constitucional
       Assuntos: Sistema tributário nacional

   [Trocar] [Desvincular]
```

- Bloco "Abarca" colapsado por default; expande ao clicar
- Botões idênticos ao `MencaoCard` (Confirmar/Trocar/Pendente/Desvincular)

### `LeisVinculacaoPanel.vue` ajustado

- Mesmos agrupamentos por status (já existem)
- **Nova sub-seção "Lista final"** ao final do painel:
  ```
  ▾ Lista final — 12 normas confirmadas
    1. Lei nº 5.172/1966 (CTN) — 4 assuntos
    2. Lei nº 8.112/1990 — 8 assuntos
    ...
    [📋 Copiar lista]
  ```
  - Toggle/accordion fechado por default
  - Apenas `confirmadas` (não inclui `confirmada_obsoleta`)
  - Ordenado por número/ano
  - Botão "Copiar lista" (copia texto plain para clipboard)

---

## 7. Bônus que entra junto

### B1. Threshold mais conservador
`top1.score / top2.score >= 1.5` → **`>= 2.0`**. Mais coisa cai em "ambígua" para revisão manual, menos falsos positivos em "sugerida".

### B2. Normalização tolera ano 2-dígitos
```js
// Em normalizarMencao, depois de remover prefixos:
// expande "/90" → "/1990" (anos < 50 vão pra 2000s, >= 50 vão pra 1900s)
s = s.replace(/\/(\d{2})\b/g, (_, yy) => {
  const n = parseInt(yy, 10)
  return n < 50 ? `/20${yy}` : `/19${yy}`
})
```

Cobre: "Lei 8.112/90" e "Lei 8.112/1990" deduplam pra `8112/1990`.

### B3. Ordenação default dos grupos no painel
1. Ambíguas (precisam decisão)
2. Sugeridas (revisar)
3. Não encontradas (saber o que falta)
4. Pendentes
5. Confirmadas obsoletas (ainda relevantes)
6. Confirmadas (já feitas — colapsado)

---

## 8. Plano de implementação

### Fase 1 — Backend (~3h)
1. `leis-cargo.service.js` — `extractMencoes` → `extractNormas` (nova lógica)
2. `regerarSugestoes` opera em `normas`
3. `vincularLei`/`mudarStatus`/`desvincular` recebem `normaId`
4. Migração automática de shape antigo
5. Bônus B1 + B2 aplicados em `law.service.js`

### Fase 2 — Frontend (~3h)
1. `services/cargo.service.js` — params renomeados (`mencaoId` → `normaId`)
2. `stores/useCargoStore.js` — actions renomeadas
3. `components/workspace/MencaoCard.vue` → `NormaCard.vue` (rename + adaptação)
4. `components/workspace/LeisVinculacaoPanel.vue` — usa `normas[]` e adiciona sub-seção lista final
5. `views/CargoConteudoView.vue` — handlers renomeados

### Fase 3 — Validação (~30min)
1. `node --check` em todos os JS modificados
2. Grep por refs antigas (`mencoes`, `mencaoId`, `MencaoCard`)
3. Testes manuais via cargo real (300+ menções → ver redução para ~80 normas)

---

## 9. Testes de aceitação

| # | Cenário | Esperado |
|---|---------|----------|
| T1 | Cargo novo, sem `leis_vinculadas` | `regerar` cria `normas[]` agregadas. ~70-100 normas |
| T2 | Cargo com `leis_vinculadas.mencoes` (PR4) | Migração automática preserva confirmadas pelo `nomeNormalizado` |
| T3 | Mesma norma referenciada em 5 lugares | Aparece **1x** com `abarca` listando 5 contextos |
| T4 | "Lei 8.112/90" e "Lei 8.112/1990" no mesmo cargo | Deduplicam em 1 norma só (ano normalizado) |
| T5 | Confirmar uma norma → cobre todas as ocorrências | Status `confirmada` único, sem precisar repetir N vezes |
| T6 | Sub-seção "Lista final" com 12 confirmadas | Lista numerada, botão copiar funciona |
| T7 | Threshold 2.0 — top1 ratio < 2.0 | Status `ambigua` em vez de `sugerida` |

---

## 10. Riscos

| # | Risco | Mitigação |
|---|-------|-----------|
| R1 | Migração automática perder confirmações antigas | `nomeNormalizado` é determinístico — confirmações com mesmo nome migram. Confirmações cujo nome mudou (raro) viram `sugerida` na nova base — usuário re-confirma |
| R2 | Backend retorna shape novo mas frontend ainda em PR4 (deploy fora de sincronia) | Front e back versionam juntos. Subir backend antes do front. Em dev, ambos rodam local — não é problema |
| R3 | Threshold 2.0 deixa muita coisa em "ambígua" | Logs `[laws.search]` permitem ajustar pós-deploy. Voltar a 1.5 é trivial. |
| R4 | Usuário tem cargos cuja análise foi feita em modelo antigo + novo no mesmo dia | A flag `_meta.schema` distingue. Migração é idempotente |

---

## 11. Decisões aprovadas

- ✅ Sub-seção "Lista final" dentro da aba Vinculação (recomendação)
- ✅ Migração automática (recomendação)
- ✅ Bônus B1/B2/B3 entram junto (recomendação)
- ✅ PR5 dedicado (recomendação)
