/**
 * Ayuda: a quién hay que contarle en una ventana que su reserva se ha
 * rechazado o anulado.
 *
 * `news_for` es el login de quien no lo hizo (y tiene que enterarse); se vacía
 * cuando lo ve. Las reservas de antes no tienen nada que contar. Tabla del
 * módulo `help`.
 */

import type { Migration } from './types.js'

export const helpNewsSchema: Migration = {
  version: 49,
  name: 'ayuda-rechazos-a-la-vista',
  statements: ['ALTER TABLE help_bookings ADD COLUMN news_for TEXT'],
}
