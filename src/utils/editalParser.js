/**
 * Parser de conteúdo de edital — Fases 1 e 2 (regex no frontend)
 *
 * Fase 1: Limpeza de artefatos de PDF
 * Fase 2: Segmentação em disciplinas + detecção de anomalias
 */

// ── Fase 1 — Limpeza ──────────────────────────────────────────

export function limpar(textoBruto) {
  let t = textoBruto

  // Remove numeração de página isolada (ex: "  12  " ou "Página 12 de 30")
  t = t.replace(/^\s*(?:página\s+)?\d{1,4}(?:\s+de\s+\d{1,4})?\s*$/gim, '')

  // Remove headers/footers repetidos (linhas idênticas que aparecem 3+ vezes)
  const linhas = t.split('\n')
  const freq = {}
  for (const l of linhas) {
    const trimmed = l.trim()
    if (trimmed.length > 5) freq[trimmed] = (freq[trimmed] || 0) + 1
  }
  const repetidas = new Set(Object.keys(freq).filter(k => freq[k] >= 3))
  t = linhas.filter(l => !repetidas.has(l.trim())).join('\n')

  // Normaliza espaços múltiplos e tabs
  t = t.replace(/\t/g, ' ')
  t = t.replace(/ {2,}/g, ' ')

  // Remove quebras de linha duplicadas (mais de 2)
  t = t.replace(/\n{3,}/g, '\n\n')

  // Remove caracteres especiais soltos (bullets unicode, etc.)
  t = t.replace(/[•●◦▪▸►◆■□]/g, '')

  // Trim das linhas
  t = t.split('\n').map(l => l.trim()).join('\n')

  // Remove linhas vazias no início e fim
  t = t.trim()

  return t
}

// ── Fase 2 — Detecção do padrão dominante ─────────────────────

export function detectarPadraoDominante(texto) {
  const linhas = texto.split('\n').filter(l => l.trim())

  // Conta padrões de numeração
  const padroes = {
    decimal: 0,     // 1.1, 1.2, 2.1
    romano: 0,      // I, II, III
    letra: 0,       // a), b), c)
    arabico: 0,     // 1., 2., 3. ou 1 -, 2 -
  }

  for (const l of linhas) {
    if (/^\d+\.\d+/.test(l)) padroes.decimal++
    else if (/^[IVXLC]+[\s.\-–]/.test(l) && /^[IVXLC]{1,6}[\s.\-–]/.test(l)) padroes.romano++
    else if (/^[a-z]\)/.test(l)) padroes.letra++
    else if (/^\d{1,2}[\s.\-–]/.test(l)) padroes.arabico++
  }

  const numeracao = Object.entries(padroes).sort((a, b) => b[1] - a[1])[0]

  // Conta separadores dentro de linhas
  const separadores = { ponto_virgula: 0, ponto: 0, virgula: 0 }
  const textoInterno = linhas.join(' ')

  // Conta ; e . usados como separadores entre itens (não no meio de frases comuns)
  const pvMatches = textoInterno.match(/;\s/g)
  const ptMatches = textoInterno.match(/\.\s+\d/g)
  separadores.ponto_virgula = pvMatches?.length || 0
  separadores.ponto = ptMatches?.length || 0

  const separador = Object.entries(separadores).sort((a, b) => b[1] - a[1])[0]

  return {
    numeracao: numeracao[1] > 0 ? numeracao[0] : 'nenhuma',
    separador: separador[1] > 2 ? separador[0] : 'quebra_linha',
    total_linhas: linhas.length,
  }
}

// ── Fase 2 — Segmentação ─────────────────────────────────────

// Padrões para detectar nome de disciplina
const DISCIPLINA_PATTERNS = [
  // Numeração romana + nome: "I - DIREITO ADMINISTRATIVO" ou "I – DIREITO ADMINISTRATIVO"
  /^[IVXLC]{1,6}\s*[-–—.]\s*(.+)/i,
  // Numeração arábica + nome em caixa alta: "1. DIREITO ADMINISTRATIVO" ou "1 - DIREITO ADMINISTRATIVO"
  /^\d{1,2}\s*[-–—.]\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ\s]{8,})/,
  // Nome em CAIXA ALTA sozinho ou seguido de dois-pontos
  /^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÜÇ\s]{10,}):?\s*$/,
]

