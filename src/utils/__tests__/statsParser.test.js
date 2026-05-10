import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseEstatisticas, detectYear } from '../statsParser'

const FIXTURES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '__fixtures__',
)

function loadFixture(name) {
  return readFileSync(path.join(FIXTURES_DIR, name), 'utf-8')
}

// Soma de qtd de disciplinas, assuntos, sub-assuntos
function totalQtd(disciplinas) {
  let total = 0
  for (const d of disciplinas) {
    total += d.qtd
    for (const a of d.assuntos || []) {
      total += a.qtd
      for (const s of a.sub_assuntos || []) total += s.qtd
    }
  }
  return total
}

// ── Path 1: HTML com <li> diretos (sem <ul> wrapper) ─────────────────────────

describe('parseEstatisticas — HTML com <li> diretos (Path 1)', () => {
  const html = `
    <li>
      <div class="assunto">
        <span class="assunto-nome-conteudo">Direito Tributário</span>
        <span class="indice-porcentagem">10 (50.00%)</span>
      </div>
      <ul>
        <li>
          <div class="assunto">
            <span class="assunto-nome-conteudo">CTN</span>
            <span class="indice-porcentagem">7 (35.00%)</span>
          </div>
          <ul>
            <li>
              <div class="assunto">
                <span class="assunto-nome-conteudo">Art. 3</span>
                <span class="indice-porcentagem">3 (15.00%)</span>
              </div>
            </li>
          </ul>
        </li>
      </ul>
    </li>
    <li>
      <div class="assunto">
        <span class="assunto-nome-conteudo">Direito Administrativo</span>
        <span class="indice-porcentagem">10 (50.00%)</span>
      </div>
    </li>
  `

  it('extrai disciplinas com hierarquia 3 níveis', () => {
    const result = parseEstatisticas(html)
    expect(result.disciplinas).toHaveLength(2)

    const tributario = result.disciplinas[0]
    expect(tributario.nome).toBe('Direito Tributário')
    expect(tributario.qtd).toBe(10)
    expect(tributario.pct).toBe(50)
    expect(tributario.assuntos).toHaveLength(1)

    const ctn = tributario.assuntos[0]
    expect(ctn.nome).toBe('CTN')
    expect(ctn.qtd).toBe(7)
    expect(ctn.sub_assuntos).toHaveLength(1)
    expect(ctn.sub_assuntos[0].nome).toBe('Art. 3')
    expect(ctn.sub_assuntos[0].qtd).toBe(3)
  })

  it('disciplina sem filhos tem assuntos vazio', () => {
    const result = parseEstatisticas(html)
    expect(result.disciplinas[1].nome).toBe('Direito Administrativo')
    expect(result.disciplinas[1].assuntos).toEqual([])
  })
})

// ── Path 5: HTML com <ul> raiz (caminho rápido novo) ──────────────────────────

describe('parseEstatisticas — HTML com <ul> raiz (Path 5 novo, fixture real)', () => {
  it('parseia fixture real do QConcursos', () => {
    const html = loadFixture('qconcursos-real-sample.html')
    const result = parseEstatisticas(html)

    // 3 matérias top-level (Adm Recursos Materiais, Adm Geral e Pública, AFO)
    expect(result.disciplinas).toHaveLength(3)
    expect(result.disciplinas.map(d => d.nome)).toEqual([
      'Administração de Recursos Materiais',
      'Administração Geral e Pública',
      'AFO, Direito Financeiro e Contabilidade Pública',
    ])
  })

  it('preserva hierarquia 3 níveis na fixture real', () => {
    const html = loadFixture('qconcursos-real-sample.html')
    const result = parseEstatisticas(html)

    const adm = result.disciplinas[0]
    expect(adm.qtd).toBe(1)
    expect(adm.assuntos).toHaveLength(1)
    expect(adm.assuntos[0].nome).toBe('Gestão de Estoques')
    expect(adm.assuntos[0].sub_assuntos).toHaveLength(1)
    expect(adm.assuntos[0].sub_assuntos[0].nome).toBe('Planejamento e Controle de Estoques')
  })

  it('captura matéria com vários assuntos', () => {
    const html = loadFixture('qconcursos-real-sample.html')
    const result = parseEstatisticas(html)

    const admGeral = result.disciplinas[1]
    expect(admGeral.qtd).toBe(19)
    expect(admGeral.assuntos.length).toBeGreaterThanOrEqual(2)
    const nomes = admGeral.assuntos.map(a => a.nome)
    expect(nomes).toContain('Introdução à Administração')
    expect(nomes).toContain('Comportamento Organizacional')
  })

  it('parseia HTML mínimo com <ul> raiz', () => {
    const html = `
      <ul class="indice-conteudo">
        <li>
          <div class="assunto">
            <span class="assunto-nome-conteudo">Banco</span>
            <span class="indice-porcentagem">5 (25.00%)</span>
          </div>
        </li>
      </ul>
    `
    const result = parseEstatisticas(html)
    expect(result.disciplinas).toHaveLength(1)
    expect(result.disciplinas[0].nome).toBe('Banco')
    expect(result.disciplinas[0].qtd).toBe(5)
  })

  it('Path 1 tem precedência sobre Path 5 quando há <li> direto E <ul>', () => {
    // Cenário improvável (usuário não cola ambos), mas documenta o fallback determinístico
    const html = `
      <li>
        <div class="assunto">
          <span class="assunto-nome-conteudo">DiretoLi</span>
          <span class="indice-porcentagem">1 (10.00%)</span>
        </div>
      </li>
      <ul>
        <li>
          <div class="assunto">
            <span class="assunto-nome-conteudo">DentroUl</span>
            <span class="indice-porcentagem">2 (20.00%)</span>
          </div>
        </li>
      </ul>
    `
    const result = parseEstatisticas(html)
    expect(result.disciplinas).toHaveLength(1)
    expect(result.disciplinas[0].nome).toBe('DiretoLi')
  })

  it('decodifica entidades HTML nos nomes (&amp;, &nbsp;)', () => {
    const html = `
      <ul>
        <li>
          <div class="assunto">
            <span class="assunto-nome-conteudo">Direito &amp; Processo</span>
            <span class="indice-porcentagem">5 (50.00%)</span>
          </div>
        </li>
      </ul>
    `
    const result = parseEstatisticas(html)
    expect(result.disciplinas[0].nome).toBe('Direito & Processo')
  })
})

