/**
 * La startup del Pomodoro (`@sanatorio/startup` y `modules/startup`): lo ganado
 * sale de la concentración, cada cosa pide lo anterior, el azar no se puede
 * volver a tirar recargando y el ranking va por horas.
 */

import {
  EMPTY_STARTUP,
  ITEMS,
  act,
  candidatesOf,
  focusOf,
  luckOf,
  parseStartup,
  stageOf,
  valuationOf,
} from '@sanatorio/startup'
import type { StartupAction, StartupState } from '@sanatorio/startup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createStartupModule } from '../../src/modules/startup/index.js'
import type { Actor } from '../../src/core/actor.js'

const actor = (login: string): Actor => ({ login, campusId: 22, admin: false })

/** Hace varias acciones seguidas; falla si alguna no se puede. */
function play(
  login: string,
  earned: number,
  actions: StartupAction[],
  from = EMPTY_STARTUP,
): StartupState {
  return actions.reduce((state, action) => {
    const result = act(login, state, earned, action)

    if ('refused' in result) throw new Error(`${action.type}: ${result.refused}`)

    return result.state
  }, from)
}

const learn = (axis: string, times: number): StartupAction[] =>
  Array.from({ length: times }, () => ({ type: 'buy', item: `learn-${axis}` }))

describe('motor de la startup', () => {
  it('se empieza en el garaje: aprender y el ordenador se pagan con minutos', () => {
    const result = act('ana', EMPTY_STARTUP, 40, { type: 'buy', item: 'learn-ai' })

    expect(result).toMatchObject({ state: { levels: { 'learn-ai': 1 }, spent: 30 } })
    // Con 40 minutos no llega para el segundo nivel (60).
    expect(
      act('ana', 'state' in result ? result.state : EMPTY_STARTUP, 40, {
        type: 'buy',
        item: 'learn-ai',
      }),
    ).toEqual({
      refused: 'poor',
    })
    // El espacio pide haber fundado la startup.
    expect(act('ana', EMPTY_STARTUP, 10_000, { type: 'buy', item: 'space' })).toEqual({
      refused: 'locked',
    })
    expect(act('ana', EMPTY_STARTUP, 10_000, { type: 'buy', item: 'nada' })).toEqual({
      refused: 'invalid',
    })
  })

  it('los hitos van en orden; fundar pide un nombre y lo guarda', () => {
    const rich = 100_000
    const studied = play('ana', rich, [...learn('ai', 4), ...learn('data', 3)])

    expect(act('ana', studied, rich, { type: 'milestone', milestone: 'mvp' })).toEqual({
      refused: 'locked',
    })

    const built = play(
      'ana',
      rich,
      [
        { type: 'milestone', milestone: 'side' },
        { type: 'milestone', milestone: 'mvp' },
      ],
      studied,
    )

    expect(
      act('ana', built, rich, { type: 'milestone', milestone: 'founded', name: '  ' }),
    ).toEqual({
      refused: 'invalid',
    })

    const founded = play(
      'ana',
      rich,
      [{ type: 'milestone', milestone: 'founded', name: 'Neuralia' }],
      built,
    )

    expect(founded.name).toBe('Neuralia')
    expect(stageOf(founded)).toBe(3)
    expect(focusOf(founded)).toBe('ai')
  })

  it('los candidatos y la suerte salen siempre igual; volver a sacar los cambia', () => {
    const state = { ...EMPTY_STARTUP, milestones: ['side', 'mvp'] as StartupState['milestones'] }

    expect(candidatesOf('ana', state)).toEqual(candidatesOf('ana', state))
    expect(candidatesOf('ana', state)).not.toEqual(candidatesOf('leo', state))

    const rerolled = play('ana', 1000, [{ type: 'reroll' }], state)

    expect(candidatesOf('ana', rerolled)).not.toEqual(candidatesOf('ana', state))
    expect(rerolled.spent).toBe(15)

    const luck = luckOf('ana', 'seed')

    expect(luck).toBeGreaterThanOrEqual(0.7)
    expect(luck).toBeLessThanOrEqual(1.5)
    expect(luckOf('ana', 'seed')).toBe(luck)
  })

  it('contratar llena el sitio; las rondas piden plantilla, espacio y horas y multiplican', () => {
    const rich = 1_000_000
    let state = play('ana', rich, [
      ...learn('front', 4),
      ...learn('back', 3),
      { type: 'milestone', milestone: 'side' },
      { type: 'milestone', milestone: 'mvp' },
      { type: 'milestone', milestone: 'founded', name: 'Pixel' },
    ])

    state = play(
      'ana',
      rich,
      [
        { type: 'hire', index: 0 },
        { type: 'hire', index: 1 },
      ],
      state,
    )
    // En el garaje caben dos.
    expect(act('ana', state, rich, { type: 'hire', index: 0 })).toEqual({ refused: 'full' })
    // La presemilla pide un espacio.
    expect(act('ana', state, rich, { type: 'round' })).toEqual({ refused: 'locked' })

    state = play('ana', rich, [{ type: 'buy', item: 'space' }], state)

    const before = valuationOf(state)

    state = play('ana', rich, [{ type: 'round' }], state)
    expect(state.rounds[0]).toMatchObject({ id: 'preseed' })
    expect(valuationOf(state)).toBeGreaterThan(before)
    // Pocas horas de concentración: con 30 minutos no se pasa de la presemilla.
    expect(act('ana', state, 30, { type: 'round' })).toEqual({ refused: 'locked' })
  })

  it('lo guardado que no cuadra con el catálogo se descarta sin romper la partida', () => {
    const state = parseStartup({
      name: 'X'.repeat(80),
      levels: { 'learn-ai': 2, inventado: 9, computer: -3 },
      milestones: ['side', 'luna'],
      team: [
        { axis: 'ai', stars: 3, look: 1 },
        { axis: 'magia', stars: 2, look: 1 },
      ],
      rounds: [
        { id: 'seed', luck: 1 },
        { id: 'z', luck: 9 },
      ],
      spent: -5,
    })

    expect(state).toMatchObject({
      levels: { 'learn-ai': 2 },
      milestones: ['side'],
      team: [{ axis: 'ai' }],
      rounds: [{ id: 'seed' }],
      spent: 0,
    })
    expect(state.name).toHaveLength(32)
    expect(parseStartup('basura')).toEqual(EMPTY_STARTUP)
    expect(ITEMS.length).toBeGreaterThan(5)
  })
})

