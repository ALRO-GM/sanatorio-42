/**
 * La vida de la oficina: quién va a dónde y qué hace en cada fotograma.
 *
 * Nada se guarda ni sale al azar del navegador: cada persona tiene un plan
 * que se repite (sentarse a trabajar, ir a por café, charlar con quien mejor
 * le cae, limpiar, repartir, hacer la ronda…), sacado con semilla de su
 * aspecto y de la oficina; y dónde está en el fotograma `frame` es solo una
 * cuenta sobre ese plan. Así la misma oficina se ve igual en todas partes, y
 * con movimiento reducido (el fotograma quieto) todo se queda quieto.
 *
 * Los caminos van por la cuadrícula, de baldosa en baldosa, esquivando lo que
 * ocupa sitio (todo menos las alfombras); si no hay camino, no se va.
 */
import { seeded } from '@sanatorio/startup'

import type { Office, Person } from './layout'
import type { Carry } from './person'

/** Lo que se dice sin palabras, en un bocadillo: un dibujo de `pixel/bubbles.ts`. */
export type Bubble =
  | 'coffee'
  | 'chat'
  | 'heart'
  | 'idea'
  | 'music'
  | 'zzz'
  | 'box'
  | 'sparkle'
  | 'shield'
  | 'wrench'
  | 'happy'

/** Dónde y cómo está alguien en un fotograma. */
export type Pose = {
  gx: number
  gy: number
  /** Sentada en su mesa (se dibuja con la mesa, no andando). */
  seated: boolean
  step: number
  back: boolean
  turn: boolean
  carry: Carry
  bubble: Bubble | null
  /** Con quién charla (su número en `Office.people`), si con alguien. */
  with: number | null
  /** Sin sitio libre por donde andar: no se le ve (está en otra planta). */
  away: boolean
}

type Tile = readonly [number, number]

/** Un tramo del plan: andar un camino o quedarse en una baldosa. */
type Leg = {
  path: readonly Tile[]
  frames: number
  seated: boolean
  carry: Carry
  bubble: Bubble | null
  /** Los fotogramas del principio con bocadillo (en el resto, sin él). */
  talk: number
  with: number | null
}

export type Plan = { legs: Leg[]; total: number; offset: number; speed: number; away: boolean }

/** Fotogramas por baldosa al andar: unas dos baldosas por segundo. */
const SPEED = 3
const PET_SPEED = 4

const key = (gx: number, gy: number): string => `${String(gx)},${String(gy)}`

/**
 * Lo que se lleva cada par de personas, de 0 a 1: sale de sus dos aspectos
 * y es lo mismo en los dos sentidos.
 */
function affinity(a: number, b: number): number {
  return seeded(`friends|${String(Math.min(a, b))}|${String(Math.max(a, b))}`)()
}

/**
 * Las relaciones de quien programa: para cada cual, con quién se lleva mejor
 * (su número en `people`) y cuánto. Quien está sola, sin nadie.
 */
export function friendsOf(
  people: readonly Person[],
): ({ friend: number; affinity: number } | null)[] {
  return people.map((person, index) => {
    let best: { friend: number; affinity: number } | null = null

    people.forEach((other, at) => {
      if (at === index || other.pet !== undefined || person.pet !== undefined) return

      const value = affinity(person.look * 1000 + index, other.look * 1000 + at)

      if (best === null || value > best.affinity) best = { friend: at, affinity: value }
    })

    return best
  })
}

