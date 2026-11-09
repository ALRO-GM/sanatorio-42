/**
 * La planta de la oficina vista como cuadrícula: cuánto mide, dónde va cada
 * cosa y dónde se puede dejar o mover algo. Lo usa la web para dibujarla y la
 * API para no dejar colocar nada fuera ni encima de otra cosa.
 *
 * Nada está fijo (pedido por Alberto el 2026-11-09): la decoración se coloca a
 * mano, y lo demás (las mesas, los servidores, el mostrador y lo que se gana:
 * pizarra, bandera, cafetera…, `fixturesOf`) también se puede mover. Lo que se
 * coloca a mano manda: lo que se coloca solo se aparta a la siguiente baldosa
 * libre de su sitio de siempre.
 */

import { DECOR, ROOM, SPACES } from './data.js'
import type { DecorItem } from './data.js'
import { has, levelOf, skillOf, stageOf } from './state.js'
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

// --- Lo que no es decoración ----------------------------------------------------

/**
 * Lo que hay en la oficina sin comprarlo como decoración: `desk` (una mesa por
 * quien programa), `rack` (los servidores), `reception` (el mostrador) y
 * `extra` (lo que se gana). `model` es su dibujo en la web.
 */
export type FixtureKind = 'desk' | 'rack' | 'reception' | 'extra'
export type Fixture = { key: string; kind: FixtureKind; model: string }

type Edges = Record<'back' | 'left' | 'right' | 'front', readonly Tile[]>

type Extra = {
  key: string
  model: string
  /** Cuándo sale. */
  when: (state: StartupState) => boolean
  /** Dónde va solo, por orden de preferencia: la primera baldosa libre. */
  spots: (edges: Edges) => readonly Tile[]
}

/**
 * Lo que se va ganando, por orden: si no queda sitio, lo último no sale. Para
 * añadir algo a la oficina que no se compra, una línea aquí (y su dibujo en
 * `pixel/layout.ts` de la web). La clave no cambia nunca: con ella se guarda
 * dónde lo ha movido cada cual.
 */
const EXTRAS: readonly Extra[] = [
  { key: 'cactus', model: 'cactus', when: (s) => spaceOf(s) === 0, spots: ({ left }) => left },
  { key: 'monstera', model: 'monstera', when: (s) => spaceOf(s) > 0, spots: ({ left }) => left },
  {
    key: 'bookshelf',
    model: 'bookshelf',
    when: (s) => skillOf(s) > 0,
    spots: ({ back }) => back.slice(1),
  },
  {
    key: 'whiteboard',
    model: 'whiteboard',
    when: (s) => stageOf(s) >= 1,
    spots: ({ back }) => back,
  },
  { key: 'dashboard', model: 'dashboard', when: (s) => stageOf(s) >= 2, spots: ({ back }) => back },
  {
    key: 'flag',
    model: 'flag',
    when: (s) => has(s, 'founded'),
    spots: ({ left }) => [...left].reverse(),
  },
  {
    key: 'coins',
    model: 'coins',
    when: (s) => s.rounds.length > 0,
    spots: ({ front, right }) => [...front, ...[...right].reverse()],
  },
  {
    key: 'globe',
    model: 'globe',
    when: (s) => has(s, 'global'),
    spots: ({ front, right }) => [...front, ...[...right].reverse()],
  },
  { key: 'coffee', model: 'coffee', when: (s) => spaceOf(s) >= 1, spots: ({ left }) => left },
  {
    key: 'printer',
    model: 'printer',
    when: (s) => stageOf(s) >= 4,
    spots: ({ right }) => right.slice(1),
  },
  { key: 'cooler', model: 'cooler', when: (s) => spaceOf(s) >= 2, spots: ({ left }) => left },
  {
    key: 'beanbag',
    model: 'beanbag',
    when: (s) => spaceOf(s) >= 2,
    spots: ({ right }) => right.slice(1),
  },
  {
    key: 'beanbag-2',
    model: 'beanbag',
    when: (s) => spaceOf(s) >= 3,
    spots: ({ right }) => right.slice(1),
  },
  {
    key: 'monstera-2',
    model: 'monstera',
    when: (s) => spaceOf(s) >= 3,
    spots: ({ right }) => [...right].reverse(),
  },
]

