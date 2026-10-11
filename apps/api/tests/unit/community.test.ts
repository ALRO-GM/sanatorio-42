/**
 * Tests de las funciones de comunidad: XP, reacciones, terapias de grupo,
 * tablón de dudas y pizarras.
 *
 * Se montan los servicios de verdad sobre SQLite en memoria, con la réplica
 * sembrada a mano y un reloj manual. No hay API de 42 de por medio: nada de
 * esto la llama, y eso también es parte de lo que se comprueba.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { DomainError } from '../../src/core/errors.js'
import { localMoment } from '../../src/core/time.js'
import { levelFor, titleUnlocked } from '../../src/modules/profile/xp.rules.js'
import { compose } from '../../src/app/composition.js'
import type { Services } from '../../src/app/composition.js'
import type { Actor } from '../../src/core/actor.js'
import { createFakeClock } from '../helpers/fake-api.js'
import { createFake42 } from '../helpers/fake-42.js'
import { activeLocation, projectUser, userId } from '../helpers/fixtures.js'
import { shortName } from '../../src/modules/doubts/doubts.service.js'
import { parseHours } from '../../src/modules/replica/index.js'

const MADRID = 22

/** Peticiones de la agenda de 42: eventos y exámenes del campus, y lo de cada persona. */
const AGENDA_CALL = /^\/(users\/\d+\/(events_users|exams|scale_teams)|campus\/\d+\/(events|exams))/
const MINUTE = 60_000
const HOUR = 60 * MINUTE

/** Martes 6 de octubre de 2026, 16:30 en Madrid (14:30 UTC). */
const TUESDAY_AFTERNOON = Date.parse('2026-10-06T14:30:00.000Z')

const actor = (login: string, extra: Partial<Actor> = {}): Actor => ({
  login,
  campusId: MADRID,
  admin: false,
  ...extra,
})

/** Comprueba que una promesa falla con ese código de dominio. */
async function expectCode(promise: Promise<unknown>, code: DomainError['code']): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (cause: unknown) => cause,
  )

  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

