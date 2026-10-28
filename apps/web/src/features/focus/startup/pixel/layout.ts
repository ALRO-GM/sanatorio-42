import { focusOf, has, levelOf, skillOf, stageOf } from '@sanatorio/startup'
import type { StartupState } from '@sanatorio/startup'

import { FLOOR_OF_SPACE } from './floor'
import type { Floor } from './floor'
import type { ModelId, Props } from './models'

/** Algo colocado en la baldosa (gx, gy) de la oficina. */
export type Piece = { model: ModelId; gx: number; gy: number; props: Props }

export type Office = {
  /** Lado de la oficina, en baldosas. */
  size: number
  floor: Floor
  /** Lo colocado, en cualquier orden: se pinta de atrás adelante. */
  pieces: Piece[]
  /** Personas de la plantilla que no caben en el dibujo. */
  hidden: number
}

/** El lado de la oficina según el espacio comprado (0 el garaje, 5 el campus). */
export const ROOM = [4, 5, 6, 7, 8, 8] as const

/**
 * La oficina de una startup: qué se ve y dónde, sacado solo de su estado (lo
 * comprado, los hitos, la plantilla y las rondas). La misma partida da siempre
 * la misma oficina.
 *
 * - Las mesas van en filas (y = 1, 3, 5…) con un pasillo entre fila y fila;
 *   primero quien fundó, con su ordenador, y luego la plantilla.
 * - Los servidores, al fondo a la derecha; lo demás, en los bordes, según se
 *   va ganando (`DECOR`).
 *
 * @param me El aspecto de quien la fundó (sale de su login).
 * @param busy Si la gente teclea.
 */
export function officeOf(state: StartupState, me: number, busy = true): Office {
  const space = Math.min(levelOf(state, 'space'), ROOM.length - 1)
  const size = ROOM[space] ?? ROOM[0]
  const focus = focusOf(state)
  const gear = levelOf(state, 'computer')
  const pieces: Piece[] = []
  const taken = new Set<string>()

  const put = (
    model: ModelId,
    props: Props,
    spots: readonly (readonly [number, number])[],
  ): void => {
    const spot = spots.find(
      ([gx, gy]) => gx >= 0 && gy >= 0 && gx < size && gy < size && !taken.has(`${gx},${gy}`),
    )

    if (spot === undefined) return

    taken.add(`${spot[0]},${spot[1]}`)
    pieces.push({ model, gx: spot[0], gy: spot[1], props })
  }

  // Las mesas.
  const desks: [number, number][] = []

  for (let gy = 1; gy < size; gy += 2) {
    for (let gx = 1; gx < size - 1; gx += 1) desks.push([gx, gy])
  }

  const people = [{ axis: focus, look: me }, ...state.team]
  const shown = people.slice(0, desks.length)

  shown.forEach((person, index) => {
    const level = index === 0 ? gear : Math.max(1, gear)
    const spot = desks[index]

    if (spot !== undefined)
      put('workstation', { level, look: person.look, axis: person.axis, busy }, [spot])
  })

  // Los servidores: un armario más cada dos niveles, todos iguales.
  const servers = levelOf(state, 'servers')

  if (servers > 0) {
    const racks = servers >= 5 ? 3 : servers >= 3 ? 2 : 1

    for (let rack = 0; rack < racks; rack += 1)
      put('rack', { level: servers }, [[size - 1 - rack, 0]])
  }

  // Lo demás, en los bordes: el fondo, la izquierda y la derecha.
  const back = Array.from({ length: size }, (_, gx) => [gx, 0] as const)
  const left = Array.from({ length: size }, (_, gy) => [0, gy] as const)
  const right = Array.from({ length: size }, (_, gy) => [size - 1, gy] as const)
  const front = Array.from({ length: size }, (_, gx) => [size - 1 - gx, size - 1] as const)
  const stage = stageOf(state)
  const skill = skillOf(state)

  for (const { model, when, props, spots } of DECOR) {
    if (when({ state, space, stage, skill })) {
      put(model, props?.({ state, focus }) ?? {}, spots({ back, left, right, front }))
    }
  }

  return {
    size,
    floor: FLOOR_OF_SPACE[space] ?? 'concrete',
    pieces,
    hidden: people.length - shown.length,
  }
}

type Spots = Record<'back' | 'left' | 'right' | 'front', readonly (readonly [number, number])[]>

type Rule = {
  model: ModelId
  /** Cuándo sale. */
  when: (game: { state: StartupState; space: number; stage: number; skill: number }) => boolean
  props?: (game: { state: StartupState; focus: ReturnType<typeof focusOf> }) => Props
  /** Dónde puede ir, por orden de preferencia: la primera baldosa libre. */
  spots: (edges: Spots) => readonly (readonly [number, number])[]
}

/**
 * La decoración que se va ganando, por orden: si no queda sitio, lo último no
 * sale. Para añadir algo a la oficina, una regla aquí.
 */
const DECOR: readonly Rule[] = [
  { model: 'cactus', when: ({ space }) => space === 0, spots: ({ left }) => left },
  { model: 'monstera', when: ({ space }) => space > 0, spots: ({ left }) => left },
  {
    model: 'bookshelf',
    when: ({ skill }) => skill > 0,
    props: ({ state }) => ({ level: skillOf(state) }),
    spots: ({ back }) => back.slice(1),
  },
  { model: 'whiteboard', when: ({ stage }) => stage >= 1, spots: ({ back }) => back },
  { model: 'dashboard', when: ({ stage }) => stage >= 2, spots: ({ back }) => back },
  {
    model: 'flag',
    when: ({ state }) => has(state, 'founded'),
    props: ({ focus }) => ({ axis: focus }),
    spots: ({ left }) => [...left].reverse(),
  },
  {
    model: 'coins',
    when: ({ state }) => state.rounds.length > 0,
    props: ({ state }) => ({ level: state.rounds.length }),
    spots: ({ front, right }) => [...front, ...[...right].reverse()],
  },
  {
    model: 'globe',
    when: ({ state }) => has(state, 'global'),
    spots: ({ front, right }) => [...front, ...[...right].reverse()],
  },
  { model: 'coffee', when: ({ space }) => space >= 1, spots: ({ left }) => left },
  { model: 'printer', when: ({ stage }) => stage >= 4, spots: ({ right }) => right.slice(1) },
  { model: 'cooler', when: ({ space }) => space >= 2, spots: ({ left }) => left },
  { model: 'beanbag', when: ({ space }) => space >= 2, spots: ({ right }) => right.slice(1) },
  { model: 'beanbag', when: ({ space }) => space >= 3, spots: ({ right }) => right.slice(1) },
  {
    model: 'monstera',
    when: ({ space }) => space >= 3,
    spots: ({ right }) => [...right].reverse(),
  },
]
