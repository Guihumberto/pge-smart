import { normalizeText } from './strings.js'

/**
 * Adapters que convertem fontes de priorização (cargo, foco) no shape uniforme
 * `AssuntoCandidate` consumido por `AssuntoCandidateList.vue` /
 * `TaskGeneratorModal.vue`.
 *
 * Shape de saída:
 * {
 *   nome:              string,      // chave de seleção; ÚNICO na lista
 *   score?:            number,      // 0..1
 *   cargaSugerida?:    number,      // horas
 *   leisReferencia?:   string[],
 *   artigosReferencia?: string,
 *   lawIdSugerido?:    string,
 *   subAssuntos?:      AssuntoCandidate[],
 *   metadadosOrigem?:  object       // propagado pro task.origemDados
 * }
 */

/**
 * Converte `priorizacao.disciplinas[].assuntos[]` de UM cargo para a lista
 * de candidatos de UMA disciplina.
 *
 * @param {object} cargo                 doc do cargo completo
 * @param {string} disciplinaNome        nome da disciplina alvo
 * @param {object} [contexto]            metadados pra propagar
 * @param {string} [contexto.editalId]
 * @param {string} [contexto.cargoId]
 * @param {string} [contexto.bancaEdital]
 * @param {string} [contexto.areaEdital]
 * @returns {{candidates: Array, normasDaDisciplina: Array}} candidates +
 *          normas detectadas no nível da disciplina (vazio aqui — cargo
 *          já mapeia leis por assunto via `leisReferencia`).
 */
export function cargoToCandidates(cargo, disciplinaNome, contexto = {}) {
  if (!cargo?.priorizacao?.disciplinas?.length) {
    return { candidates: [], normasDaDisciplina: [] }
  }
  const disc = cargo.priorizacao.disciplinas.find(d =>
    normalizeText(d.nome) === normalizeText(disciplinaNome),
  )
  if (!disc?.assuntos?.length) return { candidates: [], normasDaDisciplina: [] }

  // Tasks de cargo passam contexto cargo/edital pro origemDados de cada item.
  const baseMeta = {
    cargoOrigem: contexto.cargoId ?? null,
    editalOrigem: contexto.editalId ?? null,
    bancaOrigem: contexto.bancaEdital ?? null,
    areaOrigem: contexto.areaEdital ?? null,
  }

  // Indexa leis_vinculadas confirmadas pra preencher lawIdSugerido
  const lawIdPorNomeNormalizado = buildLawIdIndex(cargo)

  const candidates = []
  const usados = new Set() // evita nome duplicado na mesma disciplina
  for (const ass of disc.assuntos) {
    if (ass.cortado) continue // assuntos cortados pelo "Cortar conteúdo" são pulados
    const nome = ass.nome
    if (!nome || usados.has(nome)) continue
    usados.add(nome)

    const subAssuntos = (ass.sub_assuntos || [])
      .filter(s => s.nome && !s.cortado)
      .map(s => ({
        nome: s.nome,
        score: numOrNull(s.score),
        cargaSugerida: numOrNull(s.carga_estimada_horas),
        leisReferencia: arrOrNull(s.leis_referencia),
        artigosReferencia: s.arts_referencia ?? null,
      }))

    const leisRefAss = arrOrNull(ass.leis_referencia)
    // Tenta TODAS as leis referenciadas no assunto, não só a primeira.
    // Se só a segunda está confirmada pelo mentor, ainda resolve.
    let lawIdSugerido = null
    for (const lei of leisRefAss || []) {
      const id = lawIdPorNomeNormalizado.get(normalizeText(lei))
      if (id) { lawIdSugerido = id; break }
    }

    candidates.push({
      nome,
      score: numOrNull(ass.score),
      cargaSugerida: numOrNull(ass.carga_estimada_horas),
      leisReferencia: leisRefAss,
      artigosReferencia: ass.arts_referencia ?? null,
      lawIdSugerido,
      subAssuntos: subAssuntos.length ? subAssuntos : null,
      metadadosOrigem: {
        ...baseMeta,
        disciplinaOrigem: disc.nome,
      },
    })
  }
  return { candidates, normasDaDisciplina: [] }
}

/**
 * Converte saída da aba Foco (`focoParetoData` + `focoNormas`) em candidates.
 *
 * @param {Array}  focoParetoData    [{ nome, qtd, pct, acumulado }]
 * @param {Array}  [focoNormas]      [{ id, nome, count, exemplos }] — `detectNormas()`
 * @param {object} contexto          { banca, area, disciplina }
 * @returns {{candidates: Array, normasDaDisciplina: Array}} candidates +
 *           normas detectadas no nível da disciplina (não por-item).
 *           Foco não tem mapeamento norma→assunto fino, então as normas vêm
 *           soltas — caller pode mostrar como referência da disciplina toda.
 */
export function focoToCandidates(focoParetoData, focoNormas = [], contexto = {}) {
  if (!focoParetoData?.length) return { candidates: [], normasDaDisciplina: [] }
  const { banca, area, disciplina } = contexto

  const baseMeta = {
    bancaOrigem: banca ?? null,
    areaOrigem: area ?? null,
    disciplinaOrigem: disciplina ?? null,
  }

  // Normas detectadas no nível da disciplina (todos os assuntos). Shape do
  // `detectNormas` é `{ id, nome, count, exemplos }[]` ordenado por count desc.
  const normasDaDisciplina = (focoNormas || [])
    .map(n => n?.nome)
    .filter(Boolean)

  const total = sum(focoParetoData.map(p => Number(p.qtd) || 0)) || 1
  const candidates = []
  const usados = new Set()
  for (const p of focoParetoData) {
    const nome = p.nome
    if (!nome || usados.has(nome)) continue
    usados.add(nome)

    // pct vem 0..100 (% de questões da disciplina). Score normaliza pra 0..1.
    const pctNum = Number(p.pct)
    const qtdNum = Number(p.qtd) || 0
    const pctFracao = (Number.isFinite(pctNum) ? pctNum : (qtdNum / total) * 100) / 100

    candidates.push({
      nome,
      score: numOrNull(pctFracao),
      cargaSugerida: null,           // Foco não sugere carga; mentor preenche no modal
      leisReferencia: null,          // mantido null por-item; normas vão em normasDaDisciplina
      artigosReferencia: null,
      lawIdSugerido: null,
      subAssuntos: null,
      metadadosOrigem: {
        ...baseMeta,
        qtdHistorico: qtdNum || null,
        pctHistorico: Number.isFinite(pctNum) ? pctNum : null,
      },
    })
  }
  return { candidates, normasDaDisciplina }
}

// ── Helpers internos ───────────────────────────────────────────

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function arrOrNull(v) {
  return Array.isArray(v) && v.length ? v : null
}

function sum(arr) {
  return arr.reduce((s, n) => s + (Number(n) || 0), 0)
}

/**
 * Constrói índice `nomeLeiNormalizado → lawId` a partir das normas confirmadas
 * do cargo. Permite preencher `lawIdSugerido` quando o assunto referencia
 * uma lei que já está vinculada pelo mentor.
 */
function buildLawIdIndex(cargo) {
  const idx = new Map()
  for (const n of cargo?.leis_vinculadas?.normas || []) {
    if (n.status !== 'confirmada' || !n.lawId) continue
    const key = n.nomeNormalizado || normalizeText(n.nomeOriginal)
    if (key) idx.set(key, n.lawId)
  }
  return idx
}
