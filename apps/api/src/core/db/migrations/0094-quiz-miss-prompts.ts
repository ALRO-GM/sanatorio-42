/**
 * Not-games: las preguntas tal como le salieron a cada cual al fallarlas (o
 * al dejarlas sin contestar), para su Repaso (#107, #108). Un concepto se
 * pregunta de muchas formas: sin esto, el Repaso enseñaba siempre la primera
 * y no se reconocía lo fallado en otra sala. JSON con hasta cinco preguntas
 * distintas en español, de la última a la primera; se traducen al enseñarlas.
 * Módulo dueño: `quiz`.
 */

import type { Migration } from './types.js'

export const quizMissPromptsSchema: Migration = {
  version: 94,
  name: 'quiz-miss-prompts',
  statements: [`ALTER TABLE quiz_misses ADD COLUMN prompts TEXT`],
}