function matchDisciplina(linha, disciplinasConhecidas = []) {
  const trimmed = linha.trim()
  if (!trimmed) return null

  // Se a linha começa com numeração de assunto (1.1, 2.3, etc.), não é disciplina
  if (/^\d+\.\d+/.test(trimmed)) return null

  // Para linhas curtas (< 80 chars), testa padrões regex de cabeçalho puro
  if (trimmed.length <= 80) {
    for (const pattern of DISCIPLINA_PATTERNS) {
      const m = trimmed.match(pattern)
      if (m) {
        const nome = (m[1] || trimmed).replace(/[:\-–—.]+$/, '').trim()
        if (nome.split(/\s+/).length >= 2) return nome
      }
    }
  }

  // Match contra lista conhecida — verifica se a linha COMEÇA com o nome da disciplina
  // Cobre o caso: "DIREITO EMPRESARIAL: 1 Fundamentos..." (linha longa)
  // e o caso: "DIREITO EMPRESARIAL" (linha curta)
  const linhaSemNum = trimmed
    .replace(/^\d{1,2}\s*[-–—.)]\s*/, '')   // remove "1. " ou "1 - " do início
    .replace(/^[IVXLC]{1,6}\s*[-–—.)]\s*/i, '') // remove "I - " do início
    .trim()
  const linhaUpper = linhaSemNum.toUpperCase()

  for (const d of disciplinasConhecidas) {
    const dUpper = d.toUpperCase().trim()
    // A linha deve COMEÇAR com o nome da disciplina
    if (linhaUpper.startsWith(dUpper)) {
      // Depois do nome deve vir: fim da linha, ":", espaço+número, ou separador
      const resto = linhaSemNum.slice(d.length).trim()
      if (resto === '' || /^[:\-–—]/.test(resto) || /^\d/.test(resto)) {
        return d
      }
    }
  }

  return null
}

export function segmentar(textoLimpo, disciplinasConhecidas = []) {
  const linhas = textoLimpo.split('\n')
  const disciplinas = []
  let blocoAtual = null
  const padrao = detectarPadraoDominante(textoLimpo)

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const nomeDisciplina = matchDisciplina(linha, disciplinasConhecidas)

    if (nomeDisciplina) {
      if (blocoAtual) disciplinas.push(blocoAtual)

      // Extrai o conteúdo que vem APÓS o nome da disciplina na mesma linha
      // Ex: "DIREITO ADMINISTRATIVO: 1 Estado. 1.1 Funções..." → "1 Estado. 1.1 Funções..."
      const trimmed = linha.trim()
      let restoLinha = ''
      const idxNome = trimmed.toUpperCase().indexOf(nomeDisciplina.toUpperCase())
      if (idxNome !== -1) {
        restoLinha = trimmed.slice(idxNome + nomeDisciplina.length).replace(/^[\s:–—\-]+/, '').trim()
      }

      blocoAtual = {
        nome: nomeDisciplina,
        texto: restoLinha,
        linhaInicio: i,
        anomalias: [],
      }
    } else if (blocoAtual) {
      blocoAtual.texto += (blocoAtual.texto ? '\n' : '') + linha
    } else {
      // Texto antes da primeira disciplina — cria bloco "Não identificado"
      if (!disciplinas.length || disciplinas[disciplinas.length - 1]?.nome !== '_NAO_IDENTIFICADO') {
        if (blocoAtual) disciplinas.push(blocoAtual)
        blocoAtual = {
          nome: '_NAO_IDENTIFICADO',
          texto: linha,
          linhaInicio: i,
          anomalias: [{ inicio: i, fim: i, tipo: 'disciplina_nao_encontrada', mensagem: 'Texto antes de qualquer disciplina identificada' }],
        }
      } else {
        blocoAtual.texto += '\n' + linha
      }
    }
  }

  if (blocoAtual) disciplinas.push(blocoAtual)

  // Junta quebras de linha de PDF em cada bloco
  // Linhas que não começam com numeração de tópico são continuação da anterior
  for (const disc of disciplinas) {
    disc.texto = juntarQuebrasDePdf(disc.texto)
  }

  // Merge disciplinas com o mesmo nome (case-insensitive)
  const merged = []
  const seen = new Map()
  for (const disc of disciplinas) {
    const key = disc.nome.toLowerCase().trim()
    if (disc.nome === '_NAO_IDENTIFICADO' || !seen.has(key)) {
      seen.set(key, merged.length)
      merged.push(disc)
    } else {
      // Junta o texto no card existente
      const existing = merged[seen.get(key)]
      existing.texto += '\n' + disc.texto
      existing.anomalias.push(...disc.anomalias)
    }
  }

  // Detecta anomalias em cada bloco
  for (const disc of merged) {
    const anomaliasBloco = detectarAnomalias(disc.texto, padrao, disc.linhaInicio)
    disc.anomalias = [...disc.anomalias, ...anomaliasBloco]
  }

  return { disciplinas: merged, padrao }
}

// ── Junta quebras de linha de PDF ─────────────────────────────

