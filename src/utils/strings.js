/**
 * Utilitários de string compartilhados — comparações case-insensitive
 * e tolerantes a acentos/whitespace.
 */

/**
 * Normaliza string para comparação tolerante a:
 *  - case (toLowerCase)
 *  - acentos/diacríticos (NFD + strip)
 *  - whitespace extra / nbsp / colapso de múltiplos espaços
 *
 * Use SEMPRE para match de:
 *  - nome de disciplina, lei, assunto
 *  - título de plano (espelhado em backend `normalizePlanTitle` que é mais
 *    permissivo — strip de acentos só no frontend pra preview UX; backend
 *    continua aceitando casos com acento como distintos)
 */
export function normalizeText(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/\s+/g, ' ')
    .trim().toLowerCase()
}
