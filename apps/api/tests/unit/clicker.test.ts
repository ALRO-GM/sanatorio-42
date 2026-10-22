/**
 * Tests de Code Clicker, la sección secreta: la cuenta de la cruz, las
 * pastillas y la clasificación.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { BASE_PRICE, GROWTH } from '../../src/modules/clicker/cheat.rules.js'
import { toText } from '../../src/core/db/rows.js'
import { clickerLevel } from '../../src/modules/clicker/index.js'
import { actor, expectCode, HOUR, MINUTE, useCommunity } from '../helpers/community.js'
import { userId } from '../helpers/fixtures.js'
import type { Community } from '../helpers/community.js'

describe('code clicker', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, clock, db, api } = community)
  })

  /** Pulsa la cruz `times` veces, en envíos de veinte. */
  const press = async (login: string, times: number): Promise<void> => {
    for (let left = times; left > 0; left -= 20) {
      await services.clicker.plus(actor(login), { count: Math.min(20, left) })
    }
  }

  /** Una partida como las que guarda la web, con lo justo para que cuadre. */
  // Una partida recién empezada: lo escrito, a mano (doscientas pulsaciones).
  // La API rehace las cuentas con el motor del juego, así que las partidas de
  // prueba tienen que cuadrar: lo que producen lo dicen sus edificios.
  const game = (extra: Record<string, unknown> = {}): string =>
    JSON.stringify({ v: 1, code: 0, total: 1500, clicks: 200, ...extra })

  const SAVE = {
    save: game(),
    rev: 0,
    session: 'pestaña-1',
    total: 1500,
    perSecond: 1,
    achievements: 6,
    prestige: 0,
    spent: 0,
  }

  it('las noticias hablan de quien más te ha corregido y has corregido, y luego del campus', async () => {
    const { clicker } = services
    let id = 1
    /** `corrector` corrige `times` veces a `corrected` en Madrid. */
    const correct = async (corrector: string, corrected: string, times: number): Promise<void> => {
      for (let index = 0; index < times; index++) {
        await db.execute({
          sql: `INSERT INTO corrections
                  (id, campus_id, corrector, corrected, project_id, begin_at, final_mark, positive)
                VALUES (?, 22, ?, ?, 1, '2026-09-01T10:00:00.000Z', 100, 1)`,
          args: [id++, corrector, corrected],
        })
      }
    }

    await correct('leo', 'ana', 3)
    await correct('ana', 'uma', 2)
    await correct('zoe', 'bob', 20)
    await correct('ana', 'ana', 5)

    // Sin la roja no hacen falta.
    expect((await clicker.state(actor('ana'))).names).toEqual([])

    await press('ana', 42)
    await clicker.choose(actor('ana'), { pill: 'red' })

    const { names } = await clicker.state(actor('ana'))

    // Primero con quién se ha corregido (más veces antes), sin repetir ni salir ella.
    expect(names.slice(0, 2)).toEqual(['leo', 'uma'])
    expect(names).toContain('zoe')
    expect(names).not.toContain('ana')
    expect(new Set(names).size).toBe(names.length)
    expect(names.length).toBeLessThanOrEqual(12)
  })

  it('cuenta las pulsaciones de la cruz, y no deja elegir antes de las 42', async () => {
    const { clicker } = services

    expect(await clicker.state(actor('ana'))).toEqual({
      plus: 0,
      pill: null,
      save: null,
      donated: 0,
      rev: 0,
      caught: 0,
      saleDue: false,
      seizure: null,
      names: [],
    })

    await press('ana', 36)
    expect(await clicker.plus(actor('ana'), { count: 5 })).toEqual({ plus: 41, pill: null })
    await expectCode(clicker.choose(actor('ana'), { pill: 'red' }), 'conflict')
    // A la 42, sí.
    await press('ana', 1)
    expect(await clicker.choose(actor('ana'), { pill: 'red' })).toMatchObject({ pill: 'red' })
    // Ni envíos vacíos ni un millón de golpe.
    await expectCode(clicker.plus(actor('ana'), { count: 0 }), 'invalid_input')
    await expectCode(clicker.plus(actor('ana'), { count: 1000 }), 'invalid_input')
  })

  it('la azul es para siempre: ni cuenta más, ni juega, ni ve la clasificación', async () => {
    const { clicker } = services

    await press('leo', 100)
    expect(await clicker.choose(actor('leo'), { pill: 'blue' })).toMatchObject({ pill: 'blue' })

    await expectCode(clicker.choose(actor('leo'), { pill: 'red' }), 'conflict')
    expect(await clicker.plus(actor('leo'), { count: 20 })).toEqual({ plus: 100, pill: 'blue' })
    await expectCode(clicker.save(actor('leo'), SAVE), 'forbidden')
    await expectCode(clicker.board(actor('leo')), 'forbidden')
  })

  it('quien pidió no salir en la clasificación no sale, ni para los demás ni para sí', async () => {
    const { clicker } = services

    for (const login of ['ana', 'albrodri']) {
      await press(login, 42)
      await clicker.choose(actor(login), { pill: 'red' })
      await clicker.save(actor(login), {
        ...SAVE,
        save: game({ code: login === 'ana' ? 10 : 1e6 }),
      })
    }

    expect((await clicker.board(actor('ana'))).entries).toMatchObject([{ rank: 1, login: 'ana' }])
    expect(await clicker.board(actor('albrodri'))).toMatchObject({
      entries: [{ login: 'ana' }],
      me: null,
    })
  })

  it('con la roja se guarda la partida y se entra en la clasificación', async () => {
    const { clicker } = services

    await press('ana', 100)
    await press('eva', 100)
    await clicker.choose(actor('ana'), { pill: 'red' })
    await clicker.choose(actor('eva'), { pill: 'red' })

    // Quien no ha guardado todavía no sale.
    expect(await clicker.board(actor('ana'))).toEqual({ entries: [], me: null })

    await clicker.save(actor('ana'), SAVE)
    // Dos millones no se escriben en un momento.
    clock.advance(HOUR)
    await clicker.save(actor('eva'), {
      ...SAVE,
      save: game({ code: 1000, total: 2e6, owned: { repo: 1 } }),
      total: 2e6,
      perSecond: 1400,
      prestige: 1,
    })

    expect(await clicker.state(actor('ana'))).toMatchObject({ pill: 'red', save: game() })

    const board = await clicker.board(actor('ana'))

    expect(board.entries).toMatchObject([
      { rank: 1, login: 'eva', total: 2e6, level: 18, prestige: 1 },
      { rank: 2, login: 'ana', total: 1500, level: 9, achievements: 6 },
    ])
    expect(board.me).toMatchObject({ rank: 2, login: 'ana' })

    // Manda el patrimonio de ahora (código más lo que costaron los edificios), no lo escrito.
    await clicker.save(actor('ana'), {
      ...SAVE,
      rev: 1,
      save: game({ code: 1400, owned: { cursor: 2 } }),
    })
    const cursors = (BASE_PRICE.cursor ?? 0) * (1 + GROWTH)

    // `eva` vende el repo: le queda lo que tiene sin gastar, menos que a `ana`.
    await clicker.save(actor('eva'), {
      ...SAVE,
      rev: 1,
      save: game({ code: 1000, total: 2e6 }),
      total: 2e6,
      perSecond: 0,
    })
    expect((await clicker.board(actor('ana'))).entries).toMatchObject([
      { rank: 1, login: 'ana', total: 1500, wealth: 1400 + cursors },
      { rank: 2, login: 'eva', total: 2e6, wealth: 1000 },
    ])

    // El total de la clasificación no baja aunque se empiece una partida nueva.
    await clicker.save(actor('eva'), {
      ...SAVE,
      rev: 2,
      save: game({ total: 10 }),
      total: 10,
      perSecond: 1,
    })
    expect((await clicker.board(actor('eva'))).me).toMatchObject({ total: 2e6, perSecond: 1 })

    // Sin pastilla no hay partida, y una partida enorme o con cifras raras no entra.
    await expectCode(clicker.save(actor('leo'), SAVE), 'forbidden')
    await expectCode(clicker.save(actor('ana'), { ...SAVE, total: -1 }), 'invalid_input')
    await expectCode(
      clicker.save(actor('ana'), { ...SAVE, save: 'x'.repeat(90_000) }),
      'invalid_input',
    )
    await expectCode(clicker.save(actor('ana'), { ...SAVE, save: 'no es json' }), 'invalid_input')
  })

  it('un dispositivo con la partida vieja no pisa la que se siguió en otro', async () => {
    const { clicker } = services
    const ana = actor('ana')

    await press('ana', 100)
    await clicker.choose(ana, { pill: 'red' })

    // El portátil y el móvil cargan la misma partida (rev 0); juega el portátil.
    expect(await clicker.save(ana, { ...SAVE, session: 'portatil-1' })).toMatchObject({
      rev: 1,
      refused: false,
    })
    expect(await clicker.save(ana, { ...SAVE, rev: 1, session: 'portatil-1' })).toMatchObject({
      rev: 2,
      refused: false,
    })

    // El móvil, que sigue con la de antes, no entra, y la partida no cambia.
    await expectCode(
      clicker.save(ana, { ...SAVE, save: game({ tag: 'vieja' }), session: 'movil-123' }),
      'conflict',
    )
    expect(await clicker.state(ana)).toMatchObject({ save: game(), rev: 2 })

    // Si al portátil se le perdió una respuesta y manda una rev atrasada, entra:
    // es la misma pestaña.
    expect(await clicker.save(ana, { ...SAVE, rev: 1, session: 'portatil-1' })).toMatchObject({
      rev: 3,
      refused: false,
    })

    // El móvil recarga, parte de la rev que hay y pasa a tener la partida.
    expect(
      await clicker.save(ana, {
        ...SAVE,
        save: game({ tag: 'movil' }),
        rev: 3,
        session: 'movil-123',
      }),
    ).toMatchObject({ rev: 4, refused: false })
    await expectCode(clicker.save(ana, { ...SAVE, rev: 3, session: 'portatil-1' }), 'conflict')
    expect(await clicker.state(ana)).toMatchObject({ save: game({ tag: 'movil' }), rev: 4 })
  })

  it('lee de 42 los puntos donados a la bolsa, como mucho una vez al día', async () => {
    const { clicker } = services
    const asked = (): number =>
      // Cada pregunta es una o varias páginas: se cuentan las primeras.
      api.calls.filter(
        (call) => call.includes('correction_point_historics') && /[?&]page=1(&|$)/.test(call),
      ).length

    api.points.set(userId('ana'), [
      { id: 1, reason: 'Provided points to the pool', sum: -4, total: 2, created_at: '' },
      { id: 2, reason: 'Earning after defense', sum: 1, total: 3, created_at: '' },
    ])

    // Sin la roja no se pregunta: el juego no existe.
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 0 })
    expect(asked()).toBe(0)

    await press('ana', 42)
    await clicker.choose(actor('ana'), { pill: 'red' })
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 4 })

    // Al rato, lo guardado; al día siguiente, se vuelve a mirar.
    api.points.get(userId('ana'))?.push({
      id: 3,
      reason: 'Provided points to the pool',
      sum: -2,
      total: 1,
      created_at: '',
    })
    clock.advance(HOUR)
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 4 })
    clock.advance(24 * HOUR)
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 6 })
    expect(asked()).toBe(2)

    // Si 42 falla, se queda lo que había y no se vuelve a preguntar hasta mañana.
    api.failOn = { match: 'correction_point_historics', status: 500 }
    clock.advance(25 * HOUR)
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 6 })
    api.failOn = null
    clock.advance(HOUR)
    expect(await clicker.state(actor('ana'))).toMatchObject({ donated: 6 })
    expect(asked()).toBe(3)
  })

  it('quien administra ve el uso del juego, general y de cada persona', async () => {
    const { clicker, usage } = services
    const boss = actor('eva', { admin: true })

    await press('ana', 100)
    await press('leo', 100)
    await press('rut', 40)
    await clicker.choose(actor('ana'), { pill: 'red' })
    await clicker.choose(actor('leo'), { pill: 'blue' })
    await clicker.save(actor('ana'), {
      ...SAVE,
      save: game({ clicks: 321, code: 200, owned: { cursor: 2 }, bought: ['a', 'b'] }),
    })
    await usage.record(actor('ana'), { counts: {}, time: { 'nav.clicker': [300, 60, 900] } })
    // El tiempo en otra sección no es tiempo de juego.
    await usage.record(actor('ana'), { counts: {}, time: { 'nav.tablon': [500, 0, 0] } })

    const seen = await clicker.usage(boss, {})

    expect(seen.days).toBe(7)
    expect(seen.totals).toEqual({
      pressed: 3,
      reached: 2,
      red: 1,
      blue: 1,
      players: 1,
      active: 3,
      total: 1500,
      saves: 1,
      caught: 0,
      seen: 300,
      back: 60,
      hidden: 900,
    })
    expect(seen.players.map((player) => player.login)).toEqual(['ana', 'leo', 'rut'])
    expect(seen.players[0]).toMatchObject({
      plus: 100,
      pill: 'red',
      level: 9,
      total: 1500,
      clicks: 321,
      // Lo que tiene ahora, de su partida guardada.
      code: 200,
      wealth: 200 + (BASE_PRICE.cursor ?? 0) * (1 + GROWTH),
      buildings: 2,
      upgrades: 2,
      saves: 1,
      seen: 300,
      hidden: 900,
    })
    expect(seen.players[2]).toMatchObject({ plus: 40, pill: null, total: 0, clicks: 0, seen: 0 })

    // Una partida que no se entiende no rompe la cuenta.
    await db.execute("UPDATE clicker SET save = 'no es json' WHERE login = 'ana'")
    expect((await clicker.usage(boss, { days: '30' })).players[0]).toMatchObject({
      clicks: 0,
      code: 0,
      wealth: 0,
      buildings: 0,
      upgrades: 0,
    })

    await expectCode(clicker.usage(actor('ana'), {}), 'forbidden')
    await expectCode(clicker.usage(boss, { days: '0' }), 'invalid_input')
  })

  describe('las trampas', () => {
    const ana = actor('ana')
    /** Lo que cuestan `count` unidades de un edificio, desde cero. */
    const cost = (id: string, count: number): number =>
      ((BASE_PRICE[id] ?? 0) * (GROWTH ** count - 1)) / (GROWTH - 1)
    let rev = 0

    /** Guarda y sigue la `rev`, como hace la web. */
    const send = async (
      extra: Record<string, unknown>,
      figures: Partial<typeof SAVE> & {
        capital?: [number, number][]
        clicks?: [number, number][]
      } = {},
    ): Promise<{ caught: number; refused: boolean }> => {
      const total = Number(extra.total ?? 1500) + Number(extra.before ?? 0)
      const done = await services.clicker.save(ana, {
        ...SAVE,
        total,
        ...figures,
        rev,
        save: game(extra),
      })

      rev = done.rev

      return { caught: done.caught, refused: done.refused }
    }

    beforeEach(async () => {
      rev = 0
      await press('ana', 100)
      await services.clicker.choose(ana, { pill: 'red' })
      expect(await send({})).toEqual({ caught: 0, refused: false })
    })

    it('una partida jugada sin más no levanta sospechas, ni con la mejor racha', async () => {
      // Un minuto escribiendo a 12 por segundo, y pulsando.
      clock.advance(MINUTE)
      expect(await send({ total: 2400, clicks: 200 })).toEqual({ caught: 0, refused: false })

      // Compra dos repos con lo escrito en una tarde y la producción sube (2800/s).
      clock.advance(5 * HOUR)
      const spent = cost('repo', 2)

      expect(
        await send(
          { total: spent + 5000, code: 5000, owned: { repo: 2 }, clicks: 900 },
          { perSecond: 2800 },
        ),
      ).toEqual({ caught: 0, refused: false })

      // Una dorada con la racha de pulsaciones: en un minuto cae lo de horas.
      clock.advance(MINUTE)
      expect(
        await send(
          {
            total: spent + 5000 + 2800 * 3600 * 4,
            code: 2800 * 3600 * 4,
            owned: { repo: 2 },
            clicks: 1100,
            golden: 1,
          },
          { perSecond: 2800 },
        ),
      ).toEqual({ caught: 0, refused: false })

      // El portátil dormido toda la noche: al despertar cuenta las ocho horas.
      clock.advance(8 * HOUR)
      expect(
        await send(
          {
            total: spent + 5000 + 2800 * 3600 * 12,
            code: 2800 * 3600 * 12,
            owned: { repo: 2 },
            clicks: 1100,
            golden: 1,
          },
          { perSecond: 2800 },
        ),
      ).toEqual({ caught: 0, refused: false })
      expect(await services.clicker.state(ana)).toMatchObject({ caught: 0, saleDue: false })
    })

    it('se nota cada forma de hacerla, y la partida buena no se toca', async () => {
      const { clicker } = services
      const tricks: [string, Record<string, unknown>, Partial<typeof SAVE>][] = [
        // Líneas sin gastar que nadie ha escrito.
        ['ledger', { code: 1e12 }, {}],
        // Edificios que nadie ha pagado.
        ['ledger', { owned: { cursor: 400 } }, {}],
        ['ledger', { owned: { inventado: 1 } }, {}],
        // Mejoras que nadie ha pagado: lo dice la propia web.
        ['ledger', {}, { spent: 1e9 }],
        // Un total que no da tiempo a escribir.
        ['rate', { total: 1e12, code: 1e12 }, {}],
        ['rate', { before: 1e12 }, {}],
        // Cifras de la clasificación que no son las de la partida.
        ['figures', {}, { total: 1e15 }],
        // Más producción o más prestigio del que cabe con lo escrito.
        ['speed', {}, { perSecond: 1e6 }],
        // Producción declarada que sus edificios no dan ni con la mejor racha:
        // es la que haría pasar por buena cualquier subida.
        ['speed', {}, { perSecond: 100 }],
        ['prestige', {}, { prestige: 50 }],
      ]

      for (const [index, [why, extra, figures]] of tricks.entries()) {
        clock.advance(10 * MINUTE)
        expect(await send(extra, figures)).toEqual({ caught: index + 1, refused: true })
        expect(
          (await db.execute("SELECT caught_why FROM clicker WHERE login = 'ana'")).rows[0],
        ).toMatchObject({ caught_why: why })
      }

      expect(await clicker.state(ana)).toMatchObject({ save: game(), rev: 1 })
    })

    it('cada trampa: título, sus edificios vendidos a la mitad y lo mismo repartido a quien juega limpio', async () => {
      const { clicker, xp } = services
      const titleOf = async (): Promise<unknown> => {
        const { title, hacks, titles } = await xp.expediente(ana)

        return { title, hacks, extra: titles.find((entry) => entry.id.startsWith('hacker'))?.id }
      }

      // `leo` juega limpio; `sol` ya fue pillada alguna vez: a ella no le toca nada.
      for (const login of ['leo', 'sol']) {
        await press(login, 100)
        await clicker.choose(actor(login), { pill: 'red' })
        await clicker.save(actor(login), { ...SAVE, session: `pestaña-${login}` })
      }
      await db.execute("UPDATE clicker SET caught = 1 WHERE login = 'sol'")

      // `ana` juega una tarde y compra diez cursores.
      clock.advance(5 * HOUR)

      const owned = { cursor: 10 }
      const total = 50_000
      const fair = { total, code: 100, owned }
      const half = cost('cursor', 10) / 2

      await send(fair, { perSecond: 1 })
      expect(await titleOf()).toEqual({ title: 'paciente', hacks: 0, extra: undefined })

      // La pillan: no entra, vuelve a la buena y se le venden los edificios a la mitad.
      clock.advance(MINUTE)
      expect(await send({ ...fair, code: 1e9 })).toMatchObject({ caught: 1, refused: true })
      expect(await titleOf()).toEqual({ title: 'hacker_etico', hacks: 1, extra: 'hacker_etico' })
      expect(await clicker.state(ana)).toMatchObject({
        caught: 1,
        saleDue: true,
        seizure: { by: 'auto', amount: half, n: 1, shared: 1, evidence: null },
      })

      // A `leo` le llega lo mismo en su siguiente guardado; a `sol`, nada.
      const leo = await clicker.save(actor('leo'), { ...SAVE, rev: 1, session: 'pestaña-leo' })

      expect(leo.gift).toBeCloseTo(half)
      expect(
        (await clicker.save(actor('sol'), { ...SAVE, rev: 1, session: 'pestaña-sol' })).gift,
      ).toBe(0)
      // Y lo cobrado vale como escrito: su siguiente guardado, con eso de más, no es trampa.
      clock.advance(MINUTE)
      expect(
        await clicker.save(actor('leo'), {
          ...SAVE,
          rev: leo.rev,
          session: 'pestaña-leo',
          save: game({ code: half }),
        }),
      ).toMatchObject({ refused: false, gift: 0 })

      // Hasta que no llega sin edificios, no se guarda nada; con la mitad cobrada, sí.
      clock.advance(MINUTE)
      expect(await send(fair, { perSecond: 1 })).toMatchObject({ refused: true })
      expect(await send({ total, code: 100 + half, owned: { cursor: 0 } })).toMatchObject({
        caught: 1,
        refused: false,
      })
      expect(await clicker.state(ana)).toMatchObject({ saleDue: false })

      // Otra vez dentro de los cinco minutos: no cuenta dos veces. Pasados, la segunda.
      clock.advance(MINUTE)
      expect(await send({ total, code: 1e9 })).toMatchObject({ caught: 1, refused: true })
      clock.advance(5 * MINUTE)
      expect(await send({ total, code: 1e9 })).toMatchObject({ caught: 2, refused: true })
      expect(await titleOf()).toMatchObject({ title: 'hacker_poco_etico', hacks: 2 })
      expect((await clicker.usage(actor('eva', { admin: true }), {})).players[0]).toMatchObject({
        caught: 2,
        caughtWhy: 'ledger',
      })
    })

    it('el indulto pone en curso la partida rechazada y deshace el castigo', async () => {
      const { clicker, xp } = services
      const boss = actor('eva', { admin: true })
      const owned = { cursor: 10 }

      await xp.updateSettings(ana, { title: 'paciente' })
      clock.advance(5 * HOUR)
      await send({ total: 50_000, code: 100, owned }, { perSecond: 1 })

      // Tres veces seguidas le rechazan una partida que en realidad era buena.
      for (const caught of [1, 2, 3]) {
        clock.advance(10 * MINUTE)
        expect(await send({ total: 9e7, code: 8e7, owned, tag: caught }, { perSecond: 2 })).toEqual(
          { caught, refused: true },
        )
      }

      // Mientras tanto la web ha vendido los edificios, como le tocaba.
      await send({ total: 50_000, code: 300, owned: {} }, { perSecond: 0 })

      const { cheats } = await clicker.usage(boss, {})

      expect(cheats).toMatchObject([
        { login: 'ana', why: 'rate', total: 9e7 },
        { login: 'ana', why: 'rate' },
        { login: 'ana', why: 'rate' },
      ])
      await expectCode(clicker.pardon(ana, cheats[0]?.id), 'forbidden')

      // El registro de trampas las tiene las tres, con su partida para indultar.
      const log = await clicker.cheats(boss)

      expect(log.entries.map((entry) => [entry.how, entry.why, entry.copyId !== null])).toEqual([
        ['auto', 'rate', true],
        ['auto', 'rate', true],
        ['auto', 'rate', true],
      ])
      expect(log.people).toMatchObject([{ login: 'ana', times: 3, whys: ['rate'] }])
      await expectCode(clicker.cheats(ana), 'forbidden')

      // Se indulta la última: vuelve la partida con sus edificios y el título anterior.
      await clicker.pardon(boss, cheats[0]?.id)
      expect(await clicker.state(ana)).toMatchObject({
        caught: 2,
        saleDue: false,
        save: game({ total: 9e7, code: 8e7, owned, tag: 3 }),
      })
      expect(await xp.expediente(ana)).toMatchObject({ title: 'hacker_poco_etico', hacks: 2 })
      expect((await clicker.board(ana)).me).toMatchObject({ total: 9e7, perSecond: 2 })
      await expectCode(clicker.pardon(boss, cheats[0]?.id), 'not_found')

      // Quien la tenía abierta no guarda encima: tiene que cargarla.
      await expectCode(send({ total: 50_000, code: 300, owned: {} }), 'conflict')
      rev = (await clicker.state(ana)).rev
      // Y desde ahí sigue jugando sin que salte nada.
      clock.advance(MINUTE)
      expect(await send({ total: 9e7 + 100, code: 8e7 + 100, owned }, { perSecond: 2 })).toEqual({
        caught: 2,
        refused: false,
      })

      // Indultadas las otras dos, no queda rastro, y luce el título que tenía.
      // Como ya va por delante de esas copias, se queda con la partida de ahora.
      const { rev: now } = await clicker.state(ana)

      await clicker.pardon(boss, cheats[1]?.id)
      await clicker.pardon(boss, cheats[2]?.id)
      expect(await clicker.state(ana)).toMatchObject({
        caught: 0,
        saleDue: false,
        rev: now,
        save: game({ total: 9e7 + 100, code: 8e7 + 100, owned }),
      })
      expect(await xp.expediente(ana)).toMatchObject({ title: 'paciente', hacks: 0 })
      expect((await clicker.usage(boss, {})).cheats).toEqual([])

      // En el registro siguen, pero indultadas: ya no cuentan.
      const pardoned = await clicker.cheats(boss)

      expect(pardoned.people).toMatchObject([{ login: 'ana', times: 0 }])
      expect(pardoned.entries.every((entry) => entry.pardonedAt !== null)).toBe(true)
      expect(pardoned.entries.every((entry) => entry.copyId === null)).toBe(true)
    })

    it('guarda el capital por minutos y avisa de los saltos que no son trampa', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })
      const second = (): number => Math.floor(clock.now() / 1000)

      // Dos minutos subiendo poco a poco: nada que avisar.
      clock.advance(2 * MINUTE)

      const calm = Array.from({ length: 120 }, (_, index): [number, number] => [
        second() - 119 + index,
        2e6 + index * 100,
      ])

      await send({ total: 2400 }, { capital: calm })
      expect((await clicker.usage(boss, {})).alerts).toEqual([])

      const history = await clicker.capital(ana)

      // Un punto cada diez segundos, con el último valor de cada tramo.
      expect(history.points.length).toBeGreaterThanOrEqual(12)
      expect(history.points.length).toBeLessThanOrEqual(13)
      expect(history.points.at(-1)?.[1]).toBe(2e6 + 119 * 100)
      expect(history.first).toBe(history.points[0]?.[0])
      expect(history.last).toBe(history.points.at(-1)?.[0])
      // Se puede pedir solo un tramo.
      expect(
        (await clicker.capital(ana, { from: String(second() - 30) })).points.length,
      ).toBeLessThan(5)
      expect(await clicker.capital(actor('leo'))).toEqual({ points: [], first: null, last: null })
      expect((await clicker.capitalFor(boss, { login: 'ana' })).points).toEqual(history.points)
      await expectCode(clicker.capitalFor(ana, { login: 'ana' }), 'forbidden')

      // En cuatro segundos se multiplica por cinco.
      clock.advance(MINUTE)

      const leap = Array.from({ length: 60 }, (_, index): [number, number] => [
        second() - 59 + index,
        index < 30 ? 2e6 : index < 34 ? 2e6 + (index - 29) * 2e6 : 1e7,
      ])

      await send({ total: 3000, golden: 1 }, { capital: leap })

      const [alert, ...rest] = (await clicker.usage(boss, {})).alerts

      expect(rest).toEqual([])
      expect(alert).toMatchObject({ login: 'ana', from: 2e6, to: 1e7, seconds: 4, golden: true })
      expect(alert?.trace.length).toBeGreaterThan(30)

      // Con poco capital, doblarlo en un momento es jugar.
      clock.advance(MINUTE)
      await send(
        { total: 3100, golden: 1 },
        {
          capital: [
            [second() - 5, 100],
            [second(), 5000],
          ],
        },
      )
      expect((await clicker.usage(boss, {})).alerts).toHaveLength(1)

      await expectCode(clicker.dismiss(ana, alert?.id), 'forbidden')
      await clicker.dismiss(boss, alert?.id)
      expect((await clicker.usage(boss, {})).alerts).toEqual([])
    })

    /** Un salto sospechoso de `ana`, como lo dejaría un guardado: el que mira el panel. */
    const leap = async (extra: Record<string, unknown> = { total: 2400 }): Promise<number> => {
      clock.advance(MINUTE)

      const second = Math.floor(clock.now() / 1000)

      await send(extra, {
        capital: Array.from({ length: 60 }, (_, index): [number, number] => [
          second - 59 + index,
          index < 30 ? 2e6 : 1e7,
        ]),
      })

      const [alert] = (await services.clicker.usage(actor('eva', { admin: true }), {})).alerts

      return alert?.id ?? 0
    }

    it('un reparto cobrado no es un salto: solo avisa lo que sube por encima del premio', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })
      const second = (): number => Math.floor(clock.now() / 1000)
      const prize = 5e9
      /** Medio minuto quieto en 2 millones y después, de golpe, `then`. */
      const series = (then: number): [number, number][] =>
        Array.from({ length: 60 }, (_, index): [number, number] => [
          second() - 59 + index,
          index < 30 ? 2e6 : then,
        ])

      for (const [total, extra, alerts] of [
        // El premio y lo normal de esos segundos: nada que avisar.
        [2400, 5e5, 0],
        // El premio y, encima, seis veces lo que había: eso sí.
        [2600, 1e7, 1],
      ] as const) {
        // Lejos del reparto anterior, para que solo cuente el de esta vuelta.
        clock.advance(5 * MINUTE)
        await db.execute({
          sql: "UPDATE clicker SET pending_gift = ? WHERE login = 'ana'",
          args: [prize],
        })
        await send({ total })
        clock.advance(30_000)
        await send({ total: total + 100 }, { capital: series(2e6 + prize + extra) })
        expect((await clicker.usage(boss, {})).alerts).toHaveLength(alerts)
      }

      // Se acuerda de los repartos de la última hora, no de más.
      const stored = await db.execute("SELECT gifts FROM clicker WHERE login = 'ana'")

      expect(JSON.parse(toText(stored.rows[0]?.gifts))).toHaveLength(2)
      clock.advance(2 * HOUR)
      await db.execute("UPDATE clicker SET pending_gift = 1 WHERE login = 'ana'")
      await send({ total: 3000 })
      expect(
        JSON.parse(
          toText(
            (await db.execute("SELECT gifts FROM clicker WHERE login = 'ana'")).rows[0]?.gifts,
          ),
        ),
      ).toEqual([[second(), 1]])
    })

    it('revisión: «no es trampa» lo cierra sin más, y solo lo decide quien administra', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })
      const id = await leap()

      await expectCode(clicker.review(ana, id, { verdict: 'clean' }), 'forbidden')
      await expectCode(clicker.review(boss, id, { verdict: 'quizá' }), 'invalid_input')
      await expectCode(clicker.review(boss, 9999, { verdict: 'clean' }), 'not_found')
      await clicker.review(boss, id, { verdict: 'clean' })
      expect((await clicker.usage(boss, {})).alerts).toEqual([])
      expect(await clicker.state(ana)).toMatchObject({ caught: 0, saleDue: false, seizure: null })
    })

    it('revisión: «probable» le enseña los datos y no sigue sin defenderse', async () => {
      const { clicker, notices } = services
      const boss = actor('eva', { admin: true })

      await services.admin.setRole(boss, { login: 'leo', admin: true })

      const id = await leap()

      await clicker.review(boss, id, { verdict: 'likely' })

      // Le sale con las cifras que no cuadran (no cómo se detecta).
      const [pending, ...more] = await clicker.reviews(ana)

      expect(more).toEqual([])
      expect(pending).toMatchObject({ id, evidence: { from: 2e6, to: 1e7, seconds: 1 } })
      expect(await clicker.reviews(actor('leo'))).toEqual([])

      // Hay que escribir algo de verdad; y solo la persona revisada.
      await expectCode(clicker.defend(ana, id, { answer: 'no' }), 'invalid_input')
      await expectCode(clicker.defend(actor('leo'), id, { answer: 'x'.repeat(30) }), 'not_found')
      await clicker.defend(ana, id, { answer: 'Tenía una dorada abierta y una racha de bugs.' })

      // Llega al panel y a quien administra; ya no se le vuelve a pedir.
      expect(await clicker.reviews(ana)).toEqual([])
      expect((await clicker.usage(boss, {})).alerts[0]).toMatchObject({
        status: 'answered',
        answer: 'Tenía una dorada abierta y una racha de bugs.',
      })
      expect((await notices.list(actor('leo'))).items[0]).toMatchObject({
        kind: 'clicker_defense',
        from: 'ana',
      })
      await expectCode(clicker.defend(ana, id, { answer: 'x'.repeat(30) }), 'not_found')
    })

    it('revisión: «trampa» aplica la política y le dice qué no cuadró', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })

      clock.advance(5 * HOUR)

      const fair = { total: 50_000, code: 100, owned: { cursor: 10 } }

      await send(fair, { perSecond: 1 })

      const id = await leap(fair)

      await clicker.review(boss, id, { verdict: 'cheat' })
      expect((await clicker.cheats(boss)).entries[0]).toMatchObject({
        how: 'review',
        why: 'review',
        seized: cost('cursor', 10) / 2,
      })

      expect(await clicker.state(ana)).toMatchObject({
        caught: 1,
        saleDue: true,
        seizure: {
          by: 'review',
          amount: cost('cursor', 10) / 2,
          n: 1,
          evidence: { from: 2e6, to: 1e7 },
        },
      })
      expect((await clicker.usage(boss, {})).alerts).toEqual([])
      // Visto el aviso, no vuelve a salir; la venta sigue pendiente hasta que la haga.
      await clicker.ackSeizure(ana)
      expect(await clicker.state(ana)).toMatchObject({ seizure: null, saleDue: true })
    })

    it('un reparto de la policía cuenta como escrito, aunque llegue un guardado tarde', async () => {
      // Le toca un reparto grande: mucho más de lo que escribe en un minuto.
      const gift = 5e8

      await db.execute({
        sql: 'UPDATE clicker SET pending_gift = ? WHERE login = ?',
        args: [gift, 'ana'],
      })
      clock.advance(MINUTE)
      // El guardado que lo trae: la web aún no lo ha sumado.
      expect(await send({ total: 2000, code: 1500 })).toEqual({ caught: 0, refused: false })
      // Se cruzan dos guardados: este salió antes de sumarlo...
      clock.advance(MINUTE)
      expect(await send({ total: 2500, code: 2000 })).toEqual({ caught: 0, refused: false })
      // ...y este ya lo lleva: no es una trampa.
      clock.advance(MINUTE)
      expect(await send({ total: 3000 + gift, code: 2500 + gift })).toEqual({
        caught: 0,
        refused: false,
      })

      // Pasado un rato sin repartos, lo mismo de golpe sí lo es.
      clock.advance(30 * MINUTE)
      expect(await send({ total: 4000 + gift, code: 3500 + gift })).toMatchObject({ caught: 0 })
      clock.advance(MINUTE)
      expect(await send({ total: 4500 + 2 * gift, code: 4000 + 2 * gift })).toMatchObject({
        caught: 1,
        refused: true,
      })
    })

    it('pulsar más que una persona: un minuto a más de 50 por segundo', async () => {
      const { clicker, xp } = services
      const second = (): number => Math.floor(clock.now() / 1000)

      // Un minuto a 45 por segundo: se puede.
      clock.advance(MINUTE)

      const calm = Array.from({ length: 61 }, (_, i): [number, number] => [
        second() - 60 + i,
        i * 45,
      ])

      expect(await send({ clicks: 60 * 45 }, { clicks: calm })).toEqual({
        caught: 0,
        refused: false,
      })

      // El siguiente minuto, a 55: no.
      clock.advance(MINUTE)

      const fast = Array.from({ length: 61 }, (_, i): [number, number] => [
        second() - 60 + i,
        60 * 45 + i * 55,
      ])

      expect(await send({ clicks: 60 * 45 + 60 * 55 }, { clicks: fast })).toEqual({
        caught: 1,
        refused: true,
      })
      expect((await clicker.usage(actor('eva', { admin: true }), {})).players[0]).toMatchObject({
        caughtWhy: 'clicks',
      })
      expect((await xp.expediente(ana)).hacks).toBe(1)
    })

    it('pulsar más que una persona: media hora a más de 9 por segundo, con los guardados', async () => {
      // Sin muestras finas (una web que no las manda): bastan los guardados de cada minuto.
      let clicks = 0

      for (let minute = 1; minute <= 30; minute += 1) {
        clock.advance(MINUTE)
        clicks += 60 * 8
        expect(await send({ clicks })).toEqual({ caught: 0, refused: false })
      }

      // Ahora a 10 por segundo. La media de la última media hora pasa de 9 en
      // cuanto más de la mitad es a 10: al minuto 16.
      const results: { caught: number; refused: boolean }[] = []

      for (let minute = 1; minute <= 20; minute += 1) {
        clock.advance(MINUTE)
        clicks += 60 * 10
        results.push(await send({ clicks }))
      }

      const first = results.findIndex((result) => result.refused)

      expect(first + 1).toBe(16)
      expect(results[first]).toEqual({ caught: 1, refused: true })
    })

    it('el historial se aligera con el tiempo, pero no se borra', async () => {
      const { clicker } = services
      const second = (): number => Math.floor(clock.now() / 1000)
      /** Tres horas jugando: un guardado por minuto con sus sesenta segundos. */
      const play = async (): Promise<void> => {
        for (let minute = 0; minute < 180; minute += 1) {
          clock.advance(MINUTE)
          await send(
            { total: 1500 },
            {
              capital: Array.from({ length: 60 }, (_, index): [number, number] => [
                second() - 59 + index,
                2e6 + second() + index,
              ]),
            },
          )
        }
      }
      const count = async (): Promise<number> =>
        (
          await services.admin.wipe(
            actor('eva', { admin: true }),
            { kind: 'clicker_capital' },
            false,
          )
        ).rows

      await play()
      // Hoy: un punto cada diez segundos.
      const fine = await count()

      expect(fine).toBeGreaterThanOrEqual(180 * 6)
      expect(fine).toBeLessThanOrEqual(180 * 6 + 1)
      await clicker.compact()
      expect(await count()).toBe(fine)

      // Al día siguiente, de aquello queda un punto por hora.
      clock.advance(25 * HOUR)
      await clicker.compact()

      const hourly = await count()

      expect(hourly).toBeGreaterThanOrEqual(3)
      expect(hourly).toBeLessThanOrEqual(4)
      // Repetirlo no quita nada más.
      await clicker.compact()
      expect(await count()).toBe(hourly)

      // Otra tarde de juego, y dos semanas después: un punto por día, para siempre.
      await play()
      clock.advance(14 * 24 * HOUR)
      await clicker.compact()
      expect(await count()).toBe(2)
      clock.advance(5 * 365 * 24 * HOUR)
      await clicker.compact()
      expect(await count()).toBe(2)
      expect((await clicker.capital(ana)).points).toHaveLength(2)
    })

    it('quien administra puede ver la partida de cualquiera; nadie más', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })

      expect(await clicker.gameOf(boss, { login: 'ana' })).toMatchObject({
        login: 'ana',
        caught: 0,
        save: game(),
      })
      await expectCode(clicker.gameOf(ana, { login: 'ana' }), 'forbidden')
      await expectCode(clicker.gameOf(boss, { login: 'nadie' }), 'not_found')
      await expectCode(clicker.gameOf(boss, { login: '../x' }), 'invalid_input')
    })

    it('una sanción a mano deja el código, quita edificios y mejoras, y avisa en el juego', async () => {
      const { clicker } = services
      const boss = actor('eva', { admin: true })
      const note = 'Eres el top trampas: la próxima, disimula un poco.'

      await send({
        code: 1000,
        total: 1500,
        owned: { cursor: 3 },
        made: { cursor: 10 },
        bought: ['a'],
        achieved: ['x'],
        prestige: 2,
        buffs: [{ id: 'frenzy', until: 1 }],
      })
      expect(await clicker.state(ana)).toMatchObject({ caught: 0, rev })

      await expectCode(
        clicker.sanction(ana, { login: 'ana', code: 1e9, wipe: true, note }),
        'forbidden',
      )
      await expectCode(
        clicker.sanction(boss, { login: 'nadie', code: 1e9, wipe: true, note }),
        'not_found',
      )
      await expectCode(
        clicker.sanction(boss, { login: 'ana', code: -1, wipe: true, note }),
        'invalid_input',
      )

      await clicker.sanction(boss, { login: 'ana', code: 1e9, wipe: true, note })

      const after = await clicker.state(ana)
      const saved = JSON.parse(after.save ?? '{}') as Record<string, unknown>

      expect(saved).toMatchObject({
        code: 1e9,
        total: 1e9,
        owned: {},
        made: {},
        bought: [],
        buffs: [],
        achieved: ['x'],
        prestige: 2,
      })
      expect(after.rev).toBe(rev + 1)
      expect(after.caught).toBe(0)
      expect(after.saleDue).toBe(false)
      expect(after.seizure).toMatchObject({ by: 'admin', note, amount: 0 })
      expect((await clicker.cheats(boss)).entries[0]).toMatchObject({
        login: 'ana',
        how: 'sanction',
        why: 'manual',
        note,
      })
      // Sin dueño: la pestaña que la tenía abierta ya no guarda encima.
      const holder = await db.execute("SELECT holder FROM clicker WHERE login = 'ana'")

      expect(holder.rows[0]?.holder).toBeNull()
    })
  })

  it('el nivel sube tres por cada cero del total', () => {
    expect(clickerLevel(0)).toBe(0)
    expect(clickerLevel(99)).toBe(6)
    expect(clickerLevel(1000)).toBe(9)
    expect(clickerLevel(1e6)).toBe(18)
    expect(clickerLevel(1e30)).toBe(90)
    expect(clickerLevel(-5)).toBe(0)
  })
})
