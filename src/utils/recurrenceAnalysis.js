/**
 * Análise multi-dimensional pra priorização de assuntos: recorrência + volume + tendência.
 *
 * Reusa engine de regressão linear de `trendAnalysis.js` (calculateTrend) mas mantém
 * CONSTANTES INDEPENDENTES — DEFAULT_PRESETS aqui ≠ DEFAULT_THRESHOLDS de Tendências.
 * Mudar os thresholds de Tendências NÃO deve propagar pra cá. Não compartilhar valores
 * via import direto.
 *
 * Spec: docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md
 */

import { calculateTrend } from './trendAnalysis'

export const DEFAULT_PRESETS = Object.freeze({
  conservador: { recorrenciaMin: 50, volumeTotalMin: 5, r2Min: 0.5, slopeAbsMin: 0.3 },
  moderado:    { recorrenciaMin: 30, volumeTotalMin: 3, r2Min: 0.4, slopeAbsMin: 0.2 },
  permissivo:  { recorrenciaMin: 1,  volumeTotalMin: 1, r2Min: 0,   slopeAbsMin: 0   },
})

// Janela de "recência" — últimos N anos do dataset usados pra detectar atualidade.
// Fixada em 3 (heurística mentor: ~2 ciclos de concurso). Configurável fica pra v2.
export const RECENT_WINDOW = 3

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Calcula métricas multi-dimensionais para cada item da granularidade pedida.
 *
 * @param {Array} estatisticas array do store (cada item: `{ banca, area, ano, dados: { disciplinas: [...] } }`)
 * @param {Object} options
 * @param {string} options.banca banca-alvo (obrigatória — sem banca, retorna vazio)
 * @param {string} [options.area] filtro de área (opcional). Required pra ativar crossBanca.
 * @param {'disciplina'|'assunto'|'sub_assunto'} [options.granularidade='assunto']
 * @param {string} [options.disciplinaFiltro] drill-down nível 1 (filtra assuntos/sub-assuntos pela disciplina)
 * @param {string} [options.assuntoFiltro] drill-down nível 2 (requer disciplinaFiltro pra desambiguar; spec §15.2)
 * @param {boolean} [options.crossBanca=false] inclui outras bancas com mesma area; soma qtd e pct (clampa 100)
 * @returns {{ items: Array, anos: number[], bancasContribuintes: string[] }}
 */