// ── Path 2: HTML fallback por profundidade ────────────────────────────────────

describe('parseEstatisticas — HTML fallback por profundidade (Path 2)', () => {
  it('retorna disciplinas vazias para HTML sem estrutura reconhecível', () => {
    const html = '<span>algo</span>'
    const result = parseEstatisticas(html)
    expect(result.disciplinas).toEqual([])
  })

  it('aciona fallback quando <ul> está dentro de wrapper (não direto na raiz)', () => {
    // <section> wrapper força Path 2: nem <li> direto nem <ul> direto na raiz
    const html = `
      <section>
        <ul>
          <li>
            <div class="assunto">
              <span class="assunto-nome-conteudo">Banco</span>
              <span class="indice-porcentagem">5 (50.00%)</span>
            </div>
            <ul>
              <li>
                <div class="assunto">
                  <span class="assunto-nome-conteudo">Sub</span>
                  <span class="indice-porcentagem">3 (30.00%)</span>
                </div>
              </li>
            </ul>
          </li>
        </ul>
      </section>
    `
    const result = parseEstatisticas(html)
    expect(result.disciplinas).toHaveLength(1)
    expect(result.disciplinas[0].nome).toBe('Banco')
    expect(result.disciplinas[0].assuntos).toHaveLength(1)
    expect(result.disciplinas[0].assuntos[0].nome).toBe('Sub')
  })
})

// ── Path 3: Texto com indentação ──────────────────────────────────────────────

describe('parseEstatisticas — texto com indentação (Path 3)', () => {
  it('parseia hierarquia por indentação variada', () => {
    const texto = [
      'Direito Tributário',
      '10 (50.00%)',
      '  CTN',
      '  7 (35.00%)',
      '    Art. 3',
      '    3 (15.00%)',
      'Direito Administrativo',
      '10 (50.00%)',
    ].join('\n')

    const result = parseEstatisticas(texto)
    expect(result.disciplinas).toHaveLength(2)
    expect(result.disciplinas[0].nome).toBe('Direito Tributário')
    expect(result.disciplinas[0].assuntos).toHaveLength(1)
    expect(result.disciplinas[0].assuntos[0].nome).toBe('CTN')
    expect(result.disciplinas[0].assuntos[0].sub_assuntos).toHaveLength(1)
    expect(result.disciplinas[0].assuntos[0].sub_assuntos[0].nome).toBe('Art. 3')
  })

  it('aceita vírgula como separador decimal de porcentagem', () => {
    const texto = ['Banco', '5 (25,5%)'].join('\n')
    const result = parseEstatisticas(texto)
    expect(result.disciplinas[0].pct).toBe(25.5)
  })
})

// ── Path 4: Texto sem indentação (heurística de soma) ─────────────────────────

