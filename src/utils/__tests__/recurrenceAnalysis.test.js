import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PRESETS,
  RECENT_WINDOW,
  computeMetrics,
  applyPreset,
  isTendenciaConfiavel,
} from '../recurrenceAnalysis'

// Helpers
function makeEst(banca, area, ano, disciplinas) {
  return { id: `${banca}-${area}-${ano}`, banca, area, ano, dados: { disciplinas } }
}
function disc(nome, qtd, pct, assuntos = []) { return { nome, qtd, pct, assuntos } }
function ass(nome, qtd, pct, sub_assuntos = []) { return { nome, qtd, pct, sub_assuntos } }
function sub(nome, qtd, pct) { return { nome, qtd, pct } }

function close(actual, expected, eps = 1e-6) {
  expect(Math.abs(actual - expected)).toBeLessThan(eps)
}

// Dataset FCC/Fiscal 5 anos:
//  - CTN aparece em 5/5 anos com volumes altos (alta recorrência + volume + slope+)
//  - Lei 8.137 aparece em 4/5 anos (80% recorrência, volume médio)
//  - ICMS aparece em 3/5 anos (60% recorrência, volume baixo)
//  - Crase (Português) aparece em 1/5 anos (20%, ínfimo)
//  - Atos Adm aparece em 5/5, mas com slope negativo
function fixtureFCC() {
  return [
    makeEst('FCC', 'Fiscal', 2022, [
      disc('Direito Tributário', 12, 12, [
        ass('CTN', 8, 8),
        ass('Lei 8.137', 2, 2),
        ass('ICMS', 2, 2),
      ]),
      disc('Direito Adm', 25, 25, [ass('Atos Adm', 25, 25)]),
      disc('Português', 1, 1, [ass('Crase', 1, 1)]),
    ]),
    makeEst('FCC', 'Fiscal', 2023, [
      disc('Direito Tributário', 12, 12, [
        ass('CTN', 9, 9),
        ass('Lei 8.137', 3, 3),
      ]),
      disc('Direito Adm', 22, 22, [ass('Atos Adm', 22, 22)]),
    ]),
    makeEst('FCC', 'Fiscal', 2024, [
      disc('Direito Tributário', 14, 14, [
        ass('CTN', 10, 10),
        ass('Lei 8.137', 2, 2),
        ass('ICMS', 2, 2),
      ]),
      disc('Direito Adm', 18, 18, [ass('Atos Adm', 18, 18)]),
    ]),
    makeEst('FCC', 'Fiscal', 2025, [
      disc('Direito Tributário', 16, 16, [
        ass('CTN', 11, 11),
        ass('Lei 8.137', 3, 3),
        ass('ICMS', 2, 2),
      ]),
      disc('Direito Adm', 12, 12, [ass('Atos Adm', 12, 12)]),
    ]),
    makeEst('FCC', 'Fiscal', 2026, [
      disc('Direito Tributário', 18, 18, [
        ass('CTN', 12, 12),
      ]),
      disc('Direito Adm', 5, 5, [ass('Atos Adm', 5, 5)]),
    ]),
  ]
}

// ──────────────────────────────────────────────────────────────────────────────
// computeMetrics — recorrência / volume / pct
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — recorrência', () => {
  it('item em todos os anos → 100%', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn).toBeTruthy()
    close(ctn.recorrencia, 100)
    expect(ctn.n).toBe(5)
  })

  it('item em 4 de 5 anos → 80%', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const lei = r.items.find((i) => i.nome === 'Lei 8.137')
    close(lei.recorrencia, 80)
    expect(lei.n).toBe(4)
  })

  it('item em 3 de 5 anos → 60%', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const icms = r.items.find((i) => i.nome === 'ICMS')
    close(icms.recorrencia, 60)
    expect(icms.n).toBe(3)
  })

  it('item ausente em todos os anos não aparece', () => {
    const fix = [makeEst('FCC', 'F', 2024, [disc('A', 5, 5, [ass('X', 0, 0)])])]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    expect(r.items.find((i) => i.nome === 'X')).toBeUndefined()
  })
})

describe('computeMetrics — volume médio condicional', () => {
  it('volumeMedio divide por anos com qtd>0, não por total de anos', () => {
    // ICMS: qtd em 3 anos = 2, 2, 2 → total=6, volumeMedio=6/3=2 (NÃO 6/5=1.2)
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const icms = r.items.find((i) => i.nome === 'ICMS')
    expect(icms.volumeTotal).toBe(6)
    close(icms.volumeMedio, 2)
  })

  it('volumeMedio de CTN: 50 questões em 5 anos → 10', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn.volumeTotal).toBe(50) // 8+9+10+11+12
    close(ctn.volumeMedio, 10)
  })
})

