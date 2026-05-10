import { describe, it, expect } from 'vitest'
import { csvEscape, buildCsv, buildCsvFilename, sanitizeFormulaPrefix } from '../csvExport'

function makeItem(over = {}) {
  return {
    nome: 'CTN',
    caminhoCompleto: 'Tributário → CTN',
    tipo: 'assunto',
    pai: 'Tributário',
    recorrencia: 100,
    recencia: 100,
    recenciaAnos: [2024, 2025, 2026],
    volumeMedio: 8.2,
    volumeTotal: 41,
    pctMedio: 12,
    slope: 0.85,
    r2: 0.87,
    n: 5,
    qtdMax: 12,
    porAno: {},
    boostedBy: [],
    ...over,
  }
}

describe('sanitizeFormulaPrefix (CSV injection prevention)', () => {
  it('= → prefixado com aspa simples', () => {
    expect(sanitizeFormulaPrefix('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
  })

  it('+ → prefixado', () => {
    expect(sanitizeFormulaPrefix('+1+1')).toBe("'+1+1")
  })

  it('- → prefixado (poderia executar fórmula em LibreOffice)', () => {
    expect(sanitizeFormulaPrefix('-1+cmd')).toBe("'-1+cmd")
  })

  it('@ → prefixado (Lotus 1-2-3 legado)', () => {
    expect(sanitizeFormulaPrefix('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('TAB inicial → prefixado', () => {
    expect(sanitizeFormulaPrefix('\t=cmd')).toBe("'\t=cmd")
  })

  it('CR inicial → prefixado', () => {
    expect(sanitizeFormulaPrefix('\rcmd')).toBe("'\rcmd")
  })

  it('texto seguro não é prefixado', () => {
    expect(sanitizeFormulaPrefix('CTN')).toBe('CTN')
    expect(sanitizeFormulaPrefix('Direito Tributário → CTN')).toBe('Direito Tributário → CTN')
  })

  it('número e null tratados', () => {
    expect(sanitizeFormulaPrefix(42)).toBe('42')
    expect(sanitizeFormulaPrefix(null)).toBe('')
    expect(sanitizeFormulaPrefix(undefined)).toBe('')
  })

  it('string vazia retorna vazia', () => {
    expect(sanitizeFormulaPrefix('')).toBe('')
  })
})

describe('csvEscape', () => {
  it('valor simples sem caracteres especiais não é escapado', () => {
    expect(csvEscape('CTN')).toBe('CTN')
  })

  it('valor com vírgula é escapado com aspas', () => {
    expect(csvEscape('Cespe, FGV')).toBe('"Cespe, FGV"')
  })

  it('valor com aspas duplas duplica as aspas', () => {
    expect(csvEscape('Direito "Tributário"')).toBe('"Direito ""Tributário"""')
  })

  it('valor com quebra de linha é escapado', () => {
    expect(csvEscape('Linha1\nLinha2')).toBe('"Linha1\nLinha2"')
  })

  it('null/undefined viram string vazia', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })

  it('número não é escapado', () => {
    expect(csvEscape(42)).toBe('42')
  })

  it('seta unicode não é caractere especial — não escapa', () => {
    expect(csvEscape('Trib → CTN')).toBe('Trib → CTN')
  })

  it('combina sanitização de fórmula + escape de aspas', () => {
    // Cell que começa com = E tem aspas internas: precisa ambos
    expect(csvEscape('=SUM("A1")')).toBe('"\'=SUM(""A1"")"')
  })

  it('cell que começa com = sem outros caracteres especiais ganha só prefixo', () => {
    expect(csvEscape('=cmd')).toBe("'=cmd")
  })
})

describe('buildCsv', () => {
  it('retorna apenas headers quando items vazio', () => {
    expect(buildCsv([])).toBe('Nome,Recorrencia,Recencia,VolumeMedio,VolumeTotal,PctMedio,Slope,R2,N,Boosted')
  })

  it('retorna apenas headers quando items null', () => {
    expect(buildCsv(null)).toBe('Nome,Recorrencia,Recencia,VolumeMedio,VolumeTotal,PctMedio,Slope,R2,N,Boosted')
  })

  it('item simples: linha bem formatada', () => {
    const csv = buildCsv([makeItem()])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('Nome,Recorrencia,Recencia')
    expect(lines[1]).toBe('Tributário → CTN,100,100,8.2,41,12.0,0.85,0.87,5,')
  })

  it('item com recencia null: campo Recencia vazio', () => {
    const item = makeItem({ recencia: null, recenciaAnos: [] })
    const lines = buildCsv([item]).split('\n')
    // Recencia é a 3ª coluna — entre Recorrencia (100) e VolumeMedio (8.2)
    expect(lines[1]).toBe('Tributário → CTN,100,,8.2,41,12.0,0.85,0.87,5,')
  })

  it('recencia arredondada pra inteiro', () => {
    const item = makeItem({ recencia: 66.6, recenciaAnos: [2025, 2026] })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toContain(',67,8.2,') // Math.round(66.6)
  })

  it('caminhoCompleto com vírgula é escapado', () => {
    const item = makeItem({ caminhoCompleto: 'Lei 8.137, art 1' })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1].startsWith('"Lei 8.137, art 1",')).toBe(true)
  })

  it('boostedBy com múltiplas bancas vira string com vírgula entre aspas', () => {
    const item = makeItem({ boostedBy: ['Cespe', 'FGV'] })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toContain('"Cespe, FGV"')
  })

  it('boostedBy vazio resulta em campo vazio', () => {
    const item = makeItem({ boostedBy: [] })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1].endsWith(',')).toBe(true)
  })

  it('slope/r2 null viram campos vazios (item sem tendência)', () => {
    const item = makeItem({ slope: null, r2: null, n: 1 })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toBe('Tributário → CTN,100,100,8.2,41,12.0,,,1,')
  })

  it('slope negativo formata com sinal', () => {
    const item = makeItem({ slope: -1.234, r2: 0.91 })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toContain(',-1.23,')
  })

  it('múltiplos items: header + N linhas', () => {
    const items = [makeItem({ caminhoCompleto: 'A → 1' }), makeItem({ caminhoCompleto: 'B → 2' })]
    const lines = buildCsv(items).split('\n')
    expect(lines).toHaveLength(3)
  })

  it('recorrência arredondada pra inteiro', () => {
    const item = makeItem({ recorrencia: 66.6 })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toContain(',67,') // Math.round(66.6) = 67
  })

  it('volumeMedio sempre com 1 decimal', () => {
    const item = makeItem({ volumeMedio: 5 })
    const lines = buildCsv([item]).split('\n')
    expect(lines[1]).toContain(',5.0,')
  })

  it('caminhoCompleto com fórmula é sanitizado (CSV injection)', () => {
    const item = makeItem({ caminhoCompleto: '=cmd|"calc"|0' })
    const lines = buildCsv([item]).split('\n')
    // Deve começar com aspa simples (sanitize) DENTRO das aspas duplas (escape por aspas internas)
    expect(lines[1].startsWith("\"'=cmd")).toBe(true)
  })

  it('boostedBy contendo banca com nome perigoso é sanitizado', () => {
    const item = makeItem({ boostedBy: ['=Cespe'] })
    const lines = buildCsv([item]).split('\n')
    // Deve aparecer como '=Cespe (com aspa simples antes do =), pois um único item não tem vírgula
    expect(lines[1]).toContain("'=Cespe")
  })
})

describe('buildCsvFilename', () => {
  it('formata data ISO YYYYMMDD', () => {
    const date = new Date(2026, 4, 7) // 2026-05-07
    const fn = buildCsvFilename('FCC', 'Fiscal', date)
    expect(fn).toBe('analise-FCC-Fiscal-20260507.csv')
  })

  it('banca/area undefined viram "todas"', () => {
    const date = new Date(2026, 0, 1)
    const fn = buildCsvFilename(undefined, undefined, date)
    expect(fn).toBe('analise-todas-todas-20260101.csv')
  })

  it('caracteres não-alfanuméricos viram underscore', () => {
    const date = new Date(2026, 0, 1)
    const fn = buildCsvFilename('FCC/2024', 'Saúde Pública', date)
    expect(fn).toBe('analise-FCC_2024-Sa_de_P_blica-20260101.csv')
  })

  it('mês e dia com zero à esquerda', () => {
    const date = new Date(2026, 1, 3) // fev/03
    const fn = buildCsvFilename('A', 'B', date)
    expect(fn).toContain('20260203')
  })
})
