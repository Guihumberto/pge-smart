/**
 * Análise de tendência via regressão linear.
 *
 * Substitui o cálculo de delta primeiro/último ano (que era enviesado por outliers
 * e não distinguia ruído de sinal) por slope + R² com filtros de qualificação.
 *
 * Spec: docs/superpowers/specs/2026-05-07-tendencias-regressao-linear-design.md
 */

export const DEFAULT_THRESHOLDS = Object.freeze({
  minAnosQtdPositiva: 3, // ≥3 anos com qtd>0 — abaixo disso não dá pra avaliar linearidade
  minQtdMaxAbsoluta: 3,  // ≥1 ano com qtd absoluta ≥3 — filtro de ruído puro (calibrado em 2026-05-07)
  minR2: 0.5,            // R² ≥0.5 — reta tem que explicar pelo menos metade da variância
  minSlopeAbs: 0.3,      // |slope| ≥0.3pp/ano — abaixo é imperceptível pra estudo
})

/**
 * Calcula regressão linear sobre pares (ano, pct).
 *
 * @param {Object<number|string, number>} yearMap mapa ano → pct (e.g., { 2022: 4.0, 2023: 5.5 })
 * @returns {{ slope: number, r2: number, intercept: number, points: Array<[number, number]> }}
 *   slope em pp/ano. r2 entre 0 e 1.
 *   Casos especiais:
 *     - n < 2 → slope=0, r2=0, intercept=ponto único ou 0
 *     - todos os x iguais (denom=0) → slope=0, r2=0, intercept=meanY
 *     - todos os y iguais (ssTot=0) → slope=0, r2=1, intercept=meanY (reta horizontal perfeita)
 */
export function calculateTrend(yearMap) {
  const points = Object.entries(yearMap || {})
    .map(([year, pct]) => [Number(year), pct == null ? NaN : Number(pct)])
    .filter(([y, p]) => Number.isFinite(y) && Number.isFinite(p))
    .sort((a, b) => a[0] - b[0])

  const n = points.length
  if (n < 2) {
    return {
      slope: 0,
      r2: 0,
      intercept: n === 1 ? points[0][1] : 0,
      points,
    }
  }

  const sumX = points.reduce((s, [x]) => s + x, 0)
  const sumY = points.reduce((s, [, y]) => s + y, 0)
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0)
  const sumXX = points.reduce((s, [x]) => s + x * x, 0)
  const meanY = sumY / n

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) {
    // Todos os x iguais — caso degenerado (não deve ocorrer com anos únicos)
    return { slope: 0, r2: 0, intercept: meanY, points }
  }

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² (coeficiente de determinação)
  const ssTot = points.reduce((s, [, y]) => s + (y - meanY) ** 2, 0)
  if (ssTot === 0) {
    // Todos os y iguais — reta horizontal perfeita; slope será 0 também
    return { slope: 0, r2: 1, intercept: meanY, points }
  }

  const ssRes = points.reduce((s, [x, y]) => {
    const yPred = slope * x + intercept
    return s + (y - yPred) ** 2
  }, 0)
  const r2 = 1 - ssRes / ssTot

  return { slope, r2, intercept, points }
}

/**
 * Aplica filtros de qualificação. Item que reprovar em qualquer um fica fora do ranking.
 *
 * IMPORTANTE: `stats.n` aqui é "número de anos com qtd > 0" — diferente do `points.length`
 * retornado por `calculateTrend` (que é "número de anos com pct válido no input").
 * Quem chama `qualifies` precisa contar `n` separadamente a partir dos dados originais.
 * Em `buildTrendRanking` (Fase 2), `n = anos.filter(a => porAno[a].qtd > 0).length`.
 *
 * @param {Object} stats estatísticas calculadas do item
 * @param {number} stats.slope pp/ano
 * @param {number} stats.r2 0..1
 * @param {number} stats.n número de anos com qtd>0
 * @param {number} stats.qtdMax maior qtd absoluta entre os anos
 * @param {Object} [thresholds] override dos defaults (mescla com DEFAULT_THRESHOLDS)
 * @returns {boolean}
 */
/**
 * Identifica o primeiro motivo pelo qual `stats` falha nos thresholds.
 * Retorna null se passa em todos.
 *
 * Códigos retornados (ordem de prioridade):
 *   'poucosAnos'  → n < minAnosQtdPositiva
 *   'qtdBaixa'    → qtdMax < minQtdMaxAbsoluta
 *   'r2Baixo'     → r2 < minR2
 *   'slopeBaixo'  → |slope| < minSlopeAbs
 *
 * Útil pra debugging/calibração: o consumer pode contar quantos itens caíram em cada
 * filtro e decidir qual threshold ajustar empiricamente.
 *
 * @returns {null | 'poucosAnos' | 'qtdBaixa' | 'r2Baixo' | 'slopeBaixo'}
 */
