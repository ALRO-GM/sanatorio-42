/**
 * Las cuentas de la startup: qué se puede hacer, cuánto cuesta, qué pasa al
 * hacerlo y lo que vale la empresa. Funciones puras: la API las usa para hacer
 * cumplir las reglas y la web para pintar lo mismo.
 *
 * El azar (candidatos, suerte de cada ronda) sale de una semilla con el login y
 * lo hecho hasta ahora: el mismo para quien lo pide desde la web y para la API,
 * y no se puede volver a tirar recargando la página.
 */

import {
  AXES,
  CANDIDATES,
  HIRE_BASE,
  ITEMS,
  MILESTONES,
  MILESTONE_RULES,
  NAME_MAX,
  REROLL_COST,
  ROUNDS,
  ROUND_RULES,
  SEATS,
} from './data.js'
import type { Axis, Item, Milestone, Round } from './data.js'

/** Alguien de la plantilla: su especialidad, sus estrellas (1-5) y su aspecto. */
export type Hire = { axis: Axis; stars: number; look: number }

/** Una ronda hecha y la suerte que tuvo (de 0,7 a 1,5). */
export type RoundResult = { id: Round; luck: number }

export type StartupState = {
  name: string | null
  /** Nivel de cada pieza del catálogo (`ITEMS`), por id. */
  levels: Record<string, number>
  milestones: Milestone[]
  team: Hire[]
  rounds: RoundResult[]
  /** Minutos gastados. */
  spent: number
  /** Veces que se han vuelto a sacar candidatos (cambia la semilla). */
  rolls: number
}

export const EMPTY_STARTUP: StartupState = {
  name: null,
  levels: {},
  milestones: [],
  team: [],
  rounds: [],
  spent: 0,
  rolls: 0,
}

export type StartupAction =
  | { type: 'buy'; item: string }
  | { type: 'milestone'; milestone: Milestone; name?: string | undefined }
  | { type: 'hire'; index: number }
  | { type: 'reroll' }
  | { type: 'round' }

/** Por qué no se puede: sin minutos, aún no, ya está al máximo, sin sitio, o no existe. */
export type Refusal = 'poor' | 'locked' | 'max' | 'full' | 'invalid'

// --- Azar con semilla ---------------------------------------------------------

/** Un número de 32 bits a partir de un texto (FNV-1a). */
function hash(text: string): number {
  let value = 2166136261

  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }

  return value >>> 0
}

