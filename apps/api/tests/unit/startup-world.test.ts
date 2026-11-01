/**
 * La startup como mundo (`docs/pomodoro-startup.md`): el dinero que sale de lo
 * implementado y de la plantilla (y que la API vuelve a contar igual), el
 * resto de la oficina, la decoración que se coloca a mano, las cajas sorpresa
 * de las sesiones de 30 minutos, la nueva partida+ y las partidas de antes.
 */

import {
  DECOR,
  DECOR_MAX,
  EMPTY_STARTUP,
  ROOM,
  act,
  boxesOf,
  candidatesOf,
  canPlace,
  cashOf,
  desksOf,
  moodOf,
  parseStartup,
  prizeOf,
  rateOf,
  roomOf,
  seatsOf,
  cycleOf,
  settle,
} from '@sanatorio/startup'
import type { StartupAction, StartupState } from '@sanatorio/startup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Actor } from '../../src/core/actor.js'
import { NO_POOL } from '../../src/core/audience.js'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createStartupModule } from '../../src/modules/startup/index.js'

const actor = (login: string): Actor => ({ login, campusId: 22, admin: false })

function play(
  state: StartupState,
  actions: StartupAction[],
  earned = 1_000_000,
  sessions = 0,
  login = 'ana',
): StartupState {
  return actions.reduce((current, action) => {
    const result = act(login, current, earned, action, sessions)

    if ('refused' in result) throw new Error(`${action.type}: ${result.refused}`)

    return result.state
  }, state)
}

/** Una startup fundada en una oficina (espacio 2) con dinero de sobra. */
const office = (extra: Partial<StartupState> = {}): StartupState => ({
  ...EMPTY_STARTUP,
  name: 'Pixel',
  levels: { 'learn-back': 3, 'learn-front': 4, space: 2 },
  milestones: ['side', 'mvp', 'founded'],
  cash: 1_000_000,
  at: 0,
  ...extra,
})

describe('el dinero', () => {
  it('sale de lo implementado: cada versión pide lo aprendido y rinde por minuto', () => {
    // Sin aprender nada, ni el primer bot.
    expect(act('ana', EMPTY_STARTUP, 100, { type: 'buy', item: 'product-bot' })).toEqual({
      refused: 'locked',
    })

    const learnt = play(EMPTY_STARTUP, [{ type: 'buy', item: 'learn-back' }], 100)
    const bot = play(learnt, [{ type: 'buy', item: 'product-bot' }], 100)

    expect(rateOf(bot)).toBe(1)
    expect(bot.at).toBe(100)
    // La v2 pide el nivel 2 de su rama.
    expect(act('ana', bot, 1000, { type: 'buy', item: 'product-bot' })).toEqual({
      refused: 'locked',
    })
    // Lo de antes de implementarlo no rinde; lo de después, sí.
    expect(cashOf(bot, 100)).toBe(0)
    expect(cashOf(bot, 160)).toBe(60)
    expect(cashOf(bot, 160)).toBe(cashOf(parseStartup(JSON.parse(JSON.stringify(bot))), 160))
  })

  it('la plantilla también rinde, y apuntar el dinero no cambia lo que hay', () => {
    const state = office({ team: [{ axis: 'back', stars: 4, look: 1 }] })

    expect(rateOf(state)).toBe(2)

    const later = settle(state, 300)

    expect(later.cash).toBe(state.cash + 600)
    expect(cashOf(later, 300)).toBe(cashOf(state, 300))
    // Si los minutos bajasen (datos borrados), no se pierde dinero.
    expect(cashOf(later, 10)).toBe(later.cash)
  })

  it('sin apuntar nunca, lo de antes no cuenta: las partidas viejas empiezan desde cero', () => {
    const old = parseStartup({ levels: { 'learn-ai': 1 }, spent: 30 })

    expect(old.at).toBeNull()
    expect(cashOf({ ...old, levels: { ...old.levels, 'product-bot': 1 } }, 5000)).toBe(0)
  })

  it('el espacio y la decoración se pagan con dinero; los minutos no llegan', () => {
    const poor = { ...office(), cash: 10 }

    expect(act('ana', poor, 1_000_000, { type: 'buy', item: 'space' })).toEqual({
      refused: 'poor',
    })
    expect(act('ana', poor, 1_000_000, { type: 'decor', id: 'lamp' })).toEqual({
      refused: 'poor',
    })
  })
})

