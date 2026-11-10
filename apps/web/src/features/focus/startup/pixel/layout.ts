import {
  DECOR,
  ROOM,
  avatarKey,
  avatarOf,
  decorItem,
  focusOf,
  layoutOf,
  levelOf,
  roomOf,
  skillOf,
  spaceOf,
} from '@sanatorio/startup'
import type { Avatar, Axis, Role, StartupState } from '@sanatorio/startup'

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
  /** Su clave si no es decoración y se puede mover (`fixturesOf`): `desk:0`, `rack:1`, `flag`… */
  fixture?: string
}

/**
 * Quien anda por la oficina: quien programa (con su mesa), el resto de la
 * plantilla (con su oficio) y las mascotas.
 */
export type Person = {
  look: number
  /** Su aspecto (`avatarKey`): el del configurador o el que sale de `look`. */
  avatar?: string
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

/** El aspecto de alguien en una cadena: el del configurador o, si no lo tocó, el de su `look`. */
const faceOf = ({ look, avatar }: { look: number; avatar?: Avatar | undefined }): string =>
  avatarKey(avatar ?? avatarOf(look))

/** Cuánta gente del resto de la oficina y cuántas mascotas andan a la vez: más, y no se ve nada. */
const MAX_WALKERS = 10

/**
 * La oficina de una startup: qué se ve y dónde, sacado solo de su estado (lo
 * comprado, los hitos, la plantilla, las rondas y la decoración colocada). La
 * misma partida da siempre la misma oficina.
 *
 * - Dónde va cada cosa sale del motor (`world.ts`, `layoutOf`): la
 *   decoración, las mesas, los servidores, el mostrador y lo que se gana
 *   (pizarra, panel, bandera, monedas…). Todo se puede mover a mano, y es lo
 *   que la API comprueba al moverlo; lo no movido va en su sitio de siempre.
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
  // Dónde queda cada cosa que no es decoración (`world.ts`): lo movido a
  // mano y, en lo que quede, lo demás en su sitio de siempre.
  const layout = layoutOf(state)
  const desks = layout.filter((fixture) => fixture.kind === 'desk')

  // Quien programa, en su mesa: primero quien fundó.
  const coders = [
    { axis: focus, look: me, avatar: state.me },
    ...state.team.filter((hire) => hire.role === undefined),
  ]

  coders.slice(0, desks.length).forEach((coder, index) => {
    const desk = desks[index]

    if (desk === undefined) return

    const [gx, gy] = desk.at

    const avatar = faceOf(coder)

    people.push({ look: coder.look, avatar, axis: coder.axis, desk: desk.at })
    pieces.push({
      model: 'workstation',
      gx,
      gy,
      props: {
        level: index === 0 ? gear : Math.max(1, gear),
        look: coder.look,
        avatar,
        axis: coder.axis,
        busy,
      },
      seat: people.length - 1,
      fixture: desk.key,
    })
  })

  // La decoración colocada a mano.
  state.decor.forEach((piece, index) => {
    if (piece.at === null || !(piece.id in MODELS_OF_DECOR)) return

    const [gx, gy] = piece.at

    pieces.push({ model: piece.id as ModelId, gx, gy, props: { turn: piece.turn }, decor: index })
  })

  // El resto de la plantilla: recepción, en su mostrador.
  const staff = state.team.filter((hire) => hire.role !== undefined)
  const counter = layout.find((fixture) => fixture.kind === 'reception')
  const desk = counter === undefined ? undefined : staff.find((hire) => hire.role === 'reception')

  // Los servidores (todos iguales), el mostrador y lo ganado.
  for (const fixture of layout) {
    const [gx, gy] = fixture.at

    if (fixture.kind === 'rack') {
      pieces.push({
        model: 'rack',
        gx,
        gy,
        props: { level: levelOf(state, 'servers') },
        fixture: fixture.key,
      })
    } else if (fixture.kind === 'reception' && desk !== undefined) {
      const avatar = faceOf(desk)

      people.push({ look: desk.look, avatar, axis: desk.axis, role: 'reception', desk: fixture.at })
      pieces.push({
        model: 'reception',
        gx,
        gy,
        props: { look: desk.look, avatar, axis: desk.axis, role: 'reception' },
        seat: people.length - 1,
        fixture: fixture.key,
      })
    } else if (fixture.kind === 'extra') {
      pieces.push({
        model: fixture.model as ModelId,
        gx,
        gy,
        props: PROPS[fixture.model]?.(state, focus) ?? {},
        fixture: fixture.key,
      })
    }
  }

  // Sin sitio para el mostrador, recepción atiende de pie como los demás.
  const walkers: Person[] = [
    ...staff
      .filter((hire) => hire !== desk)
      .map((hire): Person => ({
        look: hire.look,
        avatar: faceOf(hire),
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

  const shownStaff = Math.min(walkers.length, MAX_WALKERS)

  return {
    size,
    floor: FLOOR_OF_SPACE[space] ?? 'planks',
    pieces,
    people,
    hidden: coders.length - Math.min(coders.length, desks.length) + (walkers.length - shownStaff),
  }
}

/** Lo que cambia el dibujo de lo ganado: el nivel de la estantería, la bandera, las monedas. */
const PROPS: Partial<Record<string, (state: StartupState, focus: Axis | null) => Props>> = {
  bookshelf: (state) => ({ level: skillOf(state) }),
  flag: (_, focus) => ({ axis: focus }),
  coins: (state) => ({ level: state.rounds.length }),
}

/** La decoración que tiene dibujo (todas: lo comprueban los tests). */
const MODELS_OF_DECOR: Record<string, true> = Object.fromEntries(
  DECOR.filter((item) => item.kind !== 'pet').map((item) => [item.id, true]),
)
