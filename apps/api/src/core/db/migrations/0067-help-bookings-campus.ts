/**
 * Índice de `help_bookings` por campus, estado y día: la clasificación de
 * ayuda (`stats`) recorría la tabla entera del campus en cada visita, porque
 * solo había índices por quien ayuda y por quien pide.
 */

import type { Migration } from './types.js'

export const helpBookingsCampusSchema: Migration = {
  version: 67,
  name: 'help-bookings-campus',
  statements: [
    'CREATE INDEX IF NOT EXISTS idx_help_bookings_campus ON help_bookings (campus_id, status, day)',
  ],
}
