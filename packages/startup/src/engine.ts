/**
 * Las cuentas de la startup: qué se puede hacer, cuánto cuesta, qué pasa al
 * hacerlo y lo que vale la empresa. Funciones puras: la API las usa para hacer
 * cumplir las reglas y la web para pintar lo mismo.
 *
 * El azar (candidatos, suerte de cada ronda, cajas sorpresa) sale de una
 * semilla con el login y lo hecho hasta ahora: el mismo para quien lo pide
 * desde la web y para la API, y no se puede volver a tirar recargando la página.
 */

import {
  AXES,
  CANDIDATES,
  DECOR,
  DECOR_MAX,
  HIRE_BASE,
  ITEMS,
  MILESTONES,
  MILESTONE_RULES,
  NAME_MAX,
  REROLL_COST,
  ROLES,
  ROLE_RULES,
  ROUNDS,
  ROUND_RULES,
  SPACES,
} from './data.js'
import { parseAvatar } from './avatar.js'
import type { Avatar } from './avatar.js'
import type { Axis, Item, Milestone, Role, Round } from './data.js'
import { seatsOf, settle } from './economy.js'
import { EMPTY_STARTUP, cycleOf, has, levelOf, seeded, skillOf } from './state.js'
import type { Hire, Placed, RoundResult, StartupState } from './state.js'
import {
  canMove,
  canPlace,
  decorItem,
  freeSpot,
  isFixtureKey,
  sellPrice,
  spaceOf,
  tidyDecor,
} from './world.js'

export type StartupAction =
  | { type: 'buy'; item: string }
  | { type: 'milestone'; milestone: Milestone; name?: string | undefined }
  | { type: 'hire'; index: number }
  | { type: 'reroll' }
  | { type: 'round' }
  /** Contratar a alguien del resto de la oficina (recepción, limpieza…), con dinero. */
  | { type: 'staff'; role: Role }
  /** Comprar una pieza de decoración: se deja sola en la primera baldosa libre. */
  | { type: 'decor'; id: string }
  /** Mover (y girar) la pieza `index` de la decoración a (gx, gy). */
  | { type: 'place'; index: number; gx: number; gy: number; turn: boolean }
  /** Guardar la pieza `index` en el almacén. */
  | { type: 'store'; index: number }
  /** Vender la pieza `index` de la decoración (`sellPrice`): sale de la oficina y del almacén. */
  | { type: 'sell'; index: number }
  /** Mover lo que no es decoración (una mesa, los servidores, la pizarra…, `fixturesOf`) a (gx, gy). */
  | { type: 'move'; key: string; gx: number; gy: number }
  /** Cambiar el aspecto de la persona `index` de la plantilla, o el tuyo con -1 (el configurador); gratis. */
  | { type: 'avatar'; index: number; avatar: Avatar }
  /** Abrir una caja sorpresa (una por sesión del Pomodoro de 30 minutos o más). */
  | { type: 'open' }
  /** Con el edificio terminado y el control global: volver a empezar en tu cuarto. */
  | { type: 'legacy' }

/**
 * Por qué no se puede: sin minutos (o sin dinero), aún no, ya está al máximo,
 * sin sitio, la baldosa está ocupada o no existe.
 */
export type Refusal = 'poor' | 'locked' | 'max' | 'full' | 'taken' | 'invalid'

/** Lo que sale de una caja sorpresa: una pieza de decoración (o mascota) o dinero. */
export type Prize = { kind: 'decor'; id: string } | { kind: 'cash'; amount: number }

// --- Lo que se deduce del estado ------------------------------------------------

/**
 * Cuánto pesa cada modelo de negocio: lo aprendido, quien programa, los
 * productos de cada rama y los servidores (también los del sótano).
 */
export function profileOf(state: StartupState): Record<Axis, number> {
  const profile = Object.fromEntries(AXES.map((axis) => [axis, 0])) as Record<Axis, number>

  for (const axis of AXES) profile[axis] += 2 * levelOf(state, `learn-${axis}`)
  for (const hire of state.team) if (hire.role === undefined) profile[hire.axis] += 3 * hire.stars
  for (const item of ITEMS) {
    if (item.kind === 'product' && item.axis !== null) {
      profile[item.axis] += 2 * levelOf(state, item.id)
    }
  }
  profile.infra += 2 * levelOf(state, 'servers') + 3 * levelOf(state, 'basement')

  return profile
}

