import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'

function makeWrapper(props = {}, slots = undefined) {
  return mount(ConfirmDialog, {
    props: {
      modelValue: true,
      title: 'Tem certeza?',
      message: 'Essa ação não pode ser desfeita.',
      ...props,
    },
    ...(slots ? { slots } : {}),
    attachTo: document.body,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ConfirmDialog', () => {
  it('renderiza título e mensagem quando aberto', () => {
    makeWrapper()
    expect(document.body.textContent).toContain('Tem certeza?')
    expect(document.body.textContent).toContain('Essa ação não pode ser desfeita.')
  })

  it('não renderiza quando modelValue é false', () => {
    makeWrapper({ modelValue: false })
    expect(document.body.querySelector('.cd-card')).toBeNull()
  })

  it('emite confirm + update:modelValue ao clicar no botão de confirmar', async () => {
    const wrapper = makeWrapper()
    const confirmBtn = document.body.querySelector('.cd-btn--info')
    confirmBtn.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('emite cancel + update:modelValue ao clicar no botão de cancelar', async () => {
    const wrapper = makeWrapper()
    const cancelBtn = document.body.querySelector('.cd-btn--ghost')
    cancelBtn.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('aplica classe danger quando variant=danger', () => {
    makeWrapper({ variant: 'danger' })
    expect(document.body.querySelector('.cd-btn--danger')).not.toBeNull()
  })

  it('aplica classe warning quando variant=warning', () => {
    makeWrapper({ variant: 'warning' })
    expect(document.body.querySelector('.cd-btn--warning')).not.toBeNull()
  })

  it('clique no overlay dispara cancel', async () => {
    const wrapper = makeWrapper()
    const overlay = document.body.querySelector('.cd-overlay')
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('Esc dispara cancel', async () => {
    const wrapper = makeWrapper()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('Esc não dispara cancel quando dialog está fechado', async () => {
    const wrapper = makeWrapper({ modelValue: false })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toBeFalsy()
  })

  it('renderiza slot quando message está vazia', () => {
    makeWrapper(
      { title: 'Custom', message: '' },
      { default: '<p class="custom-content">Conteúdo personalizado</p>' },
    )
    expect(document.body.querySelector('.custom-content')).not.toBeNull()
    expect(document.body.textContent).toContain('Conteúdo personalizado')
  })

  it('aria-modal e role=dialog presentes', () => {
    makeWrapper()
    const overlay = document.body.querySelector('.cd-overlay')
    expect(overlay.getAttribute('role')).toBe('dialog')
    expect(overlay.getAttribute('aria-modal')).toBe('true')
    expect(overlay.getAttribute('aria-labelledby')).toMatch(/^cd-title-/)
  })
})