export function qualifyReason(stats, thresholds = DEFAULT_THRESHOLDS) {
  if (!stats) return 'poucosAnos'
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds }
  if (!Number.isFinite(stats.n) || stats.n < t.minAnosQtdPositiva) return 'poucosAnos'
  if (!Number.isFinite(stats.qtdMax) || stats.qtdMax < t.minQtdMaxAbsoluta) return 'qtdBaixa'
  if (!Number.isFinite(stats.r2) || stats.r2 < t.minR2) return 'r2Baixo'
  if (!Number.isFinite(stats.slope) || Math.abs(stats.slope) < t.minSlopeAbs) return 'slopeBaixo'
  return null
}

export function qualifies(stats, thresholds = DEFAULT_THRESHOLDS) {
  return qualifyReason(stats, thresholds) === null
}

/**
 * Pipeline completo: filtra dataset, monta hierarquia, calcula tendências, ranqueia.
 *
 * Sem filtro `disciplina` → ranking de assuntos (chave "Disc → Ass").
 * Com filtro `disciplina` → ranking de assuntos + sub-assuntos da disciplina.
 *
 * Mapas auxiliares (disciplinasMap/assuntosMap/subAssuntosMap) carregam pct por ano,
 * consumidos pelos gráficos chartjs (formato compatível com trendData atual).
 *
 * @param {Array} estatisticas array do store de estatísticas
 * @param {Object} [options]
 * @param {string} [options.banca]
 * @param {string} [options.area] string vazia ou ausente conta como "área não informada"
 * @param {string} [options.disciplina]
 * @param {Object} [options.thresholds] override de DEFAULT_THRESHOLDS
 * @param {number} [options.maxItems=15]
 */
