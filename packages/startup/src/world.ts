/**
 * La planta de la oficina vista como cuadrícula: cuánto mide, dónde van las
 * mesas y los servidores (lo fijo) y dónde se puede dejar la decoración. Lo
 * usa la web para dibujarla y la API para no dejar colocar nada fuera ni
 * encima de otra cosa (`canPlace`).
 *
 * Lo que se coloca a mano manda: las mesas y los servidores se apartan de la
 * decoración (van a la siguiente baldosa libre), y la decoración no se puede
 * dejar donde ya hay una mesa o un servidor.
 */

import { DECOR, ROOM, SPACES } from './data.js'
import type { DecorItem } from './data.js'
import { levelOf } from './state.js'
import type { StartupState } from './state.js'

/** Una baldosa: (gx, gy), del fondo (0, 0) hacia delante. */
export type Tile = readonly [number, number]

const keyOf = (gx: number, gy: number): string => `${String(gx)},${String(gy)}`

/** El espacio (0 tu cuarto … 5 el edificio entero), dentro del catálogo. */
export const spaceOf = (state: StartupState): number =>
  Math.max(0, Math.min(levelOf(state, 'space'), SPACES.length - 1))

/** El lado de la planta, en baldosas. */
export const roomOf = (state: StartupState): number => ROOM[spaceOf(state)] ?? ROOM[0]

export const decorItem = (id: string): DecorItem | undefined => DECOR.find((item) => item.id === id)

/** Quien programa en la oficina: quien fundó y la plantilla sin `role`. */
export const codersOf = (state: StartupState): number =>
  1 + state.team.filter((hire) => hire.role === undefined).length

/** Las baldosas con decoración colocada. */
function decorTiles(state: StartupState): Set<string> {
  return new Set(
    state.decor.flatMap((piece) => (piece.at === null ? [] : [keyOf(piece.at[0], piece.at[1])])),
  )
}

/** Dónde puede ir una mesa: en filas (y = 1, 3, 5…) con pasillo entre una y otra. */
function deskSlots(size: number): Tile[] {
  const slots: Tile[] = []

  for (let gy = 1; gy < size; gy += 2) {
    for (let gx = 1; gx < size - 1; gx += 1) slots.push([gx, gy])
  }

  return slots
}

/**
 * Las mesas de quien programa, en orden (la primera, de quien fundó): las
 * primeras baldosas de mesa sin decoración. Quien no cabe no sale en el dibujo.
 */
export function desksOf(state: StartupState): Tile[] {
  const used = decorTiles(state)

  return deskSlots(roomOf(state))
    .filter(([gx, gy]) => !used.has(keyOf(gx, gy)))
    .slice(0, codersOf(state))
}

/** Los armarios de servidores: uno más cada dos niveles, al fondo a la derecha. */
export function racksOf(state: StartupState): Tile[] {
  const servers = levelOf(state, 'servers')
  const count = servers >= 5 ? 3 : servers >= 3 ? 2 : servers >= 1 ? 1 : 0
  const size = roomOf(state)
  const used = decorTiles(state)

  return Array.from({ length: size }, (_, step): Tile => [size - 1 - step, 0])
    .filter(([gx, gy]) => !used.has(keyOf(gx, gy)))
    .slice(0, count)
}

/** Lo fijo: mesas y servidores. */
function fixedOf(state: StartupState): Set<string> {
  return new Set([...desksOf(state), ...racksOf(state)].map(([gx, gy]) => keyOf(gx, gy)))
}

/**
 * Si la pieza `index` de la decoración puede ir a (gx, gy): dentro de la
 * planta, en una baldosa sin otra decoración, mesa ni servidor. Las mascotas
 * van solas: no se colocan.
 */
export function canPlace(state: StartupState, index: number, gx: number, gy: number): boolean {
  const piece = state.decor[index]
  const size = roomOf(state)

  const kind = piece === undefined ? undefined : decorItem(piece.id)?.kind

  if (kind !== 'piece' && kind !== 'flat') return false
  if (!Number.isInteger(gx) || !Number.isInteger(gy)) return false
  if (gx < 0 || gy < 0 || gx >= size || gy >= size) return false

  // Lo fijo se mira sin la pieza: si se aparta, una mesa puede ocupar su sitio.
  const without = { ...state, decor: state.decor.filter((_, other) => other !== index) }

  return !fixedOf(without).has(keyOf(gx, gy)) && !decorTiles(without).has(keyOf(gx, gy))
}

/**
 * Dónde se deja sola una pieza nueva: la primera baldosa libre por los bordes
 * (delante, a la izquierda, a la derecha) y, si no, cualquiera. `null` si no
 * queda sitio: se guarda en el almacén.
 */
export function freeSpot(state: StartupState): Tile | null {
  const size = roomOf(state)
  const taken = new Set([...fixedOf(state), ...decorTiles(state)])
  const edges: Tile[] = [
    ...Array.from({ length: size }, (_, step): Tile => [size - 1 - step, size - 1]),
    ...Array.from({ length: size }, (_, gy): Tile => [0, gy]),
    ...Array.from({ length: size }, (_, gy): Tile => [size - 1, size - 1 - gy]),
  ]
  const all = Array.from({ length: size * size }, (_, at): Tile => [
    at % size,
    Math.floor(at / size),
  ])

  return [...edges, ...all].find(([gx, gy]) => !taken.has(keyOf(gx, gy))) ?? null
}

/**
 * La decoración saneada para la planta de ahora: lo que quede fuera (al
 * volver a empezar en tu cuarto, más pequeño), encima de otra pieza o sea una
 * mascota se guarda en el almacén en vez de perderse.
 */
export function tidyDecor(state: StartupState): StartupState['decor'] {
  const size = roomOf(state)
  const seen = new Set<string>()

  return state.decor.map((piece) => {
    if (piece.at === null) return piece

    const [gx, gy] = piece.at
    const spot = keyOf(gx, gy)
    const fits =
      decorItem(piece.id)?.kind !== 'pet' &&
      Number.isInteger(gx) &&
      Number.isInteger(gy) &&
      gx >= 0 &&
      gy >= 0 &&
      gx < size &&
      gy < size &&
      !seen.has(spot)

    if (!fits) return { ...piece, at: null }

    seen.add(spot)

    return piece
  })
}
