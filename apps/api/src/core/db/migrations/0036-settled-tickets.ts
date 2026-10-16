/**
 * Al responder un mensaje del buzón, su aviso de «mensaje nuevo» ya se da por
 * leído para todo quien administra (`notice.settled`). Esto hace lo mismo con
 * los que se respondieron antes de que existiera: si no, el número rojo de la
 * cabecera seguiría contando mensajes ya atendidos.
 *
 * Datos del módulo `notices`.
 */

import type { Migration } from './types.js'

export const settledTicketsSchema: Migration = {
  version: 36,
  name: 'avisos-de-mensajes-ya-respondidos',
  statements: [
    `UPDATE notices SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE kind = 'ticket_new' AND read_at IS NULL
        AND ref IN (SELECT 'ticket:' || id FROM tickets WHERE status != 'open')`,
  ],
}
