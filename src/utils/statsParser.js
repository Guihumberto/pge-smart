/**
 * Parser de estatísticas de questões por disciplina/assunto/sub-assunto.
 *
 * Suporta dois formatos de entrada:
 * 1. HTML (copiado do inspect element) — detectado automaticamente
 * 2. Texto bruto (pares de linhas: nome + contagem)
 */

const COUNT_REGEX = /^\s*(\d+)\s*\((\d+[.,]\d+)%\)\s*$/
const COUNT_INLINE_REGEX = /(\d+)\s*\((\d+[.,]\d+)%\)/

/**
 * Parseia texto bruto ou HTML em estrutura hierárquica.
 * Detecta automaticamente se a entrada é HTML.
 * @param {string} texto
 * @returns {{ disciplinas: Array }}
 */
export function parseEstatisticas(texto) {
  if (/<li[\s>]/.test(texto) || /<span[\s>]/.test(texto) || /assunto-nome/.test(texto)) {
    return parseHtml(texto)
  }
  return parseTexto(texto)
}

/**
 * Detecta o ano da prova no conteúdo colado. Estratégia conservadora:
 * - HTML: procura em <h1>/<h2>/<title> ou no texto antes do primeiro <ul>
 * - Texto puro: procura nas primeiras 200 chars
 * - Aceita apenas anos no formato 20XX
 * - Retorna null se houver múltiplos anos distintos no espaço de busca
 *
 * @param {string} texto
 * @returns {number | null}
 */
export function detectYear(texto) {
  if (!texto || typeof texto !== 'string') return null

  let searchSpace = ''
  const isHtml = /<li[\s>]/.test(texto) || /<span[\s>]/.test(texto) || /assunto-nome/.test(texto)

  if (isHtml) {
    const headerMatch = texto.match(/<(h1|h2|title)[^>]*>([\s\S]*?)<\/\1>/i)
    if (headerMatch) {
      searchSpace = headerMatch[2]
    } else {
      const ulIdx = texto.search(/<ul[\s>]/i)
      searchSpace = ulIdx > 0 ? texto.slice(0, ulIdx) : texto.slice(0, 200)
    }
  } else {
    searchSpace = texto.slice(0, 200)
  }

  const matches = [...searchSpace.matchAll(/\b(20\d{2})\b/g)].map((m) => m[1])
  const distinct = [...new Set(matches)]

  if (distinct.length === 1) return parseInt(distinct[0], 10)
  return null
}

// ── Helpers de DOM ───────────────────────────────────────────────────────────

function directChildren(el, predicate) {
  if (!el) return []
  return Array.from(el.children).filter(predicate)
}

function firstDirectChild(el, predicate) {
  if (!el) return null
  for (const c of el.children) {
    if (predicate(c)) return c
  }
  return null
}

// ── Parser HTML (do inspect element) ─────────────────────────────────────────

function parseHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.querySelector('div')
  if (!root) return { disciplinas: [] }

  // Caminho 1: usuário colou os <li> diretamente
  let topLis = directChildren(root, (c) => c.tagName === 'LI')

  // Caminho 5 (novo): usuário colou um <ul> wrapper — pega <li> diretos do primeiro <ul>
  if (!topLis.length) {
    const rootUl = firstDirectChild(root, (c) => c.tagName === 'UL')
    if (rootUl) topLis = directChildren(rootUl, (c) => c.tagName === 'LI')
  }

  if (topLis.length) {
    return { disciplinas: topLis.map((li) => parseLiNode(li, 0)).filter(Boolean) }
  }

  // Caminho 2: fallback por profundidade (sem aninhamento direto reconhecível)
  const allLis = root.querySelectorAll('li')
  if (!allLis.length) return { disciplinas: [] }
  return parseAllLisByDepth(root)
}

function parseLiNode(li, depth) {
  const div = firstDirectChild(li, (c) => c.matches('div.assunto'))
  if (!div) return null

  const nomeEl = div.querySelector('span.assunto-nome-conteudo')
  const countEl = div.querySelector('span.indice-porcentagem')

  const nome = nomeEl?.textContent?.trim() || ''
  if (!nome) return null

  const countText = countEl?.textContent?.trim() || ''
  const countMatch = countText.match(COUNT_INLINE_REGEX)
  const qtd = countMatch ? parseInt(countMatch[1]) : 0
  const pct = countMatch ? parseFloat(countMatch[2].replace(',', '.')) : 0

  const childUl = firstDirectChild(li, (c) => c.tagName === 'UL')
  const childLis = childUl ? directChildren(childUl, (c) => c.tagName === 'LI') : []

  if (depth === 0) {
    const assuntos = []
    for (const childLi of childLis) {
      const assunto = parseLiNode(childLi, 1)
      if (assunto) assuntos.push(assunto)
    }
    return { nome, qtd, pct, assuntos }
  } else if (depth === 1) {
    const sub_assuntos = []
    for (const childLi of childLis) {
      const sub = parseLiNode(childLi, 2)
      if (sub) sub_assuntos.push(sub)
    }
    return { nome, qtd, pct, sub_assuntos }
  } else {
    return { nome, qtd, pct }
  }
}

function parseAllLisByDepth(root) {
  // Calcula profundidade de cada <li> contando ancestrais <ul>
  const allLis = root.querySelectorAll('li')
  const items = []

  for (const li of allLis) {
    const div = firstDirectChild(li, (c) => c.matches('div.assunto'))
    if (!div) continue

    const nomeEl = div.querySelector('span.assunto-nome-conteudo')
    const countEl = div.querySelector('span.indice-porcentagem')
    const nome = nomeEl?.textContent?.trim() || ''
    if (!nome) continue

    const countText = countEl?.textContent?.trim() || ''
    const countMatch = countText.match(COUNT_INLINE_REGEX)

    let depth = 0
    let parent = li.parentElement
    while (parent && parent !== root) {
      if (parent.tagName === 'UL') depth++
      parent = parent.parentElement
    }

    items.push({
      nome,
      qtd: countMatch ? parseInt(countMatch[1]) : 0,
      pct: countMatch ? parseFloat(countMatch[2].replace(',', '.')) : 0,
      depth: Math.max(0, depth - 1),
    })
  }

  return buildFromDepthItems(items)
}