/** La cuadrícula de la oficina: por dónde se puede andar y cómo ir de un sitio a otro. */
function gridOf(office: Office) {
  const blocked = new Set(
    office.pieces.filter((piece) => piece.model !== 'rug').map((piece) => key(piece.gx, piece.gy)),
  )
  const walkable = (gx: number, gy: number): boolean =>
    gx >= 0 && gy >= 0 && gx < office.size && gy < office.size && !blocked.has(key(gx, gy))
  const around = ([gx, gy]: Tile): Tile[] =>
    (
      [
        [gx, gy - 1],
        [gx - 1, gy],
        [gx + 1, gy],
        [gx, gy + 1],
      ] as const
    ).filter(([x, y]) => walkable(x, y))

  /** El camino más corto de una baldosa a otra (las dos incluidas), o `null`. */
  const path = (from: Tile, to: Tile): Tile[] | null => {
    const came = new Map<string, Tile | null>([[key(from[0], from[1]), null]])
    const queue: Tile[] = [from]

    // Recorrer la cola mientras crece: lo que se añade también se visita.
    for (const current of queue) {
      if (current[0] === to[0] && current[1] === to[1]) {
        const route: Tile[] = []
        let step: Tile | null | undefined = current

        while (step !== null && step !== undefined) {
          route.unshift(step)
          step = came.get(key(step[0], step[1]))
        }

        return route
      }

      for (const next of around(current)) {
        if (!came.has(key(next[0], next[1]))) {
          came.set(key(next[0], next[1]), current)
          queue.push(next)
        }
      }
    }

    return null
  }

  const open: Tile[] = []

  for (let gy = 0; gy < office.size; gy += 1) {
    for (let gx = 0; gx < office.size; gx += 1) if (walkable(gx, gy)) open.push([gx, gy])
  }

  /** La baldosa libre más cerca de (gx, gy), para las esquinas y la entrada. */
  const nearest = (gx: number, gy: number): Tile | null =>
    open.reduce<Tile | null>(
      (best, tile) =>
        best === null ||
        Math.abs(tile[0] - gx) + Math.abs(tile[1] - gy) <
          Math.abs(best[0] - gx) + Math.abs(best[1] - gy)
          ? tile
          : best,
      null,
    )

  return { walkable, around, path, open, nearest }
}

type Grid = ReturnType<typeof gridOf>

const stay = (at: Tile, frames: number, extra: Partial<Leg> = {}): Leg => ({
  path: [at],
  frames,
  seated: false,
  carry: null,
  bubble: null,
  talk: frames,
  with: null,
  ...extra,
})

const walk = (path: readonly Tile[], speed: number, carry: Carry = null): Leg => ({
  path,
  frames: (path.length - 1) * speed,
  seated: false,
  carry,
  bubble: null,
  talk: 0,
  with: null,
})

/** Un recorrido por varias baldosas que vuelve al principio, parando en cada una. */
function tour(
  grid: Grid,
  stops: readonly Tile[],
  speed: number,
  each: (index: number) => Partial<Leg>,
  frames = 18,
): Leg[] {
  const legs: Leg[] = []
  const first = stops[0]
  // Solo las paradas a las que se puede llegar: nada de saltar de un sitio a otro.
  const reachable =
    first === undefined ? [] : stops.filter((stop) => grid.path(first, stop) !== null)

  reachable.forEach((from, index) => {
    const to = reachable[(index + 1) % reachable.length] ?? from
    const route = grid.path(from, to)

    legs.push(stay(from, frames, each(index)))
    if (route !== null && route.length > 1) legs.push(walk(route, speed, each(index).carry ?? null))
  })

  return legs
}

/** Las baldosas por donde se llega a una pieza de ese modelo (la primera libre a su lado). */
function accessTo(office: Office, grid: Grid, models: readonly string[]): Tile[] {
  return office.pieces
    .filter((piece) => models.includes(piece.model))
    .flatMap((piece) => grid.around([piece.gx, piece.gy]).slice(0, 1))
}

/** Algunas baldosas libres al azar (con semilla), para dar vueltas. */
function somewhere(grid: Grid, random: () => number, count: number): Tile[] {
  if (grid.open.length === 0) return []

  return Array.from(
    { length: count },
    () => grid.open[Math.floor(random() * grid.open.length)] ?? grid.open[0] ?? [0, 0],
  )
}

/**
 * El plan de quien programa: en su mesa un rato y, entre medias, una
 * escapada (a por café, a charlar con quien mejor le cae, a descansar) y de
 * vuelta. Con buen ánimo, a veces se le ve contenta en la mesa.
 */
