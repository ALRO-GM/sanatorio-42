/**
 * Valoración de las correcciones de 42 (#91 del buzón): tras una corrección,
 * quien fue corregido dice qué tal entiende ahora el problema (y, si quiere, una
 * reacción para quien le corrigió), y quien corrigió dice cómo llegó la otra
 * persona, con las mismas etiquetas que la ayuda reservada.
 *
 * Una fila por corrección y persona que valora. «Ahora no» y «No volver a
 * preguntar» también se guardan aquí: sin respuesta, `created_at` es `NULL`.
 *
 * No se guarda a quién se valora: sale de `corrections`, que dice quién corrigió
 * a quién. Así, si 42 borra una corrección, su valoración deja de contar.
 *
 * Tabla del módulo `network`. Se quitó en la 66: solo se valora la ayuda.
 */

import type { Migration } from './types.js'

export const correctionFeedbackSchema: Migration = {
  version: 65,
  name: 'correction-feedback',
  statements: [
    `CREATE TABLE correction_feedback (
        correction_id INTEGER NOT NULL,
        rater         TEXT NOT NULL,
        -- Desde qué lado valora: quien corrigió o quien fue corregido.
        role          TEXT NOT NULL CHECK (role IN ('corrector', 'corrected')),
        -- Solo quien fue corregido: qué tal entiende el problema ahora.
        understanding TEXT,
        -- Reacción (si valora quien fue corregido) o cómo llegó (si valora quien corrigió).
        tag           TEXT,
        -- Cuándo contestó. NULL mientras no lo haya hecho.
        created_at    TEXT,
        -- Veces que ha dicho «Ahora no», y hasta cuándo no se le vuelve a preguntar.
        postponed     INTEGER NOT NULL DEFAULT 0,
        snoozed_until TEXT,
        -- 1 si ha dicho «No volver a preguntar».
        dismissed     INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (correction_id, rater)
      ) WITHOUT ROWID`,
  ],
}
