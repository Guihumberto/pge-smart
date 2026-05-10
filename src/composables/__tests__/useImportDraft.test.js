import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useImportDraft } from '../useImportDraft'

const STORAGE_KEY = 'estatisticas_draft'

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useImportDraft', () => {
  it('saveDraft persiste payload em localStorage com savedAt', () => {
    const { saveDraft } = useImportDraft()
    saveDraft({
      form: { banca: 'FGV', area: 'Fiscal', ano: 2024, descricao: '' },
      textoBruto: '<li>...</li>',
    })

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw)
    expect(parsed.form.banca).toBe('FGV')
    expect(parsed.textoBruto).toBe('<li>...</li>')
    expect(parsed.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('saveDraft atualiza draft.value e hasValidDraft', () => {
    const { saveDraft, draft, hasValidDraft } = useImportDraft()
    expect(draft.value).toBeNull()
    expect(hasValidDraft.value).toBe(false)

    saveDraft({ form: { banca: 'X' }, textoBruto: 'a' })
    expect(draft.value).not.toBeNull()
    expect(draft.value.form.banca).toBe('X')
    expect(hasValidDraft.value).toBe(true)
  })

  it('hook recupera rascunho existente no localStorage ao montar', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      form: { banca: 'OldBanca' },
      textoBruto: 'old',
      savedAt: new Date().toISOString(),
    }))
    const { draft, hasValidDraft } = useImportDraft()
    expect(hasValidDraft.value).toBe(true)
    expect(draft.value.form.banca).toBe('OldBanca')
    expect(draft.value.textoBruto).toBe('old')
  })

  it('rascunho com >24h é descartado ao montar', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25h atrás
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      form: {},
      textoBruto: 'expirado',
      savedAt: old,
    }))
    const { draft, hasValidDraft } = useImportDraft()
    expect(draft.value).toBeNull()
    expect(hasValidDraft.value).toBe(false)
  })

  it('rascunho com exatamente 23h59min é mantido', () => {
    const recent = new Date(Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000).toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      form: {},
      textoBruto: 'recente',
      savedAt: recent,
    }))
    const { draft } = useImportDraft()
    expect(draft.value).not.toBeNull()
    expect(draft.value.textoBruto).toBe('recente')
  })

  it('clearDraft remove do localStorage e zera draft', () => {
    const { saveDraft, clearDraft, draft } = useImportDraft()
    saveDraft({ form: {}, textoBruto: 'a' })
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy()

    clearDraft()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(draft.value).toBeNull()
  })

  it('refresh re-lê do localStorage (útil quando modal reabre)', () => {
    const hook = useImportDraft()
    expect(hook.draft.value).toBeNull()

    // Simula outra aba salvando rascunho
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      form: { banca: 'External' },
      textoBruto: 'novo',
      savedAt: new Date().toISOString(),
    }))

    hook.refresh()
    expect(hook.draft.value).not.toBeNull()
    expect(hook.draft.value.form.banca).toBe('External')
  })

  it('localStorage com JSON malformado retorna null silenciosamente', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    const { draft } = useImportDraft()
    expect(draft.value).toBeNull()
  })

  it('localStorage com objeto sem savedAt retorna null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form: {}, textoBruto: 'a' }))
    const { draft } = useImportDraft()
    expect(draft.value).toBeNull()
  })

  it('savedAt no futuro (clock skew) é tratado como inválido', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      form: {},
      textoBruto: 'futuro',
      savedAt: future,
    }))
    const { draft } = useImportDraft()
    expect(draft.value).toBeNull()
  })

  it('saveDraft sobrescreve rascunho anterior', () => {
    const { saveDraft, draft } = useImportDraft()
    saveDraft({ form: { banca: 'A' }, textoBruto: 'aaa' })
    saveDraft({ form: { banca: 'B' }, textoBruto: 'bbb' })
    expect(draft.value.form.banca).toBe('B')
    expect(draft.value.textoBruto).toBe('bbb')
  })

  it('saveDraft com payload undefined usa defaults', () => {
    const { saveDraft, draft } = useImportDraft()
    saveDraft()
    expect(draft.value).toEqual({
      form: null,
      textoBruto: '',
      savedAt: expect.any(String),
    })
  })
})
