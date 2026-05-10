import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnaliseTable from '../AnaliseTable.vue'

function makeItem(over = {}) {
  return {
    nome: 'CTN',
    caminhoCompleto: 'Trib → CTN',
    tipo: 'assunto',
    pai: 'Trib',
    recorrencia: 100,
    recencia: 100,
    recenciaAnos: [2024, 2025, 2026],
    volumeMedio: 10,
    volumeTotal: 50,
    pctMedio: 12,
    slope: 0.85,
    r2: 0.9,
    n: 5,
    qtdMax: 12,
    porAno: { 2022: { qtd: 8, pct: 8 }, 2023: { qtd: 9, pct: 9 } },
    boostedBy: [],
    ...over,
  }
}

function makeWrapper(props = {}) {
  return mount(AnaliseTable, {
    props: {
      items: [makeItem()],
      anos: [2022, 2023, 2024, 2025, 2026],
      granularidade: 'assunto',
      sort: 'recorrencia',
      dir: 'desc',
      page: 1,
      perPage: 50,
      presetName: 'moderado',
      breadcrumb: [{ label: 'Análise', level: 0 }],
      selectedKeys: [],
      ...props,
    },
  })
}

describe('AnaliseTable — smoke', () => {
  it('renderiza linhas dos items', () => {
    const w = makeWrapper({
      items: [
        makeItem({ nome: 'CTN', caminhoCompleto: 'Trib → CTN' }),
        makeItem({ nome: 'ICMS', caminhoCompleto: 'Trib → ICMS' }),
      ],
    })
    expect(w.findAll('tbody tr').length).toBe(2)
    expect(w.text()).toContain('CTN')
    expect(w.text()).toContain('ICMS')
  })

  it('mostra empty row quando items vazio', () => {
    const w = makeWrapper({ items: [] })
    expect(w.find('.empty-row').exists()).toBe(true)
  })

  it('renderiza sufixo da granularidade no breadcrumb', () => {
    expect(makeWrapper({ granularidade: 'disciplina' }).text()).toContain('Disciplinas')
    expect(makeWrapper({ granularidade: 'assunto' }).text()).toContain('Assuntos')
    expect(makeWrapper({ granularidade: 'sub_assunto' }).text()).toContain('Sub-assuntos')
  })

  it('clicar em header sortable emite update:sort + update:dir asc/desc', async () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    const headers = w.findAll('.th-sortable')
    // Mesma coluna inverte direção
    await headers[1].trigger('click') // Recorrência
    expect(w.emitted('update:dir')[0]).toEqual(['asc'])
  })

  it('clicar em coluna nova emite sort + dir desc para numéricas', async () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    const headers = w.findAll('.th-sortable')
    // Cols: 0=Nome, 1=Recorrência, 2=Recência, 3=Vol/ano, 4=Vol total, 5=Pct, 6=Tendência
    await headers[4].trigger('click') // Vol total
    expect(w.emitted('update:sort')[0]).toEqual(['volumeTotal'])
    expect(w.emitted('update:dir')[0]).toEqual(['desc'])
  })

  it('clicar em coluna nome emite sort + dir asc', async () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    const headers = w.findAll('.th-sortable')
    await headers[0].trigger('click') // Nome
    expect(w.emitted('update:sort')[0]).toEqual(['nome'])
    expect(w.emitted('update:dir')[0]).toEqual(['asc'])
  })

  it('header da coluna ativa mostra seta', () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    expect(w.text()).toContain('↓')
  })

  it('clicar checkbox emite update:selectedKeys com chave', async () => {
    const item = makeItem({ caminhoCompleto: 'X' })
    const w = makeWrapper({ items: [item], selectedKeys: [] })
    const cb = w.find('.td-check input')
    await cb.setValue(true)
    expect(w.emitted('update:selectedKeys')[0]).toEqual([['X']])
  })

  it('desmarcar checkbox remove da seleção', async () => {
    const item = makeItem({ caminhoCompleto: 'X' })
    const w = makeWrapper({ items: [item], selectedKeys: ['X'] })
    const cb = w.find('.td-check input')
    await cb.setValue(false)
    expect(w.emitted('update:selectedKeys')[0]).toEqual([[]])
  })

  it('row selecionada recebe classe row--selected', () => {
    const item = makeItem({ caminhoCompleto: 'X' })
    const w = makeWrapper({ items: [item], selectedKeys: ['X'] })
    expect(w.find('tbody tr').classes()).toContain('row--selected')
  })

  it('clicar em linha disciplina/assunto emite drill-down', async () => {
    const item = makeItem({ tipo: 'assunto' })
    const w = makeWrapper({ items: [item] })
    await w.find('tbody tr').trigger('click')
    expect(w.emitted('drill-down')[0][0].caminhoCompleto).toBe(item.caminhoCompleto)
  })

  it('clicar em linha sub_assunto NÃO emite drill-down', async () => {
    const item = makeItem({ tipo: 'sub_assunto' })
    const w = makeWrapper({ items: [item] })
    await w.find('tbody tr').trigger('click')
    expect(w.emitted('drill-down')).toBeUndefined()
  })

  it('row drillable ganha classe row--clickable', () => {
    expect(makeWrapper({ items: [makeItem({ tipo: 'assunto' })] }).find('tbody tr').classes())
      .toContain('row--clickable')
    expect(makeWrapper({ items: [makeItem({ tipo: 'sub_assunto' })] }).find('tbody tr').classes())
      .not.toContain('row--clickable')
  })

  it('boost-badge aparece quando boostedBy não-vazio', () => {
    const w = makeWrapper({ items: [makeItem({ boostedBy: ['Cespe', 'FGV'] })] })
    const badge = w.find('.boost-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('+2 bancas')
    expect(badge.attributes('title')).toContain('Cespe')
  })

  it('boost-badge singular quando 1 banca', () => {
    const w = makeWrapper({ items: [makeItem({ boostedBy: ['Cespe'] })] })
    expect(w.find('.boost-badge').text()).toBe('+1 banca')
  })

  it('pctMedio > 50 com cross-banca ganha classe pct-warn', () => {
    const w = makeWrapper({ items: [makeItem({ pctMedio: 60, boostedBy: ['Cespe'] })] })
    expect(w.find('.pct-warn').exists()).toBe(true)
  })

  it('pctMedio > 50 sem cross-banca NÃO ganha pct-warn (soma ingênua só faz sentido com agregação)', () => {
    const w = makeWrapper({ items: [makeItem({ pctMedio: 60, boostedBy: [] })] })
    expect(w.find('.pct-warn').exists()).toBe(false)
  })

  it('tooltip da pct-warn explica soma aproximada', () => {
    const w = makeWrapper({ items: [makeItem({ pctMedio: 60, boostedBy: ['Cespe'] })] })
    const span = w.find('.pct-warn')
    expect(span.attributes('title')).toContain('aproximada')
  })

  it('tooltip vazio quando pctMedio <= 50 (sem warn)', () => {
    const w = makeWrapper({ items: [makeItem({ pctMedio: 30, boostedBy: ['Cespe'] })] })
    // Cells por linha: check=0, nome=1, recorr=2, recência=3, vol/ano=4, vol-total=5, pct=6, tend=7
    const cell = w.findAll('td')[6].find('span')
    expect(cell.attributes('title') || '').toBe('')
  })

  it('tendência confiável renderiza ícone + valor', () => {
    const w = makeWrapper({
      items: [makeItem({ slope: 0.85, r2: 0.7 })],
      presetName: 'moderado',
    })
    expect(w.find('.trend-cell').exists()).toBe(true)
    expect(w.text()).toContain('+0.85')
  })

  it('tendência não confiável (R² baixo) renderiza traço', () => {
    const w = makeWrapper({
      items: [makeItem({ slope: 0.5, r2: 0.1 })],
      presetName: 'moderado',
    })
    expect(w.find('.trend-cell').exists()).toBe(false)
    expect(w.find('.trend-empty').exists()).toBe(true)
  })

  it('item sem slope (n=1) mostra traço', () => {
    const w = makeWrapper({
      items: [makeItem({ slope: null, r2: null, n: 1 })],
    })
    expect(w.find('.trend-empty').exists()).toBe(true)
  })

  it('breadcrumb com mais níveis mostra cliques', async () => {
    const w = makeWrapper({
      breadcrumb: [
        { label: 'Análise', level: 0 },
        { label: 'Trib', level: 1 },
        { label: 'CTN', level: 2 },
      ],
    })
    const crumbs = w.findAll('.breadcrumb__crumb')
    expect(crumbs).toHaveLength(3)
    // Último crumb é current (disabled)
    expect(crumbs[2].attributes('disabled')).toBeDefined()
    // Primeiro crumb clicável
    await crumbs[0].trigger('click')
    expect(w.emitted('breadcrumb-go')[0]).toEqual([0])
  })

  it('header checkbox seleciona todos da página', async () => {
    const items = [
      makeItem({ nome: 'A', caminhoCompleto: 'A' }),
      makeItem({ nome: 'B', caminhoCompleto: 'B' }),
    ]
    const w = makeWrapper({ items, selectedKeys: [] })
    const headerCb = w.find('.th-check input')
    await headerCb.setValue(true)
    const emit = w.emitted('update:selectedKeys')[0][0].sort()
    expect(emit).toEqual(['A', 'B'])
  })

  it('header checkbox desmarca todos da página', async () => {
    const items = [
      makeItem({ nome: 'A', caminhoCompleto: 'A' }),
      makeItem({ nome: 'B', caminhoCompleto: 'B' }),
    ]
    const w = makeWrapper({ items, selectedKeys: ['A', 'B', 'X'] })
    const headerCb = w.find('.th-check input')
    await headerCb.setValue(false)
    // Mantém X (de outra página), tira A/B (visíveis)
    const emit = w.emitted('update:selectedKeys')[0][0].sort()
    expect(emit).toEqual(['X'])
  })

  it('paginação aparece somente quando há items', () => {
    expect(makeWrapper({ items: [] }).find('.pg').exists()).toBe(false)
    expect(makeWrapper({ items: [makeItem()] }).find('.pg').exists()).toBe(true)
  })

  it('clicar no checkbox da row não dispara drill-down', async () => {
    const item = makeItem({ tipo: 'assunto', caminhoCompleto: 'X' })
    const w = makeWrapper({ items: [item] })
    const cb = w.find('.td-check input')
    await cb.setValue(true)
    expect(w.emitted('drill-down')).toBeUndefined()
  })
})

