import {
  DECOR,
  ROOM,
  decorItem,
  desksOf,
  focusOf,
  has,
  levelOf,
  racksOf,
  roomOf,
  skillOf,
  spaceOf,
  stageOf,
} from '@sanatorio/startup'
import type { Axis, Role, StartupState } from '@sanatorio/startup'

import { FLOOR_OF_SPACE } from './floor'
import type { Floor } from './floor'
import type { ModelId, Props } from './models'

export { ROOM }

/**
 * Algo colocado en la baldosa (gx, gy) de la oficina. `decor` es su número en
 * la decoración de la partida, si la puso quien juega (se puede mover);
 * `seat`, quién se sienta ahí (`Office.people`), si alguien.
 */
export type Piece = {
  model: ModelId
  gx: number
  gy: number
  props: Props
  decor?: number
  seat?: number
}

/**
 * Quien anda por la oficina: quien programa (con su mesa), el resto de la
 * plantilla (con su oficio) y las mascotas.
 */
export type Person = {
  look: number
  axis: Axis | null
  role?: Role
  pet?: 'cat' | 'dog' | 'robot'
  /** La baldosa de su mesa (o del mostrador), si tiene. */
  desk?: readonly [number, number]
}

export type Office = {
  /** Lado de la oficina, en baldosas. */
  size: number
  floor: Floor
  /** Lo colocado, en cualquier orden: se pinta de atrás adelante. */
  pieces: Piece[]
  /** Quien se mueve: se pinta encima con `pixel/life.ts`. */
  people: Person[]
  /** Gente de la plantilla que no cabe en el dibujo. */
  hidden: number
}

/** Cuánta gente del resto de la oficina y cuántas mascotas andan a la vez: más, y no se ve nada. */
const MAX_WALKERS = 10

/**
 * La oficina de una startup: qué se ve y dónde, sacado solo de su estado (lo
 * comprado, los hitos, la plantilla, las rondas y la decoración colocada). La
 * misma partida da siempre la misma oficina.
 *
 * - Lo fijo (mesas y servidores) y la decoración colocada a mano salen del
 *   motor (`world.ts`): es lo que la API comprueba al mover una pieza.
 * - Lo que se gana (pizarra, panel, bandera, monedas…) va solo en los bordes,
 *   en lo que quede libre (`DECOR`).
 *
 * @param me El aspecto de quien la fundó (sale de su login).
 * @param busy Si la gente teclea.
 */
export function officeOf(state: StartupState, me: number, busy = true): Office {
  const space = spaceOf(state)
  const size = roomOf(state)
  const focus = focusOf(state)
  const gear = levelOf(state, 'computer')
  const pieces: Piece[] = []
  const people: Person[] = []
  const taken = new Set<string>()
  const mark = (gx: number, gy: number): void => {
    taken.add(`${String(gx)},${String(gy)}`)
  }

  // Quien programa, en su mesa: primero quien fundó.
  const desks = desksOf(state)
  const coders = [
    { axis: focus, look: me },
    ...state.team.filter((hire) => hire.role === undefined),
  ]

  coders.slice(0, desks.length).forEach((coder, index) => {
    const desk = desks[index]

    if (desk === undefined) return

    const [gx, gy] = desk

    mark(gx, gy)
    people.push({ look: coder.look, axis: coder.axis, desk })
    pieces.push({
      model: 'workstation',
      gx,
      gy,
      props: {
        level: index === 0 ? gear : Math.max(1, gear),
        look: coder.look,
        axis: coder.axis,
        busy,
      },
      seat: people.length - 1,
    })
  })

  // Los servidores: un armario más cada dos niveles, todos iguales.
  for (const [gx, gy] of racksOf(state)) {
    mark(gx, gy)
    pieces.push({ model: 'rack', gx, gy, props: { level: levelOf(state, 'servers') } })
  }

  // La decoración colocada a mano.
  state.decor.forEach((piece, index) => {
    if (piece.at === null || !(piece.id in MODELS_OF_DECOR)) return

    const [gx, gy] = piece.at

    mark(gx, gy)
    pieces.push({ model: piece.id as ModelId, gx, gy, props: { turn: piece.turn }, decor: index })
  })

  const free = (spots: readonly (readonly [number, number])[]) =>
    spots.find(
      ([gx, gy]) =>
        gx >= 0 && gy >= 0 && gx < size && gy < size && !taken.has(`${String(gx)},${String(gy)}`),
    )
  const put = (model: ModelId, props: Props, spots: readonly (readonly [number, number])[]) => {
    const spot = free(spots)

    if (spot === undefined) return undefined

    mark(spot[0], spot[1])

    const piece: Piece = { model, gx: spot[0], gy: spot[1], props }

    pieces.push(piece)

    return piece
  }

  const back = Array.from({ length: size }, (_, gx) => [gx, 0] as const)
  const left = Array.from({ length: size }, (_, gy) => [0, gy] as const)
  const right = Array.from({ length: size }, (_, gy) => [size - 1, gy] as const)
  const front = Array.from({ length: size }, (_, gx) => [size - 1 - gx, size - 1] as const)

  // El resto de la plantilla: recepción, en su mostrador junto a la entrada.
  const staff = state.team.filter((hire) => hire.role !== undefined)
  let desk = staff.find((hire) => hire.role === 'reception')

  if (desk !== undefined) {
    const counter = put('reception', { look: desk.look, axis: desk.axis, role: 'reception' }, [
      ...[...left].reverse(),
      ...front,
    ])

    if (counter !== undefined) {
      people.push({
        look: desk.look,
        axis: desk.axis,
        role: 'reception',
        desk: [counter.gx, counter.gy],
      })
      counter.seat = people.length - 1
    } else {
      // Sin sitio para el mostrador, atiende de pie como los demás.
      desk = undefined
    }
  }

  const walkers: Person[] = [
    ...staff
      .filter((hire) => hire !== desk)
      .map((hire): Person => ({
        look: hire.look,
        axis: hire.axis,
        ...(hire.role === undefined ? {} : { role: hire.role }),
      })),
    ...state.decor.flatMap((piece, index): Person[] =>
      decorItem(piece.id)?.kind === 'pet'
        ? [{ look: index * 97, axis: null, pet: piece.id as 'cat' | 'dog' | 'robot' }]
        : [],
    ),
  ]

  people.push(...walkers.slice(0, MAX_WALKERS))

  // Lo que se gana, en los bordes.
  const stage = stageOf(state)
  const skill = skillOf(state)

  for (const { model, when, props, spots } of RULES) {
    if (when({ state, space, stage, skill })) {
      put(model, props?.({ state, focus }) ?? {}, spots({ back, left, right, front }))
    }
  }

  const shownStaff = Math.min(walkers.length, MAX_WALKERS)

  return {
    size,
    floor: FLOOR_OF_SPACE[space] ?? 'planks',
    pieces,
    people,
    hidden: coders.length - Math.min(coders.length, desks.length) + (walkers.length - shownStaff),
  }
}

/** La decoración que tiene dibujo (todas: lo comprueban los tests). */
const MODELS_OF_DECOR: Record<string, true> = Object.fromEntries(
  DECOR.filter((item) => item.kind !== 'pet').map((item) => [item.id, true]),
)

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
 * Lo que se va ganando, por orden: si no queda sitio, lo último no sale. Para
 * añadir algo a la oficina que no se compra, una regla aquí.
 */
const RULES: readonly Rule[] = [
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
