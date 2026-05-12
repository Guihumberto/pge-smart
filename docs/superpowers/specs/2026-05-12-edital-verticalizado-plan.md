# Plano de Implementação — Edital Verticalizado

**Spec de referência:** [2026-05-12-edital-verticalizado-design.md](./2026-05-12-edital-verticalizado-design.md)
**Data:** 2026-05-12
**Estimativa:** ~6–8h trabalho técnico (backend + frontend + estilo + ajustes).
**Estratégia:** sub-fases ordenadas, backend antes do frontend. Cada sub-fase fecha com commit independente e validação manual. Quando o frontend começar, ele consome endpoint real (backend já em pé). Sem feature flag — mudanças aditivas.

---

## Sumário das sub-fases

```
1  — Backend: refatorar htmlToPdf para aceitar opts (margin/header/footer)
2  — Backend: conteudo-pdf.service.js — builder HTML + CSS_TEMPLATE + helpers
3  — Backend: rota + controller (POST /cargos/:cargoId/conteudo/pdf)
4  — Backend: smoke test manual com cargo real (curl/Insomnia → .pdf)
5  — Frontend: cargoService.gerarConteudoPdf(editalId, cargoId, opts)
6  — Frontend: PrintView.vue — fetch paralelo, toggles, render árvore
7  — Frontend: rota nova em routes.js
8  — Frontend: botão "Imprimir edital" no header de CargoConteudoView
9  — Frontend: ajustes responsivos (mobile + tablet)
10 — Validação local end-to-end: navegador (desktop+mobile) + PDF
```

Cada sub-fase termina com commit. Backend (1–4) pode deployar antes do frontend (5–9). Sub-fase 10 é validação manual final.

**Disciplina por sub-fase:** ao final, **revisão crítica em 2 passes** (leitura própria + busca por edge cases) antes de commit, especialmente para 2 e 6 (peças com mais código novo).

---

## Sub-Fase 1 — Refatorar `htmlToPdf` para aceitar opts

**Arquivo:** `plan-leges/src/utils/pdfGenerator.js`

**Mudança:**

```js
export async function htmlToPdf(html, opts = {}) {
  const {
    margin = { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' },
    displayHeaderFooter = false,
    headerTemplate = '',
    footerTemplate = '',
    format = 'A4',
  } = opts
  // ... resto inalterado, mas page.pdf({ format, margin, displayHeaderFooter, headerTemplate, footerTemplate, printBackground: true })
}
```

**Compatibilidade:** chamada existente em `estatistica.service.js:528` (`htmlToPdf(html)`) continua funcionando pois opts default mantém comportamento anterior.

**Validação:** rodar `npm test` no plan-leges (não deve quebrar nada). Testar manualmente o endpoint `/foco/pdf` existente — PDF gerado igual antes.

**Commit:** `refactor(pdf): htmlToPdf aceita opts (margin, headerFooter)`

---

## Sub-Fase 2 — `conteudo-pdf.service.js` — builder + CSS

**Arquivo novo:** `plan-leges/src/modules/edital-cargos/conteudo-pdf.service.js`

**Estrutura:**

```js
import { htmlToPdf } from '../../utils/pdfGenerator.js'
import { findCargoById } from './cargo.service.js'
import { findEditalById } from '../editais/edital.service.js'
import { AppError } from '../../middleware/errorHandler.js'

const CSS_TEMPLATE = `
  /* ~150 linhas: @page, paleta, tipografia, paginação */