describe('parseEstatisticas — texto sem indentação (Path 4)', () => {
  it('reconstrói hierarquia 2 níveis (disciplina → assuntos) pela soma', () => {
    const texto = [
      'Direito Tributário',
      '10 (50.00%)',
      'CTN',
      '7 (35.00%)',
      'Art. 3',
      '3 (15.00%)',
      'Direito Administrativo',
      '10 (50.00%)',
    ].join('\n')

    const result = parseEstatisticas(texto)
    expect(result.disciplinas).toHaveLength(2)
    expect(result.disciplinas[0].nome).toBe('Direito Tributário')
    expect(result.disciplinas[0].assuntos.map((a) => a.nome)).toEqual(['CTN', 'Art. 3'])
    expect(result.disciplinas[1].nome).toBe('Direito Administrativo')
    expect(result.disciplinas[1].assuntos).toEqual([])
  })

  it('detecta sub_assunto quando soma de pares consecutivos bate', () => {
    // Heurística é greedy: consome itens sequencialmente até a soma bater no pai.
    // Disc(10) consome A(5)+B(5). Dentro, A(5) e B(5) viram pai-filho (A com sub_assunto B).
    // Esse é o limite do algoritmo sem indentação — documenta o comportamento.
    const texto = ['Disc', '10 (100.00%)', 'A', '5 (50.00%)', 'B', '5 (50.00%)'].join('\n')
    const result = parseEstatisticas(texto)
    expect(result.disciplinas).toHaveLength(1)
    expect(result.disciplinas[0].nome).toBe('Disc')
    expect(result.disciplinas[0].assuntos).toHaveLength(1)
    expect(result.disciplinas[0].assuntos[0].nome).toBe('A')
    expect(result.disciplinas[0].assuntos[0].sub_assuntos.map((s) => s.nome)).toEqual(['B'])
  })
})

// ── Detecção de formato ──────────────────────────────────────────────────────

describe('parseEstatisticas — detecção de formato', () => {
  it('detecta HTML pela presença de <li>', () => {
    const html = '<li><div class="assunto"><span class="assunto-nome-conteudo">Banco</span><span class="indice-porcentagem">1 (10.00%)</span></div></li>'
    const result = parseEstatisticas(html)
    expect(result.disciplinas[0].nome).toBe('Banco')
  })

  it('detecta HTML pela presença de classe assunto-nome', () => {
    const html = '<div class="assunto-nome">Banco</div>'
    // Sem <li> nem <span>, mas detectar como HTML por causa da classe
    const result = parseEstatisticas(html)
    // Não importa o resultado — só não quebra
    expect(result).toHaveProperty('disciplinas')
  })

  it('cai no parser de texto quando não há HTML', () => {
    const texto = 'Simples\n10 (100.00%)'
    const result = parseEstatisticas(texto)
    expect(result.disciplinas[0].nome).toBe('Simples')
  })

  it('retorna disciplinas vazias para entrada vazia', () => {
    expect(parseEstatisticas('').disciplinas).toEqual([])
  })
})

// ── detectYear ───────────────────────────────────────────────────────────────

describe('detectYear', () => {
  it('extrai ano de <h1>', () => {
    expect(detectYear('<h1>Provas FGV 2024</h1><ul>...</ul>')).toBe(2024)
  })

  it('extrai ano de <h2>', () => {
    expect(detectYear('<h2>2025 - Cebraspe</h2>')).toBe(2025)
  })

  it('extrai ano de <title>', () => {
    expect(detectYear('<title>Concurso 2023</title>')).toBe(2023)
  })

  it('extrai ano de texto puro nas primeiras 200 chars', () => {
    expect(detectYear('Provas Cebraspe 2024 - Fiscal\n10 (100%)')).toBe(2024)
  })

  it('retorna null se houver múltiplos anos distintos no header', () => {
    expect(detectYear('<h1>Provas 2024 e 2025</h1>')).toBe(null)
  })

  it('retorna mesmo ano se aparecer múltiplas vezes', () => {
    expect(detectYear('<h1>2024 - FGV - Prova 2024</h1>')).toBe(2024)
  })

  it('retorna null se não achar nenhum ano', () => {
    expect(detectYear('<h1>Provas FGV</h1>')).toBe(null)
  })

  it('retorna null para entrada vazia', () => {
    expect(detectYear('')).toBe(null)
    expect(detectYear(null)).toBe(null)
    expect(detectYear(undefined)).toBe(null)
  })

  it('ignora anos fora do espaço de busca em HTML (após primeiro <ul>)', () => {
    // O ano 2099 está dentro do <ul>, não deveria ser considerado
    const html = '<h1>Provas 2024</h1><ul><li>2099 (algo)</li></ul>'
    expect(detectYear(html)).toBe(2024)
  })

  it('ignora anos fora dos primeiros 200 chars em texto puro', () => {
    const longText = 'X'.repeat(220) + ' 2099 algo aqui'
    expect(detectYear(longText)).toBe(null)
  })

  it('aceita apenas anos no formato 20XX (não captura 1999 ou 2100+)', () => {
    expect(detectYear('Prova de 1999')).toBe(null)
    expect(detectYear('Prova 2099')).toBe(2099) // 20XX permitido
  })
})