/** Cuántos armarios de servidores: uno más cada dos niveles. */
function rackCount(state: StartupState): number {
  const servers = levelOf(state, 'servers')

  return servers >= 5 ? 3 : servers >= 3 ? 2 : servers >= 1 ? 1 : 0
}

/** Lo que hay ahora en la oficina además de la decoración, por orden de preferencia. */
export function fixturesOf(state: StartupState): Fixture[] {
  return [
    ...Array.from({ length: codersOf(state) }, (_, index): Fixture => ({
      key: `desk:${String(index)}`,
      kind: 'desk',
      model: 'workstation',
    })),
    ...Array.from({ length: rackCount(state) }, (_, index): Fixture => ({
      key: `rack:${String(index)}`,
      kind: 'rack',
      model: 'rack',
    })),
    ...(state.team.some((hire) => hire.role === 'reception')
      ? [{ key: 'reception', kind: 'reception' as const, model: 'reception' }]
      : []),
    ...EXTRAS.filter((extra) => extra.when(state)).map((extra): Fixture => ({
      key: extra.key,
      kind: 'extra',
      model: extra.model,
    })),
  ]
}

/** Si una clave es de algo que se puede mover (aunque ahora no esté en la oficina). */
export const isFixtureKey = (key: string): boolean =>
  /^(desk|rack):\d{1,3}$/.test(key) ||
  key === 'reception' ||
  EXTRAS.some((extra) => extra.key === key)

const inside = (size: number, gx: number, gy: number): boolean =>
  Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0 && gx < size && gy < size

/**
 * Dónde queda cada cosa que no es decoración: primero lo movido a mano (si
 * cabe y no pisa la decoración), y luego lo demás en su sitio de siempre, en
 * lo que quede libre. Lo que no cabe no sale.
 */
export function layoutOf(state: StartupState): (Fixture & { at: Tile })[] {
  const size = roomOf(state)
  const taken = decorTiles(state)
  const fixtures = fixturesOf(state)
  const placed = new Map<string, Tile>()
  const take = (key: string, tile: Tile): void => {
    placed.set(key, tile)
    taken.add(keyOf(tile[0], tile[1]))
  }

  for (const fixture of fixtures) {
    const tile = state.moved[fixture.key]

    if (tile !== undefined && inside(size, tile[0], tile[1]) && !taken.has(keyOf(...tile))) {
      take(fixture.key, tile)
    }
  }

  const back = Array.from({ length: size }, (_, gx): Tile => [gx, 0])
  const left = Array.from({ length: size }, (_, gy): Tile => [0, gy])
  const right = Array.from({ length: size }, (_, gy): Tile => [size - 1, gy])
  const front = Array.from({ length: size }, (_, gx): Tile => [size - 1 - gx, size - 1])
  const spotsOf = (fixture: Fixture): readonly Tile[] => {
    switch (fixture.kind) {
      case 'desk':
        return deskSlots(size)
      case 'rack':
        return Array.from({ length: size }, (_, step): Tile => [size - 1 - step, 0])
      case 'reception':
        return [...[...left].reverse(), ...front]
      case 'extra':
        return (
          EXTRAS.find((extra) => extra.key === fixture.key)?.spots({ back, left, right, front }) ??
          []
        )
    }
  }

  for (const fixture of fixtures) {
    if (placed.has(fixture.key)) continue

    const spot = spotsOf(fixture).find(([gx, gy]) => !taken.has(keyOf(gx, gy)))

    if (spot !== undefined) take(fixture.key, spot)
  }

  return fixtures.flatMap((fixture) => {
    const at = placed.get(fixture.key)

    return at === undefined ? [] : [{ ...fixture, at }]
  })
}