`

function escapeHtml(s) { /* simples replace de &<>"' */ }

function formatDataLonga(d = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
}

function scoreParaBolinhas(score /* 0..1 */) {
  if (score == null) return ''
  const nivel = Math.min(5, Math.max(1, Math.ceil(score * 5)))
  return '●'.repeat(nivel) + '○'.repeat(5 - nivel)
}

function statsDoCargo(disciplinas) {
  let assuntos = 0, subAssuntos = 0, leis = new Set(), cargaHoras = 0
  for (const d of disciplinas) {
    assuntos += d.assuntos?.length || 0
    for (const a of d.assuntos || []) {
      subAssuntos += a.sub_assuntos?.length || 0
      for (const l of a.leis_referencia || []) leis.add(l)
      cargaHoras += a.carga_estimada_horas || 0
    }
  }
  return { disciplinas: disciplinas.length, assuntos, subAssuntos, leis: leis.size, cargaHoras }
}

function renderCapa({ cargo, edital, disciplinas }, opts) { /* HTML */ }
function renderSumario(disciplinas) { /* HTML */ }
function renderConteudo(disciplinas, opts) { return disciplinas.map(d => renderDisciplina(d, opts)).join('') }
function renderDisciplina(d, opts) { /* HTML — header + assuntos */ }
function renderAssunto(a, opts) { /* HTML — checkbox + título + score + sub-assuntos + leis + justificativa */ }
function renderSubAssunto(s, opts) { /* HTML */ }

export function buildConteudoVerticalHtml({ cargo, edital }, opts) {
  const disciplinas = opts.mostrarPriorizacao
    ? (cargo.priorizacao?.disciplinas || [])
    : (cargo.conteudo_parseado?.disciplinas || [])

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
  <style>${CSS_TEMPLATE}</style>
</head>
<body>
  ${renderCapa({ cargo, edital, disciplinas }, opts)}
  ${disciplinas.length >= 5 ? renderSumario(disciplinas) : ''}
  ${renderConteudo(disciplinas, opts)}
</body>
</html>`
}

export async function gerarConteudoPdf(cargoId, userId, opts) {
  const cargo = await findCargoById(cargoId, userId)
  if (!cargo.conteudo_parseado?.disciplinas?.length) {
    throw new AppError('Cargo sem conteúdo programático estruturado', 422)
  }
  const edital = await findEditalById(cargo.editalId)

  const html = buildConteudoVerticalHtml({ cargo, edital }, opts)
  const headerTemplate = `<div style="font-size:8pt;letter-spacing:0.16em;text-transform:uppercase;color:#86827A;width:100%;padding:0 20mm;font-family:'IBM Plex Sans',sans-serif;">${escapeHtml([edital.orgao, cargo.nome, 'Edital verticalizado'].filter(Boolean).join(' · '))}</div>`
  const footerTemplate = `<div style="font-size:10pt;color:#3F3F3F;width:100%;text-align:center;font-family:'Cormorant Garamond',serif;font-style:italic;"><span class="pageNumber"></span></div>`

  return htmlToPdf(html, {
    margin: { top: '22mm', right: '20mm', bottom: '22mm', left: '20mm' },
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
  })
}
```

**CSS_TEMPLATE (resumo):**
- Variáveis CSS: paleta da spec §5.1.
- `@page { size: A4; margin: 0; }` (margem é gerenciada pelo Puppeteer).
- Tipografia conforme §5.2.
- Regras `page-break-*`, `orphans`, `widows` conforme §9.
- `.capa { page-break-after: always; }`, `.sumario { page-break-after: always; }`, `.disciplina { page-break-before: always; }`, `.disciplina:first-of-type { page-break-before: avoid; }`.
- Score em bolinhas via classe `.score-bolinha` com cor `--accent`.
- Filete-marca lateral em justificativa via `border-left: 3px solid var(--accent); padding-left: 12px;`.
- Linhas pontilhadas (anotações): `border-bottom: 0.5pt dotted #C0BBA8; height: 20px;` repetidas 3×.

**Render helpers — pontos críticos:**
- Toda string vinda de campo do banco passa por `escapeHtml`.
- Numeral romano da disciplina: usar pequena função `toRomano(n)` ou tabela inline (1–30 cobre 99% dos casos).
- Renderização opcional baseada em `opts`: cada bloco de score/legislação/justificativa/checkbox tem `if (opts.mostrarX)`.
- Sub-sub-assuntos são strings, não objetos: `<span>${escapeHtml(s)}</span>`.

**Validação:** import direto em REPL Node: `import { buildConteudoVerticalHtml } from '...'; console.log(buildConteudoVerticalHtml({ cargo: mockCargo, edital: mockEdital }, defaultOpts).slice(0, 2000))` — verifica HTML válido visualmente.

**Commit:** `feat(edital-cargos): conteudo-pdf service — builder HTML + CSS A4`

---

## Sub-Fase 3 — Rota + controller

