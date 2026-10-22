/**
 * Fuera la valoración de las correcciones de 42 (2026-10-22): Alberto decidió
 * que solo se valora la ayuda de la pestaña Ayuda, no las correcciones de
 * proyectos. La tabla de la 65 llegó a crearse en producción; aquí se borra.
 */

import type { Migration } from './types.js'

export const noCorrectionFeedbackSchema: Migration = {
  version: 66,
  name: 'no-correction-feedback',
  statements: ['DROP TABLE IF EXISTS correction_feedback'],
}
