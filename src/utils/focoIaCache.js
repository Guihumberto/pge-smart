// Shared cache key + accessors for the IA-generated foco analysis.
// Used by FocoInsightQuestoes (writer) and EstatisticasView's printPage (reader).

const PREFIX = 'foco-ia'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000   // 30 dias

export function focoIaCacheKey({ banca, area, disciplina }) {
  return `${PREFIX}:${banca}|${area || ''}|${disciplina}`
}

// Lê o cache validando que:
//   1. Não está expirado (savedAt < MAX_AGE_MS atrás)
//   2. O `total` armazenado bate com o `total` atual (se passado) — invalida quando
//      o acervo questoes_v2 cresceu e a análise ficou stale.
// Retorna null se inválido; auto-remove entrada corrompida/expirada.
export function readFocoIa(ctx, { currentTotal } = {}) {
  const key = focoIaCacheKey(ctx)
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)

    const age = Date.now() - new Date(parsed.savedAt).getTime()
    if (age > MAX_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    if (currentTotal != null && parsed.total != null && parsed.total !== currentTotal) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch (err) {
    console.warn('[focoIaCache] entry corrompida, removendo:', err?.message ?? err)
    localStorage.removeItem(key)
    return null
  }
}

export function writeFocoIa(ctx, analise, { total } = {}) {
  const key = focoIaCacheKey(ctx)
  try {
    localStorage.setItem(key, JSON.stringify({
      analise,
      savedAt: new Date().toISOString(),
      total,
    }))
  } catch { /* quota or disabled — silent */ }
}
