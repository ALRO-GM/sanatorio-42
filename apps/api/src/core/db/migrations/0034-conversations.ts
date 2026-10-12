/**
 * Lo que cada persona apunta de sus conversaciones.
 *
 * Los mensajes siguen donde estaban (`event_messages`): una conversación existe
 * desde que alguien escribe. Aquí va lo que es de cada cual sobre cada una:
 *
 * - `read_upto`: el último mensaje que ha visto. Lo que venga después, de otra
 *   persona, está sin leer.
 * - `pending`: la ha marcado como pendiente de responder.
 * - `remind_at`: cuándo quiere que se le recuerde. Al llegar la hora se le deja
 *   un aviso en el buzón y se vacía.
 * - `project_id`: el proyecto del que va, si lo ha dicho.
 *
 * Una fila por persona y conversación; quien no ha tocado nada no tiene fila.
 *
 * Tabla del módulo `meet`.
 */

import type { Migration } from './types.js'

export const conversationsSchema: Migration = {
  version: 34,
  name: 'conversaciones',
  statements: [
    `CREATE TABLE conversation_marks (
        login      TEXT NOT NULL,
        chat_id    TEXT NOT NULL,
        read_upto  INTEGER NOT NULL DEFAULT 0,
        pending    INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1)),
        remind_at  TEXT,
        project_id INTEGER,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (login, chat_id)
      ) WITHOUT ROWID`,
    // Para el trabajo que reparte los recordatorios: solo mira los que tienen hora.
    'CREATE INDEX conversation_marks_due ON conversation_marks (remind_at) WHERE remind_at IS NOT NULL',
    // Las conversaciones de alguien salen de lo que ha escrito.
    'CREATE INDEX IF NOT EXISTS event_messages_by_login ON event_messages (login, event_id)',
  ],
}
