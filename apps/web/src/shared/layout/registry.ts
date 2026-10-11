/**
 * Qué se puede ordenar y plegar en la web: las pestañas y los bloques de cada
 * página. Es la lista que enseña la ventana de personalización.
 *
 * Los nombres de cada cosa están en los idiomas, en `layout.<página>.<id>`.
 */

/**
 * Orden de fábrica de las pestañas. Sigue el camino habitual de quien se
 * atasca: ver quién le puede ayudar, preguntar en el tablón, buscar un grupo o
 * una pizarra, y lo que se consulta de tarde en tarde (calendario, red) al
 * final. La guardia no está: se abre desde "De guardia", en la cabecera.
 */
export const NAV_DEFAULT = [
  'consulta',
  'tablon',
  'terapia',
  'pizarras',
  'calendario',
  'red',
] as const

/** Bloques de cada página, en su orden de fábrica. `foldable`: se puede plegar. */
export const PAGES = {
  expediente: [
    { id: 'record', foldable: true },
    { id: 'health', foldable: true },
    { id: 'network', foldable: true },
    { id: 'achievements', foldable: true },
    { id: 'ranking', foldable: true },
  ],
  guardia: [
    { id: 'today', foldable: true },
    { id: 'bookings', foldable: true },
    { id: 'blocked', foldable: true },
  ],
  red: [
    { id: 'totals', foldable: false },
    { id: 'endogamy', foldable: true },
    { id: 'pairs', foldable: true },
    { id: 'strictest', foldable: true },
    { id: 'projects', foldable: true },
    { id: 'about', foldable: false },
  ],
} as const

export type PageId = keyof typeof PAGES

export const PAGE_IDS = Object.keys(PAGES) as PageId[]
