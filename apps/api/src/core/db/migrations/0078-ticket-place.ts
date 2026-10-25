/**
 * Las sugerencias de mejora de la burbuja de la cabecera
 * (`docs/sugerencias.md`): además del problema (`body`), una propuesta
 * opcional y dónde se soltó la burbuja (`place`, en JSON: sección, nombre del
 * sitio, ruta del elemento, dirección, pantalla, estilo, idioma, modo y
 * versión). Van al mismo buzón que las incidencias, con `category =
 * 'improvement'`: no hace falta otra tabla ni otra bandeja en el panel.
 *
 * Los mensajes de antes se quedan sin propuesta ni sitio (`NULL`).
 *
 * Tabla del módulo `admin`.
 */

import type { Migration } from './types.js'

export const ticketPlaceSchema: Migration = {
  version: 78,
  name: 'sugerencias-con-sitio',
  statements: [
    `ALTER TABLE tickets ADD COLUMN proposal TEXT`,
    `ALTER TABLE tickets ADD COLUMN place TEXT`,
    // El tope diario de sugerencias cuenta las de cada persona por fecha.
    `CREATE INDEX idx_tickets_place ON tickets (login, created_at) WHERE place IS NOT NULL`,
  ],
}
