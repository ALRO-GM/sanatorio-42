/**
 * La plantilla de los cursos de Not-games (`docs/plantilla-cursos.md`): lo que
 * comparten el curso de git y el de shell. Las reglas de las estrellas, el
 * orden en que se abren los puntos y la forma de una unidad (teoría, ejemplo y
 * prueba), y cuánto se calcula que lleva cada punto. Lo usan la web (para
 * enseñar los objetivos antes de empezar) y la API (para puntuar y apuntar el
 * tiempo): una sola función, el mismo resultado en los dos sitios.
 */

export { ESTIMATE, estimateSeconds, wordsIn } from './estimate.js'
export type { EstimateInput } from './estimate.js'
export { commandGoals, starsFor, starsForTime, timeGoals } from './stars.js'
export type { StarGoals, Stars, TimeGoals } from './stars.js'
export { courseLang } from './lang.js'
export { firstOpen, unlocked } from './path.js'
export type { Theory, UnitKind } from './unit.js'