describe('el resto de la oficina', () => {
  it('se contrata con dinero según el espacio, sube el ánimo y lo que se gana', () => {
    // En tu cuarto aún no hay recepción.
    expect(
      act('ana', office({ levels: { space: 1 } }), 0, { type: 'staff', role: 'reception' }),
    ).toEqual({ refused: 'locked' })

    const base = office({ levels: { 'product-bot': 1, 'learn-back': 3, space: 2 } })
    const staffed = play(
      base,
      [
        { type: 'staff', role: 'cleaning' },
        { type: 'staff', role: 'cleaning' },
      ],
      0,
    )

    expect(staffed.team.map((hire) => hire.role)).toEqual(['cleaning', 'cleaning'])
    // La primera cuesta 600 y la segunda, el doble.
    expect(staffed.cash).toBe(base.cash - 600 - 1200)
    expect(moodOf(staffed)).toBeCloseTo(1.15)
    expect(rateOf(staffed)).toBeGreaterThan(rateOf(base))
    // La cocina pide la oficina grande.
    expect(act('ana', base, 0, { type: 'staff', role: 'kitchen' })).toEqual({ refused: 'locked' })
    // No cuentan para el modelo de negocio ni tienen mesa.
    expect(desksOf(staffed)).toHaveLength(1)
  })

  it('cada oficio tiene un máximo y todos ocupan sitio', () => {
    const full = office({
      team: Array.from({ length: 12 }, (_, look) => ({ axis: 'ai', stars: 1, look })),
    })

    expect(seatsOf(full)).toBe(12)
    expect(act('ana', full, 0, { type: 'staff', role: 'cleaning' })).toEqual({ refused: 'full' })

    const two = play(office(), [
      { type: 'staff', role: 'reception' },
      { type: 'staff', role: 'reception' },
    ])

    expect(act('ana', two, 0, { type: 'staff', role: 'reception' })).toEqual({ refused: 'max' })
  })
})

describe('la decoración', () => {
  it('lo comprado se deja solo en una baldosa libre; lo de las cajas no se vende', () => {
    const state = play(office(), [
      { type: 'decor', id: 'lamp' },
      { type: 'decor', id: 'rug' },
    ])

    expect(state.decor).toHaveLength(2)
    expect(state.decor.every((piece) => piece.at !== null)).toBe(true)
    expect(act('ana', office(), 0, { type: 'decor', id: 'trophy' })).toEqual({ refused: 'locked' })
    // El piano pide la oficina grande.
    expect(act('ana', office(), 0, { type: 'decor', id: 'piano' })).toEqual({ refused: 'locked' })
    expect(act('ana', office(), 0, { type: 'decor', id: 'nada' })).toEqual({ refused: 'invalid' })
  })

  it('se mueve y se gira dentro de la planta, sin pisar mesas, servidores ni otra pieza', () => {
    const state = play(office({ levels: { space: 2, servers: 1 } }), [
      { type: 'decor', id: 'lamp' },
      { type: 'decor', id: 'plant' },
    ])
    const size = roomOf(state)
    const [desk] = desksOf(state)
    const plant = state.decor[1]?.at ?? [0, 0]

    expect(size).toBe(ROOM[2])
    // Fuera, en la mesa de quien fundó, en el armario del fondo y encima de la planta.
    for (const [gx, gy] of [[size, 0], [-1, 2], desk ?? [1, 1], [size - 1, 0], plant] as const) {
      expect(canPlace(state, 0, gx, gy), `${String(gx)},${String(gy)}`).toBe(false)
      expect(act('ana', state, 0, { type: 'place', index: 0, gx, gy, turn: false })).toEqual({
        refused: 'taken',
      })
    }

    const moved = play(state, [{ type: 'place', index: 0, gx: 0, gy: 2, turn: true }])

    expect(moved.decor[0]).toEqual({ id: 'lamp', at: [0, 2], turn: true })
    // A su propia baldosa sí se puede (para girarla sin moverla).
    expect(canPlace(moved, 0, 0, 2)).toBe(true)
    expect(act('ana', state, 0, { type: 'place', index: 9, gx: 0, gy: 0, turn: false })).toEqual({
      refused: 'invalid',
    })

    const stored = play(moved, [{ type: 'store', index: 0 }])

    expect(stored.decor[0]?.at).toBeNull()
    expect(act('ana', stored, 0, { type: 'store', index: 0 })).toEqual({ refused: 'invalid' })
  })

  it('las mesas se apartan de la decoración y las mascotas no se colocan', () => {
    const state = office({
      decor: [
        { id: 'sofa', at: [1, 1], turn: false },
        { id: 'cat', at: null, turn: false },
      ],
    })

    expect(desksOf(state)[0]).toEqual([2, 1])
    expect(canPlace(state, 1, 0, 0)).toBe(false)
  })

  it('no pasa del máximo de piezas', () => {
    const full = office({
      decor: Array.from({ length: DECOR_MAX }, () => ({ id: 'cactus', at: null, turn: false })),
    })

    expect(act('ana', full, 0, { type: 'decor', id: 'lamp' })).toEqual({ refused: 'full' })
  })
})