/** Una serie de números de 0 a 1 que siempre sale igual con la misma semilla (mulberry32). */
export function seeded(seed: string): () => number {
  let state = hash(seed)

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let t = state

    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Lo que se deduce del estado ------------------------------------------------

export const levelOf = (state: StartupState, id: string): number => state.levels[id] ?? 0

/** Lo aprendido: la suma de los niveles de las cinco ramas. */
export function skillOf(state: StartupState): number {
  return AXES.reduce((sum, axis) => sum + levelOf(state, `learn-${axis}`), 0)
}

/** Cuánto pesa cada modelo de negocio: lo aprendido, la plantilla y los servidores. */
export function profileOf(state: StartupState): Record<Axis, number> {
  const profile = Object.fromEntries(AXES.map((axis) => [axis, 0])) as Record<Axis, number>

  for (const axis of AXES) profile[axis] += 2 * levelOf(state, `learn-${axis}`)
  for (const hire of state.team) profile[hire.axis] += 3 * hire.stars
  profile.infra += 2 * levelOf(state, 'servers')

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

/** Sitio para la plantilla. */
export const seatsOf = (state: StartupState): number =>
  SEATS[Math.min(levelOf(state, 'space'), SEATS.length - 1)] ?? 2

export const has = (state: StartupState, milestone: Milestone): boolean =>
  state.milestones.includes(milestone)

/** La siguiente ronda que toca, o `null` si ya se salió a bolsa. */
export function nextRound(state: StartupState): Round | null {
  return ROUNDS.find((round) => !state.rounds.some((done) => done.id === round)) ?? null
}

/** El siguiente hito, o `null` si ya se tienen todos. */
export function nextMilestone(state: StartupState): Milestone | null {
  return MILESTONES.find((milestone) => !has(state, milestone)) ?? null
}

/**
 * La etapa, para el dibujo: 0 garaje, 1 proyecto, 2 MVP, 3 fundada, 4 con
 * inversión, 5 creciendo (serie B o más), 6 en bolsa, 7 control global.
 */
export function stageOf(state: StartupState): number {
  if (has(state, 'global')) return 7
  if (state.rounds.some((round) => round.id === 'ipo')) return 6
  if (state.rounds.some((round) => round.id === 'b')) return 5
  if (state.rounds.some((round) => round.id === 'seed')) return 4
  if (has(state, 'founded')) return 3
  if (has(state, 'mvp')) return 2
  if (has(state, 'side')) return 1

  return 0
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
  const random = seeded(`${login}|hire|${state.team.length}|${state.rolls}`)
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

/** La suerte de una ronda: de 0,7 a 1,5, con semilla. */
export function luckOf(login: string, round: Round): number {
  return Math.round((0.7 + seeded(`${login}|round|${round}`)() * 0.8) * 100) / 100
}

/**
 * Lo que vale la empresa: lo construido (aprendido, equipos, plantilla,
 * espacio, hitos) por lo que multiplican las rondas, con su suerte.
 */
export function valuationOf(state: StartupState): number {
  const built =
    skillOf(state) * 1_000 +
    levelOf(state, 'computer') * 2_000 +
    levelOf(state, 'servers') * 5_000 +
    state.team.reduce((sum, hire) => sum + hire.stars * 8_000, 0) +
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

/**
 * Hace una acción: el estado nuevo, o por qué no se puede.
 *
 * @param earned Minutos de concentración ganados en total.
 */
export function act(
  login: string,
  state: StartupState,
  earned: number,
  action: StartupAction,
): { state: StartupState } | { refused: Refusal } {
  const balance = earned - state.spent
  const hours = earned / 60
  const pay = (cost: number, next: Partial<StartupState>) =>
    cost > balance
      ? { refused: 'poor' as const }
      : { state: { ...state, ...next, spent: state.spent + cost } }

  switch (action.type) {
    case 'buy': {
      const item = ITEMS.find((one) => one.id === action.item)

      if (item === undefined) return { refused: 'invalid' }
      if (item.needs !== null && !has(state, item.needs)) return { refused: 'locked' }

      const cost = priceOf(state, item)

      if (cost === null) return { refused: 'max' }

      return pay(cost, { levels: { ...state.levels, [item.id]: levelOf(state, item.id) + 1 } })
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
        rounds: [...state.rounds, { id: round, luck: luckOf(login, round) }],
      })
    }
  }
}

/**
 * Un estado leído de la base, saneado: lo que no cuadre con el catálogo se
 * descarta en vez de romper la partida.
 */
export function parseStartup(value: unknown): StartupState {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_STARTUP }

  const raw = value as Partial<Record<keyof StartupState, unknown>>
  const number = (input: unknown): number =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : 0

  return {
    name: typeof raw.name === 'string' ? raw.name.slice(0, NAME_MAX) : null,
    levels: Object.fromEntries(
      Object.entries(
        typeof raw.levels === 'object' && raw.levels !== null
          ? (raw.levels as Record<string, unknown>)
          : {},
      )
        .filter(([id]) => ITEMS.some((item) => item.id === id))
        .map(([id, level]): [string, number] => [id, Math.floor(number(level))])
        .filter(([, level]) => level > 0),
    ),
    milestones: Array.isArray(raw.milestones)
      ? raw.milestones.filter((one): one is Milestone =>
          (MILESTONES as readonly unknown[]).includes(one),
        )
      : [],
    team: Array.isArray(raw.team)
      ? raw.team.filter(
          (one): one is Hire =>
            typeof one === 'object' &&
            one !== null &&
            (AXES as readonly unknown[]).includes((one as Hire).axis) &&
            number((one as Hire).stars) >= 1,
        )
      : [],
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
  }
}