**Arquivos:**
- `plan-leges/src/modules/edital-cargos/cargo.controller.js` — adicionar:
  ```js
  export const conteudoPdf = async (req, res) => {
    const opts = {
      mostrarPriorizacao: req.body.mostrarPriorizacao ?? false,
      mostrarLegislacao: req.body.mostrarLegislacao ?? true,
      mostrarAnotacoes: req.body.mostrarAnotacoes ?? false,
      mostrarCheckbox: req.body.mostrarCheckbox ?? true,
    }
    const pdf = await svc.gerarConteudoPdf(req.params.cargoId, req.user.id, opts)
    const buffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf)
    const slug = (req.params.cargoId || 'cargo').slice(0, 16)
    const data = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="edital-verticalizado-${slug}-${data}.pdf"`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  }
  ```
- `plan-leges/src/modules/edital-cargos/cargo.routes.js` — adicionar antes do `export default`:
  ```js
  router.post('/:cargoId/conteudo/pdf', authenticate, ctrl.conteudoPdf)
  ```

**Import:** no controller, importar `gerarConteudoPdf` do service novo. Renomear pra `gerarConteudoPdf` na chamada para evitar conflito com `parse`/`analisar` existentes — adicionar como import nomeado em vez do `* as svc` se houver conflito (provavelmente não há).

**Validação:** start backend local; subir um cargo de teste com `conteudo_parseado`; chamar via curl:
```bash
curl -X POST http://localhost:3333/api/editais/$EDITAL/cargos/$CARGO/conteudo/pdf \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"mostrarPriorizacao":true,"mostrarLegislacao":true,"mostrarCheckbox":true,"mostrarAnotacoes":false}' \
  --output edital.pdf
```
Abrir o PDF — verificar: capa, sumário (se ≥5 disciplinas), conteúdo, header/footer, fontes carregadas, paginação razoável.

**Commit:** `feat(edital-cargos): rota POST /:cargoId/conteudo/pdf`

---

## Sub-Fase 4 — Smoke test + ajustes visuais

**Não é commit obrigatório se passou.** Mas se ajustes visuais forem necessários (espaçamentos, tamanhos, cores ligeiramente off), ajustar o `CSS_TEMPLATE` da Sub-Fase 2 e commitar:

`fix(edital-cargos): ajustes finos no template do PDF — espaçamento de assuntos e cor de filetes`

Possíveis ajustes prováveis:
- Page-break agressivo demais (assunto pequeno virando órfão) → relaxar `page-break-inside: avoid`.
- Header/footer "vazando" sobre conteúdo → ajustar margem top/bottom de `@page`.
- Fontes não carregando no PDF → garantir `<link>` antes do `<style>`.
- Numeral romano grande "sobreposto" ao texto → ajustar grid ou padding.

---

## Sub-Fase 5 — Service frontend

**Arquivo:** `pge-smart/src/services/cargo.service.js` — adicionar ao final do objeto `cargoService`:

```js
async gerarConteudoPdf(editalId, cargoId, opts) {
  const { data } = await http.post(
    `/editais/${editalId}/cargos/${cargoId}/conteudo/pdf`,
    opts,
    { responseType: 'blob', timeout: 60000 }
  )
  return data // Blob
},
```

**Commit:** `feat(cargo): service gerarConteudoPdf`

---

## Sub-Fase 6 — `PrintView.vue` (peça principal do front)

**Arquivo novo:** `pge-smart/src/views/PrintView.vue`

**Estrutura `<script setup>`:**

```vue
<script setup>
import { ref, computed, onMounted, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cargoService } from '@/services/cargo.service'
import { editalService } from '@/services/edital.service'

const route = useRoute()
const router = useRouter()
const editalId = route.params.id
const cargoId = route.params.cargoId

const cargo = ref(null)
const edital = ref(null)
const loading = ref(true)
const errorFetch = ref(null)
const downloadingPdf = ref(false)
const errorDownload = ref(null)

const temPriorizacao = computed(() => !!cargo.value?.priorizacao?.disciplinas?.length)
const mostrarPriorizacao = ref(false)  // ajustado em onMounted após fetch
const mostrarLegislacao = ref(true)
const mostrarAnotacoes = ref(false)
const mostrarCheckbox = ref(true)

const disciplinas = computed(() => {
  if (!cargo.value) return []
  return mostrarPriorizacao.value
    ? cargo.value.priorizacao?.disciplinas || []
    : cargo.value.conteudo_parseado?.disciplinas || []
})

