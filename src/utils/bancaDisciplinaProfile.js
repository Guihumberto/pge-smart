function filterDocs(estatisticas, banca, area) {
  return estatisticas.filter(e => {
    if (e.banca !== banca) return false
    if (area && (e.area || '') !== area) return false
    return true
  })
}

/**
 * Returns the discipline's presence (pct, qtd) per imported year.
 * Only years with imported data for banca/area appear.
 * presente=false when the discipline wasn't in that year's exam data.
 */
export function getPresencaAnual(estatisticas, { banca, area, disciplina }) {
  const docs = filterDocs(estatisticas, banca, area)
  return docs
    .map(doc => {
      const disc = doc.dados?.disciplinas?.find(d => d.nome === disciplina)
      return { ano: doc.ano, pct: disc?.pct ?? 0, qtd: disc?.qtd ?? 0, presente: !!disc }
    })
    .sort((a, b) => a.ano - b.ano)
}

/**
 * Returns the assunto × year matrix for the heatmap.
 * anos: years with imported data for banca/area (sorted asc).
 *
 * Cell encoding per assunto per ano:
 *   { pct, qtd } → assunto presente naquele ano
 *   0            → disciplina presente mas assunto ausente (zero explícito)
 *   null         → disciplina ausente naquele ano (incerto)
 */
export function getAssuntosMatrix(estatisticas, { banca, area, disciplina }) {
  const docs = filterDocs(estatisticas, banca, area)
  const anos = [...new Set(docs.map(d => d.ano))].sort((a, b) => a - b)

  const assuntoNames = new Set()
  for (const doc of docs) {
    const disc = doc.dados?.disciplinas?.find(d => d.nome === disciplina)
    if (!disc) continue
    for (const ass of disc.assuntos || []) assuntoNames.add(ass.nome)
  }

  const assuntos = [...assuntoNames].map(nome => {
    const porAno = {}
    for (const doc of docs) {
      const disc = doc.dados?.disciplinas?.find(d => d.nome === disciplina)
      if (!disc) {
        porAno[doc.ano] = null
      } else {
        const ass = disc.assuntos?.find(a => a.nome === nome)
        porAno[doc.ano] = ass ? { pct: ass.pct, qtd: ass.qtd } : 0
      }
    }
    const vals = Object.values(porAno).filter(v => v !== null && v !== 0).map(v => v.pct)
    const media = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    return { nome, porAno, media }
  }).sort((a, b) => b.media - a.media)

  return { assuntos, anos }
}

/**
 * Calculates Pareto data: assuntos sorted by cumulative qtd across all years.
 * Returns items with individual pct and cumulative pct.
 */
export function calcPareto(estatisticas, { banca, area, disciplina }) {
  const docs = filterDocs(estatisticas, banca, area)
  const totals = {}
  let grandTotal = 0

  for (const doc of docs) {
    const disc = doc.dados?.disciplinas?.find(d => d.nome === disciplina)
    if (!disc) continue
    for (const ass of disc.assuntos || []) {
      totals[ass.nome] = (totals[ass.nome] || 0) + ass.qtd
      grandTotal += ass.qtd
    }
  }

  if (!grandTotal) return []

  const sorted = Object.entries(totals)
    .map(([nome, qtd]) => ({ nome, qtd, pct: parseFloat(((qtd / grandTotal) * 100).toFixed(1)) }))
    .sort((a, b) => b.qtd - a.qtd)

  let cumulative = 0
  return sorted.map(item => {
    cumulative += item.pct
    return { ...item, cumulativo: parseFloat(Math.min(100, cumulative).toFixed(1)) }
  })
}

/** Shannon entropy of the assunto distribution (lower = more concentrated). */
export function calcEntropia(items) {
  const total = items.reduce((s, i) => s + i.qtd, 0)
  if (!total || items.length <= 1) return 0
  return -items.reduce((s, i) => {
    const p = i.qtd / total
    return p > 0 ? s + p * Math.log2(p) : s
  }, 0)
}

/** Human-readable label for the entropy level relative to maximum possible. */
export function entropiaLabel(H, n) {
  if (n <= 1) return { nivel: 'indefinido', desc: 'Apenas 1 assunto detectado' }
  const ratio = H / Math.log2(n)
  if (ratio < 0.4) return { nivel: 'baixa', desc: 'Programa concentrado — poucos assuntos dominam a disciplina' }
  if (ratio < 0.7) return { nivel: 'média', desc: 'Programa moderado — distribuição equilibrada entre assuntos' }
  return { nivel: 'alta', desc: 'Programa amplo — muitos assuntos com peso similar, difícil prever' }
}

/** Ponto de 80% da curva de Pareto: índice do primeiro item que ultrapassa 80% acumulado. */
export function paretoCut80(items) {
  for (let i = 0; i < items.length; i++) {
    if (items[i].cumulativo >= 80) return i + 1
  }
  return items.length
}
