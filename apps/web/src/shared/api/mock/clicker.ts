/**
 * API de mentira: Code Clicker, la sección secreta.
 *
 * Con `?secreto=N` en la dirección se empieza con N pulsaciones de la cruz ya
 * hechas (99 deja a una de la ventana de las pastillas), y con `?secreto=rojo`,
 * con la pastilla roja ya elegida. `?secreto=otro` es la roja con la partida
 * abierta también en otro dispositivo (los guardados se rechazan) y
 * `?secreto=caido`, la roja con la carga de la partida fallando al entrar.
 * `?secreto=trampa` es la roja con la API pillando una trampa en cada guardado.
 * `?secreto=revision` es la roja con una revisión de trampas por contestar, y
 * `?secreto=policia`, la roja con los edificios recién requisados.
 * Sin eso, solo se pilla lo más burdo: tener sin gastar más de lo escrito.
 */

import type {
  ClickerAlert,
  ClickerCheat,
  ClickerReview,
  ClickerState,
  TitleId,
  ClickerCheatEntry,
  ClickerCheater,
} from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay, fail } from './state'
import type { Api } from '../types'

const wanted = new URLSearchParams(window.location.search).get('secreto')
const red =
  wanted === 'rojo' ||
  wanted === 'otro' ||
  wanted === 'caido' ||
  wanted === 'trampa' ||
  wanted === 'revision' ||
  wanted === 'policia'
const state: ClickerState = {
  plus: red ? 100 : Math.max(0, Number(wanted ?? 0) || 0),
  pill: red ? 'red' : null,
  save: null,
  // Unos pocos puntos donados, para ver el logro y el extra.
  donated: 3,
  rev: 0,
  caught: 0,
  saleDue: wanted === 'policia',
  seizure:
    wanted === 'policia'
      ? {
          by: 'review',
          amount: 4.7e5,
          n: 3,
          shared: 35,
          evidence: { from: 1.2e6, to: 9.4e6, seconds: 3, perSecond: 840, golden: false },
        }
      : null,
  // Algo en la bolsa común, para que la placa del botín salga en la demostración.
  pool: 2.5e6,
  names: ['jdoe', 'rsoto', 'mlopez', 'agarcia'],
}
/** La revisión de mentira que hay que contestar con `?secreto=revision`. */
let reviews: ClickerReview[] =
  wanted === 'revision'
    ? [
        {
          id: 7,
          at: new Date(Date.now() - 3_600_000).toISOString(),
          evidence: { from: 1.2e6, to: 9.4e6, seconds: 3, perSecond: 840, golden: false },
        },
      ]
    : []
let best = 0
// Lo que se va apuntando mientras se juega en la web de mentira.
const history: [number, number][] = []
let cheats: (ClickerCheat & { save: string })[] = []
let alerts: ClickerAlert[] = [
  {
    id: 1,
    login: 'rsoto',
    at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    seconds: 4,
    from: 2.1e6,
    to: 1.9e7,
    golden: false,
    status: 'open',
    answer: null,
    trace: Array.from({ length: 60 }, (_, index): [number, number] => [
      Math.floor(Date.now() / 1000) - 7200 - 30 + index,
      index < 30
        ? 2e6 + index * 3000
        : index < 34
          ? 2.1e6 * 1.75 ** (index - 29)
          : 1.9e7 + index * 4000,
    ]),
  },
]

/** El título que deja en el banner haber sido pillado, y las veces: lo pinta el expediente. */
export function mockHacker(): { title: TitleId | null; caught: number } {
  const { caught } = state

  return {
    title:
      caught === 0
        ? null
        : caught === 1
          ? 'hacker_etico'
          : caught === 2
            ? 'hacker_poco_etico'
            : 'hacker_cazado',
    caught,
  }
}
let holder: string | null = null
// La primera petición la hace la cabecera, para saber la pastilla; las dos
// siguientes son del juego al cargar la partida (en desarrollo React la pide
// dos veces), y son las que fallan con `?secreto=caido`.
let calls = 0

