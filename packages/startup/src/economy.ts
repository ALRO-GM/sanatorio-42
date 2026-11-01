/**
 * El dinero de la startup. Se gana mientras te concentras: cada minuto de
 * concentración (los que cuenta la API) rinde lo que dan los productos
 * implementados y la plantilla, por el ánimo de la oficina, la energía del
 * tejado y las partidas terminadas antes.
 *
 * No hay reloj ni nada que diga el navegador: el dinero de ahora es lo
 * apuntado (`cash`) más lo que rinden los minutos ganados desde que se apuntó
 * (`at`). Cada acción lo vuelve a apuntar (`settle`), así un cambio de lo que
 * rinde solo cuenta hacia delante, y la API lo puede volver a contar igual.
 */

import { DECOR, ITEMS, ROLE_RULES, SEATS, SEATS_PER_FLOOR } from './data.js'
import { levelOf } from './state.js'
import type { StartupState } from './state.js'
import { spaceOf } from './world.js'

/** Sitio para la plantilla: el del espacio y, en el edificio, 20 más por planta. */
export const seatsOf = (state: StartupState): number =>
  (SEATS[spaceOf(state)] ?? SEATS[0]) + SEATS_PER_FLOOR * levelOf(state, 'floors')

/**
 * El ánimo de la oficina (1 es lo normal; más, mejor): la plantilla que la
 * cuida (la segunda de cada oficio suma la mitad, la tercera un tercio…), la
 * decoración colocada (hasta +0,3), las mascotas (hasta +0,2) y la azotea.
 */
export function moodOf(state: StartupState): number {
  const seen = new Map<string, number>()
  let mood = 1

  for (const hire of state.team) {
    if (hire.role === undefined) continue

    const count = (seen.get(hire.role) ?? 0) + 1

    seen.set(hire.role, count)
    mood += ROLE_RULES[hire.role].mood / count
  }

  const placed = state.decor.filter((piece) => piece.at !== null).length
  const pets = state.decor.filter(
    (piece) => DECOR.find((item) => item.id === piece.id)?.kind === 'pet',
  ).length

  mood += Math.min(0.3, placed * 0.03) + Math.min(0.2, pets * 0.1) + 0.1 * levelOf(state, 'rooftop')

  return Math.round(mood * 100) / 100
}

/** Lo que dan los productos implementados, por minuto. */
function productsOf(state: StartupState): number {
  return ITEMS.reduce((sum, item) => {
    const level = levelOf(state, item.id)

    return item.yields === undefined || level === 0
      ? sum
      : sum + (item.yields[Math.min(level, item.yields.length) - 1] ?? 0)
  }, 0)
}

/**
 * Lo que rinde la empresa por minuto de concentración: los productos, media
 * moneda por estrella de quien programa y 20 por planta del sótano de
 * servidores; por el ánimo, la energía solar (+10 % por nivel) y cada partida
 * terminada antes (+25 %).
 */
export function rateOf(state: StartupState): number {
  const stars = state.team.reduce(
    (sum, hire) => (hire.role === undefined ? sum + hire.stars : sum),
    0,
  )
  const base = productsOf(state) + stars * 0.5 + 20 * levelOf(state, 'basement')
  const rate =
    base * moodOf(state) * (1 + 0.1 * levelOf(state, 'solar')) * (1 + 0.25 * state.legacy)

  return Math.round(rate * 100) / 100
}

/** El dinero de ahora, con `earned` minutos ganados en total. */
export function cashOf(state: StartupState, earned: number): number {
  if (state.at === null) return state.cash

  return state.cash + Math.floor(Math.max(0, earned - state.at) * rateOf(state))
}

/** El estado con el dinero apuntado hasta ahora: lo que se haga después rinde desde aquí. */
export function settle(state: StartupState, earned: number): StartupState {
  return { ...state, cash: cashOf(state, earned), at: earned }
}
