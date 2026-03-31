/**
 * Faz o parse de uma string de artigos para array de números.
 * Suporta:
 *   "1 a 5"         → [1,2,3,4,5]
 *   "45"            → [45]
 *   "1 a 5, 45"     → [1,2,3,4,5,45]
 *   "1-5"           → [1,2,3,4,5]
 *   "1ao5"          → [1,2,3,4,5]
 *   "1, 2, 3"       → [1,2,3]
 * @param {string} raw
 * @returns {{ resolved: number[], error: string|null }}
 */
export function parseArticles(raw) {
  if (!raw?.trim()) return { resolved: [], error: null }

  const resolved = new Set()
  // Normaliza separadores de intervalo
  const normalized = raw
    .replace(/\bao?\b/gi, '-')   // "a" ou "ao" → "-"
    .replace(/\s*-\s*/g, '-')    // espaços ao redor do traço

  // Separa por vírgula ou ponto-e-vírgula
  const parts = normalized.split(/[,;]/).map(p => p.trim()).filter(Boolean)

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr)
      const end = parseInt(endStr)

      if (isNaN(start) || isNaN(end)) {
        return { resolved: [], error: `Intervalo inválido: "${part}"` }
      }
      if (start > end) {
        return { resolved: [], error: `Início maior que fim: "${part}"` }
      }
      for (let i = start; i <= end; i++) resolved.add(i)
    } else {
      const num = parseInt(part)
      if (isNaN(num)) {
        return { resolved: [], error: `Artigo inválido: "${part}"` }
      }
      resolved.add(num)
    }
  }

  return {
    resolved: [...resolved].sort((a, b) => a - b),
    error: null
  }
}

/**
 * Formata o array resolvido de volta para exibição legível.
 * [1,2,3,4,5,45] → "Art. 1–5, 45"
 * @param {number[]} nums
 * @returns {string}
 */
export function formatArticles(nums) {
  if (!nums?.length) return ''

  const sorted = [...nums].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i]
    if (curr === prev + 1) {
      prev = curr
    } else {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`)
      start = curr
      prev = curr
    }
  }

  return 'Art. ' + ranges.join(', ')
}