/**
 * Los plurales que faltan (`npm run textos`): un texto que pone una cantidad
 * delante de un nombre en plural tiene que tener sus dos formas.
 *
 * `tn('clave', n)` (`shared/i18n`) lee `clave.one` o `clave.many` según las
 * reglas del idioma (`Intl.PluralRules`): en español, inglés, catalán y
 * euskera, `one` es el 1; en francés, también el 0 y lo que no llega a 2
 * («1,5 jour»). Un texto suelto con «{n} días» diría «1 días».
 */

import type { TextRow } from './textos.ts'

/**
 * Nombres que van en plural detrás de una cantidad. Un texto con «{n} días»
 * dice «1 días» cuando la cantidad es 1 (y en francés, también con 0): tiene
 * que partirse en `clave.one` y `clave.many` y pedirse con `tn`. Es una lista
 * cerrada a propósito, para no dar falsos avisos («{n} s», «+{n} más»): un
 * nombre que se cuente y no esté aquí se añade.
 */
const PLURAL_NOUNS = [
  'días',
  'horas',
  'minutos',
  'semanas',
  'meses',
  'personas',
  'filas',
  'intentos',
  'exámenes',
  'correcciones',
  'respuestas',
  'preguntas',
  'aciertos',
  'plazas',
  'proyectos',
  'módulos',
  'veces',
  'peticiones',
  'usos',
  'líneas',
  'comandos',
  'sesiones',
  'ayudas',
  'dudas',
  'uniones',
  'parejas',
  'mutuas',
  'disponibles',
  'kickoffs',
  'seniors',
  'peers',
  'sprints',
]

/** Un hueco seguido de uno de esos nombres, en el español: `{n} días`, `{total} de personas`. */
const COUNTED = new RegExp(`\\{\\w+\\} (?:de )?(?:${PLURAL_NOUNS.join('|')})(?!\\p{L})`, 'u')

/**
 * Lo que `COUNTED` marcaría pero nunca vale 1, con el porqué. Si cambia el
 * porqué, la clave sale de aquí y se parte en `.one` y `.many`.
 */
export const ALWAYS_MANY: Record<string, string> = {
  'countdown.coming': 'n es AHEAD_DAYS (30)',
  'tour.network.count': 'demostración con cifras fijas',
  'stats.tablon.extra': 'demostración con cifras fijas',
  'clicker.review.jump': 'líneas de Code Clicker: miles en adelante',
  'clicker.review.rate': 'líneas de Code Clicker: miles en adelante',
  'admin.clicker.copy': 'líneas de Code Clicker: miles en adelante',
  'exams.kickoff.chosen': 'solo sale con dos o más kickoffs marcadas',
  'ach.group_therapy.d': 'meta fija del logro (10)',
  'ach.selfless_help.d': 'meta fija del logro (10)',
  'ach.campus_guardian.d': 'meta fija del logro (25)',
  'admin.tours.hint': 'VOTES_TO_ADJUST de la API',
  'notgames.nQuestions': 'el selector empieza en 5',
  'course.term.full': 'tope de líneas de la terminal',
  'git.room.who': 'el máximo de una sala, de 2 en adelante',
  'net.projects.span': 'un rango («entre {min} y {max}»)',
  'net.strict.min': 'MIN_STEPS empieza en 3',
  'net.strict.empty': 'MIN_STEPS empieza en 3',
  'seats.days': 'opciones 7, 14, 30 y 90',
  'peers.specialistsN': 'con 1 se usa peers.specialists1',
  'peers.totalN': 'con 1 se usa peers.total1',
  'peers.totalOf': 'solo sale si hay más de las que se ven (2 o más)',
  'peers.groupHint': 'solo sale con dos o más',
  'peers.groupOpen': 'con 1 se usa peers.groupOpen1',
  'cgraph.tier2': 'umbral fijo de la medalla',
  'cgraph.tier3': 'umbral fijo de la medalla',
  'cgraph.tier4': 'umbral fijo de la medalla',
  'graph.expand': 'una serie tiene varios módulos',
  'graph.collapse': 'una serie tiene varios módulos',
  // Pendientes: los arregla otro cambio que está en marcha. Al partirlos en
  // `.one` y `.many`, se borran de aquí.
  'stats.progress.average': 'pendiente',
  'stats.progress.averageC': 'pendiente',
  'stats.progress.averagePython': 'pendiente',
  'stats.progress.unknown': 'pendiente',
  'stats.ranking.kickoff.month': 'pendiente',
  'stats.ranking.total': 'pendiente',
}

/**
 * ¿Le falta el singular a este texto? Solo mira las tablas de la web: las de
 * Code Clicker (`game.*`) no pasan por `tn`.
 */
export function needsPlural(row: Pick<TextRow, 'key' | 'text'>): boolean {
  return (
    !row.key.startsWith('game.') &&
    !/\.(one|many)$/.test(row.key) &&
    !(row.key in ALWAYS_MANY) &&
    COUNTED.test(row.text.es)
  )
}