function coderPlan(
  office: Office,
  grid: Grid,
  index: number,
  random: () => number,
  friend: { friend: number; affinity: number } | null,
  mood: number,
): Leg[] {
  const person = office.people[index]
  const desk = person?.desk

  if (desk === undefined) return [stay([0, 0], 60)]

  const home = grid.around(desk)[0]
  const seat = (frames: number, bubble: Bubble | null = null): Leg =>
    stay(desk, frames, { seated: true, bubble, talk: 18 })

  if (home === undefined || person?.role === 'reception') {
    return [seat(90), seat(36, person?.role === 'reception' ? 'chat' : 'idea')]
  }

  const coffee = accessTo(office, grid, ['coffee', 'cooler', 'vending'])
  const lounge = accessTo(office, grid, [
    'beanbag',
    'sofa',
    'arcade',
    'tv',
    'aquarium',
    'piano',
    'guitar',
  ])
  const mate = friend === null ? undefined : office.people[friend.friend]?.desk
  const chat = mate === undefined ? [] : grid.around(mate).slice(0, 1)
  const legs: Leg[] = []

  for (let trip = 0; trip < 3; trip += 1) {
    const roll = random()

    legs.push(
      seat(
        70 + Math.floor(random() * 140),
        roll < 0.4 && mood >= 1.15 ? 'happy' : roll < 0.6 ? 'idea' : null,
      ),
    )

    const choice = random()
    const [target, bubble, partner]: [Tile | undefined, Bubble, number | null] =
      choice < 0.35 && coffee.length > 0
        ? [coffee[Math.floor(random() * coffee.length)], 'coffee', null]
        : choice < 0.7 && chat.length > 0 && friend !== null
          ? [chat[0], friend.affinity > 0.75 ? 'heart' : 'chat', friend.friend]
          : lounge.length > 0
            ? [lounge[Math.floor(random() * lounge.length)], choice < 0.85 ? 'music' : 'zzz', null]
            : [somewhere(grid, random, 1)[0], 'idea', null]
    const route = target === undefined ? null : grid.path(home, target)

    if (route === null || route.length < 2) continue

    legs.push(walk([desk, ...route], SPEED))
    legs.push(
      stay(route[route.length - 1] ?? home, 30 + Math.floor(random() * 24), {
        bubble,
        with: partner,
      }),
    )
    legs.push(walk([...route].reverse().concat([desk]), SPEED))
  }

  return legs
}

/** El plan del resto de la plantilla, según su oficio, y de las mascotas. */
function walkerPlan(office: Office, grid: Grid, person: Person, random: () => number): Leg[] {
  const size = office.size
  const start = grid.open[0]

  if (start === undefined) return [stay([0, 0], 60)]

  if (person.pet !== undefined) {
    return tour(
      grid,
      somewhere(grid, random, 4),
      PET_SPEED,
      (index) => ({
        bubble: index === 0 ? (person.pet === 'robot' ? 'music' : 'heart') : null,
        talk: 12,
      }),
      30,
    )
  }

  switch (person.role) {
    case 'cleaning':
      return tour(grid, somewhere(grid, random, 5), SPEED, (index) => ({
        carry: 'mop',
        bubble: index % 2 === 0 ? 'sparkle' : null,
      }))
    case 'security': {
      const corners = [
        grid.nearest(0, 0),
        grid.nearest(size - 1, 0),
        grid.nearest(size - 1, size - 1),
        grid.nearest(0, size - 1),
      ].filter((tile): tile is Tile => tile !== null)

      return tour(
        grid,
        corners,
        SPEED + 1,
        (index) => ({ bubble: index === 0 ? 'shield' : null }),
        12,
      )
    }
    case 'delivery': {
      const door = grid.nearest(0, size - 1) ?? start
      const desks = office.people.flatMap((other) =>
        other.desk === undefined ? [] : grid.around(other.desk).slice(0, 1),
      )
      const legs: Leg[] = [stay(door, 36)]

      for (const desk of desks.slice(0, 3)) {
        const route = grid.path(door, desk)

        if (route === null || route.length < 2) continue

        legs.push(walk(route, SPEED, 'box'))
        legs.push(stay(desk, 14, { bubble: 'box', carry: 'box' }))
        legs.push(walk([...route].reverse(), SPEED))
        legs.push(stay(door, 24))
      }

      return legs
    }
    case 'kitchen': {
      const base = accessTo(office, grid, ['coffee'])[0] ?? start
      const desks = office.people.flatMap((other) =>
        other.desk === undefined ? [] : grid.around(other.desk).slice(0, 1),
      )
      const target = desks[Math.floor(random() * desks.length)]
      const route = target === undefined ? null : grid.path(base, target)
      const legs = [stay(base, 48, { bubble: 'coffee', talk: 18 })]

      if (route !== null && route.length > 1) {
        legs.push(
          walk(route, SPEED, 'tray'),
          stay(route[route.length - 1] ?? base, 14, { bubble: 'coffee', carry: 'tray' }),
        )
        legs.push(walk([...route].reverse(), SPEED))
      }

      return legs
    }
    case 'maintenance': {
      const racks = accessTo(office, grid, ['rack'])

      return tour(
        grid,
        racks.length > 0 ? racks : somewhere(grid, random, 3),
        SPEED,
        () => ({
          carry: 'wrench',
          bubble: 'wrench',
          talk: 14,
        }),
        36,
      )
    }
    default:
      return tour(grid, somewhere(grid, random, 3), SPEED, () => ({}), 30)
  }
}