describe('computeMetrics — pctMedio condicional', () => {
  it('pctMedio só dos anos com qtd>0', () => {
    // ICMS: pct=2,2,2 em 3 anos → pctMedio = 2 (NÃO 6/5)
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const icms = r.items.find((i) => i.nome === 'ICMS')
    close(icms.pctMedio, 2)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// computeMetrics — granularidade + drill-down
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — granularidade', () => {
  it('granularidade=disciplina → só disciplinas', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'disciplina' })
    expect(r.items.every((i) => i.tipo === 'disciplina')).toBe(true)
    expect(r.items.map((i) => i.nome).sort()).toEqual([
      'Direito Adm',
      'Direito Tributário',
      'Português',
    ])
  })

  it('granularidade=assunto → só assuntos', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    expect(r.items.every((i) => i.tipo === 'assunto')).toBe(true)
  })

  it('granularidade=sub_assunto → só sub-assuntos (vazio se nenhum tem subs)', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'sub_assunto' })
    expect(r.items).toEqual([])
  })

  it('granularidade=sub_assunto retorna sub-assuntos quando existem', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [
        disc('Trib', 5, 5, [ass('CTN', 5, 5, [sub('Art 142', 3, 3), sub('Art 150', 2, 2)])]),
      ]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'sub_assunto' })
    expect(r.items.map((i) => i.nome).sort()).toEqual(['Art 142', 'Art 150'])
    expect(r.items.every((i) => i.tipo === 'sub_assunto')).toBe(true)
  })
})

