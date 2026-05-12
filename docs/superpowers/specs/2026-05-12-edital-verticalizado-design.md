# Edital Verticalizado — Design

**Data:** 2026-05-12
**Escopo:** `pge-smart` (frontend Vue) + `plan-leges` (backend Node)
**Origem:** CargoConteudoView ganha botão "Imprimir edital" → nova PrintView (navegador) → PDF gerado no back (Puppeteer).

---

## 1. Problema e contexto

A `CargoConteudoView.vue` (pge-smart) é o centro do fluxo de cadastro/análise de conteúdo programático por cargo: o usuário cola o edital, vê o conteúdo estruturado (disciplinas → assuntos → sub-assuntos → sub-sub) e, após análise, vê a priorização (scores, badges, leis vinculadas).

Hoje não existe uma forma de **levar esse conteúdo para fora do app** — para estudar em papel, marcar a caneta o que já foi visto e fazer anotações. Concurseiros operam parte do estudo em papel (foco, ausência de notificações, ergonomia diferente da tela). A ausência desse artefato força os usuários a copiar manualmente ou usar PDFs feitos por terceiros.

Além do uso funcional, o artefato deve ter **qualidade editorial** suficiente para ser compartilhado em redes sociais como prova social da seriedade do estudo — "olha o meu plano". O documento vira tanto guia de estudo quanto peça de marketing orgânica.

## 2. Objetivos e não-objetivos

**Objetivos:**
- Botão único e óbvio na CargoConteudoView que leva à PrintView.
- Visualização no navegador com layout final fiel ao do PDF (WYSIWYG mental).
- Toggles para incluir/excluir priorização, legislação, espaço de anotações e checkboxes — combinados livremente.
- PDF gerado no backend (plan-leges, Puppeteer) com paginação A4, controle de viúvas/órfãs e quebras nos lugares certos.
- Estética **manual editorial clássico** (Cormorant Garamond + IBM Plex Sans, papel creme, acento burgundy) — distintiva, calorosa, compartilhável.

**Não-objetivos:**
- Editar conteúdo na PrintView (somente exibir; edição continua na CargoConteudoView).
- Imprimir cargos sem priorização ainda calculada — o toggle de priorização aparece desabilitado nesse caso.
- Multi-cargo no mesmo PDF (escopo: um cargo por documento).
- Suporte a impressão duplex/sangria/Pantone — A4 simples basta.
- Internacionalização — pt-BR fixo.

## 3. Arquitetura

```
[CargoConteudoView.vue]              [PrintView.vue]                    [plan-leges back]
        │                                  │                                   │
  Botão "Imprimir              GET /editais/:e/cargos/:c/imprimir              │
   edital" no header  ─────►   Renderiza árvore + toggles                      │
                                   │                                           │
                                   ├─ Ctrl+P fallback usa @media print CSS     │
                                   │                                           │
                                   └─ "Baixar PDF" ─── POST ─►   /api/editais/:e/cargos/:c/conteudo/pdf
                                                                  { mostrarPriorizacao,
                                                                    mostrarLegislacao,
                                                                    mostrarAnotacoes,
                                                                    mostrarCheckbox }
                                                                       │
                                                                       ├─ cargoService.getById(cargoId)
                                                                       ├─ buildConteudoVerticalHtml(cargo, opts)
                                                                       ├─ htmlToPdf(html)   [já existe]
                                                                       └─ retorna Buffer PDF
```

**Princípios:**
- A PrintView é a fonte da verdade visual para o navegador.
- O backend **reconstrói** o HTML em Node a partir do `cargo` lido do DB — nunca recebe HTML do frontend (segurança + consistência).
- As regras CSS de paginação (`page-break-*`, `orphans`, `widows`) ficam duplicadas (PrintView + backend) em arquivos pequenos e bem-isolados. As duplicações são as regras de paginação e a paleta — não a estrutura. A duplicação é aceitável por ser pequena e disciplinada; se crescer, considera-se Phase 2 (template compartilhado).

## 4. Componentes

### 4.1 `CargoConteudoView.vue` (modificação pequena)

- Adicionar botão `Imprimir edital` no header (ao lado direito do breadcrumb, mesma altura do `Voltar`).
- O botão aparece quando `!mounting && cargo` (todos os estados a partir de `entrada`).
- Clique: `router.push('/editais/:editalId/cargos/:cargoId/imprimir')`.
- Sem mudança em estado interno; é só navegação.