/** El modelo de negocio de la empresa: el que más pesa, o `null` si aún nada. */
export function focusOf(state: StartupState): Axis | null {
  const profile = profileOf(state)
  let best: Axis | null = null

  for (const axis of AXES) {
    if (profile[axis] > 0 && (best === null || profile[axis] > profile[best])) best = axis
  }

  return best
}

/** La siguiente ronda que toca, o `null` si ya se salió a bolsa. */
export function nextRound(state: StartupState): Round | null {
  return ROUNDS.find((round) => !state.rounds.some((done) => done.id === round)) ?? null
}

/** El siguiente hito, o `null` si ya se tienen todos. */
export function nextMilestone(state: StartupState): Milestone | null {
  return MILESTONES.find((milestone) => !has(state, milestone)) ?? null
}

/** Lo que cuesta contratar a alguien de esas estrellas con la plantilla de ahora. */
export function hireCost(state: StartupState, stars: number): number {
  return Math.round(HIRE_BASE * stars * (1 + state.team.length * 0.15))
}

/**
 * Los candidatos de ahora: tres, al azar con semilla. La mitad de las veces la
 * especialidad es la del modelo de la empresa (así se puede ir enfocando); las
 * estrellas altas son raras.
 */
export function candidatesOf(login: string, state: StartupState): (Hire & { cost: number })[] {
  const random = seeded(`${cycleOf(login, state)}|hire|${state.team.length}|${state.rolls}`)
  const focus = focusOf(state)

  return Array.from({ length: CANDIDATES }, () => {
    const roll = random()
    const axis =
      focus !== null && random() < 0.5
        ? focus
        : (AXES[Math.floor(random() * AXES.length)] ?? 'front')
    const stars = roll < 0.4 ? 1 : roll < 0.7 ? 2 : roll < 0.88 ? 3 : roll < 0.97 ? 4 : 5
    const look = Math.floor(random() * 1000)

    return { axis, stars, look, cost: hireCost(state, stars) }
  })
}

/** Cuántas personas de ese oficio hay en la plantilla. */
export const staffOf = (state: StartupState, role: Role): number =>
  state.team.filter((hire) => hire.role === role).length

/** Lo que cuesta, en dinero, contratar a la siguiente persona de ese oficio. */
export const staffCost = (state: StartupState, role: Role): number =>
  ROLE_RULES[role].cost * (staffOf(state, role) + 1)

/** La suerte de una ronda: de 0,7 a 1,5, con semilla. */
export function luckOf(login: string, round: Round): number {
  return Math.round((0.7 + seeded(`${login}|round|${round}`)() * 0.8) * 100) / 100
}

/** Cajas sorpresa por abrir: las sesiones de 30 minutos o más menos las abiertas. */
export const boxesOf = (state: StartupState, sessions: number): number =>
  Math.max(0, Math.floor(sessions) - state.opened)

/**
 * Lo que sale de la siguiente caja: casi siempre una pieza de decoración (a
 * veces de un espacio que aún no tienes), a veces una de las que solo salen
 * en cajas o una mascota que aún no tienes, y si no, dinero. Con semilla:
 * la web lo sabe antes de abrirla y la API saca lo mismo.
 */
export function prizeOf(login: string, state: StartupState): Prize {
  const random = seeded(`${login}|box|${String(state.opened)}`)
  const roll = random()
  const pick = random()
  const owned = new Set(state.decor.map((piece) => piece.id))
  const pets = DECOR.filter((item) => item.kind === 'pet' && !owned.has(item.id))
  const rare = DECOR.filter((item) => item.cost === 0 && item.kind !== 'pet')
  const shop = DECOR.filter((item) => item.cost > 0)
  const choose = (from: readonly { id: string }[]): Prize => ({
    kind: 'decor',
    id: from[Math.floor(pick * from.length)]?.id ?? 'plant',
  })

  if (state.decor.length < DECOR_MAX) {
    if (roll < 0.15 && pets.length > 0) return choose(pets)
    if (roll < 0.35) return choose(rare)
    if (roll < 0.85) return choose(shop)
  }

  return { kind: 'cash', amount: 100 * 2 ** spaceOf(state) }
}

/**
 * Lo que vale la empresa: lo construido (aprendido, equipos, productos,
 * plantilla, espacio, edificio, hitos) por lo que multiplican las rondas, con
 * su suerte.
 */
