/**
 * Detecta menções a normas jurídicas brasileiras em textos de assuntos/sub-assuntos.
 * Opera 100% no cliente via regex — sem chamada de rede.
 */

const NORMAS_FIXAS = [
  { id: 'cf88',    nome: 'CF/88',           pattern: /\b(?:CRFB|CF)(?:\/88)?\b/ },
  { id: 'ctn',     nome: 'CTN',             pattern: /\bCTN\b/ },
  { id: 'cc2002',  nome: 'CC/2002',         pattern: /\bCC(?:\/2002)?\b/ },
  { id: 'cpc2015', nome: 'CPC/2015',        pattern: /\bCPC(?:\/2015)?\b/ },
  { id: 'clt',     nome: 'CLT',             pattern: /\bCLT\b/ },
  { id: 'cpp',     nome: 'CPP',             pattern: /\bCPP\b/ },
  { id: 'cp',      nome: 'Cód. Penal',      pattern: /\bCP\b/ },
  { id: 'cdc',     nome: 'CDC',             pattern: /\bCDC\b/ },
  { id: 'eca',     nome: 'ECA',             pattern: /\bECA\b/ },
  { id: 'lrf',     nome: 'LRF',             pattern: /\bLRF\b/ },
  { id: 'loman',   nome: 'LOMAN',           pattern: /\bLOMAN\b/ },
  { id: 'lcp',     nome: 'LCP',             pattern: /\bLCP\b/ },
  { id: 'lei8112', nome: 'Lei 8.112/90',    pattern: /\bLei\s*(?:n[°º.]?\s*)?8\.112\b/i },
  { id: 'lei8429', nome: 'Lei 8.429/92',    pattern: /\bLei\s*(?:n[°º.]?\s*)?8\.429\b/i },
  { id: 'lei8666', nome: 'Lei 8.666/93',    pattern: /\bLei\s*(?:n[°º.]?\s*)?8\.666\b/i },
  { id: 'lei14133',nome: 'Lei 14.133/21',   pattern: /\bLei\s*(?:n[°º.]?\s*)?14\.133\b/i },
  { id: 'lei9784', nome: 'Lei 9.784/99',    pattern: /\bLei\s*(?:n[°º.]?\s*)?9\.784\b/i },
  { id: 'lei9868', nome: 'Lei 9.868/99',    pattern: /\bLei\s*(?:n[°º.]?\s*)?9\.868\b/i },
  { id: 'lei9869', nome: 'Lei 9.869/99',    pattern: /\bLei\s*(?:n[°º.]?\s*)?9\.869\b/i },
  { id: 'lei9870', nome: 'Lei 9.870/99',    pattern: /\bLei\s*(?:n[°º.]?\s*)?9\.870\b/i },
  { id: 'lei101',  nome: 'LC 101/2000',     pattern: /\bLC\s*(?:n[°º.]?\s*)?101\b/i },
  { id: 'lei123',  nome: 'LC 123/2006',     pattern: /\bLC\s*(?:n[°º.]?\s*)?123\b/i },
  { id: 'lei140',  nome: 'LC 140/2011',     pattern: /\bLC\s*(?:n[°º.]?\s*)?140\b/i },
  { id: 'lei87',   nome: 'LC 87/1996',      pattern: /\bLC\s*(?:n[°º.]?\s*)?87\b/i },
]

// Padrões genéricos para leis não cobertas pela lista fixa
const GENERIC_PATTERNS = [
  { re: /\bLei\s+(?:n[°º.]?\s*)?(\d{1,2}\.\d{3}(?:\/\d{2,4})?)\b/gi, prefix: 'Lei' },
  { re: /\bLC\s+(?:n[°º.]?\s*)?(\d{2,3}(?:\/\d{2,4})?)\b/gi,         prefix: 'LC' },
  { re: /\bEC\s+(?:n[°º.]?\s*)?(\d{1,3}(?:\/\d{4})?)\b/gi,            prefix: 'EC' },
  { re: /\bDecreto(?:-Lei)?\s+(?:n[°º.]?\s*)?(\d{3,5}(?:\/\d{2,4})?)\b/gi, prefix: 'Decreto' },
  { re: /\bS[uú]mula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?(\d+)\b/gi,   prefix: 'Súmula' },
]

/**
 * Detecta normas jurídicas nos textos fornecidos.
 * @param {string[]} texts — nomes de assuntos e sub-assuntos
 * @returns {{ id, nome, count, exemplos }[]} ordenado por count desc
 */
export function detectNormas(texts) {
  const mentions = {}

  for (const text of texts) {
    if (!text || typeof text !== 'string') continue

    // Normas fixas (mais precisas, checadas primeiro)
    for (const norma of NORMAS_FIXAS) {
      if (norma.pattern.test(text)) {
        if (!mentions[norma.id]) {
          mentions[norma.id] = { id: norma.id, nome: norma.nome, count: 0, exemplos: [] }
        }
        mentions[norma.id].count++
        if (mentions[norma.id].exemplos.length < 5) {
          mentions[norma.id].exemplos.push(text)
        }
      }
    }

    // Padrões genéricos para leis não cobertas pela lista fixa
    for (const { re, prefix } of GENERIC_PATTERNS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text)) !== null) {
        const nome = `${prefix} ${m[1]}`
        // Pula se já capturada pela lista fixa (evita duplicatas como "LC 101" + "LC 101/2000")
        const jaCapturada = Object.values(mentions).some(v =>
          v.nome.startsWith(prefix) && v.nome.includes(m[1].split('/')[0]),
        )
        if (jaCapturada) continue

        const id = `generic_${prefix.toLowerCase()}_${m[1].replace(/\W/g, '_')}`
        if (!mentions[id]) {
          mentions[id] = { id, nome, count: 0, exemplos: [] }
        }
        mentions[id].count++
        if (mentions[id].exemplos.length < 5) {
          mentions[id].exemplos.push(text)
        }
      }
    }
  }

  return Object.values(mentions).sort((a, b) => b.count - a.count)
}

/**
 * Extrai todos os textos de assuntos e sub-assuntos de uma disciplina
 * em todos os anos disponíveis da banca/área.
 */
export function extractTextsFromDisciplina(estatisticas, { banca, area, disciplina }) {
  const texts = new Set()
  for (const doc of estatisticas) {
    if (doc.banca !== banca) continue
    if (area && (doc.area || '') !== area) continue
    const disc = doc.dados?.disciplinas?.find(d => d.nome === disciplina)
    if (!disc) continue
    for (const ass of disc.assuntos || []) {
      if (ass.nome) texts.add(ass.nome)
      for (const sub of ass.sub_assuntos || []) {
        if (sub.nome) texts.add(sub.nome)
      }
    }
  }
  return [...texts]
}