### 4.2 `PrintView.vue` (novo)

- Rota nova em `router/routes.js`: path `/editais/:editalId/cargos/:cargoId/imprimir`, name `CargoImprimir`, lazy import.
- Componente busca cargo via `cargoService.getById(editalId, cargoId)` no `onMounted`.
- Toggles topo (sticky até o usuário rolar; oculto em `@media print`):
  - `mostrarPriorizacao` (default `true`; desabilitado com tooltip se `!cargo.priorizacao?.disciplinas?.length`)
  - `mostrarLegislacao` (default `true`)
  - `mostrarAnotacoes` (default `false`)
  - `mostrarCheckbox` (default `true`)
- Botão `Baixar PDF` no canto direito dos toggles. POST para `/api/editais/:e/cargos/:c/conteudo/pdf` com flags atuais. Resposta = Blob, download via anchor temporária.
- Renderização: capa → (sumário se ≥5 disciplinas) → conteúdo. Detalhe na §6.

### 4.3 `cargo.routes.js` / `cargo.controller.js` / `conteudo-pdf.service.js` (plan-leges)

- Nova rota: `POST /cargos/:cargoId/conteudo/pdf` autenticada (já há merge com `/editais/:editalId/cargos`, então a rota final fica `/api/editais/:editalId/cargos/:cargoId/conteudo/pdf`).
- Controller: valida body com defaults, chama `conteudoPdfService.gerar(cargoId, opts)`, retorna PDF com headers corretos.
- Service: 1) busca cargo via `findCargoById`, 2) `buildConteudoVerticalHtml(cargo, opts)`, 3) `htmlToPdf(html, pdfOpts)`, 4) retorna Buffer.
- Arquivo novo: `src/modules/edital-cargos/conteudo-pdf.service.js`. Contém o builder HTML, o CSS embarcado (string template) e nada mais. Sem dependências externas além do Puppeteer já em uso.

## 5. Sistema visual

Direção: **manual editorial clássico**. Inspiração: planner Moleskine + manual acadêmico bem composto. Refinado, calmo, durável.

### 5.1 Paleta

| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#FAF7F0` | fundo |
| `--ink` | `#1A1A1A` | corpo principal |
| `--ink-soft` | `#3F3F3F` | corpo secundário, sub-assuntos |
| `--ink-muted` | `#86827A` | meta, datas, números de página, sub-sub |
| `--accent` | `#7C2D2A` | numerais romanos, filetes decorativos, tags de lei, marca burgundy |
| `--rule` | `#D4CFC2` | filetes finos, separadores |
| `--check` | `#1A1A1A` | borda do `□` |

### 5.2 Tipografia

| Função | Família | Peso | Tamanho | Notas |
|---|---|---|---|---|
| Display capa | Cormorant Garamond | 500 italic | 56–72pt | tracking apertado (-0.01em) |
| Subtítulo capa | IBM Plex Sans | 500 | 11pt | uppercase, letter-spacing 0.18em |
| Numeral romano disciplina | Cormorant Garamond | 400 italic | 96pt | accent burgundy, opacity 0.85 |
| Disciplina (h1) | Cormorant Garamond | 600 | 28pt | line-height 1.15 |
| Assunto (h2) | Cormorant Garamond | 500 | 16pt | line-height 1.3 |
| Sub-assunto (h3) | IBM Plex Sans | 400 | 11pt | indent 28px, bullet `·` |
| Sub-sub (h4) | IBM Plex Sans | 400 | 10pt | indent 56px, cor `--ink-muted` |
| Lei vinculada | IBM Plex Sans | 400 italic | 9pt | tag outline burgundy |
| Score/badges | IBM Plex Mono | 400 | 9pt | monospaced para alinhar |
| Justificativa | Cormorant Garamond | 400 italic | 10pt | filete-marca lateral à esquerda (3px burgundy) |

Fontes carregadas via Google Fonts (Cormorant Garamond, IBM Plex Sans, IBM Plex Mono). No HTML do back, mesmo `<link>` — o `htmlToPdf` já espera `document.fonts.ready` antes do `page.pdf()`.

### 5.3 Ritmo vertical

- Body line-height: 1.5
- Títulos line-height: 1.15–1.3
- Espaço entre disciplinas: 32px (mas disciplinas sempre começam em página nova, então isso só vale para a primeira)
- Espaço entre assuntos: 14px
- Espaço entre sub-assuntos: 4px
- Padding entre header da página e primeiro item de conteúdo: 18px