export function valuationOf(state: StartupState): number {
  const products = ITEMS.filter((item) => item.kind === 'product').reduce(
    (sum, item) => sum + levelOf(state, item.id) * 10_000,
    0,
  )
  const building = ITEMS.filter((item) => item.kind === 'building').reduce(
    (sum, item) => sum + levelOf(state, item.id) * 50_000,
    0,
  )
  const built =
    skillOf(state) * 1_000 +
    levelOf(state, 'computer') * 2_000 +
    levelOf(state, 'servers') * 5_000 +
    products +
    building +
    state.team.reduce(
      (sum, hire) => sum + (hire.role === undefined ? hire.stars * 8_000 : 5_000),
      0,
    ) +
    levelOf(state, 'space') * 20_000 +
    (has(state, 'side') ? 5_000 : 0) +
    (has(state, 'mvp') ? 25_000 : 0) +
    (has(state, 'founded') ? 50_000 : 0)
  const rounds = state.rounds.reduce(
    (product, round) => product * ROUND_RULES[round.id].multiplier * round.luck,
    1,
  )

  return Math.round(built * rounds * (has(state, 'global') ? 10 : 1))
}

// --- Lo que se puede hacer ------------------------------------------------------

/** El precio del siguiente nivel de una pieza, o `null` si ya está al máximo. */
export function priceOf(state: StartupState, item: Item): number | null {
  return item.costs[levelOf(state, item.id)] ?? null
}

/** Si una pieza del catálogo aún no se puede comprar: le falta un hito, el espacio o lo aprendido. */
export function lockedOf(state: StartupState, item: Item): boolean {
  if (item.needs !== null && !has(state, item.needs)) return true
  if (item.space !== undefined && spaceOf(state) < item.space) return true

  // Cada versión de un producto pide ese nivel aprendido en su rama.
  return (
    item.kind === 'product' &&
    item.axis !== null &&
    levelOf(state, `learn-${item.axis}`) < levelOf(state, item.id) + 1
  )
}

/** Si ya se puede terminar la partida y volver a empezar: el control global y el edificio entero. */
export const canLegacy = (state: StartupState): boolean =>
  has(state, 'global') && spaceOf(state) === SPACES.length - 1

/**
 * Hace una acción: el estado nuevo, o por qué no se puede.
 *
 * @param earned Minutos de concentración ganados en total.
 * @param sessions Sesiones del Pomodoro de 30 minutos o más, en total (las cajas).
 */