describe('comunidad', () => {
  let db: Db
  let services: Services
  let clock: ReturnType<typeof createFakeClock>
  let api: ReturnType<typeof createFake42>

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    clock = createFakeClock(TUESDAY_AFTERNOON)
    api = createFake42()
    services = compose(db, api.client, {
      now: clock.now,
      sync: {
        trackedCampusIds: [MADRID],
        defaultCampusId: MADRID,
        hourlyReserve: 300,
        backfillIntervalMs: 0,
        locationsTtlMs: 2 * MINUTE,
        locationsIdleMs: 15 * MINUTE,
        deltaTtlMs: 5 * MINUTE,
        deltaIdleMs: 30 * MINUTE,
        requestPageBudget: 2,
      },
    }).services

    // Madrid: `ana` y `leo` hacen ft_printf (10); `eva` ya lo aprobó.
    const { replica } = services.repositories
    await replica.upsertCampuses([
      { id: MADRID, name: 'Madrid', time_zone: 'Europe/Madrid' },
      { id: 58, name: 'Barcelona', time_zone: 'Europe/Madrid' },
    ])
    await replica.ingestProjectUsers(
      [projectUser('ana'), projectUser('leo'), projectUser('eva', { status: 'finished' })],
      MADRID,
    )
  })

  afterEach(() => {
    closeDatabase(db)
    // La comunidad no le pregunta nada a 42, con una excepción: la guardia mira
    // la agenda de quien ayuda (sus correcciones), que se guarda un cuarto de hora.
    expect(api.calls.filter((call) => !AGENDA_CALL.test(call))).toHaveLength(0)
  })

  describe('niveles y títulos', () => {
    it('el nivel sale de la XP acumulada', () => {
      expect(levelFor(0)).toEqual({ level: 1, floor: 0, next: 50 })
      expect(levelFor(49).level).toBe(1)
      expect(levelFor(50).level).toBe(2)
      // El ejemplo de la presentación: 340 XP es nivel 4, de 250 a 500.
      expect(levelFor(340)).toEqual({ level: 4, floor: 250, next: 500 })
      expect(levelFor(99_999).next).toBeNull()
    })

    it('un título solo vale a partir de su nivel', () => {
      expect(titleUnlocked('paciente', 1)).toBe(true)
      expect(titleUnlocked('jefe', 6)).toBe(false)
      expect(titleUnlocked('jefe', 7)).toBe(true)
      expect(titleUnlocked('inventado', 10)).toBe(false)
    })

    it('la hora de una terapia es la del campus, no la del servidor', () => {
      // 14:30 UTC de un martes es 16:30 en Madrid…
      expect(localMoment(TUESDAY_AFTERNOON, 'Europe/Madrid')).toEqual({
        day: '2026-10-06',
        weekday: 2,
        minutes: 16 * 60 + 30,
      })
      // …y ya es de noche en Tokio.
      expect(localMoment(TUESDAY_AFTERNOON, 'Asia/Tokyo').minutes).toBe(23 * 60 + 30)
      // Una zona desconocida no rompe nada: se usa UTC.
      expect(localMoment(TUESDAY_AFTERNOON, 'Marte/Olympus').minutes).toBe(14 * 60 + 30)
    })
  })

  /** Sienta a esa gente y deja la foto de puestos recién hecha, para que no se pida a 42. */
  const seat = async (seats: Record<string, string>): Promise<void> => {
    const { replica } = services.repositories

    await replica.replacePresence(
      MADRID,
      Object.entries(seats).map(([login, host]) => activeLocation(login, host)),
    )
    await replica.setState(`locations:${MADRID}`, { at: clock.now(), count: 1 })
  }

  /**
   * Una sesión de ayuda entera: `eva` se ofrece, `requester` reserva media hora
   * a las 17:00, se hace con las dos personas en el campus y se valoran.
   */
  const helpSession = async (requester: string, helper = 'eva'): Promise<number | null> => {
    const { help } = services

    await help.setToday(actor(helper), {
      windows: [{ start: '17:00', end: '19:00' }],
      maxMinutes: 120,
    })
    const booking = await help.book(actor(requester), {
      helper,
      projectId: 10,
      start: '17:00',
      minutes: 30,
    })
    await help.respond(actor(helper), booking.id, true)

    clock.advance(40 * MINUTE) // 17:10
    await seat({ [helper]: 'c1r1s1', [requester]: 'c1r1s2' })
    await help.verify()

    clock.advance(25 * MINUTE) // 17:35
    await help.rate(actor(requester), booking.id, { tag: 'concept' })

    return (await help.rate(actor(helper), booking.id, { tag: 'prepared' })).xp
  }

  describe('ayuda reservada', () => {
    const tarde = { windows: [{ start: '17:00', end: '19:00' }], maxMinutes: 60 }

    it('una sesión aceptada, comprobada y valorada por las dos partes da XP a quien ayudó', async () => {
      const { help, xp } = services

      // `eva` aprobó ft_printf: ayuda de especialista.
      expect(await helpSession('ana')).toBe(40)

      const eva = await xp.expediente(actor('eva'))
      expect(eva.xp.total).toBe(40)
      expect(eva.reactions).toEqual({ bug: 0, code: 0, concept: 1, patient: 0 })
      expect((await help.reputation(actor('ana'))).asked.prepared).toBe(1)
      expect((await help.today(actor('ana'))).mustRate).toBe(false)
    })

    it('ayudar en un proyecto que no has aprobado vale menos', async () => {
      // `leo` lo tiene en curso, como `ana`.
      expect(await helpSession('ana', 'leo')).toBe(15)
    })

    it('sin las dos valoraciones no hay XP, y sin verse en el campus tampoco', async () => {
      const { help, xp } = services

      await help.setToday(actor('eva'), tarde)
      const booking = await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })
      await help.respond(actor('eva'), booking.id, true)

      // Antes de que termine la franja no se puede valorar.
      await expectCode(help.rate(actor('ana'), booking.id, { tag: 'bug' }), 'conflict')

      // Nadie se sienta: la comprobación no encuentra a las dos personas.
      clock.advance(40 * MINUTE)
      await seat({ eva: 'c1r1s1' })
      expect(await help.verify()).toBe(0)

      clock.advance(25 * MINUTE)
      expect(await help.rate(actor('ana'), booking.id, { tag: 'bug' })).toEqual({ xp: null })
      // Cada parte usa sus propias opciones, y solo una vez.
      await expectCode(help.rate(actor('eva'), booking.id, { tag: 'bug' }), 'invalid_input')
      await expectCode(help.rate(actor('ana'), booking.id, { tag: 'code' }), 'conflict')
      expect(await help.rate(actor('eva'), booking.id, { tag: 'curious' })).toEqual({ xp: 0 })

      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)
    })

    it('no deja abrir medias horas que ya han empezado', async () => {
      const { help } = services

      // Son las 16:30: la de las 16:00 ya pasó y la de las 16:30 acaba de empezar.
      const day = await help.setToday(actor('eva'), {
        windows: [{ start: '16:00', end: '18:00' }],
        maxMinutes: 120,
      })

      expect(day.windows).toEqual([{ start: '17:00', end: '18:00' }])

      // A las 17:40 se puede ampliar por detrás sin perder la franja en curso.
      clock.advance(70 * MINUTE)
      expect(
        (
          await help.setToday(actor('eva'), {
            windows: [{ start: '16:00', end: '19:00' }],
            maxMinutes: 120,
          })
        ).windows,
      ).toEqual([{ start: '17:00', end: '19:00' }])
    })

    it('la reserva la tiene que aceptar quien ayuda', async () => {
      const { help } = services

      await help.setToday(actor('eva'), tarde)
      const booking = await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })

      expect(booking).toMatchObject({
        status: 'pending',
        role: 'requester',
        start: '17:00',
        end: '17:30',
      })
      await expectCode(help.respond(actor('ana'), booking.id, true), 'forbidden')
      await expectCode(help.respond(actor('leo'), booking.id, true), 'not_found')

      // Sin aceptar no hay sesión que valorar, ni comprobar.
      clock.advance(70 * MINUTE)
      await seat({ eva: 'c1r1s1', ana: 'c1r1s2' })
      expect(await help.verify()).toBe(0)
      await expectCode(help.rate(actor('ana'), booking.id, { tag: 'bug' }), 'conflict')

      await help.respond(actor('eva'), booking.id, false)
      await expectCode(help.respond(actor('eva'), booking.id, true), 'conflict')
    })

    it('no deja reservar más tiempo del tope del día, aunque la franja sea más larga', async () => {
      const { help, repositories } = services
      await repositories.replica.ingestProjectUsers([projectUser('sol')], MADRID)

      // Dos horas de franja, pero como mucho una de ayuda.
      await help.setToday(actor('eva'), tarde)
      await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })

      await expectCode(
        help.book(actor('leo'), { helper: 'eva', start: '18:00', minutes: 60 }),
        'conflict',
      )
      await help.book(actor('leo'), { helper: 'eva', start: '18:00', minutes: 30 })

      // Tope alcanzado: ya no se ofrece a nadie más, aunque quede franja.
      expect(await help.offers(actor('sol'))).toEqual([])
      await expectCode(
        help.book(actor('sol'), { helper: 'eva', start: '18:30', minutes: 30 }),
        'conflict',
      )
      expect((await help.today(actor('eva'))).bookedMinutes).toBe(60)
      // Ni bajar el tope por debajo de lo ya reservado.
      await expectCode(help.setToday(actor('eva'), { ...tarde, maxMinutes: 30 }), 'conflict')
    })

    it('enseña los huecos libres de quien se ofrece', async () => {
      const { help } = services

      await help.setToday(actor('eva'), { ...tarde, maxMinutes: 120 })
      await help.book(actor('ana'), { helper: 'eva', start: '17:30', minutes: 30 })

      // Son las 16:30: toda la franja está por delante, menos lo que cogió `ana`.
      expect(await help.offers(actor('leo'))).toEqual([
        { login: 'eva', freeStarts: ['17:00', '18:00', '18:30'], remainingMinutes: 90 },
      ])
      // Quien se ofrece no se ve en la lista.
      expect(await help.offers(actor('eva'))).toEqual([])
    })

    it('valida franjas y reservas', async () => {
      const { help } = services

      await expectCode(
        help.setToday(actor('eva'), {
          windows: [{ start: '17:10', end: '18:00' }],
          maxMinutes: 60,
        }),
        'invalid_input',
      )
      await expectCode(
        help.setToday(actor('eva'), {
          windows: [{ start: '17:00', end: '17:00' }],
          maxMinutes: 60,
        }),
        'invalid_input',
      )
      await help.setToday(actor('eva'), tarde)

      await expectCode(
        help.book(actor('eva'), { helper: 'eva', start: '17:00', minutes: 30 }),
        'invalid_input',
      )
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 45 }),
        'invalid_input',
      )
      // Fuera de su franja, o a quien no se ofrece.
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '18:30', minutes: 60 }),
        'not_found',
      )
      await expectCode(
        help.book(actor('ana'), { helper: 'leo', start: '17:00', minutes: 30 }),
        'not_found',
      )

      await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })
      // Una reserva por pareja y día, y nadie pisa una franja cogida.
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '18:00', minutes: 30 }),
        'conflict',
      )
      await expectCode(
        help.book(actor('leo'), { helper: 'eva', start: '17:00', minutes: 30 }),
        'conflict',
      )
    })

    it('una corrección de 42 manda sobre la guardia: ese rato no se puede reservar', async () => {
      const { help } = services

      // `eva` tiene una corrección hoy de 17:30 a 18:00 (15:30 UTC). La agenda se
      // da por recién leída, así que no hace falta preguntar a 42.
      await db.execute({
        sql: `INSERT INTO agenda_users (login, events, exams, evaluations, fetched_at)
              VALUES ('eva', '[]', '[]', ?, ?)`,
        args: [
          JSON.stringify([
            {
              id: 1,
              beginAt: '2026-10-06T15:30:00.000Z',
              endAt: '2026-10-06T16:00:00.000Z',
              projectId: 10,
              role: 'corrector',
            },
          ]),
          new Date(clock.now()).toISOString(),
        ],
      })
      await help.setToday(actor('eva'), { ...tarde, maxMinutes: 120 })

      // Ella lo ve en su guardia, y a los demás ese hueco no les sale.
      expect((await help.today(actor('eva'))).busy).toEqual([{ start: '17:30', end: '18:00' }])
      expect((await help.offers(actor('ana')))[0]?.freeStarts).toEqual(['17:00', '18:00', '18:30'])

      // Ni se puede reservar encima, entero o a medias.
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '17:30', minutes: 30 }),
        'conflict',
      )
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 60 }),
        'conflict',
      )
      await expect(
        help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 }),
      ).resolves.toMatchObject({ status: 'pending' })
    })

    it('quien tiene una sesión sin valorar no puede reservar ni ofrecerse', async () => {
      const { help } = services

      await help.setToday(actor('eva'), { ...tarde, maxMinutes: 120 })
      await help.setToday(actor('leo'), tarde)
      const booking = await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })
      await help.respond(actor('eva'), booking.id, true)

      clock.advance(65 * MINUTE) // 17:35: ha terminado y nadie ha valorado
      expect((await help.today(actor('ana'))).mustRate).toBe(true)
      await expectCode(
        help.book(actor('ana'), { helper: 'leo', start: '18:00', minutes: 30 }),
        'conflict',
      )
      await expectCode(help.setToday(actor('eva'), tarde), 'conflict')

      // "Al final no quedamos" también la cierra.
      await help.cancel(actor('ana'), booking.id)
      expect((await help.today(actor('ana'))).mustRate).toBe(false)
      await expect(
        help.book(actor('ana'), { helper: 'leo', start: '18:00', minutes: 30 }),
      ).resolves.toMatchObject({ status: 'pending' })
    })

    it('a quien bloqueas no le apareces, y no se le dice por qué', async () => {
      const { help } = services

      await help.setToday(actor('eva'), tarde)
      const pending = await help.book(actor('leo'), { helper: 'eva', start: '17:00', minutes: 30 })

      await help.block(actor('eva'), { login: 'leo' })

      // Lo que tenía pedido se rechaza, y deja de verla.
      expect((await help.today(actor('leo'))).bookings).toMatchObject([
        { id: pending.id, status: 'declined' },
      ])
      expect(await help.offers(actor('leo'))).toEqual([])
      expect(await help.offers(actor('ana'))).toHaveLength(1)
      // La misma respuesta que si no se ofreciera.
      await expectCode(
        help.book(actor('leo'), { helper: 'eva', start: '17:30', minutes: 30 }),
        'not_found',
      )
      expect((await help.today(actor('eva'))).blocked).toEqual(['leo'])

      await expectCode(help.block(actor('eva'), { login: 'eva' }), 'invalid_input')
      await expectCode(help.block(actor('eva'), { login: 'fantasma' }), 'not_found')

      await help.unblock(actor('eva'), 'leo')
      expect(await help.offers(actor('leo'))).toHaveLength(1)
    })
  })

  describe('ranking', () => {
    it('ordena por XP de ayudar, sin contar la de asistir a terapias', async () => {
      const { xp } = services

      await helpSession('ana') // eva: 40
      await xp.award('leo', 'doubt_solved', 'doubt:1') // leo: 25
      await xp.award('ana', 'therapy_session', 'therapy:1:2026-10-06:1') // no cuenta

      const board = await xp.leaderboard(actor('leo'), 'month')

      expect(board.entries).toEqual([
        { rank: 1, login: 'eva', image: expect.any(String), xp: 40 },
        { rank: 2, login: 'leo', image: expect.any(String), xp: 25 },
      ])
      expect(board.me).toMatchObject({ rank: 2, login: 'leo' })
      // `ana` solo ha ido a terapia: no sale.
      expect((await xp.leaderboard(actor('ana'), 'all')).me).toBeNull()
    })

    it('el uso de la comunidad suma a todos, sin que una persona lo decida sola', async () => {
      const { usage } = services

      await usage.record(actor('ana'), { counts: { 'nav.tablon': 3, 'expediente.health': 1 } })
      await usage.record(actor('ana'), { counts: { 'nav.tablon': 2 } })
      // `leo` pulsa sin parar: de él cuentan como mucho 50.
      await usage.record(actor('leo'), { counts: { 'nav.red': 200 } })
      await usage.record(actor('leo'), { counts: { 'nav.tablon': 1 } })

      expect(await usage.community()).toEqual({
        counts: { 'nav.tablon': 6, 'expediente.health': 1, 'nav.red': 50 },
      })
      await expectCode(usage.record(actor('ana'), { counts: { 'DROP TABLE': 1 } }), 'invalid_input')
      await expectCode(usage.record(actor('ana'), { counts: { 'nav.red': 9999 } }), 'invalid_input')
    })

    it('administración: permisos, bloqueos y buzón con respuesta', async () => {
      const { admin } = services
      const boss = actor('eva', { admin: true })

      // Nada de esto es para quien no administra.
      await expectCode(admin.people(actor('ana')), 'forbidden')
      await expectCode(admin.tickets(actor('ana')), 'forbidden')
      await expectCode(admin.setRole(actor('ana'), { login: 'ana', admin: true }), 'forbidden')

      // Dar permiso y bloquear se nota al momento en lo que ve la sesión.
      await admin.setRole(boss, { login: 'Leo', admin: true })
      await admin.block(boss, { login: 'ana', reason: 'Spam en los chats', days: 7 })
      expect(await admin.accessOf('leo')).toEqual({ admin: true, block: null })
      expect(await admin.accessOf('ana')).toMatchObject({
        admin: false,
        block: { reason: 'Spam en los chats' },
      })
      expect(await admin.people(boss)).toMatchObject({
        admins: [{ login: 'leo', fixed: false, grantedBy: 'eva' }],
        blocks: [{ login: 'ana', blockedBy: 'eva' }],
      })
      // No se puede bloquear uno a sí mismo.
      await expectCode(admin.block(boss, { login: 'eva', reason: 'porque sí' }), 'conflict')

      // El bloqueo caduca solo.
      clock.advance(8 * 24 * 60 * MINUTE)
      expect((await admin.accessOf('ana')).block).toBeNull()
      await admin.unblock(boss, 'ana')

      // Buzón: una sugerencia y una denuncia; la denuncia tiene que decir de qué.
      const idea = await admin.openTicket(actor('ana'), {
        kind: 'idea',
        subject: 'Modo compacto',
        body: 'Estaría bien poder ver más cosas a la vez.',
      })

      await expectCode(
        admin.openTicket(actor('ana'), {
          kind: 'report',
          subject: 'Insultos',
          body: 'En el chat.',
        }),
        'invalid_input',
      )
      await admin.openTicket(actor('ana'), {
        kind: 'report',
        subject: 'Insultos',
        body: 'Mensaje fuera de lugar en el chat.',
        target: 'message:12',
      })
      expect(await admin.tickets(boss)).toHaveLength(2)

      const answered = await admin.answerTicket(boss, idea.id, {
        answer: 'Apuntado para la próxima.',
      })

      expect(answered).toMatchObject({ status: 'answered', answeredBy: 'eva' })
      // Quien lo mandó ve la respuesta; lo pendiente va primero en el buzón.
      expect(
        (await admin.myTickets(actor('ana'))).find((ticket) => ticket.id === idea.id),
      ).toMatchObject({
        answer: 'Apuntado para la próxima.',
      })
      expect((await admin.tickets(boss))[0]).toMatchObject({ kind: 'report', status: 'open' })
      await expectCode(admin.answerTicket(boss, 9999, { answer: 'x' }), 'not_found')
    })

    it('el consumo se cuenta por persona y el tope se reparte entre quienes están', async () => {
      const { admin } = services
      const boss = actor('eva', { admin: true })

      // Con el presupuesto de fábrica y poca gente, el tope es el máximo (3000).
      for (let request = 0; request < 3000; request += 1) {
        expect(await admin.allow('ana', false)).toBe(true)
      }
      expect(await admin.allow('ana', false)).toBe(false)
      // Quien administra no se queda fuera, y un tope a mano manda sobre el automático.
      expect(await admin.allow('eva', true)).toBe(true)
      await admin.setLimit(boss, { login: 'leo', perHour: 10 })
      for (let request = 0; request < 10; request += 1) await admin.allow('leo', false)
      expect(await admin.allow('leo', false)).toBe(false)

      admin.count('ana', 1500)
      admin.count('ana', 500)
      admin.count('leo', 100)

      const report = await admin.consumption(boss)

      expect(report.limit).toMatchObject({ budget: 30_000, activePeople: 3, perPerson: 3000 })
      expect(report.top[0]).toMatchObject({ login: 'ana', requests: 2, bytes: 2000, limited: 1 })
      expect(report.top.find((entry) => entry.login === 'leo')).toMatchObject({
        limited: 1,
        manualLimit: 10,
      })
      expect(report.recent).toMatchObject([{ requests: 3, bytes: 2100, people: 2 }])
      expect(report.pattern).toMatchObject([{ weekday: 2, hour: 14, requests: 3 }])
      // Tres peticiones no llegan ni de lejos al 80 % del presupuesto.
      expect(report.warnings).toEqual([])

      // A la hora siguiente el contador empieza de cero.
      clock.advance(61 * MINUTE)
      expect(await admin.allow('ana', false)).toBe(true)
      await expectCode(admin.consumption(actor('ana')), 'forbidden')
    })

    it('el mapa de calor del uso es solo para admins y agrupa a la gente', async () => {
      const { usage } = services

      await usage.record(actor('ana'), { counts: { 'nav.tablon': 3 } })
      await usage.record(actor('leo'), { counts: { 'nav.tablon': 40, 'nav.red': 5 } })

      await expectCode(usage.heatmap(actor('ana'), {}), 'forbidden')

      const admin = actor('eva', { admin: true })

      expect(await usage.heatmap(admin, {})).toEqual({
        by: 'total',
        groups: [{ id: 'all', people: 2 }],
        rows: [
          { key: 'nav.red', counts: [5] },
          { key: 'nav.tablon', counts: [43] },
        ],
      })
      // Por actividad: `ana` es ocasional y `leo` habitual.
      expect(await usage.heatmap(admin, { by: 'activity' })).toMatchObject({
        groups: [
          { id: 'casual', people: 1 },
          { id: 'regular', people: 1 },
        ],
        rows: [
          { key: 'nav.red', counts: [0, 5] },
          { key: 'nav.tablon', counts: [3, 40] },
        ],
      })
      // De nadie se sabe aquí el plan ni el año: todos al mismo grupo.
      expect((await usage.heatmap(admin, { by: 'cohort' })).groups).toEqual([
        { id: 'unknown', people: 2 },
      ])
      await expectCode(usage.heatmap(admin, { by: 'altura' }), 'invalid_input')
    })

    it('el expediente de otra persona solo enseña su parte pública', async () => {
      const { xp } = services

      await xp.award('eva', 'specialist_help', 'help:1')

      const record = await xp.publicProfile('EVA')

      expect(record).toMatchObject({
        login: 'eva',
        image: expect.any(String),
        xp: { total: 40, level: 1 },
        title: 'paciente',
      })
      expect(record.achievements.find((entry) => entry.id === 'selfless_help')).toMatchObject({
        progress: 1,
      })
      // Nada de preferencias ni del desglose de XP.
      expect(Object.keys(record).sort()).toEqual([
        'achievements',
        'image',
        'login',
        'reactions',
        'title',
        'xp',
      ])
      await expectCode(xp.publicProfile('nadie'), 'not_found')
      await expectCode(xp.publicProfile('../etc'), 'not_found')
    })

    it('quien empata comparte puesto, y cada campus tiene el suyo', async () => {
      const { xp } = services

      await xp.award('ana', 'doubt_solved', 'doubt:1')
      await xp.award('leo', 'doubt_solved', 'doubt:2')

      expect(
        (await xp.leaderboard(actor('ana'), 'all')).entries.map((entry) => entry.rank),
      ).toEqual([1, 1])
      expect((await xp.leaderboard(actor('ana', { campusId: 58 }), 'all')).entries).toEqual([])
    })

    it('el expediente desglosa la XP: cuánta y cuántas veces por cada cosa', async () => {
      const { xp } = services

      await xp.award('ana', 'doubt_solved', 'doubt:1')
      await xp.award('ana', 'doubt_solved', 'doubt:2')
      await xp.award('ana', 'guide_review', 'change:1')

      const { earned, xp: level } = await xp.expediente(actor('ana'))

      expect(earned.doubt_solved).toEqual({ xp: 50, times: 2 })
      expect(earned.guide_review).toEqual({ xp: 5, times: 1 })
      expect(earned.board_host).toEqual({ xp: 0, times: 0 })
      expect(Object.values(earned).reduce((sum, kind) => sum + kind.xp, 0)).toBe(level.total)
    })
  })

  describe('expediente', () => {
    it('ponerse de guardia por primera vez desbloquea un logro, una sola vez', async () => {
      await services.xp.markFirstDuty('ana')
      await services.xp.markFirstDuty('ana')

      const { achievements, xp } = await services.xp.expediente(actor('ana'))

      expect(achievements.find((entry) => entry.id === 'first_duty')).toEqual({
        id: 'first_duty',
        goal: 1,
        progress: 1,
        unlocked: true,
      })
      expect(xp.total).toBe(0)
    })

    it('luce el título más alto que tenga y no deja ponerse uno bloqueado', async () => {
      const { xp } = services

      expect((await xp.expediente(actor('eva'))).title).toBe('paciente')

      // 25 + 25 XP: nivel 2, "interno".
      await xp.award('eva', 'doubt_solved', 'doubt:1')
      await xp.award('eva', 'doubt_solved', 'doubt:2')
      expect((await xp.expediente(actor('eva'))).title).toBe('interno')

      await expectCode(xp.updateSettings(actor('eva'), { title: 'jefe' }), 'forbidden')

      await xp.updateSettings(actor('eva'), { title: 'paciente' })
      expect((await xp.expediente(actor('eva'))).title).toBe('paciente')
    })

    it('guarda idioma y campus sin pisar lo que no viene', async () => {
      const { xp, repositories } = services

      await xp.updateSettings(actor('ana'), { lang: 'en' })
      await xp.updateSettings(actor('ana'), { campusId: 58 })

      expect(await repositories.profiles.get('ana')).toMatchObject({ lang: 'en', campusId: 58 })
      // El catálogo solo tiene Madrid y Barcelona: otro id no cuela.
      await expectCode(xp.updateSettings(actor('ana'), { campusId: 9999 }), 'invalid_input')
      await expectCode(xp.updateSettings(actor('ana'), { lang: 'klingon' }), 'invalid_input')
    })
  })

  describe('terapias de grupo', () => {
    const martesYJueves = {
      projectId: 10,
      place: 'Cluster 1 · Planta 2',
      // Martes 6 (hoy) y jueves 8 de octubre.
      dates: ['2026-10-08', '2026-10-06'],
      start: '16:00',
      end: '18:00',
      capacity: 2,
    }

    it('quien abre el grupo entra en él y los demás lo ven', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      expect(group).toMatchObject({
        projectName: 'ft_printf',
        dates: ['2026-10-06', '2026-10-08'],
        joined: true,
        mine: true,
        inSession: true,
      })
      expect(group.members.map((member) => member.login)).toEqual(['ana'])

      const [seen] = await therapy.list(actor('leo'), 10)
      expect(seen).toMatchObject({ id: group.id, joined: false, mine: false })
    })

    it('no deja pasar de las plazas', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      await therapy.join(actor('leo'), group.id)
      await expectCode(therapy.join(actor('eva'), group.id), 'conflict')

      // Unirse dos veces no es un error ni ocupa otra plaza.
      await expect(therapy.join(actor('leo'), group.id)).resolves.toBeUndefined()
    })

    it('rechaza horarios imposibles y proyectos que no existen', async () => {
      const { therapy } = services

      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, end: '15:00' }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: [] }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, projectId: 999 }),
        'not_found',
      )
    })

    const conPuestos = { ...martesYJueves, seats: ['c1r2s1', 'c1r2s2'] }

    it('cada media hora en tu puesto da XP, comprobado con los puestos de 42', async () => {
      const { therapy, xp } = services
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // 16:30: primera media hora de la sesión de 16:00 a 18:00.
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)
      // La misma media hora no se comprueba dos veces.
      clock.advance(5 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      // 17:00: segunda media hora.
      clock.advance(25 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)

      expect((await xp.expediente(actor('ana'))).xp.total).toBe(20)
      expect((await xp.expediente(actor('leo'))).xp.total).toBe(20)
    })

    it('solo cuenta quien está en un puesto reservado, y hacen falta dos', async () => {
      const { therapy, xp } = services
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // `leo` está en el campus, pero en otro puesto: `ana` se queda sola.
      await seat({ ana: 'c1r2s1', leo: 'c3r1s1' })
      expect(await therapy.checkAttendance()).toBe(0)

      // Llegar tarde no recupera la media hora ya comprobada.
      clock.advance(10 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      clock.advance(20 * MINUTE)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(2)
      expect((await xp.expediente(actor('leo'))).xp.total).toBe(10)
    })

    it('fuera de horario o sin puestos reservados no hay nada que comprobar', async () => {
      const { therapy } = services
      const sinPuestos = await therapy.create(actor('ana'), martesYJueves)
      await therapy.join(actor('leo'), sinPuestos.id)

      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)

      await therapy.close(actor('ana'), sinPuestos.id)
      const group = await therapy.create(actor('ana'), conPuestos)
      await therapy.join(actor('leo'), group.id)

      // Miércoles a la misma hora: no hay sesión.
      clock.advance(24 * HOUR)
      await seat({ ana: 'c1r2s1', leo: 'c1r2s2' })
      expect(await therapy.checkAttendance()).toBe(0)
    })

    it('los días son concretos: ni fechas pasadas ni cosas que no son un día', async () => {
      const { therapy } = services

      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['2026-10-05'] }),
        'invalid_input',
      )
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, dates: ['martes'] }),
        'invalid_input',
      )
      // Repetidos fuera, y en orden.
      const group = await therapy.create(actor('ana'), {
        ...martesYJueves,
        dates: ['2026-10-20', '2026-10-06', '2026-10-20'],
      })
      expect(group.dates).toEqual(['2026-10-06', '2026-10-20'])
    })

    it('los puestos van juntos, son como mucho seis y de ellos salen las plazas', async () => {
      const { therapy } = services
      const con = (seats: string[]) => therapy.create(actor('ana'), { ...martesYJueves, seats })

      // Cuatro puestos en dos filas seguidas: cuatro plazas, se pida lo que se pida.
      expect(
        await therapy.create(actor('ana'), {
          ...martesYJueves,
          capacity: 12,
          seats: ['c1r2s1', 'c1r2s2', 'c1r3s1', 'c1r4s1'],
        }),
      ).toMatchObject({ capacity: 4 })
      // Tres filas de separación, dos clusters, un solo puesto o siete: no.
      await expectCode(con(['c1r1s1', 'c1r4s1']), 'invalid_input')
      await expectCode(con(['c1r1s1', 'c2r1s1']), 'invalid_input')
      await expectCode(con(['c1r1s1']), 'invalid_input')
      await expectCode(
        con(['1', '2', '3', '4', '5', '6', '7'].map((n) => `c1r1s${n}`)),
        'invalid_input',
      )
    })

    it('al apuntarte dices cómo llevas el proyecto, y un grupo de repaso pide el 100 %', async () => {
      const { therapy } = services

      // Abrir uno de repaso sin tenerlo terminado no tiene sentido.
      await expectCode(
        therapy.create(actor('ana'), { ...martesYJueves, kind: 'review', progress: 80 }),
        'conflict',
      )

      const review = await therapy.create(actor('ana'), {
        ...martesYJueves,
        kind: 'review',
        progress: 100,
      })

      expect(review).toMatchObject({
        kind: 'review',
        members: [{ login: 'ana', progress: 100 }],
      })
      await expectCode(therapy.join(actor('leo'), review.id, { progress: 90 }), 'conflict')
      await expectCode(therapy.join(actor('leo'), review.id), 'conflict')
      await therapy.join(actor('leo'), review.id, { progress: 100 })

      // En uno normal vale cualquier porcentaje, o no decirlo.
      const study = await therapy.create(actor('eva'), { ...martesYJueves, capacity: 4 })

      await therapy.join(actor('leo'), study.id, { progress: 35 })
      await therapy.join(actor('ana'), study.id)
      expect(
        (await therapy.list(actor('eva'))).find((group) => group.id === study.id),
      ).toMatchObject({
        kind: 'study',
        members: expect.arrayContaining([
          expect.objectContaining({ login: 'eva', progress: null }),
          expect.objectContaining({ login: 'leo', progress: 35 }),
          expect.objectContaining({ login: 'ana', progress: null }),
        ]),
      })
      await expectCode(therapy.join(actor('sol'), study.id, { progress: 150 }), 'invalid_input')
    })

    it('cada grupo tiene su chat, solo para quien está dentro', async () => {
      const { therapy, meet } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      const id = `group:${group.id}`

      await therapy.join(actor('leo'), group.id, { progress: 40 })
      await meet.send(actor('leo'), null, { id, kind: 'text', body: '¿Hay que llevar algo?' })

      expect((await meet.thread(actor('ana'), null, id)).messages).toMatchObject([
        { login: 'leo', body: '¿Hay que llevar algo?' },
      ])
      await expectCode(meet.thread(actor('eva'), null, id), 'forbidden')
    })

    it('un especialista puede ofrecerse a preevaluar; quien aún lo hace, no', async () => {
      await services.xp.updateSettings(actor('eva'), { preReview: true })
      // `ana` lo marca también, pero aún lo está haciendo: no cuenta.
      await services.xp.updateSettings(actor('ana'), { preReview: true })

      expect((await services.xp.expediente(actor('eva'))).preReview).toBe(true)

      // En la sala de espera solo cuenta para quien ya aprobó el proyecto.
      const peers = await services.repositories.replica.findPeers({
        projectId: 10,
        campusId: MADRID,
        presenceSince: new Date(0).toISOString(),
      })
      const flags = Object.fromEntries(peers.map((peer) => [peer.login, peer.preReview]))

      expect(flags.ana).toBe(false)
      // Cambiar otra preferencia no borra la marca.
      await services.xp.updateSettings(actor('eva'), { lang: 'en' })
      expect((await services.xp.expediente(actor('eva'))).preReview).toBe(true)
    })

    it('quien lo abrió puede cambiarlo; nadie más', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      await therapy.join(actor('leo'), group.id)

      await expectCode(therapy.update(actor('leo'), group.id, martesYJueves), 'forbidden')

      const updated = await therapy.update(actor('ana'), group.id, {
        ...martesYJueves,
        place: 'Cluster 3',
        dates: ['2026-10-06', '2026-10-09'],
        end: '19:00',
        seats: ['c3r1s1', 'c3r1s2', 'c3r2s1'],
      })

      expect(updated).toMatchObject({
        id: group.id,
        place: 'Cluster 3',
        dates: ['2026-10-06', '2026-10-09'],
        end: '19:00',
        // Las plazas son los puestos elegidos.
        capacity: 3,
        seats: ['c3r1s1', 'c3r1s2', 'c3r2s1'],
      })
      // La gente apuntada sigue apuntada.
      expect(updated.members.map((member) => member.login)).toEqual(['ana', 'leo'])
      // Quien modera también puede.
      await expect(
        therapy.update(actor('moderadora', { admin: true }), group.id, martesYJueves),
      ).resolves.toMatchObject({ place: 'Cluster 1 · Planta 2' })
    })

    it('al cambiarlo no caben menos plazas que gente, ni días nuevos en el pasado', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), { ...martesYJueves, capacity: 3 })
      await therapy.join(actor('leo'), group.id)
      await therapy.join(actor('eva'), group.id)

      await expectCode(
        therapy.update(actor('ana'), group.id, { ...martesYJueves, capacity: 2 }),
        'conflict',
      )

      // El jueves, el martes 6 ya pasó: se puede conservar, pero no añadir el lunes 5.
      clock.advance(48 * HOUR)
      await expect(
        therapy.update(actor('ana'), group.id, {
          ...martesYJueves,
          capacity: 3,
          dates: ['2026-10-06', '2026-10-08', '2026-10-12'],
        }),
      ).resolves.toMatchObject({ dates: ['2026-10-06', '2026-10-08', '2026-10-12'] })
      await expectCode(
        therapy.update(actor('ana'), group.id, {
          ...martesYJueves,
          capacity: 3,
          dates: ['2026-10-05', '2026-10-08'],
        }),
        'invalid_input',
      )
    })

    it('un grupo que se queda vacío desaparece de todas partes', async () => {
      const { therapy, calendar, map, repositories } = services
      const week = ['2026-10-05T00:00:00.000Z', '2026-10-12T00:00:00.000Z'] as const
      const sessions = async (login: string) =>
        (await calendar.between(actor(login), null, ...week)).events.filter(
          (event) => event.kind === 'therapy',
        )
      const reserved = async () =>
        (await map.forCampus(actor('leo'))).clusters
          .flatMap((cluster) => cluster.seats)
          .filter((seat) => seat.reservation !== null)

      const group = await therapy.create(actor('ana'), {
        ...martesYJueves,
        seats: ['c1r2s1', 'c1r2s2'],
      })
      await repositories.replica.setState(`locations:${MADRID}`, { at: clock.now(), count: 0 })

      expect(await sessions('ana')).toHaveLength(2)
      expect(await reserved()).toHaveLength(2)

      // `ana` se sale y no queda nadie.
      await therapy.leave(actor('ana'), group.id)

      expect(await therapy.list(actor('leo'))).toEqual([])
      expect(await sessions('ana')).toEqual([])
      expect(await reserved()).toEqual([])
      // Y no ocupa hueco de los grupos que `ana` puede tener abiertos.
      await expectCode(therapy.join(actor('leo'), group.id), 'conflict')

      // El mapa pone al día la réplica al abrirse: esas peticiones no son de la comunidad.
      api.calls.length = 0
    })

    it('un grupo se cierra solo cuando pasa su último día', async () => {
      const { therapy } = services
      await therapy.create(actor('ana'), martesYJueves)

      // El jueves 8 sigue ahí; el viernes 9 ya no.
      clock.advance(48 * HOUR)
      expect(await therapy.list(actor('leo'))).toHaveLength(1)
      clock.advance(24 * HOUR)
      expect(await therapy.list(actor('leo'))).toEqual([])
    })

    it('solo cierra quien lo abrió, y se cierra solo al quedarse vacío', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      await expectCode(therapy.close(actor('leo'), group.id), 'forbidden')

      await therapy.leave(actor('ana'), group.id)
      expect(await therapy.list(actor('leo'))).toEqual([])
    })

    it('los grupos de un campus no se ven desde otro', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)
      const desdeBarcelona = actor('leo', { campusId: 58 })

      expect(await therapy.list(desdeBarcelona)).toEqual([])
      await expectCode(therapy.join(desdeBarcelona, group.id), 'not_found')
    })
  })

  describe('tablón de dudas', () => {
    it('una duda pasa de abierta a "de especialista" y a resuelta', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, {
        body: '¿Por qué ft_split me da leaks?',
      })
      expect(doubt.status).toBe('open')

      await doubts.answer(actor('leo'), doubt.id, { body: 'A mí me pasaba igual' })
      expect((await doubts.detail(actor('ana'), doubt.id)).status).toBe('open')

      const replies = await doubts.answer(actor('eva'), doubt.id, {
        body: 'Libera cada palabra y luego el array',
      })
      expect(replies.map((reply) => reply.specialist)).toEqual([false, true])
      expect((await doubts.detail(actor('ana'), doubt.id)).status).toBe('specialist')

      // Hay que decir qué respuesta la resolvió.
      await expectCode(
        doubts.setResolved(actor('ana'), doubt.id, { resolved: true }),
        'invalid_input',
      )
      await doubts.setResolved(actor('ana'), doubt.id, {
        resolved: true,
        answerId: replies[1]?.id,
      })
      const board = await doubts.board(actor('leo'), 10)
      expect(board.doubts).toMatchObject([
        { id: doubt.id, status: 'resolved', answers: 2, mine: false },
      ])
    })

    it('solo quien la puso (o quien modera) la resuelve o la quita', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo pruebo sin tester?' })

      await expectCode(
        doubts.setResolved(actor('leo'), doubt.id, { resolved: true, answerId: 1 }),
        'forbidden',
      )
      await expectCode(doubts.remove(actor('leo'), doubt.id), 'forbidden')

      await doubts.remove(actor('moderadora', { admin: true }), doubt.id)
      expect((await doubts.board(actor('ana'), 10)).doubts).toEqual([])
    })

    it('quien puso la duda puede cambiar el texto, mientras no esté resuelta', async () => {
      const { doubts } = services
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo pruevo sin tester?' })

      await expectCode(
        doubts.update(actor('leo'), doubt.id, { body: 'Otra cosa distinta' }),
        'forbidden',
      )
      await expectCode(doubts.update(actor('ana'), doubt.id, { body: '?' }), 'invalid_input')

      expect(
        await doubts.update(actor('ana'), doubt.id, { body: '¿Cómo pruebo sin tester?' }),
      ).toMatchObject({ id: doubt.id, body: '¿Cómo pruebo sin tester?', mine: true })

      // Resuelta, alguien ganó XP por responder a lo que decía: no se toca.
      const [answer] = await doubts.answer(actor('eva'), doubt.id, { body: 'Con un main propio' })
      await doubts.setResolved(actor('ana'), doubt.id, { resolved: true, answerId: answer?.id })
      await expectCode(
        doubts.update(actor('ana'), doubt.id, { body: 'Ahora pregunto otra cosa' }),
        'conflict',
      )
    })

    it('valida el texto y el proyecto', async () => {
      const { doubts } = services

      await expectCode(doubts.create(actor('ana'), 10, { body: 'eh' }), 'invalid_input')
      await expectCode(doubts.create(actor('ana'), 10, { body: 'x'.repeat(281) }), 'invalid_input')
      await expectCode(
        doubts.create(actor('ana'), 999, { body: 'una duda cualquiera' }),
        'not_found',
      )
    })

    it('la guía la escriben quienes aprobaron; el resto propone', async () => {
      const { doubts } = services
      const guide = { start: ['Lee el subject entero'], problems: [], concepts: ['Punteros'] }

      await expectCode(doubts.saveGuide(actor('ana'), 10, guide), 'forbidden')
      expect(await doubts.saveGuide(actor('eva'), 10, guide)).toMatchObject({
        start: ['Lee el subject entero'],
        updatedBy: 'eva',
      })

      await doubts.propose(actor('ana'), 10, {
        section: 'problems',
        body: 'Segfault al recibir NULL',
      })

      // Quien no puede editar no ve las propuestas; quien sí, las ve y decide.
      expect((await doubts.board(actor('ana'), 10)).proposals).toEqual([])
      const pending = (await doubts.board(actor('eva'), 10)).proposals
      expect(pending).toMatchObject([{ author: 'ana', section: 'problems' }])

      await expectCode(doubts.reviewProposal(actor('ana'), pending[0]?.id ?? 0, true), 'forbidden')
      await doubts.reviewProposal(actor('eva'), pending[0]?.id ?? 0, true)

      const board = await doubts.board(actor('eva'), 10)
      expect(board.guide.problems).toEqual(['Segfault al recibir NULL'])
      expect(board.proposals).toEqual([])
    })
  })

  describe('XP por resolver dudas', () => {
    const total = async (login: string): Promise<number> =>
      (await services.xp.expediente(actor(login))).xp.total

    /** `asker` pone una duda, `solver` la responde y `asker` la da por resuelta con esa respuesta. */
    const solve = async (asker: string, solver: string, body: string): Promise<number> => {
      const { doubts } = services
      const doubt = await doubts.create(actor(asker), 10, { body })
      const [answer] = await doubts.answer(actor(solver), doubt.id, { body: 'Prueba así' })

      await doubts.setResolved(actor(asker), doubt.id, { resolved: true, answerId: answer?.id })

      return doubt.id
    }

    it('gana XP quien escribió la respuesta que la resolvió, y la pierde si se reabre', async () => {
      const { doubts } = services
      const doubtId = await solve('ana', 'eva', '¿Cómo va va_arg?')

      expect(await total('eva')).toBe(25)
      expect((await doubts.detail(actor('ana'), doubtId)).solvedAnswerId).not.toBeNull()

      await doubts.setResolved(actor('ana'), doubtId, { resolved: false })

      expect(await total('eva')).toBe(0)
      expect(await doubts.detail(actor('ana'), doubtId)).toMatchObject({
        status: 'specialist',
        solvedAnswerId: null,
      })
    })

    it('resolverse la duda a uno mismo no da XP', async () => {
      await solve('ana', 'ana', '¿Dónde pongo el Makefile?')

      expect(await total('ana')).toBe(0)
    })

    it('la respuesta tiene que ser de esa duda', async () => {
      const { doubts } = services
      const otra = await doubts.create(actor('leo'), 10, { body: '¿Y los flags del bonus?' })
      const [ajena] = await doubts.answer(actor('eva'), otra.id, { body: 'No hacen falta' })
      const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo va va_arg?' })

      await expectCode(
        doubts.setResolved(actor('ana'), doubt.id, { resolved: true, answerId: ajena?.id }),
        'invalid_input',
      )
    })

    it('la misma pareja solo puntúa una vez al día', async () => {
      await solve('ana', 'eva', 'Primera duda de hoy')
      await solve('ana', 'eva', 'Segunda duda de hoy')
      expect(await total('eva')).toBe(25)

      // Otra persona sí cuenta, y mañana la misma pareja también.
      await solve('leo', 'eva', 'La duda de leo')
      expect(await total('eva')).toBe(50)
      clock.advance(24 * HOUR)
      await solve('ana', 'eva', 'La duda de mañana')
      expect(await total('eva')).toBe(75)
    })
  })

  describe('cambios de guía con responsables', () => {
    const total = async (login: string): Promise<number> =>
      (await services.xp.expediente(actor(login))).xp.total

    /** `author` propone una línea y devuelve el id de la propuesta. */
    const propose = async (author: string, body: string): Promise<number> => {
      const { doubts } = services

      await doubts.propose(actor(author), 10, { section: 'problems', body })

      const found = (await doubts.board(actor('eva'), 10)).proposals.find((p) => p.body === body)

      return found?.id ?? 0
    }

    /** `validator` valida una línea de `author` y devuelve el id del cambio. */
    const accept = async (author: string, validator: string, body: string): Promise<number> => {
      const { doubts } = services

      await doubts.reviewProposal(actor(validator), await propose(author, body), true)

      const change = (await doubts.board(actor(validator), 10)).recentChanges.find(
        (entry) => entry.body === body,
      )

      return change?.id ?? 0
    }

    beforeEach(async () => {
      // Más gente que ya aprobó ft_printf, para validar y para señalar.
      await services.repositories.replica.ingestProjectUsers(
        ['sol', 'teo', 'uma'].map((login) => projectUser(login, { status: 'finished' })),
        MADRID,
      )
    })

    it('validar un cambio da XP a quien lo propuso y a quien lo valida', async () => {
      const { doubts } = services
      const changeId = await accept('ana', 'eva', 'Cuidado con %% al final')

      expect(await total('ana')).toBe(15)
      expect(await total('eva')).toBe(5)
      expect((await doubts.board(actor('ana'), 10)).guide.problems).toEqual([
        'Cuidado con %% al final',
      ])

      // Quien validó no puede señalarlo; otra especialista sí.
      expect((await doubts.board(actor('eva'), 10)).recentChanges).toMatchObject([
        { id: changeId, proposer: 'ana', validator: 'eva', flags: 0, canFlag: false },
      ])
      expect((await doubts.board(actor('sol'), 10)).recentChanges).toMatchObject([
        { canFlag: true },
      ])
      // Quien no aprobó el proyecto no ve la lista de cambios.
      expect((await doubts.board(actor('leo'), 10)).recentChanges).toEqual([])
    })

    it('nadie valida su propio cambio', async () => {
      const proposalId = await propose('eva', 'Lee el man de stdarg')

      await expectCode(services.doubts.reviewProposal(actor('eva'), proposalId, true), 'forbidden')
    })

    it('la misma pareja solo puntúa una vez por semana', async () => {
      await accept('ana', 'eva', 'Primera línea')
      await accept('ana', 'eva', 'Segunda línea')

      expect(await total('ana')).toBe(15)
      expect(await total('eva')).toBe(5)

      // Con otra persona validando sí cuenta.
      await accept('ana', 'sol', 'Tercera línea')
      expect(await total('ana')).toBe(30)

      clock.advance(8 * 24 * HOUR)
      await accept('ana', 'eva', 'Cuarta línea')
      expect(await total('ana')).toBe(45)
    })

    it('con dos señales el cambio se retira y los dos pierden la XP', async () => {
      const { doubts } = services
      const changeId = await accept('ana', 'eva', 'Usa printf dentro de ft_printf')

      // Ni quien lo propuso, ni quien lo validó, ni quien no aprobó el proyecto.
      await expectCode(doubts.flagChange(actor('ana'), changeId), 'forbidden')
      await expectCode(doubts.flagChange(actor('eva'), changeId), 'forbidden')
      await expectCode(doubts.flagChange(actor('leo'), changeId), 'forbidden')

      // Una sola persona no basta, y no puede señalar dos veces.
      expect(await doubts.flagChange(actor('sol'), changeId)).toBe(false)
      await expectCode(doubts.flagChange(actor('sol'), changeId), 'conflict')
      expect(await total('ana')).toBe(15)

      expect(await doubts.flagChange(actor('teo'), changeId)).toBe(true)

      expect(await total('ana')).toBe(0)
      expect(await total('eva')).toBe(0)
      const board = await doubts.board(actor('sol'), 10)
      expect(board.guide.problems).toEqual([])
      expect(board.recentChanges).toEqual([])
      await expectCode(doubts.flagChange(actor('uma'), changeId), 'not_found')
    })

    it('pasado un mes, un cambio ya no se puede señalar', async () => {
      const changeId = await accept('ana', 'eva', 'Una línea que aguanta')

      clock.advance(31 * 24 * HOUR)

      await expectCode(services.doubts.flagChange(actor('sol'), changeId), 'conflict')
    })

    it('tres cambios rechazados son un mes sin proponer', async () => {
      const { doubts } = services

      for (const body of ['Uno', 'Dos', 'Tres']) {
        await doubts.reviewProposal(actor('eva'), await propose('ana', body), false)
      }

      await expectCode(
        doubts.propose(actor('ana'), 10, { section: 'start', body: 'Cuatro' }),
        'forbidden',
      )
      expect((await doubts.board(actor('ana'), 10)).sanctions.proposeBlockedUntil).toBe(
        new Date(clock.now() + 30 * 24 * HOUR).toISOString(),
      )
      // A quien rechazó no le pasa nada.
      expect((await doubts.board(actor('eva'), 10)).sanctions).toEqual({
        proposeBlockedUntil: null,
        reviewBlockedUntil: null,
      })

      clock.advance(31 * 24 * HOUR)
      await expect(
        doubts.propose(actor('ana'), 10, { section: 'start', body: 'Cuatro' }),
      ).resolves.toBeUndefined()
    })

    it('tres cambios validados y luego retirados son un mes sin validar', async () => {
      const { doubts } = services

      // Tres personas distintas proponen, para que no se bloquee antes quien propone.
      for (const [author, body] of [
        ['ana', 'Malo uno'],
        ['leo', 'Malo dos'],
        ['uma', 'Malo tres'],
      ] as const) {
        const changeId = await accept(author, 'eva', body)

        await doubts.flagChange(actor('sol'), changeId)
        await doubts.flagChange(actor('teo'), changeId)
      }

      const pending = await propose('ana', 'Este ya no lo valida eva')

      await expectCode(doubts.reviewProposal(actor('eva'), pending, true), 'forbidden')
      // Ni lo cuela editando la guía a mano.
      await expectCode(
        doubts.saveGuide(actor('eva'), 10, { start: ['Truco'], problems: [], concepts: [] }),
        'forbidden',
      )
      expect((await doubts.board(actor('eva'), 10)).sanctions.reviewBlockedUntil).not.toBeNull()
      // Otra especialista sigue pudiendo.
      await expect(doubts.reviewProposal(actor('sol'), pending, true)).resolves.toBeUndefined()

      clock.advance(31 * 24 * HOUR)
      await expect(
        doubts.reviewProposal(actor('eva'), await propose('leo', 'De vuelta'), true),
      ).resolves.toBeUndefined()
    })
  })

  describe('grafo del tablón', () => {
    const { replica } = { replica: () => services.repositories.replica }
    const all = (graph: Awaited<ReturnType<typeof services.doubts.graph>>) =>
      graph.circles.flatMap(({ circle, projects }) => projects.map((p) => ({ ...p, circle })))

    /** El nodo de ese proyecto en el grafo de esa persona. */
    const node = async (login: string, name: string) => {
      const found = all(await services.doubts.graph(actor(login), null)).find(
        (project) => project.name === name,
      )

      if (found === undefined) {
        throw new Error(`no hay ${name} en el grafo de ${login}`)
      }

      return found
    }

    beforeEach(async () => {
      // Las horas de los proyectos se dan por pedidas: el grafo no pregunta a 42.
      await replica().setState(`hours:${MADRID}`, {})
      await replica().ingestProjectUsers(
        [
          // Plan clásico: `ana` aprobó Libft y hace ft_printf; `leo` ya va por push_swap.
          projectUser('ana', { slug: '42cursus-ft_printf' }),
          projectUser('ana', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            status: 'finished',
          }),
          projectUser('leo', {
            projectId: 40,
            projectName: 'push_swap',
            slug: '42cursus-push_swap',
          }),
          // Plan nuevo: `nex` aprobó Libft, hace un módulo de Python y viene de la piscina.
          projectUser('nex', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            status: 'finished',
            createdAt: '2026-05-01T10:00:00.000Z',
          }),
          projectUser('nex', {
            projectId: 30,
            projectName: 'Python Module 00',
            slug: 'python-module-00',
            createdAt: '2026-06-20T10:00:00.000Z',
          }),
          projectUser('nex', {
            projectId: 90,
            projectName: 'C Piscine C 00',
            slug: 'c-piscine-c-00',
            status: 'finished',
            cursusIds: [9],
          }),
          // `pis` sigue en la piscina.
          projectUser('pis', {
            projectId: 90,
            projectName: 'C Piscine C 00',
            slug: 'c-piscine-c-00',
            cursusIds: [9],
          }),
        ],
        MADRID,
      )
    })

    it('cada persona ve su plan: clásico en C o nuevo con Python', async () => {
      const classic = await services.doubts.graph(actor('ana'), null)
      const next = await services.doubts.graph(actor('nex'), null)

      expect(classic.track).toBe('classic')
      expect(all(classic).map((p) => `${p.circle}:${p.name}`)).toEqual([
        '0:Libft',
        '1:ft_printf',
        '2:push_swap',
      ])

      // El plan nuevo comparte los primeros proyectos, pero tiene sus módulos
      // de Python y no el push_swap del plan clásico.
      expect(next.track).toBe('next')
      expect(all(next).map((p) => `${p.circle}:${p.name}`)).toEqual([
        '0:Libft',
        '1:ft_printf',
        '2:Python Module 00',
      ])
    })

    it('la piscina no sale, ni en el grafo ni entre los proyectos de quien ya es estudiante', async () => {
      const names = all(await services.doubts.graph(actor('nex'), null)).map((p) => p.name)

      expect(names.some((name) => /piscine/i.test(name))).toBe(false)
      expect((await replica().projectsOf('nex', true)).map((p) => p.name)).toEqual([
        'Python Module 00',
        'Libft',
      ])
      // Quien todavía está en la piscina sí ve los suyos: es lo único que tiene.
      expect((await replica().projectsOf('pis', true)).map((p) => p.name)).toEqual([
        'C Piscine C 00',
      ])
    })

    it('dice cómo va con cada proyecto y cuáles aún no tiene disponibles', async () => {
      const graph = await services.doubts.graph(actor('ana'), null)

      // Va por el círculo 1: es el más alto en el que tiene algo.
      expect(graph.currentCircle).toBe(1)
      expect(graph.knownUpTo).toBe(2)
      expect(await node('ana', 'Libft')).toMatchObject({ status: 'finished', locked: false })
      expect(await node('ana', 'ft_printf')).toMatchObject({
        status: 'in_progress',
        locked: false,
        short: 'printf',
      })
      // push_swap es del círculo 2: lo tendrá, pero todavía no.
      expect(await node('ana', 'push_swap')).toMatchObject({ status: 'todo', locked: true })
      expect(await node('leo', 'push_swap')).toMatchObject({ status: 'in_progress', locked: false })
    })

    it('aprende el plan de los rangos y las fechas de cada persona', async () => {
      // `nex` validó el rango 0 en mayo y el 1 en junio, y después se apuntó a
      // un proyecto que no está en ninguna tabla.
      await replica().ingestProjectUsers(
        [
          projectUser('nex', {
            projectId: 77,
            projectName: 'Proyecto Nuevo',
            slug: 'proyecto-nuevo',
            createdAt: '2026-06-25T10:00:00.000Z',
          }),
          projectUser('otra', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            createdAt: '2026-09-01T10:00:00.000Z',
          }),
          projectUser('otra', {
            projectId: 30,
            projectName: 'Python Module 00',
            slug: 'python-module-00',
          }),
        ],
        MADRID,
      )
      api.quests.set(userId('nex'), [
        { quest_id: 128, validated_at: '2026-03-12T10:00:00.000Z', quest: { slug: '42next' } },
        {
          quest_id: 44,
          validated_at: '2026-05-10T10:00:00.000Z',
          quest: { slug: 'common-core-rank-00' },
        },
        {
          quest_id: 45,
          validated_at: '2026-06-15T10:00:00.000Z',
          quest: { slug: 'common-core-rank-01' },
        },
        { quest_id: 37, validated_at: null, quest: { slug: 'common-core' } },
      ])

      const graph = await services.doubts.graph(actor('nex'), userId('nex'))

      expect(graph).toMatchObject({ track: 'next', currentCircle: 2 })
      expect(all(graph).find((p) => p.name === 'Proyecto Nuevo')).toMatchObject({ circle: 2 })

      // Solo se pregunta por sus hitos y su cursus, y no se repite al volver a abrir el grafo.
      const asked = api.calls.length

      await services.doubts.graph(actor('nex'), userId('nex'))
      expect(api.calls).toHaveLength(asked)
      expect(
        api.calls.every(
          (call) =>
            /^\/users\/\d+\/(quests_users|cursus_users)/.test(call) &&
            call.startsWith(`/users/${userId('nex')}/`),
        ),
      ).toBe(true)
      api.calls.length = 0

      // Lo aprendido vale para quien venga detrás en el mismo plan: lo verá
      // como algo que tendrá, aún cerrado.
      expect(await node('otra', 'Proyecto Nuevo')).toMatchObject({
        circle: 2,
        status: 'todo',
        locked: false,
      })
      expect(
        (await services.doubts.graph(actor('ana'), null)).circles.flatMap((c) => c.projects),
      ).not.toContainEqual(expect.objectContaining({ name: 'Proyecto Nuevo' }))
    })

    it('da las fechas del estado de salud: inicio, círculos completados y black hole', async () => {
      await replica().ingestUser(
        {
          id: userId('nex'),
          login: 'nex',
          cursus_users: [
            { cursus_id: 9, level: 7, begin_at: '2026-01-26T09:00:00.000Z' },
            {
              cursus_id: 21,
              level: 3.66,
              begin_at: '2026-05-18T07:42:00.000Z',
              blackholed_at: '2027-04-03T07:42:00.000Z',
            },
          ],
        },
        [MADRID],
      )
      api.quests.set(userId('nex'), [
        {
          quest_id: 45,
          validated_at: '2026-06-18T14:40:00.000Z',
          quest: { slug: 'common-core-rank-01' },
        },
        {
          quest_id: 44,
          validated_at: '2026-05-19T11:37:00.000Z',
          quest: { slug: 'common-core-rank-00' },
        },
        { quest_id: 37, validated_at: null, quest: { slug: 'common-core' } },
      ])

      // Las fechas son las del 42cursus, no las de la piscina.
      expect(await services.xp.health(actor('nex'), userId('nex'))).toEqual({
        startedAt: '2026-05-18T07:42:00.000Z',
        blackholedAt: '2027-04-03T07:42:00.000Z',
        currentCircle: 2,
        milestones: ['2026-05-19T11:37:00.000Z', '2026-06-18T14:40:00.000Z'],
      })

      // Quien entró antes de que se guardasen las fechas no las tiene: se piden
      // a 42 una vez y quedan guardadas.
      api.cursus.set(userId('eva'), [
        { cursus_id: 9, level: 6, begin_at: '2026-01-26T09:00:00.000Z' },
        {
          cursus_id: 21,
          level: 2.1,
          begin_at: '2026-06-01T08:00:00.000Z',
          blackholed_at: '2027-02-01T08:00:00.000Z',
        },
      ])
      expect(await services.xp.health(actor('eva'), userId('eva'))).toMatchObject({
        startedAt: '2026-06-01T08:00:00.000Z',
        blackholedAt: '2027-02-01T08:00:00.000Z',
      })
      const asked = api.calls.filter((call) => call.includes('cursus_users')).length

      await services.xp.health(actor('eva'), userId('eva'))
      expect(api.calls.filter((call) => call.includes('cursus_users'))).toHaveLength(asked)

      // De quien no se sabe nada no se inventa nada: empieza en el círculo 0.
      api.calls.length = 0
      expect(await services.xp.health(actor('leo'), null)).toEqual({
        startedAt: null,
        blackholedAt: null,
        currentCircle: 0,
        milestones: [],
      })
      expect(api.calls).toHaveLength(0)
    })

    it('avisa de las dudas sin responder a quien puede responderlas', async () => {
      const doubt = await services.doubts.create(actor('leo'), 10, { body: '¿Cómo va va_arg?' })

      // `ana` lo está haciendo y `eva` lo aprobó: a las dos les sirve saberlo.
      expect((await node('ana', 'ft_printf')).signals.unanswered).toBe(1)
      expect((await node('eva', 'ft_printf')).signals.unanswered).toBe(1)
      // A quien la puso no se le avisa de su propia duda.
      expect((await node('leo', 'ft_printf')).signals.unanswered).toBe(0)

      await services.doubts.answer(actor('eva'), doubt.id, { body: 'Pide un int.' })

      expect((await node('ana', 'ft_printf')).signals.unanswered).toBe(0)
    })

    it('no avisa de nada en proyectos a los que aún no se ha llegado', async () => {
      await services.doubts.create(actor('eva'), 20, { body: '¿Qué hace ft_lstmap?' })

      // `leo` no tiene Libft; `ana` la aprobó.
      expect((await node('leo', 'Libft')).signals).toEqual({
        unanswered: 0,
        proposals: 0,
        missingGuide: false,
      })
      expect((await node('ana', 'Libft')).signals.unanswered).toBe(1)
    })

    it('la guía que falta y las propuestas solo llegan a quien aprobó el proyecto', async () => {
      await services.doubts.propose(actor('leo'), 10, { section: 'start', body: 'Lee el subject' })

      expect((await node('eva', 'ft_printf')).signals).toMatchObject({
        proposals: 1,
        missingGuide: true,
      })
      expect((await node('ana', 'ft_printf')).signals).toMatchObject({
        proposals: 0,
        missingGuide: false,
      })

      await services.doubts.saveGuide(actor('eva'), 10, {
        start: ['Lee el subject'],
        problems: [],
        concepts: [],
      })

      expect((await node('eva', 'ft_printf')).signals.missingGuide).toBe(false)
    })

    it('dice las horas, la serie y si lo bordó con un 125', async () => {
      const { replica: repo } = services.repositories

      await repo.ingestProjectUsers(
        [
          {
            ...projectUser('ana', {
              projectId: 20,
              projectName: 'Libft',
              slug: '42cursus-libft',
              status: 'finished',
            }),
            final_mark: 125,
          },
        ],
        MADRID,
      )
      await db.execute('UPDATE projects SET hours = 55 WHERE id = 10')
      // Las horas ya se han pedido esta semana: no hay que preguntar a 42.
      await repo.setState(`hours:${MADRID}`, {})

      expect(await node('ana', 'Libft')).toMatchObject({ perfect: true, series: null, hours: null })
      expect(await node('ana', 'ft_printf')).toMatchObject({ perfect: false, hours: 55 })
      expect(await node('nex', 'Python Module 00')).toMatchObject({ series: 'Python' })
      expect((await services.doubts.graph(actor('ana'), null)).level).toBeNull()
    })

    it('entiende las estimaciones de 42', () => {
      expect(
        ['55 hours', '1 hour', 'about 2 days', '1 week', '', null, 'pronto'].map(parseHours),
      ).toEqual([55, 1, 16, 40, null, null, null])
    })

    it('abrevia los nombres para que quepan en el nodo', () => {
      expect(
        [
          'Libft',
          'get_next_line',
          'Python Module 07',
          'CPP Module 03',
          'Exam Rank 02',
          'Call Me Maybe',
          'Inception-of-Things',
        ].map(shortName),
      ).toEqual(['Libft', 'GNL', 'Py 07', 'C++ 03', 'Exam 02', 'CallMe', 'Inceptio…'])
    })
  })

  describe('pizarras', () => {
    const malloc = (startsInHours = 24) => ({
      title: 'malloc: dónde vive tu memoria',
      topic: 'malloc',
      place: 'Cluster 1, sala de pizarras',
      startsAt: new Date(TUESDAY_AFTERNOON + startsInHours * HOUR).toISOString(),
      endsAt: new Date(TUESDAY_AFTERNOON + (startsInHours + 1.5) * HOUR).toISOString(),
      capacity: 2,
    })

    it('se propone, sale en el calendario y se reserva plaza', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), malloc())

      await boards.join(actor('ana'), board.id)

      expect(await boards.list(actor('ana'))).toMatchObject([
        { id: board.id, host: 'eva', attendees: 1, joined: true, mine: false },
      ])
    })

    it('quien participa en un evento puede avisar y chatear; quien no, no', async () => {
      const { boards, meet } = services
      const board = await boards.create(actor('eva'), malloc())
      const id = `board:${board.id}`

      await boards.join(actor('ana'), board.id)

      await meet.send(actor('ana'), null, { id, kind: 'seen' })
      await meet.send(actor('ana'), null, {
        id,
        kind: 'late',
        minutes: 10,
        reason: 'evaluation',
        body: 'Salgo de una corrección',
      })
      const thread = await meet.send(actor('eva'), null, { id, kind: 'text', body: 'Te espero' })

      // Las dos ven lo mismo, en orden.
      expect(thread.messages).toMatchObject([
        { login: 'ana', kind: 'seen', minutes: null, reason: null },
        { login: 'ana', kind: 'late', minutes: 10, reason: 'evaluation' },
        { login: 'eva', kind: 'text', body: 'Te espero' },
      ])
      expect((await meet.thread(actor('ana'), null, id)).messages).toHaveLength(3)

      // `leo` no se ha apuntado: ni lee ni escribe.
      await expectCode(meet.thread(actor('leo'), null, id), 'forbidden')
      await expectCode(meet.send(actor('leo'), null, { id, kind: 'seen' }), 'forbidden')
      // Un retraso sin minutos o un mensaje vacío no valen.
      await expectCode(meet.send(actor('ana'), null, { id, kind: 'late' }), 'invalid_input')
      await expectCode(
        meet.send(actor('ana'), null, { id, kind: 'text', body: ' ' }),
        'invalid_input',
      )
    })

    it('la asistencia se valida con dos códigos: uno al empezar y otro al terminar', async () => {
      const { boards, meet } = services
      const board = await boards.create(actor('eva'), malloc())
      const id = `board:${board.id}`

      await boards.join(actor('ana'), board.id)

      // Quien la imparte ve los dos códigos, de cuatro caracteres y distintos.
      const host = await meet.attendance(actor('eva'), id)
      const codes = host.codes ?? { start: '', end: '' }

      expect(host).toMatchObject({ role: 'host', mine: null, people: [] })
      expect(codes.start).toMatch(/^[A-Z2-9]{4}$/)
      expect(codes.end).toMatch(/^[A-Z2-9]{4}$/)
      expect(codes.start).not.toBe(codes.end)
      // Y son siempre los mismos para ese evento.
      expect((await meet.attendance(actor('eva'), id)).codes).toEqual(codes)

      // Quien asiste no los ve.
      expect(await meet.attendance(actor('ana'), id)).toEqual({
        role: 'guest',
        codes: null,
        mine: null,
        people: [],
      })

      // No se puede terminar sin haber empezado, ni con un código inventado.
      await expectCode(meet.checkin(actor('ana'), { id, code: codes.end }), 'conflict')
      await expectCode(meet.checkin(actor('ana'), { id, code: 'ZZZZ' }), 'invalid_input')
      // Ni validar quien la imparte, ni quien no está apuntado.
      await expectCode(meet.checkin(actor('eva'), { id, code: codes.start }), 'conflict')
      await expectCode(meet.checkin(actor('leo'), { id, code: codes.start }), 'forbidden')

      const started = await meet.checkin(actor('ana'), { id, code: codes.start.toLowerCase() })

      // Con solo el de inicio todavía no hay duración: no vale.
      expect(started).toMatchObject({ phase: 'start', presence: { endedAt: null, minutes: null } })

      clock.advance(50 * MINUTE)
      // Volver a escribir el de inicio no mueve la hora a la que empezó.
      await meet.checkin(actor('ana'), { id, code: codes.start })

      const ended = await meet.checkin(actor('ana'), { id, code: codes.end })

      expect(ended).toMatchObject({ phase: 'end', presence: { login: 'ana', minutes: 50 } })
      expect((await meet.attendance(actor('eva'), id)).people).toMatchObject([
        { login: 'ana', minutes: 50 },
      ])
      // Los códigos son solo para pizarras y sesiones de ayuda.
      await expectCode(meet.attendance(actor('ana'), 'therapy:1:2026-10-06'), 'invalid_input')
    })

    it('no hay más plazas de las que hay', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), malloc())

      await boards.join(actor('ana'), board.id)
      await boards.join(actor('leo'), board.id)
      await expectCode(boards.join(actor('otro'), board.id), 'conflict')
    })

    it('quien la imparte puede cambiarla mientras no haya terminado', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), { ...malloc(), capacity: 3 })

      for (const login of ['ana', 'leo', 'sol']) {
        await boards.join(actor(login), board.id)
      }

      await expectCode(boards.update(actor('ana'), board.id, malloc()), 'forbidden')

      const updated = await boards.update(actor('eva'), board.id, {
        ...malloc(),
        capacity: 3,
        title: 'malloc y free, con dibujos',
        place: 'Cluster 2',
      })
      expect(updated).toMatchObject({
        id: board.id,
        title: 'malloc y free, con dibujos',
        place: 'Cluster 2',
        attendees: 3,
      })

      // No caben menos plazas que gente apuntada, ni se manda al pasado.
      await expectCode(
        boards.update(actor('eva'), board.id, { ...malloc(), capacity: 2 }),
        'conflict',
      )
      await expectCode(boards.update(actor('eva'), board.id, malloc(-48)), 'invalid_input')

      // Cuando ya ha terminado, se queda como está.
      clock.advance(72 * HOUR)
      await expectCode(boards.update(actor('eva'), board.id, malloc()), 'conflict')
    })

    it('rechaza pizarras en el pasado o de duración absurda', async () => {
      const { boards } = services

      await expectCode(boards.create(actor('eva'), malloc(-2)), 'invalid_input')
      await expectCode(
        boards.create(actor('eva'), { ...malloc(), endsAt: malloc(24 * 7).endsAt }),
        'invalid_input',
      )
      await expectCode(
        boards.create(actor('eva'), { ...malloc(), startsAt: 'mañana' }),
        'invalid_input',
      )
    })

    it('quien imparte gana XP cuando ya ha pasado y fue alguien, y solo una vez', async () => {
      const { boards, xp } = services
      const board = await boards.create(actor('eva'), malloc())
      await boards.join(actor('ana'), board.id)

      // Antes de que ocurra, nada.
      await boards.settle()
      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)

      clock.advance(48 * HOUR)
      await boards.settle()
      await boards.settle()

      const eva = await xp.expediente(actor('eva'))
      expect(eva.xp.total).toBe(50)
      expect(eva.achievements.find((entry) => entry.id === 'board_teacher')?.unlocked).toBe(true)
    })

    it('una pizarra a la que no va nadie no da XP', async () => {
      const { boards, xp } = services
      await boards.create(actor('eva'), malloc())

      clock.advance(48 * HOUR)
      await boards.settle()

      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)
    })

    it('solo la cancela quien la imparte', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), malloc())

      await expectCode(boards.cancel(actor('ana'), board.id), 'forbidden')
      await boards.cancel(actor('eva'), board.id)

      expect(await boards.list(actor('ana'))).toEqual([])
    })
  })
})