### 5.4 Score visual (priorização)

Score numérico (0–100) vira **bolinhas preenchidas** (5 níveis) ao lado do título do assunto:

| Faixa | Visual |
|---|---|
| 0–19 | `●○○○○` |
| 20–39 | `●●○○○` |
| 40–59 | `●●●○○` |
| 60–79 | `●●●●○` |
| 80–100 | `●●●●●` |

As bolinhas usam `--accent`. Score cru aparece pequeno depois (`●●●○○ 78`).

Acessibilidade: as bolinhas levam `aria-label="Prioridade 4 de 5"` no DOM da PrintView (no PDF é só visual).

## 6. Estrutura do documento

### 6.1 Capa (página 1)

```
┌────────────────────────────────────────────────┐
│  ──══════════════════════════════════════──    │ ← filete duplo no topo
│                                                │
│                                                │
│                                                │
│           PGE-RJ · PROCURADOR · 2026           │ ← subtítulo IBM Plex sans uppercase
│                                                │
│           Edital                               │
│           Verticalizado                        │ ← Cormorant italic 64pt, à esquerda
│           ─────────                            │ ← filete burgundy curto
│                                                │
│                                                │
│           Edição do candidato                  │ ← IBM Plex 9pt, gris
│           Gerado em 12 de maio de 2026         │
│                                                │
│           [com priorização] [com legislação]   │ ← chips outline burgundy 9pt
│           [com anotações]   [com checkboxes]   │
│                                                │
│                                                │
│  ──══════════════════════════════════════──    │ ← filete duplo embaixo
└────────────────────────────────────────────────┘
```

- Os chips só aparecem se o toggle correspondente estiver ligado.
- Data formatada por extenso em pt-BR ("12 de maio de 2026").

### 6.2 Sumário (página 2; somente se `disciplinas.length >= 5`)

Linha por disciplina:
```
I · DIREITO CONSTITUCIONAL  ......................  p.3
II · DIREITO ADMINISTRATIVO ......................  p.7
```

- Numeração romana, divisor `·`, leaders pontilhados, número de página em arábico.
- Cormorant Garamond corpo. Sem decorações fora dos leaders.

Se menos de 5 disciplinas, pula sumário (vira ruído).

### 6.3 Páginas de conteúdo

Cada disciplina começa em **página nova** (page-break-before: always; exceto a primeira disciplina, que continua da capa/sumário).

Header de disciplina:
```
                                   ╱
                                  ╱
                                 ╱
       I    │  Direito Constitucional
            │
            ────────────────────────────────────────
```
- Numeral romano grande à esquerda (Cormorant 96pt italic, burgundy 85%).
- Filete vertical fino burgundy 1pt entre numeral e título.
- Filete horizontal fino após o título (largura total, `--rule`).
- Margem inferior 24px antes do primeiro assunto.

Bloco de assunto (com tudo ligado):
```
  □  1. Princípios fundamentais                  ●●●●○ 78
     Soberania, cidadania, dignidade humana
     · Objetivos fundamentais da República
     ──── CF/88, art. 1º a 4º
     ┃ "Aparece em 7 de 8 anos. Tendência ↑."
```
- Checkbox `□` (somente se `mostrarCheckbox`).
- Score em bolinhas + número (somente se `mostrarPriorizacao`).
- Sub-assuntos com bullet `·`, indent 28px.
- Sub-sub (sem bullet, indent 56px, italic gris).
- Leis vinculadas em linha com filete `────` antes (somente se `mostrarLegislacao`).
- Justificativa em italic com filete-marca lateral burgundy (somente se `mostrarPriorizacao`).

Se `mostrarAnotacoes`:
- Espaço mínimo 60px após cada assunto (`min-height` no bloco-assunto).
- 3 linhas pontilhadas (`border-bottom: 0.5pt dotted #C0BBA8`) com 20px de altura entre cada, ocupando esse espaço.
- O espaço conta para paginação (não some no quebra).

### 6.4 Header e footer recorrentes

A partir da página 2:
- **Header**: filete fino (`--rule`, 0.5pt) + "PGE-RJ · PROCURADOR · EDITAL VERTICALIZADO" alinhado à esquerda em IBM Plex Sans 8pt uppercase letter-spacing 0.16em.
- **Footer**: número da página em arábico, Cormorant italic 10pt, centralizado.