function buildFromDepthItems(items) {
  const disciplinas = []
  let discAtual = null
  let assuntoAtual = null

  for (const item of items) {
    if (item.depth === 0) {
      if (discAtual) disciplinas.push(discAtual)
      discAtual = { nome: item.nome, qtd: item.qtd, pct: item.pct, assuntos: [] }
      assuntoAtual = null
    } else if (item.depth === 1 && discAtual) {
      assuntoAtual = { nome: item.nome, qtd: item.qtd, pct: item.pct, sub_assuntos: [] }
      discAtual.assuntos.push(assuntoAtual)
    } else if (item.depth >= 2 && assuntoAtual) {
      assuntoAtual.sub_assuntos.push({ nome: item.nome, qtd: item.qtd, pct: item.pct })
    }
  }

  if (discAtual) disciplinas.push(discAtual)
  return { disciplinas }
}

// ── Parser Texto (formato pares de linhas) ───────────────────────────────────

function parseTexto(texto) {
  const linhas = texto.split('\n').map((l) => l.trimEnd())

  const itens = []
  let i = 0
  while (i < linhas.length) {
    const linha = linhas[i].trim()
    if (!linha) {
      i++
      continue
    }

    const proxima = linhas[i + 1]?.trim() || ''
    const countMatch = proxima.match(COUNT_REGEX)

    if (countMatch) {
      const indent = linhas[i].match(/^(\s*)/)[1].length

      itens.push({
        nome: linha,
        qtd: parseInt(countMatch[1]),
        pct: parseFloat(countMatch[2].replace(',', '.')),
        indent,
      })
      i += 2
    } else {
      if (COUNT_REGEX.test(linha)) {
        i++
        continue
      }
      const indent = linhas[i].match(/^(\s*)/)[1].length
      itens.push({ nome: linha, qtd: 0, pct: 0, indent })
      i++
    }
  }

  if (!itens.length) return { disciplinas: [] }

  return buildHierarchy(itens)
}

function buildHierarchy(itens) {
  const indents = [...new Set(itens.map((i) => i.indent))].sort((a, b) => a - b)
  const usaIndent = indents.length >= 2

  if (usaIndent) {
    return buildByIndent(itens, indents)
  }

  return buildBySums(itens)
}

function buildByIndent(itens, indentLevels) {
  const levelMap = {}
  indentLevels.forEach((indent, idx) => {
    levelMap[indent] = Math.min(idx, 2)
  })

  const disciplinas = []
  let discAtual = null
  let assuntoAtual = null

  for (const item of itens) {
    const nivel = levelMap[item.indent] ?? 0

    if (nivel === 0) {
      if (discAtual) disciplinas.push(discAtual)
      discAtual = { nome: item.nome, qtd: item.qtd, pct: item.pct, assuntos: [] }
      assuntoAtual = null
    } else if (nivel === 1 && discAtual) {
      assuntoAtual = { nome: item.nome, qtd: item.qtd, pct: item.pct, sub_assuntos: [] }
      discAtual.assuntos.push(assuntoAtual)
    } else if (nivel >= 2 && assuntoAtual) {
      assuntoAtual.sub_assuntos.push({ nome: item.nome, qtd: item.qtd, pct: item.pct })
    } else if (discAtual) {
      assuntoAtual = { nome: item.nome, qtd: item.qtd, pct: item.pct, sub_assuntos: [] }
      discAtual.assuntos.push(assuntoAtual)
    }
  }

  if (discAtual) disciplinas.push(discAtual)
  return { disciplinas }
}

function buildBySums(itens) {
  const disciplinas = []
  let i = 0

  while (i < itens.length) {
    const item = itens[i]

    let soma = 0
    let j = i + 1
    while (j < itens.length && soma < item.qtd) {
      soma += itens[j].qtd
      j++
    }

    const ehDisciplina = soma > 0 && Math.abs(soma - item.qtd) <= 2

    if (ehDisciplina) {
      const disc = { nome: item.nome, qtd: item.qtd, pct: item.pct, assuntos: [] }

      const filhos = itens.slice(i + 1, j)
      let fi = 0
      while (fi < filhos.length) {
        const filho = filhos[fi]

        let somaFilho = 0
        let fj = fi + 1
        while (fj < filhos.length && somaFilho < filho.qtd) {
          somaFilho += filhos[fj].qtd
          fj++
        }

        const ehAssunto = somaFilho > 0 && Math.abs(somaFilho - filho.qtd) <= 1

        if (ehAssunto) {
          const assunto = { nome: filho.nome, qtd: filho.qtd, pct: filho.pct, sub_assuntos: [] }
          for (let k = fi + 1; k < fj; k++) {
            assunto.sub_assuntos.push({ nome: filhos[k].nome, qtd: filhos[k].qtd, pct: filhos[k].pct })
          }
          disc.assuntos.push(assunto)
          fi = fj
        } else {
          disc.assuntos.push({ nome: filho.nome, qtd: filho.qtd, pct: filho.pct, sub_assuntos: [] })
          fi++
        }
      }

      disciplinas.push(disc)
      i = j
    } else {
      disciplinas.push({ nome: item.nome, qtd: item.qtd, pct: item.pct, assuntos: [] })
      i++
    }
  }

  return { disciplinas }
}