export function computeMetrics(estatisticas, options = {}) {
  const {
    banca,
    area,
    granularidade = 'assunto',
    disciplinaFiltro,
    assuntoFiltro,
    crossBanca = false,
  } = options

  if (!banca) return { items: [], anos: [], bancasContribuintes: [], janelaRecente: [] }

  // 1. Separar dataset em target (banca-alvo) e others (cross-banca, mesma area)
  const targets = []
  const others = []
  const bancasContrib = new Set()

  for (const e of estatisticas || []) {
    if (!e || !e.dados || !Array.isArray(e.dados.disciplinas)) continue
    if (e.banca === banca) {
      if (area && (e.area || '') !== area) continue
      targets.push(e)
    } else if (crossBanca && area && (e.area || '') === area) {
      others.push(e)
      bancasContrib.add(e.banca)
    }
  }

  // 2. Anos do dataset filtrado (target + others)
  const anos = [...new Set([...targets, ...others].map((e) => e.ano))]
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  if (anos.length === 0) {
    return { items: [], anos: [], bancasContribuintes: [...bancasContrib], janelaRecente: [] }
  }

  // 3+4. Hierarquia + merge cross-banca
  // Chaves internas usam '::' (não ' → ') pra evitar conflito caso nomes contenham ' → '.
  // O caminho user-facing fica em `caminhoCompleto`.
  const nodes = new Map()

  function getOrCreate(chave, init) {
    let n = nodes.get(chave)
    if (!n) {
      n = { ...init, porAno: {}, boostedBy: new Set() }
      nodes.set(chave, n)
    }
    return n
  }

  // Pass 1: target banca — overwrite (consistente com trendAnalysis: duplicatas banca/area/ano, último vence)
  for (const est of targets) {
    for (const disc of est.dados.disciplinas || []) {
      if (!disc || !disc.nome) continue
      const dNode = getOrCreate(`d::${disc.nome}`, {
        tipo: 'disciplina',
        nome: disc.nome,
        caminhoCompleto: disc.nome,
        pai: null,
        __disc: disc.nome,
      })
      dNode.porAno[est.ano] = { qtd: num(disc.qtd), pct: num(disc.pct) }

      for (const ass of disc.assuntos || []) {
        if (!ass || !ass.nome) continue
        const aNode = getOrCreate(`a::${disc.nome}::${ass.nome}`, {
          tipo: 'assunto',
          nome: ass.nome,
          caminhoCompleto: `${disc.nome} → ${ass.nome}`,
          pai: disc.nome,
          __disc: disc.nome,
        })
        aNode.porAno[est.ano] = { qtd: num(ass.qtd), pct: num(ass.pct) }

        for (const sub of ass.sub_assuntos || []) {
          if (!sub || !sub.nome) continue
          const sNode = getOrCreate(`s::${disc.nome}::${ass.nome}::${sub.nome}`, {
            tipo: 'sub_assunto',
            nome: sub.nome,
            caminhoCompleto: `${disc.nome} → ${ass.nome} → ${sub.nome}`,
            pai: ass.nome,
            __disc: disc.nome,
            __ass: ass.nome,
          })
          sNode.porAno[est.ano] = { qtd: num(sub.qtd), pct: num(sub.pct) }
        }
      }
    }
  }

  // Pass 2: cross-banca — soma em cima do que já existe; clampa pct a 100; marca boostedBy
  for (const est of others) {
    for (const disc of est.dados.disciplinas || []) {
      if (!disc || !disc.nome) continue
      const dNode = getOrCreate(`d::${disc.nome}`, {
        tipo: 'disciplina',
        nome: disc.nome,
        caminhoCompleto: disc.nome,
        pai: null,
        __disc: disc.nome,
      })
      mergeFromOther(dNode, est.ano, num(disc.qtd), num(disc.pct), est.banca)

      for (const ass of disc.assuntos || []) {
        if (!ass || !ass.nome) continue
        const aNode = getOrCreate(`a::${disc.nome}::${ass.nome}`, {
          tipo: 'assunto',
          nome: ass.nome,
          caminhoCompleto: `${disc.nome} → ${ass.nome}`,
          pai: disc.nome,
          __disc: disc.nome,
        })
        mergeFromOther(aNode, est.ano, num(ass.qtd), num(ass.pct), est.banca)

        for (const sub of ass.sub_assuntos || []) {
          if (!sub || !sub.nome) continue
          const sNode = getOrCreate(`s::${disc.nome}::${ass.nome}::${sub.nome}`, {
            tipo: 'sub_assunto',
            nome: sub.nome,
            caminhoCompleto: `${disc.nome} → ${ass.nome} → ${sub.nome}`,
            pai: ass.nome,
            __disc: disc.nome,
            __ass: ass.nome,
          })
          mergeFromOther(sNode, est.ano, num(sub.qtd), num(sub.pct), est.banca)
        }
      }
    }
  }

  // Janela de recência: últimos RECENT_WINDOW anos do dataset (vazia se há menos)
  const janelaRecente = anos.length >= RECENT_WINDOW ? anos.slice(-RECENT_WINDOW) : []

  // 5+6+7. Filtrar por granularidade + drill-down + computar métricas
  const items = []
  for (const node of nodes.values()) {
    if (node.tipo !== granularidade) continue
    if (granularidade === 'assunto' && disciplinaFiltro && node.__disc !== disciplinaFiltro) continue
    if (granularidade === 'sub_assunto') {
      if (disciplinaFiltro && node.__disc !== disciplinaFiltro) continue
      // assuntoFiltro só vale junto com disciplinaFiltro (spec §15.2: 'ass sem disc → ignora')
      // — sem isso, sub-assuntos com mesmo nome em disciplinas diferentes seriam misturados.
      if (assuntoFiltro && disciplinaFiltro && node.__ass !== assuntoFiltro) continue
    }

    let n = 0
    let qtdMax = 0
    let volumeTotal = 0
    let somaPct = 0
    const pctMap = {}

    for (const ano of anos) {
      const d = node.porAno[ano]
      const qtd = d?.qtd || 0
      const pct = d?.pct || 0
      pctMap[ano] = pct
      volumeTotal += qtd
      if (qtd > 0) {
        n++
        somaPct += pct
        if (qtd > qtdMax) qtdMax = qtd
      }
    }

    if (n === 0) continue // item não apareceu em nenhum ano — filtrado por construção

    let slope = null
    let r2 = null
    if (n >= 2) {
      const t = calculateTrend(pctMap)
      slope = t.slope
      r2 = t.r2
    }

    // Recência: cobertura nos últimos RECENT_WINDOW anos. Null se dataset tem <3 anos
    // (caso degenerado em que recência == recorrência, sem agregar info).
    let recencia = null
    let recenciaAnos = []
    if (janelaRecente.length > 0) {
      recenciaAnos = janelaRecente.filter((a) => (node.porAno[a]?.qtd || 0) > 0)
      recencia = (recenciaAnos.length / RECENT_WINDOW) * 100
    }

    items.push({
      nome: node.nome,
      caminhoCompleto: node.caminhoCompleto,
      tipo: node.tipo,
      pai: node.pai,
      recorrencia: (n / anos.length) * 100,
      recencia,
      recenciaAnos,
      volumeMedio: volumeTotal / n,
      volumeTotal,
      pctMedio: somaPct / n,
      slope,
      r2,
      n,
      qtdMax,
      porAno: { ...node.porAno },
      boostedBy: [...node.boostedBy],
    })
  }

  return {
    items,
    anos,
    bancasContribuintes: [...bancasContrib],
    janelaRecente,
  }
}