export function buildTrendRanking(estatisticas, options = {}) {
  const {
    banca,
    area,
    disciplina,
    thresholds = DEFAULT_THRESHOLDS,
    maxItems = 15,
  } = options

  // 1. Filtrar dataset por banca/área.
  // Nota: `area` falsy (undefined/null/'') é tratado como "sem filtro de área", alinhado com
  // a UI atual (`if (filtro.value.area && ...)`). Quem precisar distinguir "área vazia" de
  // "todas as áreas" deve passar um sentinel diferente — fora do escopo do MVP.
  const filtradas = (estatisticas || []).filter((e) => {
    if (!e || !e.dados || !Array.isArray(e.dados.disciplinas)) return false
    if (banca && e.banca !== banca) return false
    if (area && (e.area || '') !== area) return false
    return true
  })

  // 2. Anos únicos no dataset filtrado, ordenados ascendente
  const anos = [...new Set(filtradas.map((e) => e.ano))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  if (anos.length === 0) {
    return {
      anos: [], subindo: [], descendo: [], total: 0, descartados: 0,
      disciplinasMap: {}, assuntosMap: {}, subAssuntosMap: {},
    }
  }

  // 3. Hierarquia: discRaw[disc.nome][ano] = {qtd, pct}
  //                assRaw["disc → ass"][ano] = {qtd, pct} + .__disc
  //                subRaw["disc → ass → sub"][ano] = {qtd, pct} + .__disc + .__assunto
  //
  // Performance: tripla aninhada O(estatisticas × disciplinas × assuntos × sub_assuntos).
  // Para datasets típicos (≤200 docs × ~10 disciplinas × ~50 assuntos × ~5 subs)
  // fica em torno de 1M ops simples — sem problema. Datasets monstruosos podem precisar
  // de cache ou indexação no sub-projeto 2.
  //
  // Coerção numérica explícita em qtd/pct para tolerar dados legados que vieram como string.
  const discRaw = {}
  const assRaw = {}
  const subRaw = {}

  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  for (const est of filtradas) {
    for (const disc of est.dados.disciplinas || []) {
      if (!disc || !disc.nome) continue
      const dKey = disc.nome
      if (!discRaw[dKey]) discRaw[dKey] = {}
      discRaw[dKey][est.ano] = { qtd: num(disc.qtd), pct: num(disc.pct) }

      for (const ass of disc.assuntos || []) {
        if (!ass || !ass.nome) continue
        const aKey = `${disc.nome} → ${ass.nome}`
        if (!assRaw[aKey]) assRaw[aKey] = { __disc: disc.nome }
        assRaw[aKey][est.ano] = { qtd: num(ass.qtd), pct: num(ass.pct) }

        for (const sub of ass.sub_assuntos || []) {
          if (!sub || !sub.nome) continue
          const sKey = `${disc.nome} → ${ass.nome} → ${sub.nome}`
          if (!subRaw[sKey]) subRaw[sKey] = { __disc: disc.nome, __assunto: ass.nome }
          subRaw[sKey][est.ano] = { qtd: num(sub.qtd), pct: num(sub.pct) }
        }
      }
    }
  }

  // 4. Selecionar candidatos para o ranking
  const candidatos = []
  if (disciplina) {
    // Assuntos + sub-assuntos da disciplina selecionada
    for (const [key, val] of Object.entries(assRaw)) {
      if (val.__disc === disciplina) candidatos.push({ nome: key, dados: val, disc: val.__disc })
    }
    for (const [key, val] of Object.entries(subRaw)) {
      if (val.__disc === disciplina) candidatos.push({ nome: key, dados: val, disc: val.__disc })
    }
  } else {
    // Assuntos de todas as disciplinas
    for (const [key, val] of Object.entries(assRaw)) {
      candidatos.push({ nome: key, dados: val, disc: val.__disc })
    }
  }

  // 5. Calcular tendência + aplicar qualifies. Conta descartes por motivo (debug/calibração).
  const tendencias = []
  const descartados = { total: 0, poucosAnos: 0, qtdBaixa: 0, r2Baixo: 0, slopeBaixo: 0 }

  for (const cand of candidatos) {
    const porAno = {}
    const pctMap = {}
    let qtdMax = 0
    let n = 0
    for (const ano of anos) {
      const d = cand.dados[ano]
      const qtd = d?.qtd || 0
      const pct = d?.pct || 0
      porAno[ano] = { qtd, pct }
      pctMap[ano] = pct
      if (qtd > 0) n++
      if (qtd > qtdMax) qtdMax = qtd
    }

    const { slope, r2 } = calculateTrend(pctMap)
    const motivo = qualifyReason({ slope, r2, n, qtdMax }, thresholds)

    if (motivo) {
      descartados.total++
      descartados[motivo]++
      continue
    }

    const primeiroAno = anos[0]
    const ultimoAno = anos[anos.length - 1]

    tendencias.push({
      nome: cand.nome,
      disc: cand.disc,
      slope,
      r2,
      n,
      qtdMax,
      primeiroPct: porAno[primeiroAno].pct,
      ultimoPct: porAno[ultimoAno].pct,
      acumulado: slope * (ultimoAno - primeiroAno),
      porAno,
    })
  }

  // 6. Ranquear top maxItems em cada lista, ordenadas por |slope| descendente
  const subindo = tendencias
    .filter((t) => t.slope > 0)
    .sort((a, b) => b.slope - a.slope)
    .slice(0, maxItems)

  const descendo = tendencias
    .filter((t) => t.slope < 0)
    .sort((a, b) => a.slope - b.slope) // mais negativo primeiro
    .slice(0, maxItems)

  // 7. Construir mapas auxiliares pct-only para charts (compat com trendData atual).
  //
  // Contrato: chaves do mapa interno são strings de ano (ex: "2022", "2023") + metadados
  // textuais ("disc", "assunto"). Charts iteram via Object.entries e distinguem ano de
  // metadado por nome ou usando isNaN. Não adicionar metadado com nome numérico (ex: __1)
  // sob risco de contaminar o filtro do consumer.
  // disciplinasMap[disc][ano] = pct (número direto)
  const disciplinasMap = {}
  for (const [name, byYear] of Object.entries(discRaw)) {
    disciplinasMap[name] = {}
    for (const [ano, val] of Object.entries(byYear)) {
      disciplinasMap[name][ano] = val.pct
    }
  }

  // assuntosMap[key] = { disc, [ano]: pct }
  const assuntosMap = {}
  for (const [key, val] of Object.entries(assRaw)) {
    const m = { disc: val.__disc }
    for (const [k, v] of Object.entries(val)) {
      if (k === '__disc') continue
      m[k] = v.pct
    }
    assuntosMap[key] = m
  }

  // subAssuntosMap[key] = { disc, assunto, [ano]: pct }
  const subAssuntosMap = {}
  for (const [key, val] of Object.entries(subRaw)) {
    const m = { disc: val.__disc, assunto: val.__assunto }
    for (const [k, v] of Object.entries(val)) {
      if (k === '__disc' || k === '__assunto') continue
      m[k] = v.pct
    }
    subAssuntosMap[key] = m
  }

  return {
    anos,
    subindo,
    descendo,
    total: subindo.length + descendo.length,
    descartados,
    disciplinasMap,
    assuntosMap,
    subAssuntosMap,
  }
}
