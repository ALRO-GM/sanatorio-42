/**
 * Lectura del nombre de un puesto (`c1r2s4` → cluster `c1`, fila 2, puesto 4).
 *
 * La API hace la misma lectura para dibujar el mapa
 * (`apps/api/src/modules/map/seat-layout.ts`); aquí solo se usa para describir
 * con palabras los puestos que alguien ha elegido.
 */
export type SeatPosition = { cluster: string; row: number; seat: number }

const HOST = /^(.+?)r(\d{1,2})[sp](\d{1,2})$/

export function parseSeat(host: string): SeatPosition | null {
  const match = HOST.exec(host.trim().toLowerCase())

  if (match === null) {
    return null
  }

  const [, cluster = '', row = '', seat = ''] = match

  return { cluster, row: Number(row), seat: Number(seat) }
}