describe('módulo startup', () => {
  let db: Db
  let minutes: Map<string, number>

  const build = () =>
    createStartupModule({
      db,
      focusedMinutes: (login) =>
        Promise.resolve(
          login === undefined ? minutes : new Map([[login, minutes.get(login) ?? 0]]),
        ),
    }).service

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    minutes = new Map([
      ['ana', 300],
      ['leo', 1200],
    ])
  })

  afterEach(() => {
    closeDatabase(db)
  })

  it('lo ganado es lo concentrado; lo gastado se guarda y no se puede gastar dos veces', async () => {
    const service = build()

    expect(await service.snapshot(actor('ana'))).toMatchObject({
      earnedMinutes: 300,
      state: { spent: 0 },
    })

    await service.act(actor('ana'), { type: 'buy', item: 'computer' })
    for (let level = 0; level < 3; level += 1)
      await service.act(actor('ana'), { type: 'buy', item: 'learn-ai' })

    expect((await service.snapshot(actor('ana'))).state).toMatchObject({ spent: 255 })
    // Quedan 45: el siguiente nivel cuesta 240.
    await expect(
      service.act(actor('ana'), { type: 'buy', item: 'learn-ai' }),
    ).rejects.toMatchObject({
      code: 'conflict',
    })
    await expect(service.act(actor('ana'), { type: 'teleport' })).rejects.toMatchObject({
      code: 'invalid_input',
    })
    await expect(
      service.act(actor('ana'), { type: 'milestone', milestone: 'founded', name: '<script>' }),
    ).rejects.toMatchObject({ code: 'invalid_input' })
  })

  it('el ranking va por horas de concentración y enseña la startup de cada cual', async () => {
    const service = build()

    await service.act(actor('ana'), { type: 'buy', item: 'learn-front' })
    await service.act(actor('leo'), { type: 'buy', item: 'learn-ai' })

    const ranking = await service.ranking(actor('ana'))

    expect(ranking.map((row) => row.login)).toEqual(['leo', 'ana'])
    expect(ranking[0]).toMatchObject({ hours: 20, focus: 'ai', stage: 0 })
  })
})
