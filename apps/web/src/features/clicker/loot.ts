/**
 * El botín de la policía del código: lo que se ha requisado a quien hacía
 * trampas va a una bolsa común, y de vez en cuando sale una placa en la zona de
 * juego. Quien la coge se lleva diez commits de la suerte de esa bolsa (la
 * cuenta la hace la API, que es quien sabe cuánto queda).
 *
 * Sin reloj ni azar propios, como el resto del motor: así se puede probar.
 */

import type { Random } from './engine'

export const LOOT = {
  /** Entre una placa y la siguiente, de cuatro a nueve minutos. */
  minMs: 4 * 60_000,
  maxMs: 9 * 60_000,
  /** Lo que dura a la vista, como una dorada. */
  lifeMs: 13_000,
}

/** La placa que hay a la vista: hasta cuándo y dónde (de 0 a 1). */
export type LootUp = { until: number; x: number; y: number }

export type LootState = { at: number; up: LootUp | null }

/** Cuándo sale la siguiente. */
export function nextLootAt(now: number, random: Random): number {
  return now + LOOT.minMs + random() * (LOOT.maxMs - LOOT.minMs)
}

/**
 * Un paso del reloj: se va la placa que ha caducado y sale otra si toca. Con la
 * bolsa vacía no sale ninguna (y la que hubiera se va).
 */
export function lootStep(state: LootState, now: number, pool: number, random: Random): LootState {
  if (pool <= 0) return state.up === null ? state : { at: state.at, up: null }
  if (state.up !== null && now > state.up.until) return { at: nextLootAt(now, random), up: null }
  if (state.up === null && now >= state.at) {
    return {
      at: state.at,
      up: { until: now + LOOT.lifeMs, x: 0.1 + random() * 0.8, y: 0.15 + random() * 0.7 },
    }
  }

  return state
}

/** Se ha cogido (o se ha intentado): no hay placa hasta la siguiente. */
export function lootTaken(now: number, random: Random): LootState {
  return { at: nextLootAt(now, random), up: null }
}
