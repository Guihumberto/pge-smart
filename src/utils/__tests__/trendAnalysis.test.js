import { describe, it, expect } from 'vitest'
import { calculateTrend, qualifies, DEFAULT_THRESHOLDS, buildTrendRanking } from '../trendAnalysis'

// Helper para comparar floats com tolerância
function close(actual, expected, eps = 1e-6) {
  expect(Math.abs(actual - expected)).toBeLessThan(eps)
}

describe('calculateTrend', () => {
  it('pontos colineares perfeitos: slope conhecido, R²=1', () => {
    // y = 2x - 4040 (slope=2 pp/ano, intercept=-4040)
    const result = calculateTrend({ 2022: 4, 2023: 6, 2024: 8, 2025: 10, 2026: 12 })
    close(result.slope, 2.0)
    close(result.r2, 1.0)
    expect(result.points).toHaveLength(5)
  })

  it('slope negativo (descendente)', () => {
    const result = calculateTrend({ 2022: 10, 2023: 8, 2024: 6, 2025: 4, 2026: 2 })
    close(result.slope, -2.0)
    close(result.r2, 1.0)
  })

  it('pontos com ruído: R² < 1', () => {
    // Tendência geral de subida, mas com oscilação
    const result = calculateTrend({ 2022: 3, 2023: 5, 2024: 4, 2025: 7, 2026: 8 })
    expect(result.slope).toBeGreaterThan(0)
    expect(result.r2).toBeGreaterThan(0.5)
    expect(result.r2).toBeLessThan(1.0)
  })

  it('pontos completamente ruidosos: R² baixo', () => {
    // Sem tendência clara
    const result = calculateTrend({ 2022: 5, 2023: 1, 2024: 5, 2025: 1, 2026: 5 })
    expect(result.r2).toBeLessThan(0.5)
  })

  it('n=0 (mapa vazio): retorna zeros', () => {
    const result = calculateTrend({})
    expect(result.slope).toBe(0)
    expect(result.r2).toBe(0)
    expect(result.intercept).toBe(0)
    expect(result.points).toEqual([])
  })

  it('n=1: retorna slope=0, r2=0, intercept=ponto único', () => {
    const result = calculateTrend({ 2024: 5 })
    expect(result.slope).toBe(0)
    expect(result.r2).toBe(0)
    expect(result.intercept).toBe(5)
    expect(result.points).toEqual([[2024, 5]])
  })

  it('todos os y iguais (sem variância): slope=0, r2=1, intercept=valor comum', () => {
    const result = calculateTrend({ 2022: 5, 2023: 5, 2024: 5, 2025: 5 })
    close(result.slope, 0)
    expect(result.r2).toBe(1)
    expect(result.intercept).toBe(5)
  })

  it('n=2 com pontos colineares: R²=1', () => {
    // Apenas 2 pontos sempre dão reta perfeita
    const result = calculateTrend({ 2024: 4, 2025: 6 })
    close(result.slope, 2)
    close(result.r2, 1)
  })

  it('valores não-numéricos (NaN/null) são filtrados', () => {
    const result = calculateTrend({ 2022: 4, 2023: NaN, 2024: 8, 2025: null })
    expect(result.points).toHaveLength(2) // só 2022 e 2024 sobram
    close(result.slope, 2.0)
  })

  it('chaves de ano como string são parseadas', () => {
    const result = calculateTrend({ '2022': 4, '2023': 6, '2024': 8 })
    close(result.slope, 2)
    close(result.r2, 1)
  })

  it('retorna pontos ordenados por ano ascendente', () => {
    const result = calculateTrend({ 2026: 12, 2022: 4, 2024: 8, 2023: 6, 2025: 10 })
    expect(result.points.map(([y]) => y)).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  it('input null/undefined: trata como vazio', () => {
    expect(calculateTrend(null).points).toEqual([])
    expect(calculateTrend(undefined).points).toEqual([])
  })
})

describe('qualifies', () => {
  function makeStats(overrides = {}) {
    return {
      slope: 1.0,
      r2: 0.8,
      n: 5,
      qtdMax: 10,
      ...overrides,
    }
  }

  it('passa quando todos os thresholds são atendidos', () => {
    expect(qualifies(makeStats())).toBe(true)
  })

  it('reprova quando n < minAnosQtdPositiva', () => {
    expect(qualifies(makeStats({ n: 2 }))).toBe(false)
    expect(qualifies(makeStats({ n: 3 }))).toBe(true) // limite inclusivo
  })

  it('reprova quando qtdMax < minQtdMaxAbsoluta', () => {
    expect(qualifies(makeStats({ qtdMax: 2 }))).toBe(false)
    expect(qualifies(makeStats({ qtdMax: 3 }))).toBe(true) // limite inclusivo (calibrado 2026-05-07)
  })

  it('reprova quando r2 < minR2', () => {
    expect(qualifies(makeStats({ r2: 0.49 }))).toBe(false)
    expect(qualifies(makeStats({ r2: 0.5 }))).toBe(true)
  })

  it('reprova quando |slope| < minSlopeAbs', () => {
    expect(qualifies(makeStats({ slope: 0.29 }))).toBe(false)
    expect(qualifies(makeStats({ slope: -0.29 }))).toBe(false)
    expect(qualifies(makeStats({ slope: 0.3 }))).toBe(true)
    expect(qualifies(makeStats({ slope: -0.3 }))).toBe(true)
  })

  it('aceita override de thresholds', () => {
    const lenient = { minAnosQtdPositiva: 2, minQtdMaxAbsoluta: 1, minR2: 0.1, minSlopeAbs: 0.05 }
    expect(qualifies(makeStats({ n: 2, qtdMax: 1, r2: 0.1, slope: 0.05 }), lenient)).toBe(true)
  })

  it('override parcial mescla com defaults', () => {
    // Só relaxa minR2; restantes permanecem default
    expect(qualifies(makeStats({ r2: 0.3, n: 2 }), { minR2: 0.2 })).toBe(false) // n falha
    expect(qualifies(makeStats({ r2: 0.3 }), { minR2: 0.2 })).toBe(true) // só r2 relaxado, n=5 OK
  })

  it('reprova com stats inválido (null, undefined)', () => {
    expect(qualifies(null)).toBe(false)
    expect(qualifies(undefined)).toBe(false)
  })

  it('reprova com campos não-numéricos (NaN)', () => {
    expect(qualifies(makeStats({ slope: NaN }))).toBe(false)
    expect(qualifies(makeStats({ r2: NaN }))).toBe(false)
    expect(qualifies(makeStats({ n: NaN }))).toBe(false)
    expect(qualifies(makeStats({ qtdMax: NaN }))).toBe(false)
  })
})

describe('DEFAULT_THRESHOLDS', () => {
  it('é congelado (imutável)', () => {
    expect(Object.isFrozen(DEFAULT_THRESHOLDS)).toBe(true)
  })

  it('tem os 4 thresholds (calibrados em 2026-05-07 via dados reais FGV/OAB)', () => {
    expect(DEFAULT_THRESHOLDS).toEqual({
      minAnosQtdPositiva: 3,
      minQtdMaxAbsoluta: 3, // ajustado de 5 para 3 após calibração empírica
      minR2: 0.5,
      minSlopeAbs: 0.3,
    })
  })
})

describe('Edge Cases Not Covered', () => {
  it('Infinity value in yearMap is filtered out', () => {
    const yearMap = { 2022: 5, 2023: Infinity, 2024: 8 }
    const result = calculateTrend(yearMap)
    expect(result.points).toHaveLength(2) // só 2022 e 2024
    expect(result.points).toEqual([[2022, 5], [2024, 8]])
  })

  it('negative year values work mathematically', () => {
    const yearMap = { 1950: 2, 1960: 5, 1970: 8 }
    const result = calculateTrend(yearMap)
    expect(result.points).toHaveLength(3)
    // slope = change / year_span = 6 / 20 = 0.3
    close(result.slope, 0.3)
  })

  it('all y equal at 0', () => {
    const yearMap = { 2022: 0, 2023: 0, 2024: 0 }
    const result = calculateTrend(yearMap)
    expect(result.slope).toBe(0)
    expect(result.r2).toBe(1) // reta horizontal perfeita
    expect(result.intercept).toBe(0)
  })

  it('qualifies with Infinity in slope — should fail Number.isFinite', () => {
    // ACHADO: Number.isFinite(Infinity) === false? Não! Number.isFinite(Infinity) === false.
    const stats = { slope: Infinity, r2: 0.8, n: 5, qtdMax: 10 }
    expect(qualifies(stats)).toBe(false)
  })

  it('qualifies with -Infinity in slope', () => {
    const stats = { slope: -Infinity, r2: 0.8, n: 5, qtdMax: 10 }
    expect(qualifies(stats)).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// buildTrendRanking — pipeline completo
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Helper para criar uma estatística mock no shape esperado pelo store.
 */
function makeEst(banca, area, ano, disciplinas) {
  return {
    id: `${banca}-${area}-${ano}`,
    banca,
    area,
    ano,
    descricao: '',
    dados: { disciplinas },
  }
}

/**
 * Cria 5 estatísticas FGV/Fiscal de 2022-2026 com tendências variadas.
 * - Direito Tributário (alta confiável): pct sobe de 10 pra 22, qtd alta
 * - Direito Adm (queda confiável): pct cai de 25 pra 5, qtd alta
 * - Português (volume baixo - filtrado): qtd sempre <5
 * - Matemática (R² baixo - filtrado): pct oscila
 * - Constitucional (slope baixo - filtrado): pct quase plano
 */
function fixtureCompleta() {
  function disc(nome, qtd, pct, assuntos = []) {
    return { nome, qtd, pct, assuntos }
  }
  function ass(nome, qtd, pct, sub_assuntos = []) {
    return { nome, qtd, pct, sub_assuntos }
  }

  return [
    makeEst('FGV', 'Fiscal', 2022, [
      disc('Direito Tributário', 10, 10, [ass('CTN', 8, 8), ass('Lei 8.137', 2, 2)]),
      disc('Direito Adm', 25, 25, [ass('Atos Administrativos', 20, 20)]),
      disc('Português', 1, 1, [ass('Crase', 1, 1)]),
      disc('Matemática', 5, 5, [ass('Porcentagem', 5, 5)]),
      disc('Constitucional', 12, 12, [ass('Princípios', 12, 12)]),
    ]),
    makeEst('FGV', 'Fiscal', 2023, [
      disc('Direito Tributário', 13, 13, [ass('CTN', 11, 11), ass('Lei 8.137', 2, 2)]),
      disc('Direito Adm', 20, 20, [ass('Atos Administrativos', 18, 18)]),
      disc('Português', 2, 2, [ass('Crase', 2, 2)]),
      disc('Matemática', 1, 1, [ass('Porcentagem', 1, 1)]),
      disc('Constitucional', 12, 12, [ass('Princípios', 12, 12)]),
    ]),
    makeEst('FGV', 'Fiscal', 2024, [
      disc('Direito Tributário', 16, 16, [ass('CTN', 14, 14), ass('Lei 8.137', 2, 2)]),
      disc('Direito Adm', 15, 15, [ass('Atos Administrativos', 13, 13)]),
      disc('Português', 1, 1, [ass('Crase', 1, 1)]),
      disc('Matemática', 6, 6, [ass('Porcentagem', 6, 6)]),
      disc('Constitucional', 12, 12, [ass('Princípios', 12, 12)]),
    ]),
    makeEst('FGV', 'Fiscal', 2025, [
      disc('Direito Tributário', 19, 19, [ass('CTN', 17, 17), ass('Lei 8.137', 2, 2)]),
      disc('Direito Adm', 10, 10, [ass('Atos Administrativos', 8, 8)]),
      disc('Português', 2, 2, [ass('Crase', 2, 2)]),
      disc('Matemática', 1, 1, [ass('Porcentagem', 1, 1)]),
      disc('Constitucional', 12, 12, [ass('Princípios', 12, 12)]),
    ]),
    makeEst('FGV', 'Fiscal', 2026, [
      disc('Direito Tributário', 22, 22, [ass('CTN', 20, 20), ass('Lei 8.137', 2, 2)]),
      disc('Direito Adm', 5, 5, [ass('Atos Administrativos', 3, 3)]),
      disc('Português', 1, 1, [ass('Crase', 1, 1)]),
      disc('Matemática', 7, 7, [ass('Porcentagem', 7, 7)]),
      disc('Constitucional', 12, 12, [ass('Princípios', 12, 12)]),
    ]),
  ]
}

describe('buildTrendRanking', () => {
  it('retorna estrutura vazia quando não há estatísticas', () => {
    const r = buildTrendRanking([], { banca: 'FGV', area: 'Fiscal' })
    expect(r.anos).toEqual([])
    expect(r.subindo).toEqual([])
    expect(r.descendo).toEqual([])
    expect(r.total).toBe(0)
  })

  it('retorna estrutura vazia quando banca filtrada não existe', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'Cespe', area: 'Fiscal' })
    expect(r.anos).toEqual([])
    expect(r.subindo).toEqual([])
  })

  it('extrai anos únicos ordenados do dataset filtrado', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    expect(r.anos).toEqual([2022, 2023, 2024, 2025, 2026])
  })

  it('detecta tendência de alta confiável (Direito Tributário → CTN)', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const ctn = r.subindo.find((t) => t.nome === 'Direito Tributário → CTN')
    expect(ctn).toBeDefined()
    expect(ctn.slope).toBeGreaterThan(0)
    expect(ctn.r2).toBeGreaterThanOrEqual(0.5)
    expect(ctn.n).toBe(5)
    expect(ctn.qtdMax).toBe(20)
  })

  it('detecta tendência de queda confiável (Direito Adm → Atos)', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const atos = r.descendo.find((t) => t.nome === 'Direito Adm → Atos Administrativos')
    expect(atos).toBeDefined()
    expect(atos.slope).toBeLessThan(0)
    expect(atos.r2).toBeGreaterThanOrEqual(0.5)
  })

  it('filtra assunto com qtd absoluta sempre baixa (Português → Crase)', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const all = [...r.subindo, ...r.descendo].map((t) => t.nome)
    expect(all).not.toContain('Português → Crase')
  })

  it('filtra assunto com R² baixo (Matemática → Porcentagem oscilante)', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const all = [...r.subindo, ...r.descendo].map((t) => t.nome)
    expect(all).not.toContain('Matemática → Porcentagem')
  })

  it('filtra assunto com slope ~0 (Constitucional → Princípios plano)', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const all = [...r.subindo, ...r.descendo].map((t) => t.nome)
    expect(all).not.toContain('Constitucional → Princípios')
  })

  it('descartados conta total e quebra por motivo', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    // Lei 8.137 (slope 0), Crase (qtd baixa), Porcentagem (R² baixo), Princípios (slope 0)
    expect(r.descartados.total).toBeGreaterThanOrEqual(3)
    expect(r.descartados.qtdBaixa).toBeGreaterThanOrEqual(1) // Crase
    expect(r.descartados.slopeBaixo).toBeGreaterThanOrEqual(1) // Lei 8.137 ou Princípios
    // Soma das categorias = total
    const soma = r.descartados.poucosAnos + r.descartados.qtdBaixa + r.descartados.r2Baixo + r.descartados.slopeBaixo
    expect(soma).toBe(r.descartados.total)
  })

  it('expõe qualifyReason para diagnóstico', async () => {
    const { qualifyReason } = await import('../trendAnalysis')
    expect(qualifyReason({ slope: 1, r2: 0.8, n: 5, qtdMax: 10 })).toBe(null)
    expect(qualifyReason({ slope: 1, r2: 0.8, n: 2, qtdMax: 10 })).toBe('poucosAnos')
    expect(qualifyReason({ slope: 1, r2: 0.8, n: 5, qtdMax: 2 })).toBe('qtdBaixa')
    expect(qualifyReason({ slope: 1, r2: 0.4, n: 5, qtdMax: 10 })).toBe('r2Baixo')
    expect(qualifyReason({ slope: 0.2, r2: 0.8, n: 5, qtdMax: 10 })).toBe('slopeBaixo')
  })

  it('itens carregam porAno com {pct, qtd} para cada ano', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const ctn = r.subindo.find((t) => t.nome === 'Direito Tributário → CTN')
    expect(ctn.porAno).toBeDefined()
    expect(ctn.porAno[2022]).toEqual({ pct: 8, qtd: 8 })
    expect(ctn.porAno[2026]).toEqual({ pct: 20, qtd: 20 })
  })

  it('respeita limite maxItems', () => {
    const r = buildTrendRanking(fixtureCompleta(), {
      banca: 'FGV', area: 'Fiscal', maxItems: 1,
    })
    expect(r.subindo.length).toBeLessThanOrEqual(1)
    expect(r.descendo.length).toBeLessThanOrEqual(1)
  })

  it('aceita override de thresholds (relaxa filtros)', () => {
    const fix = fixtureCompleta()
    const defaultRanking = buildTrendRanking(fix, { banca: 'FGV', area: 'Fiscal' })
    const relaxedRanking = buildTrendRanking(fix, {
      banca: 'FGV', area: 'Fiscal',
      thresholds: {
        minAnosQtdPositiva: 2,
        minQtdMaxAbsoluta: 1,
        minR2: 0.0,
        minSlopeAbs: 0.05,
      },
    })
    expect(relaxedRanking.total).toBeGreaterThan(defaultRanking.total)
  })

  it('ordena subindo por slope descendente, descendo por slope ascendente (mais negativo primeiro)', () => {
    const r = buildTrendRanking(fixtureCompleta(), {
      banca: 'FGV', area: 'Fiscal',
      thresholds: { ...DEFAULT_THRESHOLDS, minQtdMaxAbsoluta: 1, minR2: 0.1, minSlopeAbs: 0.1 },
    })
    for (let i = 1; i < r.subindo.length; i++) {
      expect(r.subindo[i - 1].slope).toBeGreaterThanOrEqual(r.subindo[i].slope)
    }
    for (let i = 1; i < r.descendo.length; i++) {
      expect(r.descendo[i - 1].slope).toBeLessThanOrEqual(r.descendo[i].slope)
    }
  })

  it('disciplinasMap carrega pct por ano para cada disciplina', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    expect(r.disciplinasMap['Direito Tributário']).toEqual({
      2022: 10, 2023: 13, 2024: 16, 2025: 19, 2026: 22,
    })
  })

  it('assuntosMap carrega disc + pct por ano', () => {
    const r = buildTrendRanking(fixtureCompleta(), { banca: 'FGV', area: 'Fiscal' })
    const ctn = r.assuntosMap['Direito Tributário → CTN']
    expect(ctn.disc).toBe('Direito Tributário')
    expect(ctn[2022]).toBe(8)
    expect(ctn[2026]).toBe(20)
  })

  it('subAssuntosMap presente quando há sub-assuntos', () => {
    const fix = fixtureCompleta()
    // Adicionar um sub-assunto em 2024 e 2025
    fix[2].dados.disciplinas[0].assuntos[0].sub_assuntos = [
      { nome: 'Art. 3', qtd: 5, pct: 5 },
    ]
    fix[3].dados.disciplinas[0].assuntos[0].sub_assuntos = [
      { nome: 'Art. 3', qtd: 7, pct: 7 },
    ]
    const r = buildTrendRanking(fix, { banca: 'FGV', area: 'Fiscal' })
    expect(r.subAssuntosMap['Direito Tributário → CTN → Art. 3']).toBeDefined()
    expect(r.subAssuntosMap['Direito Tributário → CTN → Art. 3'].disc).toBe('Direito Tributário')
    expect(r.subAssuntosMap['Direito Tributário → CTN → Art. 3'].assunto).toBe('CTN')
  })

  it('filtro por disciplina retorna assuntos + sub-assuntos da disciplina', () => {
    const fix = fixtureCompleta()
    // Adiciona sub-assunto com tendência clara em CTN para validar
    for (let i = 0; i < 5; i++) {
      const ano = 2022 + i
      const subPct = 2 + i * 2 // 2, 4, 6, 8, 10
      fix[i].dados.disciplinas[0].assuntos[0].sub_assuntos = [
        { nome: 'Art. 3', qtd: subPct, pct: subPct },
      ]
    }
    const r = buildTrendRanking(fix, {
      banca: 'FGV', area: 'Fiscal', disciplina: 'Direito Tributário',
    })
    const nomes = [...r.subindo, ...r.descendo].map((t) => t.nome)
    // Todos itens devem começar com 'Direito Tributário →'
    nomes.forEach((n) => expect(n.startsWith('Direito Tributário →')).toBe(true))
    // Sub-assunto Art. 3 deve estar presente
    expect(nomes.some((n) => n.includes('Art. 3'))).toBe(true)
  })

  it('filtra por banca/área separadamente', () => {
    const fix = [
      ...fixtureCompleta(), // FGV/Fiscal
      makeEst('Cespe', 'Fiscal', 2024, [
        { nome: 'Direito Tributário', qtd: 50, pct: 50, assuntos: [] },
      ]),
    ]
    const r = buildTrendRanking(fix, { banca: 'FGV', area: 'Fiscal' })
    // Só dados FGV
    expect(Object.values(r.disciplinasMap['Direito Tributário'])).not.toContain(50)
  })

  it('trata estatística malformada (sem dados) sem quebrar', () => {
    const fix = [
      makeEst('FGV', 'Fiscal', 2024, [{ nome: 'A', qtd: 5, pct: 5, assuntos: [] }]),
      { id: 'corrupt', banca: 'FGV', area: 'Fiscal', ano: 2025 }, // sem dados
      null,
      undefined,
    ]
    expect(() => buildTrendRanking(fix, { banca: 'FGV', area: 'Fiscal' })).not.toThrow()
  })

  it('estatísticas com area undefined batem com filtro area=""', () => {
    const fix = [
      makeEst('FGV', '', 2022, [{ nome: 'A', qtd: 5, pct: 5, assuntos: [] }]),
      makeEst('FGV', '', 2023, [{ nome: 'A', qtd: 5, pct: 5, assuntos: [] }]),
      { id: 'no-area', banca: 'FGV', ano: 2024, dados: { disciplinas: [{ nome: 'A', qtd: 5, pct: 5, assuntos: [] }] } },
    ]
    const r = buildTrendRanking(fix, { banca: 'FGV', area: '' })
    expect(r.anos.length).toBeGreaterThanOrEqual(2)
  })

  it('coerce qtd/pct como string para number', () => {
    const fix = [
      makeEst('FGV', 'F', 2022, [{ nome: 'A', qtd: '10', pct: '5', assuntos: [{ nome: 'B', qtd: '8', pct: '4', sub_assuntos: [] }] }]),
      makeEst('FGV', 'F', 2023, [{ nome: 'A', qtd: '12', pct: '6', assuntos: [{ nome: 'B', qtd: '10', pct: '5', sub_assuntos: [] }] }]),
      makeEst('FGV', 'F', 2024, [{ nome: 'A', qtd: '14', pct: '7', assuntos: [{ nome: 'B', qtd: '12', pct: '6', sub_assuntos: [] }] }]),
    ]
    const r = buildTrendRanking(fix, { banca: 'FGV', area: 'F' })
    expect(r.disciplinasMap['A'][2022]).toBe(5) // number, não "5"
    expect(typeof r.disciplinasMap['A'][2022]).toBe('number')
  })

  it('ignora disciplina/assunto/sub-assunto sem nome (data corrupta)', () => {
    const fix = [
      makeEst('FGV', 'F', 2022, [
        { nome: 'A', qtd: 5, pct: 5, assuntos: [{ nome: '', qtd: 5, pct: 5, sub_assuntos: [] }] }, // ass sem nome
        { nome: '', qtd: 5, pct: 5, assuntos: [] }, // disc sem nome
        null, // null
      ]),
    ]
    expect(() => buildTrendRanking(fix, { banca: 'FGV', area: 'F' })).not.toThrow()
    const r = buildTrendRanking(fix, { banca: 'FGV', area: 'F' })
    expect(r.disciplinasMap['A']).toBeDefined()
    expect(r.disciplinasMap['']).toBeUndefined()
  })

  it('duplicatas de banca/area/ano: último vence (sobrescreve no mapa)', () => {
    const fix = [
      makeEst('FGV', 'F', 2022, [{ nome: 'A', qtd: 5, pct: 5, assuntos: [] }]),
      makeEst('FGV', 'F', 2022, [{ nome: 'A', qtd: 10, pct: 10, assuntos: [] }]), // duplicata, mais recente
    ]
    const r = buildTrendRanking(fix, { banca: 'FGV', area: 'F' })
    expect(r.disciplinasMap['A'][2022]).toBe(10) // último vence
  })
})
