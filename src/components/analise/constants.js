// Constantes compartilhadas entre AnaliseTable.vue e EstatisticasView.vue.
// Single source of truth pra evitar drift cross-arquivo (#ARCH-24).

/** Opções de paginação adequadas pra análise multi-dimensional (datasets densos). */
export const PER_PAGE_OPTIONS = [50, 100, 200]

/** Default usado em parse de querystring + initialização de state. Deve estar em PER_PAGE_OPTIONS. */
export const DEFAULT_PER_PAGE = 50