describe('las cajas sorpresa', () => {
  it('una por sesión de 30 minutos o más; lo que sale está decidido de antes', () => {
    expect(act('ana', EMPTY_STARTUP, 60, { type: 'open' })).toEqual({ refused: 'locked' })
    expect(boxesOf(EMPTY_STARTUP, 2)).toBe(2)

    const prize = prizeOf('ana', EMPTY_STARTUP)
    const once = play(EMPTY_STARTUP, [{ type: 'open' }], 60, 2)

    expect(once.opened).toBe(1)
    if (prize.kind === 'decor') expect(once.decor.map((piece) => piece.id)).toEqual([prize.id])
    else expect(once.cash).toBe(prize.amount)

    const twice = play(once, [{ type: 'open' }], 60, 2)

    expect(act('ana', twice, 60, { type: 'open' }, 2)).toEqual({ refused: 'locked' })
    expect(boxesOf(twice, 2)).toBe(0)
    expect(prizeOf('ana', EMPTY_STARTUP)).toEqual(prize)
  })

  it('de muchas cajas sale de todo, y nunca una mascota repetida', () => {
    let state = EMPTY_STARTUP

    for (let box = 0; box < 60; box += 1) state = play(state, [{ type: 'open' }], 0, 60)

    const pets = state.decor.filter(
      (piece) => DECOR.find((item) => item.id === piece.id)?.kind === 'pet',
    )

    expect(new Set(pets.map((piece) => piece.id)).size).toBe(pets.length)
    expect(new Set(state.decor.map((piece) => piece.id)).size).toBeGreaterThan(8)
  })
})

describe('nueva partida+', () => {
  const done = office({
    levels: { space: 5, 'product-bot': 3, 'learn-back': 3 },
    milestones: ['side', 'mvp', 'founded', 'global'],
    cash: 5000,
    at: 20_000,
    spent: 9000,
    opened: 4,
    decor: [
      { id: 'sofa', at: [8, 8], turn: false },
      { id: 'lamp', at: [0, 3], turn: true },
      { id: 'dog', at: null, turn: false },
    ],
  })

  it('pide el control global y el edificio entero', () => {
    expect(act('ana', office(), 0, { type: 'legacy' })).toEqual({ refused: 'locked' })
    expect(
      act('ana', { ...done, milestones: ['side', 'mvp', 'founded'] }, 0, { type: 'legacy' }),
    ).toEqual({ refused: 'locked' })
  })

  it('vuelve a tu cuarto conservando la decoración, las cajas y un extra de lo que se gana', () => {
    const fresh = play(done, [{ type: 'legacy' }], 20_000)

    expect(fresh).toMatchObject({
      levels: {},
      milestones: [],
      team: [],
      legacy: 1,
      opened: 4,
      spent: 9000,
      cash: 500,
      at: 20_000,
    })
    // El sofá ya no cabe en tu cuarto: al almacén. La lámpara se queda.
    expect(fresh.decor).toEqual([
      { id: 'sofa', at: null, turn: false },
      { id: 'lamp', at: [0, 3], turn: true },
      { id: 'dog', at: null, turn: false },
    ])
    expect(rateOf({ ...fresh, levels: { 'product-bot': 1 } })).toBeCloseTo(1.25 * moodOf(fresh), 1)
    // Otra vuelta, otros candidatos.
    expect(candidatesOf('ana', fresh)).not.toEqual(candidatesOf('ana', { ...fresh, legacy: 0 }))
  })
})

describe('las partidas de antes (migración 82)', () => {
  const saved = {
    name: 'Neuralia',
    levels: { 'learn-ai': 5, 'learn-data': 3, computer: 3, space: 2, servers: 1 },
    milestones: ['side', 'mvp', 'founded'],
    team: [
      { axis: 'ai', stars: 3, look: 12 },
      { axis: 'data', stars: 1, look: 400 },
    ],
    rounds: [{ id: 'preseed', luck: 1.2 }],
    spent: 2400,
    rolls: 2,
  }

  it('se leen con lo nuevo vacío y siguen sacando los mismos candidatos', () => {
    const state = parseStartup(saved)

    expect(state).toMatchObject({ ...saved, cash: 0, at: null, decor: [], opened: 0, legacy: 0 })

    // La semilla de antes: el login tal cual.
    expect(cycleOf('ana', state)).toBe('ana')
    expect(candidatesOf('ana', state)).toHaveLength(3)
    expect(candidatesOf('ana', state)).toEqual(candidatesOf('ana', parseStartup(saved)))
  })

  it('se puede seguir jugando: lo primero apunta el dinero desde ahí', () => {
    const next = play(parseStartup(saved), [{ type: 'buy', item: 'product-insights' }], 3000)

    expect(next.at).toBe(3000)
    expect(next.cash).toBe(0)
    expect(next.spent).toBe(2580)
  })

  it('lo guardado roto o de más se descarta o va al almacén', () => {
    const state = parseStartup({
      ...saved,
      cash: -4,
      at: 'ayer',
      team: [...saved.team, { axis: 'ai', stars: 1, look: 3, role: 'astronauta' }],
      decor: [
        { id: 'lamp', at: [1, 0], turn: 'sí' },
        { id: 'lamp', at: [1, 0], turn: false },
        { id: 'sofa', at: [99, 99], turn: false },
        { id: 'cat', at: [2, 2], turn: false },
        { id: 'unicornio', at: [3, 3], turn: false },
        { id: 'plant', at: [0.5, 2], turn: false },
        'basura',
      ],
    })

    expect(state.cash).toBe(0)
    expect(state.at).toBeNull()
    expect(state.team[2]).toEqual({ axis: 'ai', stars: 1, look: 3 })
    expect(state.decor).toEqual([
      { id: 'lamp', at: [1, 0], turn: false },
      { id: 'lamp', at: null, turn: false },
      { id: 'sofa', at: null, turn: false },
      { id: 'cat', at: null, turn: false },
      { id: 'plant', at: null, turn: false },
    ])
  })
})

