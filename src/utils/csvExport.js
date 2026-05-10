/**
 * Helpers de exportação CSV pra aba Análise.
 *
 * Formato exigido pela spec §9.2 (analise-recorrencia-design):
 *   - UTF-8 com BOM (Excel-friendly)
 *   - Headers: Nome,Recorrencia,VolumeMedio,VolumeTotal,PctMedio,Slope,R2,N,Boosted
 *   - Filename: analise-{banca}-{area}-{YYYYMMDD}.csv
 */

/**
 * Sanitiza prefixos perigosos contra CSV/Formula injection (Excel/LibreOffice/Numbers
 * executam fórmulas em células que começam com `=`, `+`, `-`, `@`, TAB ou CR).
 * Prefixar com aspa simples força tratamento como texto. OWASP recomenda esse padrão.
 *
 * Texto vindo do mentor (ex: nomes de assuntos parseados de QConcursos) NÃO deveria
 * conter fórmulas, mas defesa em profundidade vale: dataset adversarial poderia
 * injetar `=cmd|...` num nome de assunto e atacar quem abrisse o CSV.
 */
export function sanitizeFormulaPrefix(s) {
  if (s == null) return ''
  const str = String(s)
  if (str.length === 0) return str
  if (/^[=+\-@\t\r]/.test(str)) return `'${str}`
  return str
}

/** Escapa um valor pra célula CSV. Aspas duplas internas viram "" (RFC 4180). */
export function csvEscape(value) {
  if (value == null) return ''
  let s = sanitizeFormulaPrefix(value)
  // Vírgula, aspas duplas, quebra de linha — qualquer um exige aspas
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const HEADERS = ['Nome', 'Recorrencia', 'Recencia', 'VolumeMedio', 'VolumeTotal', 'PctMedio', 'Slope', 'R2', 'N', 'Boosted']

/** Formata um item da Análise como linha CSV. */
function itemToRow(item) {
  return [
    csvEscape(item.caminhoCompleto),
    Math.round(item.recorrencia),
    item.recencia == null ? '' : Math.round(item.recencia),
    Number(item.volumeMedio).toFixed(1),
    item.volumeTotal,
    Number(item.pctMedio).toFixed(1),
    item.slope == null ? '' : Number(item.slope).toFixed(2),
    item.r2 == null ? '' : Number(item.r2).toFixed(2),
    item.n,
    csvEscape((item.boostedBy || []).join(', ')),
  ].join(',')
}

/** Constrói o CSV (sem BOM — chamador adiciona). Linhas separadas por \n. */
export function buildCsv(items) {
  const lines = [HEADERS.join(',')]
  for (const item of items || []) lines.push(itemToRow(item))
  return lines.join('\n')
}

/** Nome de arquivo no formato analise-{banca}-{area}-{YYYYMMDD}.csv. */
export function buildCsvFilename(banca, area, date = new Date()) {
  const safe = (s) => (s ? String(s).replace(/[^\w-]+/g, '_') : 'todas')
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `analise-${safe(banca)}-${safe(area)}-${yyyy}${mm}${dd}.csv`
}

/** Dispara o download via Blob + anchor. UTF-8 + BOM (Excel detecta acentos). */
export function downloadCsv(content, filename) {
  const BOM = '﻿'
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
