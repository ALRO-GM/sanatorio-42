/**
 * Tests de Code Clicker, la sección secreta: la cuenta de la cruz, las
 * pastillas y la clasificación.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { BASE_PRICE, GROWTH, SALE_REFUND } from '../../src/modules/clicker/cheat.rules.js'
import { clickerLevel } from '../../src/modules/clicker/index.js'
import { actor, expectCode, HOUR, MINUTE, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('code clicker', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']

  beforeEach(() => {
    ;({ services, clock, db } = community)
  })

  /** Pulsa la cruz `times` veces, en envíos de veinte. */
  const press = async (login: string, times: number): Promise<void> => {
    for (let left = times; left > 0; left -= 20) {
      await services.clicker.plus(actor(login), { count: Math.min(20, left) })
    }
  }

  /** Una partida como las que guarda la web, con lo justo para que cuadre. */
  const game = (extra: Record<string, unknown> = {}): string =>
    JSON.stringify({ v: 1, code: 0, total: 1500, ...extra })

  const SAVE = {
    save: game(),
    rev: 0,
    session: 'pestaña-1',
    total: 1500,
    perSecond: 12,
    achievements: 6,
    prestige: 0,
    spent: 0,
  }

  it('cuenta las pulsaciones de la cruz, y no deja elegir antes de las cien', async () => {
    const { clicker } = services

    expect(await clicker.state(actor('ana'))).toEqual({
      plus: 0,
      pill: null,
      save: null,
      rev: 0,
      caught: 0,
      saleDue: false,
      seizure: null,
      pool: 0,
      names: [],
    })

    await press('ana', 60)
    expect(await clicker.plus(actor('ana'), { count: 5 })).toEqual({ plus: 65, pill: null })
    await expectCode(clicker.choose(actor('ana'), { pill: 'red' }), 'conflict')
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
      save: game({ total: 2e6 }),
      total: 2e6,
      perSecond: 900,
      prestige: 1,
    })

    expect(await clicker.state(actor('ana'))).toMatchObject({ pill: 'red', save: game() })

    const board = await clicker.board(actor('ana'))

    expect(board.entries).toMatchObject([
      { rank: 1, login: 'eva', total: 2e6, level: 18, prestige: 1 },
      { rank: 2, login: 'ana', total: 1500, level: 9, achievements: 6 },
    ])
    expect(board.me).toMatchObject({ rank: 2, login: 'ana' })

    // El total de la clasificación no baja aunque se empiece una partida nueva.
    await clicker.save(actor('eva'), {
      ...SAVE,
      rev: 1,
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

  it('quien administra ve el uso del juego, general y de cada persona', async () => {
    const { clicker, usage } = services
    const boss = actor('eva', { admin: true })

    await press('ana', 100)
    await press('leo', 100)
    await press('rut', 40)
    await clicker.choose(actor('ana'), { pill: 'red' })
    await clicker.choose(actor('leo'), { pill: 'blue' })
    await clicker.save(actor('ana'), { ...SAVE, save: game({ clicks: 321 }) })
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
      saves: 1,
      seen: 300,
      hidden: 900,
    })
    expect(seen.players[2]).toMatchObject({ plus: 40, pill: null, total: 0, clicks: 0, seen: 0 })

    // Una partida que no se entiende no rompe la cuenta.
    await db.execute("UPDATE clicker SET save = 'no es json' WHERE login = 'ana'")
    expect((await clicker.usage(boss, { days: '30' })).players[0]).toMatchObject({ clicks: 0 })

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

      // Compra cien cursores con lo escrito en una tarde y la producción sube.
      clock.advance(5 * HOUR)
      const spent = cost('cursor', 100)

      expect(
        await send(
          { total: spent + 5000, code: 5000, owned: { cursor: 100 }, clicks: 900 },
          { perSecond: 4000 },
        ),
      ).toEqual({ caught: 0, refused: false })

      // Una dorada con la racha de pulsaciones: en un minuto cae lo de horas.
      clock.advance(MINUTE)
      expect(
        await send(
          {
            total: spent + 5000 + 4000 * 3600 * 4,
            code: 4000 * 3600 * 4,
            owned: { cursor: 100 },
            clicks: 1100,
            golden: 1,
          },
          { perSecond: 4000 },
        ),
      ).toEqual({ caught: 0, refused: false })

      // El portátil dormido toda la noche: al despertar cuenta las ocho horas.
      clock.advance(8 * HOUR)
      expect(
        await send(
          {
            total: spent + 5000 + 4000 * 3600 * 12,
            code: 4000 * 3600 * 12,
            owned: { cursor: 100 },
            clicks: 1100,
            golden: 1,
          },
          { perSecond: 4000 },
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
      await clicker.pardon(boss, cheats[1]?.id)
      await clicker.pardon(boss, cheats[2]?.id)
      expect(await clicker.state(ana)).toMatchObject({ caught: 0, saleDue: false })
      expect(await xp.expediente(ana)).toMatchObject({ title: 'paciente', hacks: 0 })
      expect((await clicker.usage(boss, {})).cheats).toEqual([])
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
    const leap = async (extra: Record<string, unknown> = { total: 3000 }): Promise<number> => {
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

    it('el botín de la bolsa: diez commits de la suerte, sin pasar de lo que hay y cada cinco minutos', async () => {
      const { clicker } = services

      // Con 1 000 líneas sin gastar y 12 por segundo, un commit de la suerte da
      // 1 000 × 0,15 + 13 (lo menor de las dos cuentas, más trece).
      clock.advance(MINUTE)
      await send({ code: 1000 })

      // Nada en la bolsa: nada que coger.
      await expectCode(clicker.claimPool(ana), 'conflict')
      await db.execute('UPDATE clicker_pool SET amount = 1e6 WHERE id = 1')

      const first = await clicker.claimPool(ana)

      expect(first).toEqual({
        amount: 10 * (1000 * 0.15 + 13),
        pool: 1e6 - 10 * (1000 * 0.15 + 13),
      })
      await expectCode(clicker.claimPool(ana), 'conflict')

      // Lo cobrado vale como escrito: el siguiente guardado no es trampa.
      clock.advance(MINUTE)
      expect(await send({ total: 1500 + first.amount, code: 1000 + first.amount })).toEqual({
        caught: 0,
        refused: false,
      })

      // A los cinco minutos, otra vez; y si queda poco, se lleva lo que queda.
      clock.advance(5 * MINUTE)
      await db.execute('UPDATE clicker_pool SET amount = 50 WHERE id = 1')
      expect(await clicker.claimPool(ana)).toEqual({ amount: 50, pool: 0 })

      // Quien no juega no coge nada.
      await expectCode(clicker.claimPool(actor('leo')), 'forbidden')
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

    it('los precios son los del juego', async () => {
      // La web es la que tiene las reglas: si cambian allí, que se note aquí.
      const path = '../../../web/src/features/clicker/data.ts'
      const data = (await import(/* @vite-ignore */ path)) as {
        BUILDINGS: { id: string; base: number }[]
        GROWTH: number
        FORCED_REFUND: number
      }

      expect(Object.fromEntries(data.BUILDINGS.map(({ id, base }) => [id, base]))).toEqual(
        BASE_PRICE,
      )
      expect(data.GROWTH).toBe(GROWTH)
      // Y lo que se devuelve al vender por trampa, también.
      expect(data.FORCED_REFUND).toBe(SALE_REFUND)
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
