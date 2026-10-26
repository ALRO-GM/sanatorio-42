/**
 * Un campus grande de mentira, con la forma del de París: clústeres por planta
 * (`f0`, `f1`, `f1b`…), cientos de puestos en cada uno y unos cientos de
 * personas sentadas. Sirve para probar que los clústeres gigantes caben en
 * pantalla y que el plano no se arrastra (`docs/asientos.md`, «Clústeres
 * grandes»). Sale al elegir París en el selector de campus del pie.
 *
 * Todo es inventado: los logins se montan con sílabas sueltas y las caras son
 * los retratos dibujados de `portrait.ts`.
 */

import type { ClusterMap, MapCluster, MapSeat, SeatDuty } from '@sanatorio/contracts'

import { portrait } from './portrait'

/** El id del campus de París en 42 (y en `CAMPUSES`). */
export const PARIS_ID = 1

/**
 * Filas × puestos por fila de cada clúster. Los de verdad rondan 13 × 23; `f1`
 * es más grande a propósito (20 × 30) para probar el peor caso.
 */
const PARIS_SIZES: Record<string, [rows: number, seats: number]> = {
  f0: [13, 23],
  f1: [20, 30],
  f1b: [10, 21],
  f2: [12, 23],
  f4: [14, 16],
  f6: [13, 16],
}

/** Qué parte de los puestos de cada clúster está ocupada. */
const FILL: Record<string, number> = { f0: 0.15, f1: 0.45, f1b: 0, f2: 0.3, f4: 0.2, f6: 0.35 }

const SYLLABLES = ['ba', 'lo', 'mi', 'ru', 'te', 'ka', 'no', 'si', 'du', 'vé', 'po', 'zi']

/** Un número entre 0 y 1 que sale siempre igual para la misma semilla. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453

  return x - Math.floor(x)
}

/** Un login inventado (tres sílabas y, a veces, un guion y una letra). */
function fakeLogin(seed: number): string {
  const pick = (offset: number): string =>
    SYLLABLES[Math.floor(noise(seed * 7 + offset) * SYLLABLES.length)] ?? 'ba'
  const base = `${pick(1)}${pick(2)}${pick(3)}`.normalize('NFD').replace(/[^a-z]/g, '')

  return seed % 4 === 0 ? `${base}-${String.fromCharCode(97 + (seed % 26))}` : `${base}${seed}`
}

/**
 * El plano de París de mentira. Con `projectId`, una de cada quince personas
 * está de guardia (verde o dorada), como en la sala de espera de un proyecto.
 */
export function parisMap(projectId?: number): ClusterMap {
  let seed = 0
  const clusters = Object.entries(PARIS_SIZES).map(([id, [rows, seatsPerRow]]): MapCluster => {
    const seats: MapSeat[] = []

    for (let row = 1; row <= rows; row += 1) {
      for (let seat = 1; seat <= seatsPerRow; seat += 1) {
        seed += 1
        const host = `${id}r${row}s${seat}`
        const roll = noise(seed)
        const busy = roll < (FILL[id] ?? 0)
        // Algunos ocupados no se ven (del otro grupo u ocultos): salen sin cara.
        const taken = busy && seed % 23 === 0
        const login = fakeLogin(seed)
        const duty: SeatDuty | null =
          projectId !== undefined && busy && seed % 15 === 0
            ? seed % 2 === 0
              ? 'specialist'
              : 'patient'
            : null

        seats.push({
          host,
          row,
          seat,
          taken,
          broken: !busy && seed % 97 === 0 ? { by: 'mock', at: new Date().toISOString() } : null,
          reservation: null,
          occupant:
            busy && !taken
              ? {
                  login,
                  image: portrait(login),
                  projects: [],
                  duty,
                  me: false,
                  online: seed % 3 === 0,
                  circle: seed % 6,
                  finishedMine: null,
                  focusUntil: null,
                }
              : null,
        })
      }
    }

    return {
      id,
      rows,
      seatsPerRow,
      seats,
      // Como la API: ocupado es quien está sentado, se le vea o no.
      occupied: seats.filter((one) => one.occupant !== null || one.taken).length,
      onDuty: seats.filter((one) => (one.occupant?.duty ?? null) !== null).length,
    }
  })

  return {
    clusters,
    // Como en París: cuentas del staff o de bots con un «puesto» que no es un
    // puesto. No forman clúster; salen en la lista de los que no se colocan.
    unplaced: [
      { login: 'robotin', host: 'PECERA 🐟', duty: null },
      { login: 'conserje', host: 'Hogwa', duty: null },
    ],
    me: { circle: 2, projects: [] },
  }
}
