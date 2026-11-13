/** Los conjuntos de preguntas que usan las unidades, por nombre. */

import { questionIds } from '../questions.js'

/** Todas las de desarrollo, con las dos que no tienen respuesta. */
export const DEV = questionIds({ set: 'dev' })

/** Las de desarrollo que sí tienen respuesta (para medir solo la recuperación). */
export const DEV_FOUND = DEV.filter((id) => !questionIds({ kind: 'none' }).includes(id))

/** Las apartadas para comprobar al final. */
export const TEST = questionIds({ set: 'test' })

/** Las que preguntan con otras palabras o en el otro idioma. */
export const PARAPHRASES = questionIds({ kind: 'paraphrase' })

/** Las escritas con prisa: sin acentos, en mayúsculas, en plural. */
export const TYPED = questionIds({ set: 'typed' })

/** Las que el fichero de evaluación trae con su respuesta. */
export const LEAKED = ['retries', 'full', 'heartbeat', 'redis', 'health', 'dead']

/** Las que tropiezan con el ruido del `poetry.lock`. */
export const NOISY = [
  'retries',
  'dead',
  'full',
  'heartbeat',
  'health',
  'redis',
  'maxsize',
  'queuefull',
]

/** Dos documentos pequeños para contar a mano. */
export const HAND_DOCS = ['docs/colas.md', 'docs/reintentos.md']