describe('computeMetrics — drill-down', () => {
  it('disciplinaFiltro com granularidade=assunto → só assuntos da disciplina', () => {
    const r = computeMetrics(fixtureFCC(), {
      banca: 'FCC',
      area: 'Fiscal',
      granularidade: 'assunto',
      disciplinaFiltro: 'Direito Tributário',
    })
    expect(r.items.map((i) => i.nome).sort()).toEqual(['CTN', 'ICMS', 'Lei 8.137'])
    expect(r.items.every((i) => i.pai === 'Direito Tributário')).toBe(true)
  })

  it('drill-down sub_assunto: disciplinaFiltro + assuntoFiltro', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [
        disc('Trib', 5, 5, [
          ass('CTN', 5, 5, [sub('Art 142', 3, 3), sub('Art 150', 2, 2)]),
          ass('ICMS', 3, 3, [sub('FG', 3, 3)]),
        ]),
        disc('Adm', 4, 4, [ass('Atos', 4, 4, [sub('Validade', 4, 4)])]),
      ]),
    ]
    const r = computeMetrics(fix, {
      banca: 'FCC',
      area: 'F',
      granularidade: 'sub_assunto',
      disciplinaFiltro: 'Trib',
      assuntoFiltro: 'CTN',
    })
    expect(r.items.map((i) => i.nome).sort()).toEqual(['Art 142', 'Art 150'])
  })

  it('assuntoFiltro sem disciplinaFiltro é ignorado (spec §15.2)', () => {
    // CTN existe em duas disciplinas — sem disciplinaFiltro, assuntoFiltro deve ser ignorado
    // (caso contrário, mistura sub-assuntos das duas)
    const fix = [
      makeEst('FCC', 'F', 2024, [
        disc('Trib', 5, 5, [ass('CTN', 5, 5, [sub('Art 142', 3, 3)])]),
        disc('Outro', 4, 4, [ass('CTN', 4, 4, [sub('Outro Art', 4, 4)])]),
      ]),
    ]
    const r = computeMetrics(fix, {
      banca: 'FCC',
      area: 'F',
      granularidade: 'sub_assunto',
      assuntoFiltro: 'CTN', // sem disciplinaFiltro
    })
    // Todos os sub-assuntos retornam (filtro ignorado)
    expect(r.items.map((i) => i.nome).sort()).toEqual(['Art 142', 'Outro Art'])
  })

  it('banca com múltiplas áreas: filtro de área isola o universo', () => {
    const fix = [
      makeEst('FCC', 'Fiscal', 2024, [disc('Trib', 5, 5, [ass('CTN', 5, 5)])]),
      makeEst('FCC', 'Saude', 2024, [disc('Med', 3, 3, [ass('Epidem', 3, 3)])]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    expect(r.items.map((i) => i.nome)).toEqual(['CTN'])
  })

  it('disciplinaFiltro inexistente → items vazio', () => {
    const r = computeMetrics(fixtureFCC(), {
      banca: 'FCC',
      area: 'Fiscal',
      granularidade: 'assunto',
      disciplinaFiltro: 'Inexistente',
    })
    expect(r.items).toEqual([])
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// computeMetrics — slope/R²
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — slope/r2', () => {
  it('n>=2: slope e r2 calculados', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn.slope).not.toBeNull()
    expect(ctn.r2).not.toBeNull()
    expect(ctn.slope).toBeGreaterThan(0) // CTN sobe ao longo dos anos
  })

  it('atos adm: slope negativo (queda)', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const atos = r.items.find((i) => i.nome === 'Atos Adm')
    expect(atos.slope).toBeLessThan(0)
  })

  it('n=1 → slope=null e r2=null', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const crase = r.items.find((i) => i.nome === 'Crase')
    expect(crase).toBeTruthy()
    expect(crase.n).toBe(1)
    expect(crase.slope).toBeNull()
    expect(crase.r2).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// computeMetrics — cross-banca
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — cross-banca', () => {
  function fixtureMultiBanca() {
    return [
      // FCC tem CTN em 2 anos
      makeEst('FCC', 'Fiscal', 2024, [disc('Trib', 8, 8, [ass('CTN', 8, 8)])]),
      makeEst('FCC', 'Fiscal', 2025, [disc('Trib', 10, 10, [ass('CTN', 10, 10)])]),
      // Cespe tem CTN em 1 ano (mesma area)
      makeEst('Cespe', 'Fiscal', 2024, [disc('Trib', 6, 6, [ass('CTN', 6, 6)])]),
      // FGV tem CTN em outro ano (mesma area)
      makeEst('FGV', 'Fiscal', 2026, [disc('Trib', 5, 5, [ass('CTN', 5, 5)])]),
      // ABC tem CTN mas área diferente (não entra)
      makeEst('ABC', 'Saude', 2024, [disc('Trib', 100, 100, [ass('CTN', 100, 100)])]),
    ]
  }

  it('crossBanca=false: só dados da banca-alvo', () => {
    const r = computeMetrics(fixtureMultiBanca(), {
      banca: 'FCC',
      area: 'Fiscal',
      granularidade: 'assunto',
      crossBanca: false,
    })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn.volumeTotal).toBe(18) // 8+10
    expect(ctn.boostedBy).toEqual([])
    expect(r.bancasContribuintes).toEqual([])
    expect(r.anos).toEqual([2024, 2025])
  })

  it('crossBanca=true: agrega outras bancas com mesma area', () => {
    const r = computeMetrics(fixtureMultiBanca(), {
      banca: 'FCC',
      area: 'Fiscal',
      granularidade: 'assunto',
      crossBanca: true,
    })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    // FCC: 8+10=18; Cespe 2024: +6; FGV 2026: +5 → total 29
    expect(ctn.volumeTotal).toBe(29)
    expect(ctn.boostedBy.sort()).toEqual(['Cespe', 'FGV'])
    expect(r.bancasContribuintes.sort()).toEqual(['Cespe', 'FGV'])
    // Anos expandidos: 2024 (FCC+Cespe), 2025 (FCC), 2026 (FGV)
    expect(r.anos).toEqual([2024, 2025, 2026])
    // Recorrência: 3 anos com qtd>0 / 3 anos do dataset = 100%
    close(ctn.recorrencia, 100)
  })

  it('crossBanca: pct soma e clampa em 100', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [disc('A', 60, 60)]),
      makeEst('Cespe', 'F', 2024, [disc('A', 70, 70)]),
    ]
    const r = computeMetrics(fix, {
      banca: 'FCC',
      area: 'F',
      granularidade: 'disciplina',
      crossBanca: true,
    })
    const a = r.items.find((i) => i.nome === 'A')
    expect(a.volumeTotal).toBe(130)
    close(a.pctMedio, 100) // soma 60+70=130 → clampa 100
  })

  it('crossBanca exige area: sem area, ignora outras bancas', () => {
    const r = computeMetrics(fixtureMultiBanca(), {
      banca: 'FCC',
      granularidade: 'assunto',
      crossBanca: true,
    })
    expect(r.bancasContribuintes).toEqual([])
    const ctn = r.items.find((i) => i.nome === 'CTN')
    // Sem area, target = todos da FCC; outras bancas não entram
    expect(ctn.boostedBy).toEqual([])
  })

  it('crossBanca não inclui bancas com area diferente', () => {
    const r = computeMetrics(fixtureMultiBanca(), {
      banca: 'FCC',
      area: 'Fiscal',
      granularidade: 'assunto',
      crossBanca: true,
    })
    expect(r.bancasContribuintes).not.toContain('ABC')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// computeMetrics — edge cases
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — edge cases', () => {
  it('sem banca → items vazio', () => {
    const r = computeMetrics(fixtureFCC(), { granularidade: 'assunto' })
    expect(r.items).toEqual([])
    expect(r.anos).toEqual([])
  })

  it('banca inexistente → items vazio', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'Inexistente', granularidade: 'assunto' })
    expect(r.items).toEqual([])
  })

  it('estatisticas vazio → items vazio', () => {
    const r = computeMetrics([], { banca: 'FCC', granularidade: 'assunto' })
    expect(r.items).toEqual([])
  })

  it('estatisticas null → items vazio (sem crash)', () => {
    expect(() => computeMetrics(null, { banca: 'FCC' })).not.toThrow()
    const r = computeMetrics(null, { banca: 'FCC' })
    expect(r.items).toEqual([])
  })

  it('dados malformados são tolerados', () => {
    const fix = [
      { id: 'corrupt', banca: 'FCC', ano: 2024 }, // sem dados
      { id: 'corrupt2', banca: 'FCC', ano: 2025, dados: null },
      makeEst('FCC', 'F', 2025, [
        disc(null, 5, 5), // disciplina sem nome
        disc('Trib', 5, 5, [ass(undefined, 3, 3), ass('CTN', 5, 5, [sub('', 2, 2)])]),
      ]),
    ]
    expect(() => computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })).not.toThrow()
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    expect(r.items.find((i) => i.nome === 'CTN')).toBeTruthy()
    expect(r.items.find((i) => !i.nome)).toBeUndefined()
  })

  it('qtd/pct como string são coercidos', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [disc('A', '8', '12.5', [ass('CTN', '5', '8')])]),
      makeEst('FCC', 'F', 2025, [disc('A', '10', '13.5', [ass('CTN', '7', '9')])]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn.volumeTotal).toBe(12)
    close(ctn.pctMedio, 8.5)
  })

  it('caminhoCompleto reflete hierarquia completa pra sub-assuntos', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [
        disc('Trib', 5, 5, [ass('CTN', 5, 5, [sub('Art 142', 3, 3)])]),
      ]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'sub_assunto' })
    expect(r.items[0].caminhoCompleto).toBe('Trib → CTN → Art 142')
  })

  it('anos do dataset preservam ordem ascendente', () => {
    const fix = [
      makeEst('FCC', 'F', 2026, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2022, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2024, [disc('A', 5, 5)]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'disciplina' })
    expect(r.anos).toEqual([2022, 2024, 2026])
  })

  it('dataset com 1 ano: recorrência=100% para tudo que aparece', () => {
    const fix = [makeEst('FCC', 'F', 2024, [disc('A', 5, 5, [ass('CTN', 5, 5)])])]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    expect(r.items[0].recorrencia).toBe(100)
    expect(r.items[0].slope).toBeNull() // n=1
  })

  it('porAno é cópia (mutar não afeta nodes internos)', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    const before = { ...ctn.porAno }
    ctn.porAno[2024] = { qtd: 999, pct: 999 }
    // Reexecutar e checar que original não foi afetado
    const r2 = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn2 = r2.items.find((i) => i.nome === 'CTN')
    expect(ctn2.porAno[2024]).toEqual(before[2024])
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// applyPreset
// ──────────────────────────────────────────────────────────────────────────────

describe('applyPreset', () => {
  function makeItem(over) {
    return {
      nome: 'X',
      caminhoCompleto: 'X',
      tipo: 'assunto',
      pai: null,
      recorrencia: 80,
      volumeMedio: 5,
      volumeTotal: 25,
      pctMedio: 5,
      slope: 0.5,
      r2: 0.7,
      n: 5,
      qtdMax: 10,
      porAno: {},
      boostedBy: [],
      ...over,
    }
  }

  it('conservador filtra recorrência baixa', () => {
    const items = [makeItem({ recorrencia: 40 }), makeItem({ recorrencia: 60 })]
    const out = applyPreset(items, 'conservador')
    expect(out).toHaveLength(1)
    expect(out[0].recorrencia).toBe(60)
  })

  it('conservador filtra volumeTotal baixo', () => {
    const items = [makeItem({ volumeTotal: 4 }), makeItem({ volumeTotal: 6 })]
    const out = applyPreset(items, 'conservador')
    expect(out).toHaveLength(1)
    expect(out[0].volumeTotal).toBe(6)
  })

  it('moderado é mais permissivo que conservador', () => {
    const items = [makeItem({ recorrencia: 35, volumeTotal: 4 })]
    expect(applyPreset(items, 'conservador')).toHaveLength(0)
    expect(applyPreset(items, 'moderado')).toHaveLength(1)
  })

  it('permissivo deixa quase tudo passar', () => {
    const items = [makeItem({ recorrencia: 20, volumeTotal: 1 })]
    expect(applyPreset(items, 'permissivo')).toHaveLength(1)
    expect(applyPreset(items, 'moderado')).toHaveLength(0)
  })

  it('item sem slope passa se recorrência+volume permitirem', () => {
    const items = [makeItem({ slope: null, r2: null, n: 1 })]
    expect(applyPreset(items, 'conservador')).toHaveLength(1)
  })

  it('preset name desconhecido cai pra moderado', () => {
    const items = [makeItem({ recorrencia: 35, volumeTotal: 4 })]
    expect(applyPreset(items, 'invalido')).toHaveLength(1)
  })

  it('customThresholds override mescla com defaults', () => {
    const items = [makeItem({ recorrencia: 70 })]
    // Conservador exige >=50; subindo override pra 80 deve filtrar
    expect(applyPreset(items, 'conservador', { recorrenciaMin: 80 })).toHaveLength(0)
  })

  it('items null/undefined → array vazio', () => {
    expect(applyPreset(null, 'moderado')).toEqual([])
    expect(applyPreset(undefined, 'moderado')).toEqual([])
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// isTendenciaConfiavel
// ──────────────────────────────────────────────────────────────────────────────

describe('isTendenciaConfiavel', () => {
  function makeItem(over) {
    return { slope: 0.5, r2: 0.6, ...over }
  }

  it('item sem slope (n=1) → não confiável', () => {
    expect(isTendenciaConfiavel(makeItem({ slope: null, r2: null }), 'moderado')).toBe(false)
  })

  it('r2 abaixo do preset → não confiável', () => {
    expect(isTendenciaConfiavel(makeItem({ r2: 0.3 }), 'moderado')).toBe(false)
  })

  it('|slope| abaixo do preset → não confiável', () => {
    expect(isTendenciaConfiavel(makeItem({ slope: 0.1 }), 'moderado')).toBe(false)
  })

  it('passa em ambos os thresholds → confiável', () => {
    expect(isTendenciaConfiavel(makeItem({ slope: 0.5, r2: 0.7 }), 'moderado')).toBe(true)
  })

  it('slope negativo grande passa (usa abs)', () => {
    expect(isTendenciaConfiavel(makeItem({ slope: -0.8, r2: 0.7 }), 'conservador')).toBe(true)
  })

  it('permissivo: tudo confiável (thresholds zeradas)', () => {
    expect(isTendenciaConfiavel(makeItem({ slope: 0.01, r2: 0 }), 'permissivo')).toBe(true)
  })

  it('item null não crasha', () => {
    expect(isTendenciaConfiavel(null, 'moderado')).toBe(false)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// DEFAULT_PRESETS — sanity
// ──────────────────────────────────────────────────────────────────────────────

describe('computeMetrics — recência (janela últimos 3 anos)', () => {
  it('RECENT_WINDOW exporta valor 3', () => {
    expect(RECENT_WINDOW).toBe(3)
  })

  it('dataset com 5 anos: janelaRecente = últimos 3', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    expect(r.janelaRecente).toEqual([2024, 2025, 2026])
  })

  it('CTN aparece em todos os 5 anos: recencia=100% (3/3)', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const ctn = r.items.find((i) => i.nome === 'CTN')
    close(ctn.recencia, 100)
    expect(ctn.recenciaAnos).toEqual([2024, 2025, 2026])
  })

  it('Lei 8.137 aparece em 2022/2023/2024/2025 (4 anos): recencia=67% (2/3, anos recentes 2024/2025)', () => {
    const r = computeMetrics(fixtureFCC(), { banca: 'FCC', area: 'Fiscal', granularidade: 'assunto' })
    const lei = r.items.find((i) => i.nome === 'Lei 8.137')
    close(lei.recencia, (2 / 3) * 100)
    expect(lei.recenciaAnos.sort()).toEqual([2024, 2025])
  })

  it('item sumindo: recencia << recorrencia', () => {
    // 4 anos com qtd>0, mas só em 2022 e 2023 (anos antigos) — janela recente 2024-2026 = 0
    const fix = [
      makeEst('FCC', 'F', 2022, [disc('A', 5, 5, [ass('Sumindo', 5, 5)])]),
      makeEst('FCC', 'F', 2023, [disc('A', 5, 5, [ass('Sumindo', 5, 5)])]),
      makeEst('FCC', 'F', 2024, [disc('A', 5, 5)]), // sem o assunto
      makeEst('FCC', 'F', 2025, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2026, [disc('A', 5, 5)]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    const sumindo = r.items.find((i) => i.nome === 'Sumindo')
    close(sumindo.recorrencia, 40) // 2/5 anos
    close(sumindo.recencia, 0) // 0/3 anos recentes
    expect(sumindo.recenciaAnos).toEqual([])
  })

  it('item subindo: recencia >> recorrencia', () => {
    // Aparece só em 2025 e 2026 (anos recentes) — recorrência baixa, recência alta
    const fix = [
      makeEst('FCC', 'F', 2022, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2023, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2024, [disc('A', 5, 5)]),
      makeEst('FCC', 'F', 2025, [disc('A', 5, 5, [ass('Novo', 5, 5)])]),
      makeEst('FCC', 'F', 2026, [disc('A', 5, 5, [ass('Novo', 5, 5)])]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    const novo = r.items.find((i) => i.nome === 'Novo')
    close(novo.recorrencia, 40) // 2/5
    close(novo.recencia, (2 / 3) * 100) // 2/3 (2025 e 2026)
    expect(novo.recenciaAnos).toEqual([2025, 2026])
  })

  it('dataset com 2 anos: recencia=null e recenciaAnos=[]', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [disc('A', 5, 5, [ass('CTN', 5, 5)])]),
      makeEst('FCC', 'F', 2025, [disc('A', 5, 5, [ass('CTN', 5, 5)])]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    expect(r.janelaRecente).toEqual([])
    const ctn = r.items.find((i) => i.nome === 'CTN')
    expect(ctn.recencia).toBeNull()
    expect(ctn.recenciaAnos).toEqual([])
  })

  it('dataset com exatamente 3 anos: janela = todos, recencia == recorrencia', () => {
    const fix = [
      makeEst('FCC', 'F', 2024, [disc('A', 5, 5, [ass('CTN', 5, 5)])]),
      makeEst('FCC', 'F', 2025, [disc('A', 5, 5)]), // sem CTN nesse ano
      makeEst('FCC', 'F', 2026, [disc('A', 5, 5, [ass('CTN', 5, 5)])]),
    ]
    const r = computeMetrics(fix, { banca: 'FCC', area: 'F', granularidade: 'assunto' })
    expect(r.janelaRecente).toEqual([2024, 2025, 2026])
    const ctn = r.items.find((i) => i.nome === 'CTN')
    close(ctn.recorrencia, (2 / 3) * 100)
    close(ctn.recencia, (2 / 3) * 100)
  })

  it('dataset vazio: janelaRecente=[]', () => {
    const r = computeMetrics([], { banca: 'FCC', granularidade: 'assunto' })
    expect(r.janelaRecente).toEqual([])
  })

  it('sem banca: janelaRecente=[]', () => {
    const r = computeMetrics(fixtureFCC(), { granularidade: 'assunto' })
    expect(r.janelaRecente).toEqual([])
  })
})

describe('DEFAULT_PRESETS', () => {
  it('três presets nomeados', () => {
    expect(Object.keys(DEFAULT_PRESETS).sort()).toEqual(['conservador', 'moderado', 'permissivo'])
  })

  it('thresholds em ordem de severidade', () => {
    expect(DEFAULT_PRESETS.conservador.recorrenciaMin).toBeGreaterThan(
      DEFAULT_PRESETS.moderado.recorrenciaMin,
    )
    expect(DEFAULT_PRESETS.moderado.recorrenciaMin).toBeGreaterThan(
      DEFAULT_PRESETS.permissivo.recorrenciaMin,
    )
  })

  it('frozen (não pode mutar)', () => {
    expect(Object.isFrozen(DEFAULT_PRESETS)).toBe(true)
  })
})