Capa não tem header/footer. Sumário tem header mas footer com `ii`.

Implementação em Puppeteer: usar `displayHeaderFooter: true` + `headerTemplate` / `footerTemplate` strings com placeholders `${pageNumber}` / `${totalPages}`. No PrintView (navegador), são divs fixos via `@page` + `position: running()` quando o browser suportar; fallback: aparecem apenas na impressão via classes específicas.

## 7. Toggles e estado da PrintView

| Toggle | Default | Desabilitado quando |
|---|---|---|
| Mostrar priorização | true | `!cargo.priorizacao?.disciplinas?.length` (com tooltip "Análise ainda não foi feita") |
| Mostrar legislação | true | — (sempre habilitado; se não houver leis, o bloco simplesmente não aparece) |
| Espaço para anotações | false | — |
| Checkboxes | true | — |

Bar dos toggles é sticky no topo da PrintView, com fundo `--paper` opaco e sombra suave. Oculto em `@media print`.

Persistência de preferência: **não** nesta fase. A cada visita, defaults acima. Se o usuário pedir, persistimos via localStorage em fase futura.

## 8. Endpoint do backend

### 8.1 Rota

`POST /api/editais/:editalId/cargos/:cargoId/conteudo/pdf` (mergeParams em `cargo.routes.js`).

Middleware: `authenticate` (padrão das outras rotas do módulo).

### 8.2 Body

```json
{
  "mostrarPriorizacao": true,
  "mostrarLegislacao": true,
  "mostrarAnotacoes": false,
  "mostrarCheckbox": true
}
```

Todos opcionais; defaults aplicados na controller:
- Priorização: `true` se cargo tem priorização, `false` caso contrário.
- Legislação: `true`.
- Anotações: `false`.
- Checkbox: `true`.

### 8.3 Resposta

- Status 200, `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="edital-verticalizado-<slug-cargo>-<YYYY-MM-DD>.pdf"`.
- Body: PDF Buffer.
- Erros: 404 se cargo não existe, 403 se usuário não tem acesso ao edital, 500 com mensagem genérica em erro inesperado.

### 8.4 Service

`conteudoPdfService.gerar(cargoId, userId, opts)`:
1. `findCargoById(cargoId, userId)` (já existe em `cargo.service.js`; valida ownership pelo userId internamente).
2. `buildConteudoVerticalHtml(cargo, opts)` → string HTML completo (`<!DOCTYPE html>...`).
3. `htmlToPdf(html)` (já existe em `utils/pdfGenerator.js`). Sobrescreve margem A4 padrão se necessário — vamos passar margem como parâmetro (ver §9).
4. Retorna Buffer.

### 8.5 Template HTML

Arquivo único `conteudo-pdf.service.js`, função pura `buildConteudoVerticalHtml(cargo, opts)`. Estrutura:

```js
function buildConteudoVerticalHtml(cargo, opts) {
  const { mostrarPriorizacao, mostrarLegislacao, mostrarAnotacoes, mostrarCheckbox } = opts
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
  <style>${CSS_TEMPLATE}</style>
</head>
<body>
  ${renderCapa(cargo, opts)}
  ${disciplinas.length >= 5 ? renderSumario(cargo) : ''}
  ${renderConteudo(cargo, opts)}
</body>
</html>`
}
```

`CSS_TEMPLATE` é uma constante no mesmo arquivo (~150 linhas), contendo `@page`, tipografia, paginação, etc.

`renderCapa`, `renderSumario`, `renderConteudo`, `renderDisciplina`, `renderAssunto`, `renderSubAssunto` — funções puras que retornam strings de HTML. Escape obrigatório via `escapeHtml(str)` helper local para evitar XSS no PDF (qualquer string vinda de banco passa por ele).

## 9. Paginação, viúvas e órfãs

Regras CSS aplicadas tanto na PrintView (`@media print`) quanto no HTML do backend (sempre ativas, já que o backend renderiza pra PDF):

```css
@page { size: A4; margin: 22mm 20mm 22mm 20mm; }