const stats = computed(() => { /* mesma lógica do back: disciplinas/assuntos/subs/leis/horas */ })
const dataLonga = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())
const subtituloCapa = computed(() => /* [orgao,banca,ano].filter().join(' · ').toUpperCase() */)

onMounted(async () => {
  try {
    const [c, e] = await Promise.all([
      cargoService.get(editalId, cargoId),
      editalService.get(editalId),
    ])
    cargo.value = c
    edital.value = e
    mostrarPriorizacao.value = !!c.priorizacao?.disciplinas?.length
  } catch (err) {
    errorFetch.value = err.message
  } finally {
    loading.value = false
  }
})

async function baixarPdf() {
  if (downloadingPdf.value) return
  downloadingPdf.value = true
  errorDownload.value = null
  try {
    const blob = await cargoService.gerarConteudoPdf(editalId, cargoId, {
      mostrarPriorizacao: mostrarPriorizacao.value,
      mostrarLegislacao: mostrarLegislacao.value,
      mostrarAnotacoes: mostrarAnotacoes.value,
      mostrarCheckbox: mostrarCheckbox.value,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edital-verticalizado-${cargo.value.nome.replace(/\W+/g, '-').toLowerCase()}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    errorDownload.value = 'Não foi possível gerar o PDF. Tente novamente.'
  } finally {
    downloadingPdf.value = false
  }
}

function toRomano(n) { /* implementar */ }
function scoreParaBolinhas(s) { /* mesma do back */ }
</script>
```

**Estrutura `<template>`:**
- `<div class="print-view">`:
  - Loading skeleton (se `loading`).
  - Empty state (se `!loading && !disciplinas.length`).
  - Toggle bar sticky (`role="toolbar"`):
    - Checkbox toggle "Mostrar priorização" (disabled se `!temPriorizacao`, com tooltip).
    - Checkbox "Mostrar legislação".
    - Checkbox "Espaço para anotações".
    - Checkbox "Checkboxes".
    - Botão "Baixar PDF" (com spinner se `downloadingPdf`).
    - Aviso de erro inline (se `errorDownload`).
  - `<article class="documento">`:
    - `<section class="capa">` — render conforme §6.1.
    - `<section class="sumario">` (se `disciplinas.length >= 5`).
    - `<section class="conteudo">` — `v-for` em disciplinas.
      - Para cada disciplina: header com numeral romano + nome + filete.
      - `v-for` em assuntos: checkbox + título + score (se priorização) + sub-assuntos + leis + justificativa + (espaço de anotações se ligado).

**Estilo `<style>` (scoped):**
- ~250 linhas. Variáveis CSS no `:root`, classes para cada elemento.
- Importar fontes Google na primeira linha via `@import`.
- `@media print`: oculta toggle bar, aplica regras de page-break.
- `@media (max-width: 1023px)`: ajustes tablet (scale ou width 100%).
- `@media (max-width: 767px)`: layout mobile completo conforme §7.1.

**Validação:** abrir a rota localmente, verificar:
- Loading skeleton aparece e some.
- Toggles refletem mudanças imediatamente no documento.
- Empty state aparece com cargo sem conteúdo.
- Ctrl+P no navegador mostra preview decente (sem toggle bar).

**Commit:** `feat(views): PrintView edital verticalizado — render + toggles`

---

## Sub-Fase 7 — Rota no router

**Arquivo:** `pge-smart/src/router/routes.js`

Inserir após a rota `CargoConteudo` (~linha 103):
```js
{
  path: 'editais/:id/cargos/:cargoId/imprimir',
  name: 'CargoImprimir',
  component: () => import('@/views/PrintView.vue'),
},
```

**Validação:** navegar pelo URL bar até `http://localhost:5173/editais/<id>/cargos/<id>/imprimir` — PrintView monta.

**Commit:** `feat(router): rota CargoImprimir`

---

## Sub-Fase 8 — Botão na CargoConteudoView

**Arquivo:** `pge-smart/src/views/CargoConteudoView.vue`

No `<div class="conteudo-view__header">` (linha ~4), adicionar à direita do breadcrumb, dentro de um wrapper flex:

```vue
<button
  v-if="!mounting && cargo"
  class="btn-outline btn-outline--accent"
  @click="router.push(`/editais/${editalId}/cargos/${cargoId}/imprimir`)"
>
  <Printer :size="14" /> Imprimir edital
</button>
```

Importar `Printer` do `lucide-vue-next` (já em uso no projeto).

CSS: encaixar com `justify-content: space-between` no header existente, ou adicionar `.conteudo-view__header__actions` no fim.

**Validação:** ver botão aparecendo, clicar leva para PrintView.

**Commit:** `feat(cargo-conteudo): botão Imprimir edital no header`

---

## Sub-Fase 9 — Responsividade

Refinar CSS da PrintView para mobile (testar em DevTools com iPhone 12 / Pixel 7 / iPad).

Critérios de aceitação:
- Capa fica legível em 375px width — title quebra ok, stats line não sai do viewport.
- Toggle bar em mobile vira drawer/sheet (acionada por botão ícone "ajustes") OU compacta horizontalmente com scroll-x.
- Botão "Baixar PDF" sempre visível em mobile (não escondido em menu).
- Documento principal escala bem (font-sizes reduzidas, mas hierarquia preservada).

**Commit:** `style(print-view): ajustes responsivos mobile e tablet`

---

## Sub-Fase 10 — Validação end-to-end

Não é commit. Checklist de validação manual:

- [ ] Backend: PDF gera ok com priorização ON. Página 1 = capa. Página 2 = sumário (se ≥5 disciplinas). Páginas seguintes = disciplinas com numeral romano grande + filete.
- [ ] Backend: PDF gera ok com priorização OFF. Renderiza `conteudo_parseado` corretamente.
- [ ] Backend: toggles individuais funcionam: legislação OFF some leis, anotações ON adiciona espaço, checkbox OFF some quadradinhos.
- [ ] Backend: cargo sem `conteudo_parseado` retorna 422 com mensagem clara.
- [ ] Backend: cargo de outro usuário retorna 403.
- [ ] Frontend: PrintView abre e carrega. Toggles funcionam. Documento atualiza em tempo real.
- [ ] Frontend: empty state aparece para cargo vazio.
- [ ] Frontend: botão "Baixar PDF" mostra spinner; toggles desabilitam durante download.
- [ ] Frontend: Ctrl+P na PrintView dá preview decente (mesmo que pior que o do back).
- [ ] Frontend mobile: PrintView é navegável em 375px. Toggle bar acessível. Botão de download visível.
- [ ] Frontend mobile: screenshot da capa em proporção 4:5 (Instagram) fica bonito.
- [ ] CargoConteudoView: botão "Imprimir edital" aparece em todos os estados (entrada, preview, resultado, priorização).
- [ ] Tipografia: Cormorant Garamond visível no documento. IBM Plex Sans em meta/sub-itens. Sem fallbacks visíveis.
- [ ] Páginas no PDF: viúvas/órfãs ok (poucas linhas isoladas). Disciplinas começam em página nova. Headers/footers presentes a partir da p.2.

Se algo quebrar, voltar à sub-fase responsável.

---

## Riscos durante execução

1. **Fonte do Google não carrega no Puppeteer:** já mitigado por `document.fonts.ready` + timeout 2s. Se fallback feio, baixar fontes localmente em `plan-leges/public/fonts/` e referenciar via `file://` ou base64 inline.
2. **`page-break-inside: avoid` excessivo deixa página com muito espaço branco:** relaxar para apenas `.justificativa` e `.lei-tag`; remover de `.assunto-bloco`. Aceitar quebras dentro de assuntos longos.
3. **Header/footer do Puppeteer corta conteúdo:** `headerTemplate` ocupa altura do `margin-top` definido. Garantir `margin: { top: '22mm' }` deixa espaço.
4. **CORS no download via Blob:** baseURL já é o backend, sem CORS issue (assumindo dev/prod corretamente configurados — já é o caso de `/foco/pdf`).
5. **Conteúdo do edital com HTML/markdown:** se algum nome de assunto/sub trouxer markup, `escapeHtml` neutraliza. Sem renderização rica.
6. **`btn-outline--accent` não existe no design system:** criar uma variante local ou usar `btn-outline` simples. Não bloqueador.

---

## Pós-implementação (não nesta entrega)

- Aprendizados: documentar bugs/quirks encontrados em arquivo `2026-05-12-edital-verticalizado-learnings.md` se valerem registro.
- Métricas: olhar logs do back após 1 semana — quantos PDFs gerados, qual tamanho médio, qual combinação de toggles mais usada. Informa decisões de fase 2 (PNG, cache, etc).