export function act(
  login: string,
  previous: StartupState,
  earned: number,
  action: StartupAction,
  sessions = 0,
): { state: StartupState } | { refused: Refusal } {
  // El dinero se apunta antes de nada: lo que cambie ahora rinde desde aquí.
  const state = settle(previous, earned)
  const balance = earned - state.spent
  const hours = earned / 60
  const seed = cycleOf(login, state)
  const pay = (cost: number, next: Partial<StartupState>) =>
    cost > balance
      ? { refused: 'poor' as const }
      : { state: { ...state, ...next, spent: state.spent + cost } }
  const payCash = (cost: number, next: Partial<StartupState>) =>
    cost > state.cash
      ? { refused: 'poor' as const }
      : { state: { ...state, ...next, cash: state.cash - cost } }

  switch (action.type) {
    case 'buy': {
      const item = ITEMS.find((one) => one.id === action.item)

      if (item === undefined) return { refused: 'invalid' }
      if (lockedOf(state, item)) return { refused: 'locked' }

      const cost = priceOf(state, item)

      if (cost === null) return { refused: 'max' }

      const next = { levels: { ...state.levels, [item.id]: levelOf(state, item.id) + 1 } }

      if (item.currency !== 'cash') return pay(cost, next)

      const result = payCash(cost, next)

      // Con un espacio más grande, lo guardado que ya cabe se queda donde estaba.
      return 'state' in result
        ? { state: { ...result.state, decor: tidyDecor(result.state) } }
        : result
    }
    case 'milestone': {
      if (nextMilestone(state) !== action.milestone) return { refused: 'locked' }

      const rule = MILESTONE_RULES[action.milestone]

      if (
        skillOf(state) < rule.skill ||
        state.team.length < rule.team ||
        hours < rule.hours ||
        (rule.round !== null && !state.rounds.some((round) => round.id === rule.round))
      ) {
        return { refused: 'locked' }
      }

      const name = (action.name ?? '').trim().slice(0, NAME_MAX)

      if (action.milestone === 'founded' && name === '') return { refused: 'invalid' }

      return pay(rule.cost, {
        milestones: [...state.milestones, action.milestone],
        ...(action.milestone === 'founded' ? { name } : {}),
      })
    }
    case 'hire': {
      if (!has(state, 'mvp')) return { refused: 'locked' }
      if (state.team.length >= seatsOf(state)) return { refused: 'full' }

      const candidate = candidatesOf(login, state)[action.index]

      if (candidate === undefined) return { refused: 'invalid' }

      const { cost, ...hire } = candidate

      return pay(cost, { team: [...state.team, hire] })
    }
    case 'reroll':
      if (!has(state, 'mvp')) return { refused: 'locked' }

      return pay(REROLL_COST, { rolls: state.rolls + 1 })
    case 'round': {
      const round = nextRound(state)

      if (round === null) return { refused: 'max' }
      if (!has(state, 'founded')) return { refused: 'locked' }

      const rule = ROUND_RULES[round]

      if (
        state.team.length < rule.team ||
        levelOf(state, 'space') < rule.space ||
        hours < rule.hours
      ) {
        return { refused: 'locked' }
      }

      return pay(rule.cost, {
        rounds: [...state.rounds, { id: round, luck: luckOf(seed, round) }],
      })
    }
    case 'staff': {
      const rule = (ROLE_RULES as Partial<Record<string, (typeof ROLE_RULES)[Role]>>)[action.role]

      if (rule === undefined) return { refused: 'invalid' }
      if (!has(state, 'founded') || spaceOf(state) < rule.space) return { refused: 'locked' }

      const count = staffOf(state, action.role)

      if (count >= rule.max) return { refused: 'max' }
      if (state.team.length >= seatsOf(state)) return { refused: 'full' }

      const look = Math.floor(seeded(`${seed}|staff|${action.role}|${String(count)}`)() * 1000)

      return payCash(staffCost(state, action.role), {
        team: [
          ...state.team,
          { axis: focusOf(state) ?? 'front', stars: 1, look, role: action.role },
        ],
      })
    }
    case 'decor': {
      const item = decorItem(action.id)

      if (item === undefined) return { refused: 'invalid' }
      // Lo de coste 0 solo sale en las cajas.
      if (item.cost === 0 || spaceOf(state) < item.space) return { refused: 'locked' }
      if (state.decor.length >= DECOR_MAX) return { refused: 'full' }

      return payCash(item.cost, { decor: withPiece(state, item.id) })
    }
    case 'place': {
      const piece = state.decor[action.index]

      if (piece === undefined) return { refused: 'invalid' }
      if (!canPlace(state, action.index, action.gx, action.gy)) return { refused: 'taken' }

      const decor = state.decor.map((one, index): Placed =>
        index === action.index ? { ...one, at: [action.gx, action.gy], turn: action.turn } : one,
      )

      return { state: { ...state, decor } }
    }
    case 'store': {
      // Lo que no existe o ya está guardado no se guarda.
      if ((state.decor[action.index]?.at ?? null) === null) return { refused: 'invalid' }

      return {
        state: {
          ...state,
          decor: state.decor.map((one, index) =>
            index === action.index ? { ...one, at: null } : one,
          ),
        },
      }
    }
    case 'sell': {
      const piece = state.decor[action.index]

      if (piece === undefined) return { refused: 'invalid' }

      return {
        state: {
          ...state,
          cash: state.cash + sellPrice(state, piece.id),
          decor: state.decor.filter((_, index) => index !== action.index),
        },
      }
    }
    case 'avatar': {
      const avatar = parseAvatar(action.avatar)

      if (avatar === undefined) return { refused: 'invalid' }
      if (action.index === -1) return { state: { ...state, me: avatar } }
      if (state.team[action.index] === undefined) return { refused: 'invalid' }

      return {
        state: {
          ...state,
          team: state.team.map((hire, index) =>
            index === action.index ? { ...hire, avatar } : hire,
          ),
        },
      }
    }
    case 'move': {
      if (!isFixtureKey(action.key)) return { refused: 'invalid' }
      if (!canMove(state, action.key, action.gx, action.gy)) return { refused: 'taken' }

      return {
        state: { ...state, moved: { ...state.moved, [action.key]: [action.gx, action.gy] } },
      }
    }
    case 'open': {
      if (boxesOf(state, sessions) === 0) return { refused: 'locked' }

      const prize = prizeOf(login, state)
      const opened = state.opened + 1

      return {
        state:
          prize.kind === 'cash'
            ? { ...state, opened, cash: state.cash + prize.amount }
            : { ...state, opened, decor: withPiece(state, prize.id) },
      }
    }
    case 'legacy': {
      if (!canLegacy(state)) return { refused: 'locked' }

      // Lo que se conserva: la decoración y las mascotas, las cajas abiertas,
      // lo gastado (para que el tiempo no vuelva), una décima del dinero y,
      // por cada vuelta, un 25 % más de lo que se gana.
      const fresh: StartupState = {
        ...EMPTY_STARTUP,
        spent: state.spent,
        cash: Math.floor(state.cash / 10),
        at: earned,
        decor: state.decor,
        opened: state.opened,
        legacy: state.legacy + 1,
      }

      return { state: { ...fresh, decor: tidyDecor(fresh) } }
    }
  }
}

