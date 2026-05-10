import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnaliseToolbar from '../AnaliseToolbar.vue'

function makeWrapper(props = {}) {
  return mount(AnaliseToolbar, {
    props: {
      banca: 'FCC',
      area: 'Fiscal',
      disciplina: '',
      granularidade: 'assunto',
      preset: 'moderado',
      crossBanca: false,
      bancasOptions: ['FCC', 'Cespe', 'FGV'],
      areasOptions: ['Fiscal', 'Saude'],
      disciplinasOptions: ['Direito Administrativo', 'Direito Tributário', 'Português'],
      otherBancasInArea: ['Cespe', 'FGV'],
      totalCount: 50,
      filteredCount: 23,
      selectedCount: 0,
      ...props,
    },
  })
}

describe('AnaliseToolbar — smoke', () => {
  it('renderiza com props básicas', () => {
    const w = makeWrapper()
    expect(w.find('.analise-toolbar').exists()).toBe(true)
    expect(w.text()).toContain('Mostrando')
    expect(w.text()).toContain('23')
    expect(w.text()).toContain('50')
  })

  it('select de banca emite update:banca', async () => {
    const w = makeWrapper()
    const select = w.findAll('select')[0]
    await select.setValue('Cespe')
    expect(w.emitted('update:banca')[0]).toEqual(['Cespe'])
  })

  it('select de área emite update:area', async () => {
    const w = makeWrapper()
    const select = w.findAll('select')[1]
    await select.setValue('Saude')
    expect(w.emitted('update:area')[0]).toEqual(['Saude'])
  })

  it('select de disciplina renderiza opções de disciplinasOptions', () => {
    const w = makeWrapper()
    const select = w.findAll('select')[2] // Banca, Área, Disciplina
    const opts = select.findAll('option').map((o) => o.text())
    expect(opts).toContain('Todas as disciplinas')
    expect(opts).toContain('Direito Administrativo')
    expect(opts).toContain('Direito Tributário')
  })

  it('selecionar disciplina emite update:disciplina', async () => {
    const w = makeWrapper()
    const select = w.findAll('select')[2]
    await select.setValue('Direito Tributário')
    expect(w.emitted('update:disciplina')[0]).toEqual(['Direito Tributário'])
  })

  it('selecionar "Todas as disciplinas" emite valor vazio', async () => {
    const w = makeWrapper({ disciplina: 'Direito Tributário' })
    const select = w.findAll('select')[2]
    await select.setValue('')
    expect(w.emitted('update:disciplina')[0]).toEqual([''])
  })

  it('disciplinasOptions vazio renderiza só "Todas"', () => {
    const w = makeWrapper({ disciplinasOptions: [] })
    const select = w.findAll('select')[2]
    const opts = select.findAll('option').map((o) => o.text())
    expect(opts).toEqual(['Todas as disciplinas'])
  })

  it('botão de granularidade emite update:granularidade', async () => {
    const w = makeWrapper()
    const segs = w.findAll('.seg')[0].findAll('.seg__btn')
    await segs[0].trigger('click') // Disciplina
    expect(w.emitted('update:granularidade')[0]).toEqual(['disciplina'])
  })

  it('granularidade ativa marca botão como --active', () => {
    const w = makeWrapper({ granularidade: 'sub_assunto' })
    const segs = w.findAll('.seg')[0].findAll('.seg__btn')
    // Disciplina, Assunto, Sub-assunto
    expect(segs[0].classes()).not.toContain('seg__btn--active')
    expect(segs[1].classes()).not.toContain('seg__btn--active')
    expect(segs[2].classes()).toContain('seg__btn--active')
  })

  it('preset muda emite update:preset', async () => {
    const w = makeWrapper()
    const segs = w.findAll('.seg')[1].findAll('.seg__btn')
    await segs[2].trigger('click') // Permissivo
    expect(w.emitted('update:preset')[0]).toEqual(['permissivo'])
  })

  it('checkbox cross-banca emite update:crossBanca', async () => {
    const w = makeWrapper()
    const cb = w.find('.cross-toggle input[type="checkbox"]')
    await cb.setValue(true)
    expect(w.emitted('update:crossBanca')[0]).toEqual([true])
  })

  it('cross-banca desabilita quando otherBancasInArea vazio', () => {
    const w = makeWrapper({ otherBancasInArea: [] })
    const cb = w.find('.cross-toggle input[type="checkbox"]')
    expect(cb.attributes('disabled')).toBeDefined()
    expect(w.find('.cross-toggle--disabled').exists()).toBe(true)
  })

  it('cross-banca mostra hint com nomes das bancas disponíveis', () => {
    const w = makeWrapper({ otherBancasInArea: ['Cespe', 'FGV'] })
    expect(w.text()).toContain('Cespe')
    expect(w.text()).toContain('FGV')
  })

  it('botão Copiar desabilitado quando selectedCount=0', () => {
    const w = makeWrapper({ selectedCount: 0 })
    const btns = w.findAll('.btn-outline')
    const copyBtn = btns.find((b) => b.text().includes('Copiar'))
    expect(copyBtn.attributes('disabled')).toBeDefined()
  })

  it('botão Copiar habilitado quando há seleção', () => {
    const w = makeWrapper({ selectedCount: 3 })
    const btns = w.findAll('.btn-outline')
    const copyBtn = btns.find((b) => b.text().includes('Copiar'))
    expect(copyBtn.attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain('3 selecionado')
  })

  it('botão Copiar emite copy-selected ao clicar', async () => {
    const w = makeWrapper({ selectedCount: 2 })
    const btns = w.findAll('.btn-outline')
    const copyBtn = btns.find((b) => b.text().includes('Copiar'))
    await copyBtn.trigger('click')
    expect(w.emitted('copy-selected')).toBeTruthy()
  })

  it('botão Exportar CSV desabilitado quando filteredCount=0', () => {
    const w = makeWrapper({ filteredCount: 0 })
    const btns = w.findAll('.btn-outline')
    const csvBtn = btns.find((b) => b.text().includes('CSV'))
    expect(csvBtn.attributes('disabled')).toBeDefined()
  })

  it('botão Exportar CSV emite export-csv ao clicar', async () => {
    const w = makeWrapper()
    const btns = w.findAll('.btn-outline')
    const csvBtn = btns.find((b) => b.text().includes('CSV'))
    await csvBtn.trigger('click')
    expect(w.emitted('export-csv')).toBeTruthy()
  })

  it('preset moderado é o ativo por default', () => {
    const w = makeWrapper()
    const segs = w.findAll('.seg')[1].findAll('.seg__btn')
    expect(segs[1].classes()).toContain('seg__btn--active')
  })

  it('selectedCount plural vs singular', () => {
    expect(makeWrapper({ selectedCount: 1 }).text()).toContain('1 selecionado ')
    expect(makeWrapper({ selectedCount: 5 }).text()).toContain('5 selecionados')
  })
})
