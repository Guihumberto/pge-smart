import { describe, it, expect } from 'vitest'

describe('vitest setup', () => {
  it('roda assertions básicas', () => {
    expect(1 + 1).toBe(2)
  })

  it('tem DOM disponível via happy-dom', () => {
    const div = document.createElement('div')
    div.textContent = 'hello'
    expect(div.textContent).toBe('hello')
  })

  it('parseia HTML via DOMParser (necessário para statsParser)', () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString('<ul><li>a</li><li>b</li></ul>', 'text/html')
    expect(doc.querySelectorAll('li')).toHaveLength(2)
  })
})
