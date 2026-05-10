import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Pagination from '../Pagination.vue'

function makeWrapper(props = {}) {
  return mount(Pagination, {
    props: {
      currentPage: 1,
      totalPages: 5,
      total: 50,
      perPage: 12,
      ...props,
    },
  })
}

describe('Pagination', () => {
  it('não renderiza nada quando total=0', () => {
    const w = makeWrapper({ total: 0, totalPages: 1 })
    expect(w.find('.pg').exists()).toBe(false)
  })

  it('mostra "Mostrando 1–12 de 50" na primeira página', () => {
    const w = makeWrapper()
    expect(w.text()).toContain('Mostrando 1–12 de 50')
  })

  it('mostra "Mostrando 13–24 de 50" na segunda página', () => {
    const w = makeWrapper({ currentPage: 2 })
    expect(w.text()).toContain('Mostrando 13–24 de 50')
  })

  it('mostra "Mostrando 49–50 de 50" na última página', () => {
    const w = makeWrapper({ currentPage: 5 })
    expect(w.text()).toContain('Mostrando 49–50 de 50')
  })

  it('esconde botões de página quando totalPages=1', () => {
    const w = makeWrapper({ totalPages: 1, total: 10 })
    expect(w.find('.pg__pages').exists()).toBe(false)
    expect(w.find('.pg__perpage').exists()).toBe(true)
    expect(w.text()).toContain('Mostrando 1–10 de 10')
  })

  it('renderiza todas as páginas (≤7) sem elipses', () => {
    const w = makeWrapper({ totalPages: 5 })
    const buttons = w.findAll('.pg__btn--num')
    expect(buttons.map(b => b.text())).toEqual(['1', '2', '3', '4', '5'])
  })

  it('insere elipses para muitas páginas', () => {
    const w = makeWrapper({ currentPage: 10, totalPages: 20, total: 240 })
    const labels = w.findAll('.pg__btn--num').map(b => b.text())
    expect(labels[0]).toBe('1')
    expect(labels[labels.length - 1]).toBe('20')
    expect(labels).toContain('...')
    expect(labels).toContain('10')
  })

  it('emite update:currentPage ao clicar em uma página', async () => {
    const w = makeWrapper({ currentPage: 1, totalPages: 5 })
    const buttons = w.findAll('.pg__btn--num')
    await buttons[2].trigger('click') // página 3
    expect(w.emitted('update:currentPage')).toEqual([[3]])
  })

  it('botão anterior emite currentPage-1', async () => {
    const w = makeWrapper({ currentPage: 3 })
    const prevBtn = w.findAll('.pg__btn').find(b => b.attributes('aria-label') === 'Página anterior')
    await prevBtn.trigger('click')
    expect(w.emitted('update:currentPage')).toEqual([[2]])
  })

  it('botão próximo emite currentPage+1', async () => {
    const w = makeWrapper({ currentPage: 3 })
    const nextBtn = w.findAll('.pg__btn').find(b => b.attributes('aria-label') === 'Próxima página')
    await nextBtn.trigger('click')
    expect(w.emitted('update:currentPage')).toEqual([[4]])
  })

  it('botão anterior fica desabilitado na primeira página', () => {
    const w = makeWrapper({ currentPage: 1 })
    const prevBtn = w.findAll('.pg__btn').find(b => b.attributes('aria-label') === 'Página anterior')
    expect(prevBtn.attributes('disabled')).toBeDefined()
  })

  it('botão próximo fica desabilitado na última página', () => {
    const w = makeWrapper({ currentPage: 5 })
    const nextBtn = w.findAll('.pg__btn').find(b => b.attributes('aria-label') === 'Próxima página')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('clique em página atual não emite evento', async () => {
    const w = makeWrapper({ currentPage: 2 })
    const buttons = w.findAll('.pg__btn--num')
    await buttons[1].trigger('click') // página 2 (atual)
    expect(w.emitted('update:currentPage')).toBeUndefined()
  })

  it('mudar perPage emite update:perPage', async () => {
    const w = makeWrapper()
    const select = w.find('.pg__select')
    await select.setValue('24')
    expect(w.emitted('update:perPage')).toEqual([[24]])
  })

  it('lista opções padrão 12/24/48 no select', () => {
    const w = makeWrapper()
    const opts = w.findAll('.pg__select option').map(o => o.text())
    expect(opts).toEqual(['12', '24', '48'])
  })

  it('respeita perPageOptions custom', () => {
    const w = makeWrapper({ perPageOptions: [10, 25, 50, 100] })
    const opts = w.findAll('.pg__select option').map(o => o.text())
    expect(opts).toEqual(['10', '25', '50', '100'])
  })

  it('marca aria-current=page no botão da página ativa', () => {
    const w = makeWrapper({ currentPage: 3 })
    const buttons = w.findAll('.pg__btn--num')
    const active = buttons.find(b => b.attributes('aria-current') === 'page')
    expect(active.text()).toBe('3')
  })

  it('botões de outras páginas não têm aria-current', () => {
    const w = makeWrapper({ currentPage: 3 })
    const buttons = w.findAll('.pg__btn--num').filter(b => b.text() !== '3')
    buttons.forEach(b => {
      expect(b.attributes('aria-current')).toBeUndefined()
    })
  })

  // Documenta contrato: o componente NÃO reseta currentPage automaticamente
  // ao mudar perPage. Spec §8.3 delega esse reset ao parent.
  it('mudar perPage emite apenas update:perPage, não update:currentPage', async () => {
    const w = makeWrapper({ currentPage: 5, totalPages: 5, total: 50 })
    const select = w.find('.pg__select')
    await select.setValue('48')
    expect(w.emitted('update:perPage')).toEqual([[48]])
    expect(w.emitted('update:currentPage')).toBeUndefined()
  })

  it('label do per-page select tem for/id associados', () => {
    const w = makeWrapper()
    const label = w.find('.pg__perpage label')
    const select = w.find('.pg__select')
    expect(label.attributes('for')).toBeTruthy()
    expect(select.attributes('id')).toBe(label.attributes('for'))
  })
})
