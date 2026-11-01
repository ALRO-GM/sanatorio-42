/**
 * A quién le salen las preguntas de la piscina.
 *
 * Un piscinero solo tiene proyectos de la piscina (`c-piscine-shell-00` …
 * `c-piscine-c-13`, en `replica/piscine.ts`), y Not-games elige por los que
 * tiene en curso o aprobados. Lo de un módulo lo sabe quien está en él o ya
 * ha pasado a uno de los siguientes: quien va por C 05 ha visto los punteros
 * de C 01 aunque lo suspendiera. Por eso cada concepto pide «este módulo o
 * cualquiera de después», no solo el suyo.
 */

import { PISCINE_PROGRESS } from '../../replica/index.js'

/** Shell 00, Shell 01, C 00 … C 13: el orden en que se hacen. */
const STEPS: readonly string[] = PISCINE_PROGRESS.map((project) => project.slug)

/** Los slugs de la piscina desde `slug` (incluido) hasta el final. */
export function fromPiscine(slug: string): readonly string[] {
  const at = STEPS.indexOf(slug)

  // Un slug mal escrito dejaría la pregunta sin nadie que la vea: mejor que no arranque.
  if (at < 0) throw new Error(`${slug} no es un módulo de la piscina`)

  return STEPS.slice(at)
}
