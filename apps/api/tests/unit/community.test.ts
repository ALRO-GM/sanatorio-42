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
import { activeLocation, projectUser } from '../helpers/fixtures.js'

const MADRID = 22
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
    // Ni una sola petición a 42 en todo lo que hace la comunidad.
    expect(api.calls).toHaveLength(0)
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

    it('quien empata comparte puesto, y cada campus tiene el suyo', async () => {
      const { xp } = services

      await xp.award('ana', 'doubt_solved', 'doubt:1')
      await xp.award('leo', 'doubt_solved', 'doubt:2')

      expect(
        (await xp.leaderboard(actor('ana'), 'all')).entries.map((entry) => entry.rank),
      ).toEqual([1, 1])
      expect((await xp.leaderboard(actor('ana', { campusId: 58 }), 'all')).entries).toEqual([])
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
      days: [4, 2],
      start: '16:00',
      end: '18:00',
      capacity: 2,
    }

    it('quien abre el grupo entra en él y los demás lo ven', async () => {
      const { therapy } = services
      const group = await therapy.create(actor('ana'), martesYJueves)

      expect(group).toMatchObject({
        projectName: 'ft_printf',
        days: [2, 4],
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
        therapy.create(actor('ana'), { ...martesYJueves, days: [] }),
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

  describe('grafo del common core', () => {
    const node = async (login: string, key: string) => {
      const graph = await services.doubts.graph(actor(login))
      const found = graph.circles.flatMap((circle) => circle.projects).find((p) => p.key === key)

      if (found === undefined) {
        throw new Error(`no hay ${key} en el grafo`)
      }

      return found
    }

    beforeEach(async () => {
      // ft_printf pasa a tener su slug de verdad, y `ana` ya aprobó Libft.
      await services.repositories.replica.ingestProjectUsers(
        [
          projectUser('ana', { slug: '42cursus-ft_printf' }),
          projectUser('ana', {
            projectId: 20,
            projectName: 'Libft',
            slug: '42cursus-libft',
            status: 'finished',
          }),
        ],
        MADRID,
      )
    })

    it('reparte el common core en siete círculos, sin la piscina', async () => {
      const graph = await services.doubts.graph(actor('ana'))

      expect(graph.circles.map((circle) => circle.circle)).toEqual([0, 1, 2, 3, 4, 5, 6])
      expect(graph.circles[0]?.projects.map((p) => p.name)).toEqual(['Libft'])
      expect(graph.circles[6]?.projects.map((p) => p.key)).toEqual([
        'ft_transcendence',
        'exam-rank-06',
      ])

      const names = graph.circles.flatMap((circle) => circle.projects.map((p) => p.name))
      expect(names.some((name) => /piscine/i.test(name))).toBe(false)
      expect(new Set(names).size).toBe(names.length)
    })

    it('dice cómo va cada persona con cada proyecto', async () => {
      expect(await node('ana', 'libft')).toMatchObject({ status: 'finished', projectId: 20 })
      expect(await node('ana', 'ft_printf')).toMatchObject({ status: 'in_progress', projectId: 10 })
      expect(await node('eva', 'ft_printf')).toMatchObject({ status: 'finished' })
      // Nadie del campus lo ha tocado: sale, pero sin tablón al que entrar.
      expect(await node('ana', 'minishell')).toMatchObject({ status: 'todo', projectId: null })
    })

    it('usa el proyecto del plan que tenga cada persona', async () => {
      await services.repositories.replica.ingestProjectUsers(
        [
          projectUser('leo', { projectId: 1994, projectName: 'Born2beroot', slug: 'born2beroot' }),
          projectUser('ana', {
            projectId: 2686,
            projectName: 'Born2beroot',
            slug: '42next-born2beroot',
            status: 'finished',
          }),
        ],
        MADRID,
      )

      expect(await node('ana', 'born2beroot')).toMatchObject({
        projectId: 2686,
        status: 'finished',
      })
      expect(await node('leo', 'born2beroot')).toMatchObject({
        projectId: 1994,
        status: 'in_progress',
      })
      // Quien no tiene ninguno ve el de siempre.
      expect(await node('eva', 'born2beroot')).toMatchObject({ projectId: 1994, status: 'todo' })
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

      // `leo` no ha empezado Libft; `ana` la aprobó.
      expect((await node('leo', 'libft')).signals).toEqual({
        unanswered: 0,
        proposals: 0,
        missingGuide: false,
      })
      expect((await node('ana', 'libft')).signals.unanswered).toBe(1)
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

    it('no hay más plazas de las que hay', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), malloc())

      await boards.join(actor('ana'), board.id)
      await boards.join(actor('leo'), board.id)
      await expectCode(boards.join(actor('otro'), board.id), 'conflict')
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
