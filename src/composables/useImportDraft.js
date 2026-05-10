import { computed, ref } from 'vue'

const STORAGE_KEY = 'estatisticas_draft'
const TTL_MS = 24 * 60 * 60 * 1000

/**
 * Persiste 1 rascunho global do modal de importação de estatísticas.
 * Spec §4 — chave única, TTL de 24h, recuperável via banner ao reabrir.
 */
export function useImportDraft() {
  const draft = ref(loadFromStorage())

  const hasValidDraft = computed(() => draft.value !== null)

  function refresh() {
    draft.value = loadFromStorage()
  }

  function saveDraft(payload) {
    const record = {
      form: payload?.form ?? null,
      textoBruto: payload?.textoBruto ?? '',
      savedAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      // localStorage cheio, modo privado, ou bloqueado — silencioso
    }
    draft.value = record
  }

  function clearDraft() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // silencioso
    }
    draft.value = null
  }

  return { draft, hasValidDraft, saveDraft, clearDraft, refresh }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.savedAt) return null
    const age = Date.now() - new Date(parsed.savedAt).getTime()
    if (Number.isNaN(age) || age < 0 || age > TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}