function juntarQuebrasDePdf(texto) {
  if (!texto) return texto
  const linhas = texto.split('\n')
  const resultado = []

  for (let i = 0; i < linhas.length; i++) {
    const trimmed = linhas[i].trim()
    if (!trimmed) continue

    if (resultado.length === 0) {
      resultado.push(trimmed)
      continue
    }

    // A linha atual é continuação da anterior se:
    // - NÃO começa com numeração de tópico (1 , 1.1 , 1.1.1 )
    // - E a linha anterior terminou sem ponto final, ponto-e-vírgula ou dois-pontos
    //   (ou seja, cortou no meio da frase por quebra de PDF)
    const anterior = resultado[resultado.length - 1]
    const comecaComNumero = /^\d{1,2}(\.\d{1,2}){0,2}\s/.test(trimmed)
    const anteriorTerminouCompleta = /[.;:)]$/.test(anterior.trim())

    if (!comecaComNumero && !anteriorTerminouCompleta) {
      // Continuação — a linha anterior cortou no meio
      resultado[resultado.length - 1] += ' ' + trimmed
    } else if (!comecaComNumero && anteriorTerminouCompleta) {
      // Linha que não começa com número mas a anterior terminou ok
      // Pode ser continuação de um item longo — junta mesmo assim
      resultado[resultado.length - 1] += ' ' + trimmed
    } else {
      // Começa com número — nova linha lógica
      resultado.push(trimmed)
    }
  }

  return resultado.join('\n')
}

// ── Fase 2 — Detecção de anomalias ───────────────────────────

export function detectarAnomalias(texto, padrao, offsetLinha = 0) {
  const anomalias = []
  const linhas = texto.split('\n')

  // Rastreia numeração para detectar quebras
  const numeros = []

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()
    if (!linha) continue

    const linhaGlobal = offsetLinha + i

    // Extrai numeração de tópicos ignorando números de leis e numeração de 3+ níveis
    // Captura: "4.1 ", "4.2 " mas NÃO "4.1.1 " (3 níveis) nem "Lei nº 9.605"
    const numRegex = /(?:^|[\s;])(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?\b/g
    let numMatch
    while ((numMatch = numRegex.exec(linha)) !== null) {
      const pos = numMatch.index
      // Ignora se precedido por contexto de lei
      const antes = linha.slice(Math.max(0, pos - 20), pos).toLowerCase()
      if (/(?:nº|lei|decreto|portaria|resolução|complementar|\/)\s*$/.test(antes)) continue
      // Sub-numeração de tópico raramente passa de 30
      const sub = parseInt(numMatch[2])
      if (sub > 30) continue
      // Se tem 3º nível (4.1.1), é sub-sub — não valida sequência no nível 2
      if (numMatch[3] !== undefined) continue
      numeros.push({ principal: parseInt(numMatch[1]), sub, linha: linhaGlobal })
    }

    // Anomalia: possível disciplina embutida dentro de bloco de assuntos
    if (i > 0) {
      const possivel = matchDisciplina(linha, [])
      if (possivel && !/^\d+\./.test(linha)) {
        anomalias.push({
          inicio: linhaGlobal,
          fim: linhaGlobal,
          tipo: 'disciplina_embutida',
          mensagem: `Possível disciplina dentro de bloco de assuntos: "${possivel}"`,
        })
      }
    }
  }

  // Anomalia: quebra de numeração
  for (let i = 1; i < numeros.length; i++) {
    const prev = numeros[i - 1]
    const curr = numeros[i]

    if (curr.principal === prev.principal) {
      // Mesmo grupo — sub deve ser sequencial
      if (curr.sub !== prev.sub + 1) {
        anomalias.push({
          inicio: curr.linha,
          fim: curr.linha,
          tipo: 'quebra_numeracao',
          mensagem: `Quebra na numeração — esperado ${prev.principal}.${prev.sub + 1} mas encontrado ${curr.principal}.${curr.sub}`,
        })
      }
    }
  }

  return anomalias
}

// ── Helper: Parse do nome do edital ──────────────────────────

export function parseNomeEdital(nome) {
  const result = { orgao: '', estado: '', ano: null }

  // Extrai órgão/estado: padrão "PGE/AL" ou "TRF-3" ou "MPU"
  const orgaoMatch = nome.match(/[-–—]\s*([A-Z]{2,}(?:[/-][A-Z]{2,})?)/i)
  if (orgaoMatch) {
    const parts = orgaoMatch[1].split(/[/]/)
    result.orgao = orgaoMatch[1].toUpperCase()
    if (parts.length === 2 && parts[1].length === 2) {
      result.estado = parts[1].toUpperCase()
    }
  }

  // Extrai ano: 4 dígitos começando com 20
  const anoMatch = nome.match(/\b(20\d{2})\b/)
  if (anoMatch) {
    result.ano = parseInt(anoMatch[1])
  }

  return result
}