function mergeFromOther(node, ano, qtd, pct, sourceBanca) {
  const prev = node.porAno[ano] || { qtd: 0, pct: 0 }
  node.porAno[ano] = {
    qtd: prev.qtd + qtd,
    pct: Math.min(100, prev.pct + pct),
  }
  node.boostedBy.add(sourceBanca)
}

/**
 * Filtra items pelo preset. Não recalcula métricas — só descarta os que não passam
 * em recorrenciaMin / volumeTotalMin.
 *
 * r2Min e slopeAbsMin do preset NÃO filtram items — são consultados pela UI via
 * `isTendenciaConfiavel(item, presetName)` pra decidir se a coluna Tendência mostra
 * valor ou fica vazia.
 *
 * @param {Array} items lista de computeMetrics
 * @param {'conservador'|'moderado'|'permissivo'} presetName preset; default 'moderado' se inválido
 * @param {Object} [customThresholds] override mesclado em cima do preset escolhido
 */
export function applyPreset(items, presetName, customThresholds) {
  const base = DEFAULT_PRESETS[presetName] || DEFAULT_PRESETS.moderado
  const t = { ...base, ...(customThresholds || {}) }
  return (items || []).filter(
    (i) => i.recorrencia >= t.recorrenciaMin && i.volumeTotal >= t.volumeTotalMin,
  )
}

/**
 * Tendência confiável segundo os thresholds do preset?
 * Usado pela UI pra decidir mostrar/ocultar o slope na coluna Tendência.
 */
export function isTendenciaConfiavel(item, presetName, customThresholds) {
  if (!item || item.slope == null || item.r2 == null) return false
  const base = DEFAULT_PRESETS[presetName] || DEFAULT_PRESETS.moderado
  const t = { ...base, ...(customThresholds || {}) }
  return item.r2 >= t.r2Min && Math.abs(item.slope) >= t.slopeAbsMin
}
