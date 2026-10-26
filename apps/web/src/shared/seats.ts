/**
 * Lectura del nombre de un puesto (`c1r2s4` → cluster `c1`, fila 2, puesto 4).
 *
 * La API hace la misma lectura para dibujar el mapa
 * (`apps/api/src/modules/map/seat-layout.ts`); aquí se usa para decir con
 * palabras dónde está un puesto.
 */
import type { Translate } from './i18n'

type SeatPosition = { cluster: string; row: number; seat: number }

const HOST = /^(.+?)r(\d{1,2})[sp](\d{1,2})$/

export function parseSeat(host: string): SeatPosition | null {
  const match = HOST.exec(host.trim().toLowerCase())

  if (match === null) {
    return null
  }

  const [, cluster = '', row = '', seat = ''] = match

  return { cluster, row: Number(row), seat: Number(seat) }
}

/**
 * Cómo se llama un clúster: "Clúster 1" para `c1`. Los nombres cortos de letra
 * y número de otros campus van en mayúsculas, como los rotulan allí: en París,
 * `f1b` (la entreplanta de la planta 1) es «F1B», no «Clúster F1B», que no
 * cabría en las pastillas y no es como lo llama nadie. Lo demás, tal cual.
 */
export function clusterName(id: string, t: Translate): string {
  const match = /^c(\d+)$/.exec(id)

  if (match !== null) return t('map.cluster', { n: match[1] ?? '' })

  return /^[a-z]{1,2}\d+[a-z]?$/.test(id) ? id.toUpperCase() : id
}

/**
 * "Cluster 2 · Fila 10 · PC 1" para `c2r10s1`. Si el nombre no sigue ese
 * patrón, se deja como viene.
 */
export function seatName(host: string, t: Translate): string {
  const position = parseSeat(host)

  return position === null
    ? host
    : t('map.seatName', {
        cluster: clusterName(position.cluster, t),
        row: position.row,
        seat: position.seat,
      })
}