/** La decoración con una pieza más: en la primera baldosa libre (las mascotas, sueltas). */
function withPiece(state: StartupState, id: string): Placed[] {
  const at = decorItem(id)?.kind === 'pet' ? null : freeSpot(state)

  return [...state.decor, { id, at, turn: false }]
}

/**
 * Un estado leído de la base, saneado: lo que no cuadre con el catálogo se
 * descarta en vez de romper la partida. Las partidas de antes (sin dinero ni
 * decoración) salen con lo nuevo vacío.
 */
export function parseStartup(value: unknown): StartupState {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_STARTUP }

  const raw = value as Partial<Record<keyof StartupState, unknown>>
  const number = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : 0
  const whole = (input: unknown): number => Math.floor(number(input))

  const state: StartupState = {
    name: typeof raw.name === 'string' ? raw.name.slice(0, NAME_MAX) : null,
    levels: Object.fromEntries(
      Object.entries(
        typeof raw.levels === 'object' && raw.levels !== null
          ? (raw.levels as Record<string, unknown>)
          : {},
      )
        .filter(([id]) => ITEMS.some((item) => item.id === id))
        .map(([id, level]): [string, number] => [id, whole(level)])
        .filter(([, level]) => level > 0),
    ),
    milestones: Array.isArray(raw.milestones)
      ? raw.milestones.filter((one): one is Milestone =>
          (MILESTONES as readonly unknown[]).includes(one),
        )
      : [],
    team: Array.isArray(raw.team) ? raw.team.flatMap(parseHire) : [],
    rounds: Array.isArray(raw.rounds)
      ? raw.rounds.filter(
          (one): one is RoundResult =>
            typeof one === 'object' &&
            one !== null &&
            (ROUNDS as readonly unknown[]).includes((one as RoundResult).id),
        )
      : [],
    spent: number(raw.spent),
    rolls: number(raw.rolls),
    cash: whole(raw.cash),
    at: typeof raw.at === 'number' && Number.isFinite(raw.at) && raw.at >= 0 ? raw.at : null,
    decor: Array.isArray(raw.decor) ? raw.decor.flatMap(parsePlaced).slice(0, DECOR_MAX) : [],
    moved: parseMoved(raw.moved),
    opened: whole(raw.opened),
    legacy: whole(raw.legacy),
  }

  const me = parseAvatar(raw.me)

  return { ...state, decor: tidyDecor(state), ...(me === undefined ? {} : { me }) }
}

function parseHire(one: unknown): Hire[] {
  if (typeof one !== 'object' || one === null) return []

  const hire = one as Partial<Record<keyof Hire, unknown>>

  if (!(AXES as readonly unknown[]).includes(hire.axis)) return []
  if (typeof hire.stars !== 'number' || !(hire.stars >= 1)) return []

  const base = {
    axis: hire.axis as Axis,
    stars: hire.stars,
    look: typeof hire.look === 'number' && Number.isFinite(hire.look) ? hire.look : 0,
  }

  const avatar = parseAvatar(hire.avatar)
  const withRole = (ROLES as readonly unknown[]).includes(hire.role)
    ? { ...base, role: hire.role as Role }
    : base

  return [avatar === undefined ? withRole : { ...withRole, avatar }]
}

/** Lo movido a mano: solo claves que existen y baldosas de números enteros. */
function parseMoved(value: unknown): StartupState['moved'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        (entry): entry is [string, [number, number]] =>
          isFixtureKey(entry[0]) &&
          Array.isArray(entry[1]) &&
          entry[1].length === 2 &&
          entry[1].every((part) => Number.isInteger(part) && (part as number) >= 0),
      )
      .slice(0, 200)
      .map(([key, [gx, gy]]) => [key, [gx, gy] as const]),
  )
}

function parsePlaced(one: unknown): Placed[] {
  if (typeof one !== 'object' || one === null) return []

  const piece = one as Partial<Record<keyof Placed, unknown>>

  if (typeof piece.id !== 'string' || decorItem(piece.id) === undefined) return []

  const at =
    Array.isArray(piece.at) &&
    piece.at.length === 2 &&
    piece.at.every((value) => Number.isInteger(value))
      ? ([piece.at[0] as number, piece.at[1] as number] as const)
      : null

  return [{ id: piece.id, at, turn: piece.turn === true }]
}