/**
 * Los planes de toda la oficina, uno por persona de `office.people`: se
 * calculan una vez por oficina y luego cada fotograma solo los lee (`poseAt`).
 *
 * @param mood El ánimo de la oficina (`moodOf`): con buen ánimo se ve.
 */
export function lifeOf(office: Office, mood: number): Plan[] {
  const grid = gridOf(office)
  const friends = friendsOf(office.people)

  return office.people.map((person, index) => {
    const random = seeded(`life|${String(person.look)}|${String(index)}|${String(office.size)}`)
    const legs =
      person.desk !== undefined
        ? coderPlan(office, grid, index, random, friends[index] ?? null, mood)
        : walkerPlan(office, grid, person, random)
    const usable = legs.filter((leg) => leg.frames > 0)
    const plan = usable.length > 0 ? usable : [stay(grid.open[0] ?? [0, 0], 60)]
    // Quien no tiene mesa ni ninguna baldosa libre no sale.
    const away = person.desk === undefined && grid.open.length === 0

    return {
      legs: plan,
      total: plan.reduce((sum, leg) => sum + leg.frames, 0),
      // Que no se levanten todos a la vez.
      offset: Math.floor(random() * 997),
      speed: person.pet === undefined ? SPEED : PET_SPEED,
      away,
    }
  })
}

/** Dónde está y qué hace alguien con ese plan en el fotograma `frame`. */
export function poseAt(plan: Plan, frame: number): Pose {
  let t = (frame + plan.offset) % Math.max(1, plan.total)

  for (const leg of plan.legs) {
    if (t >= leg.frames) {
      t -= leg.frames
      continue
    }

    const at = Math.min(leg.path.length - 1, Math.floor(t / plan.speed))
    const from = leg.path[at] ?? [0, 0]
    const to = leg.path[at + 1] ?? from
    const part = leg.path.length > 1 ? (t % plan.speed) / plan.speed : 0
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const moving = leg.path.length > 1

    return {
      gx: from[0] + dx * part,
      gy: from[1] + dy * part,
      seated: leg.seated,
      step: moving ? 1 + (Math.floor(t / 2) % 2) : 0,
      back: moving && (dx < 0 || dy < 0),
      turn: moving && dx - dy > 0,
      carry: leg.carry,
      bubble: t < leg.talk ? leg.bubble : null,
      with: leg.with,
      away: plan.away,
    }
  }

  const first = plan.legs[0]
  const tile = first?.path[0] ?? [0, 0]

  return {
    gx: tile[0],
    gy: tile[1],
    seated: first?.seated ?? false,
    step: 0,
    back: false,
    turn: false,
    carry: null,
    bubble: null,
    with: null,
    away: plan.away,
  }
}
