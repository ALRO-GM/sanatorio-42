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
 * final. La guardia no está: se abre desde "De guardia", en la cabecera. La
 * agenda va la primera, pero sale junto al perfil, en su propia categoría.
 */
export const NAV_DEFAULT = [
  'agenda',
  'consulta',
  'tablon',
  'terapia',
  'pizarras',
  'notgames',
  'estadisticas',
  'calendario',
  'red',
  'avance',
  'clusters',
  'examenes',
] as const

/**
 * Orden de fábrica de las categorías de arriba (`CATEGORIES` en
 * `app/sections.ts`, que tiene sus iconos). El perfil, la portada, va el
 * primero; la persona puede moverlas a mano en Personalizar.
 */
export const CATEGORY_DEFAULT = ['expediente', 'ayuda', 'calendario', 'clusters', 'datos'] as const

/**
 * Bloques de cada página, en su orden de fábrica. `foldable`: se puede plegar.
 * `from`: desde qué modo de la interfaz sale (`shared/detail.tsx`).
 */
export const PAGES = {
  expediente: [
    { id: 'record', foldable: true, from: 'simple' },
    { id: 'health', foldable: true, from: 'simple' },
    { id: 'network', foldable: true, from: 'normal' },
    { id: 'achievements', foldable: true, from: 'normal' },
    { id: 'ranking', foldable: true, from: 'normal' },
  ],
  guardia: [
    // Preevaluar es una de las cosas principales de la guardia: va la primera.
    { id: 'prereview', foldable: false, from: 'simple' },
    { id: 'today', foldable: true, from: 'simple' },
    { id: 'bookings', foldable: true, from: 'simple' },
    { id: 'blocked', foldable: true, from: 'normal' },
  ],
  red: [
    { id: 'totals', foldable: false, from: 'normal' },
    { id: 'endogamy', foldable: true, from: 'datos' },
    { id: 'pairs', foldable: true, from: 'datos' },
    { id: 'strictest', foldable: true, from: 'datos' },
    { id: 'projects', foldable: true, from: 'datos' },
    { id: 'about', foldable: false, from: 'normal' },
  ],
} as const

export type PageId = keyof typeof PAGES

export const PAGE_IDS = Object.keys(PAGES) as PageId[]