describe('módulo startup: lo nuevo', () => {
  let db: Db
  let hidden: Set<string>

  const build = () =>
    createStartupModule({
      db,
      focusedMinutes: (login) =>
        Promise.resolve(new Map([[login ?? 'ana', login === 'leo' ? 900 : 600]])),
      longSessions: (login, minutes) => {
        // Las cajas se cuentan con sesiones de 30 minutos.
        expect(minutes).toBe(30)

        return Promise.resolve(login === 'ana' ? 1 : 0)
      },
      audience: { ...NO_POOL, hiddenFrom: () => Promise.resolve(hidden) },
    }).service

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    hidden = new Set()
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('la caja se abre con las sesiones que cuenta la API, no con lo que diga la web', async () => {
    const service = build()

    expect(await service.snapshot(actor('ana'))).toMatchObject({ longSessions: 1 })

    const opened = await service.act(actor('ana'), { type: 'open' })

    expect(opened.state.opened).toBe(1)
    await expect(service.act(actor('ana'), { type: 'open' })).rejects.toMatchObject({
      code: 'conflict',
    })
    await expect(service.act(actor('leo'), { type: 'open' })).rejects.toMatchObject({
      code: 'conflict',
    })
  })

  it('colocar valida la entrada y el sitio; el dinero no se puede mandar desde fuera', async () => {
    const service = build()

    for (const bad of [
      { type: 'place', index: 0, gx: 99, gy: 0, turn: false },
      { type: 'place', index: -1, gx: 0, gy: 0, turn: false },
      { type: 'place', index: 0, gx: 1.5, gy: 0, turn: false },
      { type: 'place', index: 0, gx: 0, gy: 0 },
      { type: 'staff', role: 'astronauta' },
      { type: 'decor', id: '' },
      { type: 'buy', item: 'space', cash: 1e9 },
    ]) {
      const result = service.act(actor('ana'), bad)

      if ('cash' in bad) {
        // Lo que sobra se ignora: sin dinero, el espacio no se paga.
        await expect(result).rejects.toMatchObject({ code: 'conflict' })
      } else {
        await expect(result, JSON.stringify(bad)).rejects.toMatchObject({ code: 'invalid_input' })
      }
    }

    // Sin piezas, no hay nada que mover.
    await expect(
      service.act(actor('ana'), { type: 'place', index: 0, gx: 0, gy: 0, turn: false }),
    ).rejects.toMatchObject({ code: 'conflict' })
  })

  it('se puede ir a ver la oficina de alguien del ranking, pero no la de quien está oculto', async () => {
    const service = build()

    await service.act(actor('leo'), { type: 'buy', item: 'learn-front' })

    expect(await service.visit(actor('ana'), { login: 'leo' })).toMatchObject({
      login: 'leo',
      state: { levels: { 'learn-front': 1 } },
    })
    // La visita no enseña los minutos de nadie.
    expect(Object.keys(await service.visit(actor('ana'), { login: 'leo' }))).toEqual([
      'login',
      'state',
    ])
    await expect(service.visit(actor('ana'), { login: 'nadie' })).rejects.toMatchObject({
      code: 'not_found',
    })
    await expect(service.visit(actor('ana'), { login: '../etc' })).rejects.toMatchObject({
      code: 'invalid_input',
    })

    hidden.add('leo')
    await expect(service.visit(actor('ana'), { login: 'leo' })).rejects.toMatchObject({
      code: 'not_found',
    })
    // A sí misma se ve siempre.
    expect(await service.visit(actor('leo'), { login: 'leo' })).toMatchObject({ login: 'leo' })
  })
})