.capa            { page-break-after: always; }
.sumario         { page-break-after: always; }
.disciplina      { page-break-before: always; }
.disciplina:first-of-type { page-break-before: avoid; } /* primeira disciplina não fura após capa */
.disciplina__header { page-break-after: avoid; }
.assunto-bloco   { page-break-inside: avoid; }
.justificativa   { page-break-inside: avoid; orphans: 2; widows: 2; }
.lei-tag         { page-break-inside: avoid; }
p, li            { orphans: 3; widows: 3; }
```

Notas:
- `page-break-inside: avoid` é uma sugestão, não garantia — funciona desde que o bloco caiba em uma página. Para blocos enormes (assunto com 30 sub-assuntos), o navegador/Puppeteer fará quebra natural; o `orphans: 3; widows: 3` mitiga.
- Puppeteer respeita essas regras na geração PDF (testado em prática nas outras rotas do projeto).
- Header/footer recorrentes via `displayHeaderFooter: true` no `page.pdf()` — requer ajuste em `htmlToPdf` para receber opções de header/footer (ver §10).

## 10. Ajuste no `htmlToPdf` utility

Hoje `htmlToPdf(html)` é fixa. Refatorar para `htmlToPdf(html, opts = {})` onde opts inclui:

```js
{
  margin: { top, right, bottom, left }, // default mantido para retro-compatibilidade
  displayHeaderFooter: false,
  headerTemplate: '',
  footerTemplate: '',
}
```

A chamada de `focoPDF` continua usando defaults (compatibilidade preservada). O service novo passa header/footer customizados.

## 11. Tratamento de erros

Frontend:
- Botão "Baixar PDF" desabilitado durante request, com spinner.
- Erro de rede → toast "Não foi possível gerar o PDF. Tente novamente." (usa o sistema de toast já existente no app, se houver; se não, alert).
- Timeout > 30s → cancela e mostra mesma mensagem.

Backend:
- Cargo sem disciplinas → 422 "Cargo sem conteúdo programático estruturado".
- Puppeteer falha → log com `cargoId` + erro → 500 genérico.
- Browser singleton já recriado pelo `pdfGenerator.js` quando crasha.

## 12. Acessibilidade (PrintView no navegador)

- Estrutura semântica: `<main>`, `<section class="disciplina">`, `<h1>`, `<h2>`, etc.
- Checkboxes `<input type="checkbox" disabled aria-label="Marcar como estudado: <nome>">` (são só visuais, não funcionais — não persistem estado).
- Score em bolinhas com `aria-label` traduzindo nº de bolinhas.
- Toggle bar com `role="toolbar"` e labels claras.
- Contraste: paper #FAF7F0 vs ink #1A1A1A passa AAA (ratio 14:1).

## 13. Telemetria/log

Backend: log a cada PDF gerado com `cargoId`, `userId`, `opts`, tempo total. Útil para entender adoção e ajustar performance.

Frontend: opcional — se houver wrapper de eventos no app, dispara `edital_pdf_gerado` com flags. Se não, pula nesta fase.

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Google Fonts lento → PDF sem a fonte | `htmlToPdf` já espera `document.fonts.ready` com timeout 2s; em fallback usa serif/sans-serif do sistema. Aceitável. |
| Cargo com 50+ disciplinas → PDF gigante | Sem limite explícito; A4 lida bem. Se virar problema, paginar download em ZIP. Fora de escopo agora. |
| CSS de paginação divergir entre PrintView e backend | Ambos partilham as **mesmas regras conceituais** documentadas aqui na §9. Code review checa em ambos. |
| Usuário tenta imprimir cargo sem priorização com toggle ON | Toggle desabilitado no front; se vier no body do POST mesmo assim, backend ignora silenciosamente e gera sem priorização. |
| XSS via nome de disciplina/assunto malicioso | `escapeHtml` em todo string vinda de DB no template do backend. PrintView usa interpolação Vue (auto-escape). |

## 15. Plano de rollout

Sem feature flag. Mudanças são aditivas (botão novo, rota nova, endpoint novo). Deploy em janela normal. Se houver problema, reverter commit do botão na CargoConteudoView é suficiente para ocultar o feature.

## 16. Fora de escopo (futuro)

- Persistência das preferências de toggle.
- Salvar PDFs gerados no DB para reuso/cache.
- Modo "papel-economia" (preto-e-branco, sem cor, fonte do sistema) para impressoras a laser modestas.
- Compartilhamento direto via link do PDF (sem necessidade de download).
- Marca d'água com nome do usuário ("Edição do candidato — Fulano Silva") com opção de remover.
- Exportar em DOCX para edição offline.