export const clickerMock: Pick<
  Api,
  | 'getClicker'
  | 'pressPlus'
  | 'choosePill'
  | 'saveClicker'
  | 'getClickerBoard'
  | 'getClickerUsage'
  | 'getClickerCapital'
  | 'getClickerCheats'
  | 'pardonClickerCheat'
  | 'dismissClickerAlert'
  | 'reviewClickerAlert'
  | 'getClickerReviews'
  | 'defendClickerReview'
  | 'claimClickerPool'
  | 'ackClickerSeizure'
  | 'getClickerGameOf'
  | 'sanctionClicker'
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

    const sent = JSON.parse(save.save) as {
      code: number
      total: number
      owned?: Record<string, number>
    }
    const empty = Object.values(sent.owned ?? {}).every((count) => count === 0)
    // Con la venta pendiente, el guardado que llega sin edificios es el bueno.
    const selling = state.saleDue && empty

    // Con `trampa`, el primer guardado entra, para que haya una partida buena a la que volver.
    const rigged = wanted === 'trampa' && state.save !== null

    if (!selling && (rigged || sent.code > sent.total + 1)) {
      state.caught += 1
      // Como la API: en cada trampa se venden los edificios a la mitad.
      if (!state.saleDue) {
        state.seizure = { by: 'auto', amount: 1.2e5, n: state.caught, shared: 35, evidence: null }
      }
      state.saleDue = true
      cheats.unshift({
        id: state.caught,
        login: ME.login,
        at: new Date().toISOString(),
        why: rigged ? 'rate' : 'ledger',
        total: save.total,
        perSecond: save.perSecond,
        save: save.save,
      })

      return { rev: state.rev, caught: state.caught, refused: true, gift: 0 }
    }
    if (state.saleDue && !empty)
      return { rev: state.rev, caught: state.caught, refused: true, gift: 0 }

    for (const [at, capital] of save.capital ?? []) {
      // Un punto cada diez segundos: aquí no hay meses de historial que enseñar.
      if (at - (history.at(-1)?.[0] ?? 0) >= 10) history.push([at, capital])
    }

    state.saleDue = false
    state.save = save.save
    state.rev += 1
    holder = save.session
    best = Math.max(best, save.total)

    return { rev: state.rev, caught: state.caught, refused: false, gift: 0 }
  },

  async getClickerBoard() {
    await delay()

    const level = (total: number): number => Math.floor(3 * Math.log10(1 + total))
    const rows = [
      {
        login: 'jdoe',
        total: 4.2e9,
        wealth: 6e8,
        perSecond: 91_000,
        achievements: 41,
        prestige: 0,
      },
      {
        login: ME.login,
        total: best,
        wealth: best / 2,
        perSecond: 0,
        achievements: 0,
        prestige: 0,
      },
      { login: 'rsoto', total: 1800, wealth: 900, perSecond: 6, achievements: 9, prestige: 0 },
    ].sort((a, b) => b.wealth - a.wealth)
    const entries = rows.map((row, index) => ({
      ...row,
      rank: index + 1,
      image: portrait(row.login),
      level: level(row.total),
    }))

    return { entries, me: entries.find((row) => row.login === ME.login) ?? null }
  },

  async getClickerUsage(days) {
    await delay()

    const level = (total: number): number => Math.floor(3 * Math.log10(1 + total))
    const at = (hoursAgo: number): string =>
      new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
    const rows = [
      { login: 'jdoe', plus: 100, pill: 'red', total: 4.2e9, perSecond: 91_000, clicks: 5200 },
      { login: ME.login, plus: state.plus, pill: state.pill, total: best, perSecond: 0, clicks: 0 },
      { login: 'rsoto', plus: 100, pill: 'red', total: 1800, perSecond: 6, clicks: 410 },
      { login: 'mlopez', plus: 100, pill: 'blue', total: 0, perSecond: 0, clicks: 0 },
      { login: 'agarcia', plus: 37, pill: null, total: 0, perSecond: 0, clicks: 0 },
    ] as const
    const players = rows.map((row, index) => ({
      ...row,
      level: level(row.total),
      achievements: row.total > 0 ? 41 - index * 16 : 0,
      prestige: 0,
      code: row.total / 10,
      wealth: row.total / 4,
      buildings: row.total > 0 ? 180 - index * 60 : 0,
      upgrades: row.total > 0 ? 24 - index * 8 : 0,
      saves: row.total > 0 ? 300 - index * 120 : 0,
      updatedAt: at(index * 30),
      caught: row.login === ME.login ? state.caught : 0,
      caughtWhy: row.login === ME.login ? (cheats[0]?.why ?? null) : null,
      caughtAt: row.login === ME.login ? (cheats[0]?.at ?? null) : null,
      // Quien juega lo deja abierto: casi todo el tiempo es con la pestaña oculta.
      seen: row.pill === 'red' ? days * (900 - index * 300) : 0,
      back: row.pill === 'red' ? days * (400 - index * 100) : 0,
      hidden: row.pill === 'red' ? days * (5200 - index * 1500) : 0,
    }))
    const sum = (field: 'total' | 'saves' | 'seen' | 'back' | 'hidden'): number =>
      players.reduce((total, player) => total + player[field], 0)

    return {
      days,
      totals: {
        pressed: players.length,
        reached: players.filter((player) => player.plus >= 100).length,
        red: players.filter((player) => player.pill === 'red').length,
        blue: players.filter((player) => player.pill === 'blue').length,
        players: players.filter((player) => player.total > 0).length,
        active: players.filter((_, index) => index * 30 < days * 24).length,
        total: sum('total'),
        saves: sum('saves'),
        caught: players.filter((player) => player.caught > 0).length,
        seen: sum('seen'),
        back: sum('back'),
        hidden: sum('hidden'),
      },
      players,
      alerts,
      cheats: cheats.map(({ save: _, ...cheat }) => cheat),
    }
  },

  async getClickerCapital({ login, from = 0, to = Infinity } = {}) {
    await delay()

    const now = Math.floor(Date.now() / 1000)
    // Tres meses subiendo a buen ritmo, con sus parones de noche: lo de hoy
    // con detalle, lo de la semana por horas y lo anterior por días.
    const past = [
      ...Array.from({ length: 83 }, (_, index) => now - (90 - index) * 86_400),
      ...Array.from({ length: 144 }, (_, index) => now - (168 - index) * 3600),
      ...Array.from({ length: 360 }, (_, index) => now - (24 * 360 - index * 24) * 10),
    ].map((at): [number, number] => {
      const days = 90 - (now - at) / 86_400

      return [at, 500 * 1.12 ** days * (1 + 0.05 * Math.sin(days * 6.3))]
    })
    const all = login === undefined || login === ME.login ? [...past, ...history] : past
    const points = all.filter(([at]) => at >= from && at <= to)
    const step = Math.max(1, Math.ceil(points.length / 300))

    return {
      first: all[0]?.[0] ?? null,
      last: all.at(-1)?.[0] ?? null,
      points: points.filter((_, index) => index % step === 0 || index === points.length - 1),
    }
  },

  // Un registro de trampas inventado, más las que se pillen en esta sesión.
  async getClickerCheats() {
    await delay()

    const day = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString()
    const invented: ClickerCheatEntry[] = [
      {
        id: 9001,
        login: 'tbravo',
        at: day(1),
        how: 'auto',
        why: 'rate',
        total: 4.2e9,
        perSecond: 3e6,
        seized: 1.8e9,
        note: null,
        pardonedAt: null,
        copyId: null,
      },
      {
        id: 9002,
        login: 'tbravo',
        at: day(6),
        how: 'auto',
        why: 'clicks',
        total: 2.1e8,
        perSecond: 4e4,
        seized: 9e7,
        note: null,
        pardonedAt: null,
        copyId: null,
      },
      {
        id: 9003,
        login: 'nruiz',
        at: day(3),
        how: 'review',
        why: 'review',
        total: null,
        perSecond: null,
        seized: 5.5e10,
        note: null,
        pardonedAt: null,
        copyId: null,
      },
      {
        id: 9004,
        login: 'jdoe',
        at: day(9),
        how: 'auto',
        why: 'figures',
        total: 1e12,
        perSecond: 1e9,
        seized: 0,
        note: null,
        pardonedAt: day(8),
        copyId: null,
      },
      {
        id: 9005,
        login: 'nruiz',
        at: day(12),
        how: 'sanction',
        why: 'manual',
        total: null,
        perSecond: null,
        seized: 0,
        note: 'Te quedas con mil millones.',
        pardonedAt: null,
        copyId: null,
      },
    ]
    const mine: ClickerCheatEntry[] = cheats.map((cheat) => ({
      id: cheat.id,
      login: ME.login,
      at: cheat.at,
      how: 'auto',
      why: cheat.why,
      total: cheat.total,
      perSecond: cheat.perSecond,
      seized: 0,
      note: null,
      pardonedAt: null,
      copyId: cheat.id,
    }))
    const entries = [...mine, ...invented].sort((a, b) => b.at.localeCompare(a.at))
    const people = new Map<string, ClickerCheater>()

    for (const entry of entries) {
      const known = people.get(entry.login)
      const counts = entry.pardonedAt === null ? 1 : 0

      if (known === undefined) {
        people.set(entry.login, {
          login: entry.login,
          times: counts,
          first: entry.at,
          last: entry.at,
          whys: [entry.why],
          seized: entry.seized,
          wealth: entry.login === 'tbravo' ? 3.1e9 : 8.4e10,
          review: entry.login === 'nruiz' ? 'answered' : null,
        })
      } else {
        known.times += counts
        known.first = entry.at
        known.seized += entry.seized
        if (!known.whys.includes(entry.why)) known.whys.push(entry.why)
      }
    }

    return { entries, people: [...people.values()] }
  },

  async pardonClickerCheat(id) {
    await delay(150)

    const copy = cheats.find((cheat) => cheat.id === id)

    if (copy === undefined) throw fail(404, 'Esa trampa ya no está')

    cheats = cheats.filter((cheat) => cheat.id !== id)
    state.save = copy.save
    state.rev += 1
    holder = null
    state.caught = Math.max(0, state.caught - 1)
    state.saleDue = false
    best = Math.max(best, copy.total)
  },

  async dismissClickerAlert(id) {
    await delay(100)
    alerts = alerts.filter((alert) => alert.id !== id)
  },

  async reviewClickerAlert(id, verdict) {
    await delay(100)

    const alert = alerts.find((entry) => entry.id === id)

    if (alert === undefined) throw fail(404, 'Ese aviso ya no está')
    if (verdict === 'likely') {
      alert.status = 'asked'

      return
    }

    alerts = alerts.filter((entry) => entry.id !== id)
  },

  async getClickerReviews() {
    await delay(80)

    return [...reviews]
  },

  async defendClickerReview(id, answer) {
    await delay(120)
    if (answer.trim().length < 20) throw fail(400, 'Cuéntalo con un poco más de detalle')
    reviews = reviews.filter((review) => review.id !== id)
  },

  async claimClickerPool() {
    await delay(120)

    const amount = Math.min(state.pool, 5e4)

    if (amount <= 0) throw fail(409, 'La bolsa está vacía')
    state.pool -= amount

    return { amount, pool: state.pool }
  },

  // Las partidas de mentira de los demás: con algo comprado, para que se vea.
  async getClickerGameOf(login) {
    await delay(100)

    return {
      login,
      save: JSON.stringify({
        v: 1,
        code: 48_200,
        total: 2.6e6,
        owned: { cursor: 25, pisciner: 12, cluster: 4 },
      }),
      caught: login === 'rsoto' ? 2 : 0,
      perSecond: 340,
    }
  },

  async sanctionClicker({ code, wipe, note }) {
    await delay(150)

    const game = JSON.parse(state.save ?? '{}') as Record<string, unknown>
    const total = Math.max(Number(game.total) || 0, code)

    state.save = JSON.stringify(
      wipe
        ? { ...game, code, total, owned: {}, made: {}, bought: [], buffs: [], bugs: [] }
        : { ...game, code, total },
    )
    state.rev += 1
    state.seizure = { by: 'admin', amount: 0, n: state.caught, shared: 0, evidence: null, note }
  },

  async ackClickerSeizure() {
    await delay(60)
    state.seizure = null
  },
}