describe('AnaliseTable — coluna Recência (condicional)', () => {
  it('coluna Recência aparece quando anos.length >= 3', () => {
    const w = makeWrapper({ anos: [2024, 2025, 2026] })
    const headers = w.findAll('.th-sortable').map((h) => h.text())
    expect(headers.some((h) => h.includes('Recência'))).toBe(true)
  })

  it('coluna Recência ausente quando anos.length < 3', () => {
    const w = makeWrapper({
      anos: [2025, 2026],
      items: [makeItem({ recencia: null, recenciaAnos: [] })],
    })
    const headers = w.findAll('.th-sortable').map((h) => h.text())
    expect(headers.some((h) => h.includes('Recência'))).toBe(false)
  })

  it('item com recencia null mostra traço (—)', () => {
    const w = makeWrapper({
      anos: [2024, 2025, 2026],
      items: [makeItem({ recencia: null, recenciaAnos: [] })],
    })
    // Cells por linha: check=0, nome=1, recorr=2, recência=3
    const recenciaCell = w.findAll('td')[3]
    expect(recenciaCell.find('.trend-empty').exists()).toBe(true)
  })

  it('tooltip da Recência lista anos cobertos', () => {
    const w = makeWrapper({
      anos: [2024, 2025, 2026],
      items: [makeItem({ recencia: 67, recenciaAnos: [2024, 2026] })],
    })
    const recenciaCell = w.findAll('td')[3]
    const span = recenciaCell.find('span[title]')
    expect(span.attributes('title')).toContain('2024')
    expect(span.attributes('title')).toContain('2026')
    expect(span.attributes('title')).toContain('2/3')
  })

  it('colspan do empty-row reflete colunas visíveis', () => {
    // Com Recência: 7 cols + checkbox = 8
    const wWithRec = makeWrapper({ items: [], anos: [2024, 2025, 2026] })
    const emptyTd = wWithRec.find('.empty-row')
    expect(emptyTd.attributes('colspan')).toBe('8')

    // Sem Recência: 6 cols + checkbox = 7
    const wNoRec = makeWrapper({ items: [], anos: [2025, 2026] })
    expect(wNoRec.find('.empty-row').attributes('colspan')).toBe('7')
  })
})

