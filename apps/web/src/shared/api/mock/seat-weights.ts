/**
 * Los pesos de los puestos del panel (`docs/asientos.md`), en la demo. La
 * vista previa es el grafo de asientos de la demo, y su calidad, una cuenta
 * sencilla con los pesos: lo justo para ver que cambia al tocarlos.
 */

import type { SeatGroupQuality, SeatWeightsState } from '@sanatorio/contracts'

import type { Api } from '../types'
import { ME } from './data'
import { mockSeats } from './network'
import { delay } from './state'

const DEFAULTS = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 3, 2, 0, 2, 3, 0],
  [0, 0, 1.5, 0, 1.5, 0, 0],
]

let state: SeatWeightsState = {
  grid: DEFAULTS.map((row) => [...row]),
  defaults: DEFAULTS,
  updatedBy: null,
  updatedAt: null,
}

/** Más peso cerca y menos lejos, grupos más nítidos; con todo igual, una bola. */
function qualityOf(grid: number[][]): SeatGroupQuality {
  const cells = grid.flat()
  const total = cells.reduce((sum, value) => sum + value, 0)
  const near = (grid[1]?.[2] ?? 0) + (grid[1]?.[4] ?? 0) + (grid[1]?.[1] ?? 0) + (grid[1]?.[5] ?? 0)
  const focus = total === 0 ? 0 : near / total
  const round = (value: number): number => Math.round(value * 1000) / 1000

  return {
    modularity: round(0.25 + 0.45 * focus),
    communities: total === 0 ? 0 : Math.round(6 + 10 * focus),
    grouped: round(total === 0 ? 0 : 0.6 + 0.3 * focus),
    inside: round(0.5 + 0.4 * focus),
    largest: round(0.35 - 0.2 * focus),
    pairs: Math.round(total * 12),
  }
}

export const seatWeightsMock: Pick<
  Api,
  'getSeatWeights' | 'saveSeatWeights' | 'previewSeatWeights'
> = {
  async getSeatWeights() {
    await delay(60)

    return state
  },

  async saveSeatWeights(grid) {
    await delay(80)
    state = { ...state, grid, updatedBy: ME.login, updatedAt: new Date().toISOString() }

    return state
  },

  async previewSeatWeights(grid, days) {
    await delay(200)

    return {
      graph: mockSeats(ME.login, days),
      proposed: qualityOf(grid),
      current: qualityOf(state.grid),
    }
  },
}
