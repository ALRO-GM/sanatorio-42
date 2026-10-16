/**
 * Las correcciones de 42 ya no piden respuesta (`needsReply` en `meet.rules.ts`).
 *
 * Hasta ahora, a quien no contestaba a la media hora de empezar se le apuntaba
 * «no asistido» en el chat de la corrección y un aviso de que se le pasó, aunque
 * la hubiera hecho: bastaba con no tener la web abierta. Se borran esas marcas y
 * sus avisos. Lo que sí contestó cada cual (voy, me retraso, no voy) se queda.
 *
 * Datos del módulo `meet`.
 */

import type { Migration } from './types.js'

export const evaluationMissedSchema: Migration = {
  version: 35,
  name: 'correcciones-sin-falta-automatica',
  statements: [
    `DELETE FROM event_messages
      WHERE event_id LIKE 'evaluation:%' AND kind = 'absent' AND reason = 'missed'`,
    `DELETE FROM event_alerts WHERE event_id LIKE 'evaluation:%'`,
  ],
}
