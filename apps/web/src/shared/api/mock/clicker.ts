/**
 * API de mentira: Code Clicker, la sección secreta.
 *
 * Con `?secreto=N` en la dirección se empieza con N pulsaciones de la cruz ya
 * hechas (99 deja a una de la ventana de las pastillas), y con `?secreto=rojo`,
 * con la pastilla roja ya elegida. `?secreto=otro` es la roja con la partida
 * abierta también en otro dispositivo (los guardados se rechazan) y
 * `?secreto=caido`, la roja con la carga de la partida fallando al entrar.
 */

import type { ClickerState } from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay, fail } from './state'
import type { Api } from '../types'

const wanted = new URLSearchParams(window.location.search).get('secreto')
const red = wanted === 'rojo' || wanted === 'otro' || wanted === 'caido'
const state: ClickerState = {
  plus: red ? 100 : Math.max(0, Number(wanted ?? 0) || 0),
  pill: red ? 'red' : null,
  save: null,
  rev: 0,
  names: ['jdoe', 'rsoto', 'mlopez', 'agarcia'],
}
let best = 0
let holder: string | null = null
// La primera petición la hace la cabecera, para saber la pastilla; las dos
// siguientes son del juego al cargar la partida (en desarrollo React la pide
// dos veces), y son las que fallan con `?secreto=caido`.
let calls = 0

export const clickerMock: Pick<
  Api,
  'getClicker' | 'pressPlus' | 'choosePill' | 'saveClicker' | 'getClickerBoard'
> = {
  async getClicker() {
    await delay(100)

    calls += 1

    if (wanted === 'caido' && (calls === 2 || calls === 3)) throw fail(503, 'Sin servicio')

    return { ...state, names: state.pill === 'red' ? state.names : [] }
  },

  async pressPlus(count) {
    await delay(50)

    if (state.pill === null) state.plus += count

    return { plus: state.plus, pill: state.pill }
  },

  async choosePill(pill) {
    await delay(150)
    state.pill = pill

    return this.getClicker()
  },

  async saveClicker(save) {
    await delay(50)

    if (wanted === 'otro' || (save.rev !== state.rev && save.session !== holder)) {
      throw fail(409, 'Esta partida se ha seguido en otro dispositivo')
    }

    state.save = save.save
    state.rev += 1
    holder = save.session
    best = Math.max(best, save.total)

    return { rev: state.rev }
  },

  async getClickerBoard() {
    await delay()

    const level = (total: number): number => Math.floor(3 * Math.log10(1 + total))
    const rows = [
      { login: 'jdoe', total: 4.2e9, perSecond: 91_000, achievements: 41, prestige: 0 },
      { login: ME.login, total: best, perSecond: 0, achievements: 0, prestige: 0 },
      { login: 'rsoto', total: 1800, perSecond: 6, achievements: 9, prestige: 0 },
    ].sort((a, b) => b.total - a.total)
    const entries = rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      image: portrait(row.login),
      level: level(row.total),
    }))

    return { entries, me: entries.find((row) => row.login === ME.login) ?? null }
  },
}
