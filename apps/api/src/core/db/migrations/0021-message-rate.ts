/**
 * Índice para el tope de mensajes por persona y minuto: sin él, cada mensaje
 * que se manda recorría la tabla entera para contar los últimos de su autor.
 *
 * Tabla del módulo `meet`.
 */

import type { Migration } from './types.js'

export const messageRateSchema: Migration = {
  version: 21,
  name: 'mensajes-por-persona',
  statements: [`CREATE INDEX idx_event_messages_login ON event_messages (login, created_at)`],
}