describe('AnaliseTable — modo expandível (visão de disciplina)', () => {
  function makeSub(over = {}) {
    return {
      nome: 'Art 142',
      caminhoCompleto: 'Trib → CTN → Art 142',
      tipo: 'sub_assunto',
      pai: 'CTN',
      recorrencia: 80,
      recencia: 67,
      recenciaAnos: [2024, 2026],
      volumeMedio: 5,
      volumeTotal: 20,
      pctMedio: 6,
      slope: 0.5,
      r2: 0.8,
      n: 4,
      qtdMax: 6,
      porAno: {},
      boostedBy: [],
      passesPreset: true,
      ...over,
    }
  }

  it('sem subsByAssunto: chevron column ausente (modo plain)', () => {
    const w = makeWrapper({ items: [makeItem({ nome: 'CTN' })] })
    expect(w.find('.th-expand').exists()).toBe(false)
    expect(w.find('.chevron-btn').exists()).toBe(false)
  })

  it('com subsByAssunto: chevron renderiza pra assunto que tem subs', () => {
    const subs = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    expect(w.find('.th-expand').exists()).toBe(true)
    expect(w.find('.chevron-btn').exists()).toBe(true)
  })

  it('chevron desabilitado pra assunto sem subs', () => {
    const subs = new Map([['CTN', [makeSub()]]]) // só CTN tem subs
    const w = makeWrapper({
      items: [
        makeItem({ nome: 'CTN', caminhoCompleto: 'Trib → CTN' }),
        makeItem({ nome: 'ICMS', caminhoCompleto: 'Trib → ICMS' }),
      ],
      subsByAssunto: subs,
    })
    // CTN tem chevron, ICMS tem só chevron-empty
    expect(w.findAll('.chevron-btn').length).toBe(1)
    expect(w.findAll('.chevron-empty').length).toBe(1)
  })

  it('click no chevron expande linhas dos subs', async () => {
    const subs = new Map([['CTN', [makeSub({ nome: 'Art 142' }), makeSub({ nome: 'Art 150', caminhoCompleto: 'Trib → CTN → Art 150' })]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    expect(w.findAll('.row--sub').length).toBe(0)
    await w.find('.chevron-btn').trigger('click')
    expect(w.findAll('.row--sub').length).toBe(2)
    expect(w.text()).toContain('Art 142')
    expect(w.text()).toContain('Art 150')
  })

  it('click no chevron de novo colapsa', async () => {
    const subs = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    await w.find('.chevron-btn').trigger('click')
    expect(w.findAll('.row--sub').length).toBe(1)
    await w.find('.chevron-btn').trigger('click')
    expect(w.findAll('.row--sub').length).toBe(0)
  })

  it('sub que passa no preset ganha classe row--sub-highlight', async () => {
    const subs = new Map([['CTN', [makeSub({ passesPreset: true })]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    await w.find('.chevron-btn').trigger('click')
    const subRow = w.find('.row--sub')
    expect(subRow.classes()).toContain('row--sub-highlight')
  })

  it('sub que NÃO passa no preset não ganha highlight', async () => {
    const subs = new Map([['CTN', [makeSub({ passesPreset: false })]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    await w.find('.chevron-btn').trigger('click')
    const subRow = w.find('.row--sub')
    expect(subRow.classes()).not.toContain('row--sub-highlight')
  })

  it('mudança de subsByAssunto reseta expansões', async () => {
    const subs1 = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs1,
    })
    await w.find('.chevron-btn').trigger('click')
    expect(w.findAll('.row--sub').length).toBe(1)
    // Trocar a Map dispara watcher → reseta expandedAssuntos
    await w.setProps({ subsByAssunto: new Map([['Outro', [makeSub()]]]) })
    expect(w.findAll('.row--sub').length).toBe(0)
  })

  it('chevron tem aria-expanded refletindo estado', async () => {
    const subs = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    expect(w.find('.chevron-btn').attributes('aria-expanded')).toBe('false')
    await w.find('.chevron-btn').trigger('click')
    expect(w.find('.chevron-btn').attributes('aria-expanded')).toBe('true')
  })

  it('aria-label do chevron muda entre Expandir/Colapsar conforme estado', async () => {
    const subs = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs,
    })
    expect(w.find('.chevron-btn').attributes('aria-label')).toContain('Expandir')
    await w.find('.chevron-btn').trigger('click')
    expect(w.find('.chevron-btn').attributes('aria-label')).toContain('Colapsar')
  })

  it('mudar subsByAssunto SEM mudar keys preserva expansões (fix #13)', async () => {
    // Cenário real: user troca preset → view recria Map (passesPreset diferente)
    // mas keys são as mesmas → expansões NÃO devem zerar
    const subs1 = new Map([['CTN', [makeSub({ passesPreset: false })]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN' })],
      subsByAssunto: subs1,
    })
    await w.find('.chevron-btn').trigger('click')
    expect(w.findAll('.row--sub').length).toBe(1)

    // Map novo, mesmas keys (CTN), passesPreset diferente
    const subs2 = new Map([['CTN', [makeSub({ passesPreset: true })]]])
    await w.setProps({ subsByAssunto: subs2 })
    // Expansão deve persistir
    expect(w.findAll('.row--sub').length).toBe(1)
    // Mas o destaque deve ter mudado
    expect(w.find('.row--sub').classes()).toContain('row--sub-highlight')
  })

  it('colspan do empty-row aumenta em 1 quando modo expandível', () => {
    const w = makeWrapper({
      items: [],
      anos: [2024, 2025, 2026],
      subsByAssunto: new Map([['CTN', []]]),
    })
    // 7 cols + checkbox + expand = 9
    expect(w.find('.empty-row').attributes('colspan')).toBe('9')
  })

  it('click no chevron NÃO dispara drill-down (stop)', async () => {
    const subs = new Map([['CTN', [makeSub()]]])
    const w = makeWrapper({
      items: [makeItem({ nome: 'CTN', tipo: 'assunto' })],
      subsByAssunto: subs,
    })
    await w.find('.chevron-btn').trigger('click')
    expect(w.emitted('drill-down')).toBeUndefined()
  })
})

describe('AnaliseTable — a11y', () => {
  it('header da coluna ativa tem aria-sort com direção atual', () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    const headers = w.findAll('.th-sortable')
    // Recorrência (índice 1)
    expect(headers[1].attributes('aria-sort')).toBe('descending')
  })

  it('headers não-ativos têm aria-sort="none"', () => {
    const w = makeWrapper({ sort: 'recorrencia', dir: 'desc' })
    const headers = w.findAll('.th-sortable')
    expect(headers[0].attributes('aria-sort')).toBe('none')
    expect(headers[2].attributes('aria-sort')).toBe('none')
  })

  it('aria-sort muda pra ascending quando dir=asc', () => {
    const w = makeWrapper({ sort: 'volumeTotal', dir: 'asc' })
    const headers = w.findAll('.th-sortable')
    // headers[4] = Vol total (depois da Recência entrar como índice 2)
    expect(headers[4].attributes('aria-sort')).toBe('ascending')
  })

  it('último crumb do breadcrumb tem aria-current="page"', () => {
    const w = makeWrapper({
      breadcrumb: [
        { label: 'Análise', level: 0 },
        { label: 'Trib', level: 1 },
      ],
    })
    const crumbs = w.findAll('.breadcrumb__crumb')
    expect(crumbs[0].attributes('aria-current')).toBeUndefined()
    expect(crumbs[1].attributes('aria-current')).toBe('page')
  })

  it('headers usam scope="col" pra associação com células', () => {
    const w = makeWrapper()
    const headers = w.findAll('.th-sortable')
    headers.forEach((h) => expect(h.attributes('scope')).toBe('col'))
  })
})
