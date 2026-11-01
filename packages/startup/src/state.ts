/**
 * La partida de la startup tal como se guarda, y el azar con semilla. Lo usan
 * las cuentas (`engine.ts`), el dinero (`economy.ts`) y la oficina (`world.ts`).
 */

import type { Axis, Milestone, Role, Round } from './data.js'

/**
 * Alguien de la plantilla: su especialidad, sus estrellas (1-5) y su aspecto.
 * Sin `role`, programa (de su especialidad); con `role`, es del resto de la
 * oficina (recepción, limpieza…) y no cuenta para el modelo de negocio.
 */
export type Hire = { axis: Axis; stars: number; look: number; role?: Role }

/** Una ronda hecha y la suerte que tuvo (de 0,7 a 1,5). */
export type RoundResult = { id: Round; luck: number }

/**
 * Una pieza de decoración: cuál (`DECOR`), en qué baldosa está (`null`:
 * guardada en el almacén) y si está girada (mirando a la derecha).
 */
export type Placed = { id: string; at: readonly [number, number] | null; turn: boolean }

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
  /**
   * El dinero apuntado la última vez que se hizo algo. Lo que se gana desde
   * entonces sale de los minutos ganados después (`at`) y de lo que rinde la
   * empresa (`economy.ts`): la API lo vuelve a contar igual cada vez.
   */
  cash: number
  /** Los minutos ganados cuando se apuntó `cash`; `null` si aún no se apuntó nunca. */
  at: number | null
  /** La decoración comprada o ganada. */
  decor: Placed[]
  /** Cajas sorpresa abiertas (se gana una por sesión de 30 minutos o más). */
  opened: number
  /** Veces que se ha terminado el edificio y vuelto a empezar (nueva partida+). */
  legacy: number
}

export const EMPTY_STARTUP: StartupState = {
  name: null,
  levels: {},
  milestones: [],
  team: [],
  rounds: [],
  spent: 0,
  rolls: 0,
  cash: 0,
  at: null,
  decor: [],
  opened: 0,
  legacy: 0,
}

export const levelOf = (state: StartupState, id: string): number => state.levels[id] ?? 0

export const has = (state: StartupState, milestone: Milestone): boolean =>
  state.milestones.includes(milestone)

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

/**
 * La semilla de cada vuelta: la primera partida, el login tal cual (así las
 * de antes siguen sacando lo mismo); en una nueva partida+, con su número.
 */
export const cycleOf = (login: string, state: StartupState): string =>
  state.legacy === 0 ? login : `${login}#${String(state.legacy)}`