/**
 * Las mesas de quien programa, en orden (la primera, de quien fundó). Quien
 * no cabe no sale en el dibujo.
 */
export const desksOf = (state: StartupState): Tile[] =>
  layoutOf(state)
    .filter((fixture) => fixture.kind === 'desk')
    .map((fixture) => fixture.at)

/** Los armarios de servidores. */
export const racksOf = (state: StartupState): Tile[] =>
  layoutOf(state)
    .filter((fixture) => fixture.kind === 'rack')
    .map((fixture) => fixture.at)

/**
 * Lo que no se aparta: las mesas, los servidores y todo lo movido a mano. Lo
 * demás que se coloca solo (el mostrador, lo ganado) busca otro sitio.
 */
function solidOf(state: StartupState): Set<string> {
  return new Set(
    layoutOf(state)
      .filter(
        (fixture) =>
          fixture.kind === 'desk' || fixture.kind === 'rack' || fixture.key in state.moved,
      )
      .map(({ at }) => keyOf(at[0], at[1])),
  )
}

/**
 * Si la pieza `index` de la decoración puede ir a (gx, gy): dentro de la
 * planta, en una baldosa sin otra decoración, mesa, servidor ni nada movido a
 * mano. Las mascotas van solas: no se colocan.
 */
export function canPlace(state: StartupState, index: number, gx: number, gy: number): boolean {
  const piece = state.decor[index]
  const kind = piece === undefined ? undefined : decorItem(piece.id)?.kind

  if (kind !== 'piece' && kind !== 'flat') return false
  if (!inside(roomOf(state), gx, gy)) return false

  // Lo demás se mira sin la pieza: si se aparta, una mesa puede ocupar su sitio.
  const without = { ...state, decor: state.decor.filter((_, other) => other !== index) }

  return !solidOf(without).has(keyOf(gx, gy)) && !decorTiles(without).has(keyOf(gx, gy))
}

/**
 * Si lo que no es decoración con esa clave puede ir a (gx, gy): que esté en la
 * oficina, dentro de la planta, y sin decoración ni otra cosa movida a mano en
 * esa baldosa. Lo que se coloca solo y estuviera allí se aparta.
 */
export function canMove(state: StartupState, key: string, gx: number, gy: number): boolean {
  if (!fixturesOf(state).some((fixture) => fixture.key === key)) return false
  if (!inside(roomOf(state), gx, gy)) return false
  if (decorTiles(state).has(keyOf(gx, gy))) return false

  const others = layoutOf(state).filter(
    (fixture) => fixture.key !== key && fixture.key in state.moved,
  )

  return !others.some(({ at }) => at[0] === gx && at[1] === gy)
}

/**
 * Dónde se deja sola una pieza nueva: la primera baldosa libre por los bordes
 * (delante, a la izquierda, a la derecha) y, si no, cualquiera. `null` si no
 * queda sitio: se guarda en el almacén.
 */
export function freeSpot(state: StartupState): Tile | null {
  const size = roomOf(state)
  const taken = new Set([...solidOf(state), ...decorTiles(state)])
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
    const fits = decorItem(piece.id)?.kind !== 'pet' && inside(size, gx, gy) && !seen.has(spot)

    if (!fits) return { ...piece, at: null }

    seen.add(spot)

    return piece
  })
}

/**
 * Lo que se cobra al vender una pieza de decoración: lo que costó en la
 * tienda. Lo que solo sale en las cajas (y las mascotas) no tiene precio de
 * tienda: vale lo que da una caja en dinero en el espacio de ahora.
 */
export function sellPrice(state: StartupState, id: string): number {
  const item = decorItem(id)

  if (item === undefined) return 0

  return item.cost > 0 ? item.cost : 100 * 2 ** spaceOf(state)
}
