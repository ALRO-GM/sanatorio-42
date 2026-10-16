/**
 * Tests de la ayuda reservada.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { projectUser } from '../helpers/fixtures.js'
import {
  MADRID,
  AGENDA_CALL,
  HOUR,
  MINUTE,
  TUESDAY_AFTERNOON,
  actor,
  expectCode,
  useCommunity,
} from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('comunidad', () => {
  const community = useCommunity()
  const { validate, helpSession } = community
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']
  let api: Community['api']

  beforeEach(() => {
    ;({ services, clock, db, api } = community)
  })

  describe('ayuda reservada', () => {
    const tarde = { windows: [{ start: '17:00', end: '19:00' }], maxMinutes: 60 }

    it('una sesión aceptada, con los dos códigos y valorada por las dos partes da XP a quien ayudó', async () => {
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

    it('sin las dos valoraciones no hay XP, y sin los códigos tampoco', async () => {
      const { help, xp } = services

      await help.setToday(actor('eva'), tarde)
      const booking = await help.book(actor('ana'), { helper: 'eva', start: '17:00', minutes: 30 })
      await help.respond(actor('eva'), booking.id, true)

      // Antes de que termine la franja no se puede valorar.
      await expectCode(help.rate(actor('ana'), booking.id, { tag: 'bug' }), 'conflict')

      // Se valida el código de inicio, pero no el de fin: no hay asistencia.
      clock.advance(30 * MINUTE)
      await validate(`help:booking:${booking.id}`, 'eva', 'ana', 'start')

      clock.advance(35 * MINUTE)
      expect(await help.rate(actor('ana'), booking.id, { tag: 'bug' })).toEqual({ xp: null })
      // Cada parte usa sus propias opciones, y solo una vez.
      await expectCode(help.rate(actor('eva'), booking.id, { tag: 'bug' }), 'invalid_input')
      await expectCode(help.rate(actor('ana'), booking.id, { tag: 'code' }), 'conflict')
      // Con las dos valoraciones la sesión espera: el código de fin aún no ha caducado.
      expect(await help.rate(actor('eva'), booking.id, { tag: 'curious' })).toEqual({ xp: null })

      // A las 18:00 caduca. Sin él, la sesión se cierra a cero.
      clock.advance(30 * MINUTE)
      await expectCode(validate(`help:booking:${booking.id}`, 'eva', 'ana', 'end'), 'conflict')
      expect((await help.today(actor('eva'))).bookings).toMatchObject([{ xp: 0, verified: false }])
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

    it('deja quitar la media hora en curso, pero no la que alguien tiene reservada', async () => {
      const { help } = services

      await help.setToday(actor('eva'), tarde)
      const booking = await help.book(actor('ana'), { helper: 'eva', start: '18:00', minutes: 30 })

      // Son las 17:10: la de las 17:00 está en curso y se puede quitar.
      clock.advance(40 * MINUTE)
      const day = await help.setToday(actor('eva'), {
        windows: [{ start: '17:30', end: '18:00' }],
        maxMinutes: 60,
      })

      // La de las 18:00 está pedida: se queda aunque no venga en lo guardado.
      expect(day.windows).toEqual([{ start: '17:30', end: '18:30' }])

      // Rechazada la reserva, ya se puede soltar.
      await help.respond(actor('eva'), booking.id, false)
      expect((await help.setToday(actor('eva'), { windows: [], maxMinutes: 60 })).windows).toEqual(
        [],
      )
    })

    it('las peticiones por contestar y los rechazos salen en la ventana hasta que se ven', async () => {
      const { help } = services

      await help.setToday(actor('eva'), tarde)
      const first = await help.book(actor('ana'), { helper: 'eva', start: '18:00', minutes: 30 })
      const second = await help.book(actor('leo'), { helper: 'eva', start: '18:30', minutes: 30 })

      // `eva` tiene dos por contestar; `ana`, nada todavía.
      expect((await help.inbox(actor('eva'))).requests.map((one) => one.id)).toEqual([
        first.id,
        second.id,
      ])
      expect(await help.inboxCount(actor('ana'))).toBe(0)

      // Rechaza una: a `ana` le sale; `leo` anula la otra: le sale a `eva`.
      await help.respond(actor('eva'), first.id, false)
      await help.cancel(actor('leo'), second.id)
      expect(await help.inbox(actor('ana'))).toMatchObject({
        requests: [],
        news: [{ id: first.id, status: 'declined', peer: { login: 'eva' } }],
      })
      expect(await help.inbox(actor('eva'))).toMatchObject({
        requests: [],
        news: [{ id: second.id, status: 'cancelled' }],
      })

      // Visto, no vuelve a salir. Y solo lo da por visto a quien le toca.
      await help.seen(actor('eva'), first.id)
      expect(await help.inboxCount(actor('ana'))).toBe(1)
      await help.seen(actor('ana'), first.id)
      expect(await help.inboxCount(actor('ana'))).toBe(0)

      // Una petición cuya hora ya pasó no se queda esperando respuesta.
      const late = await help.book(actor('sol'), { helper: 'eva', start: '17:30', minutes: 30 })

      expect(await help.inboxCount(actor('eva'))).toBe(2)
      clock.advance(3 * HOUR)
      expect((await help.inbox(actor('eva'))).requests.map((one) => one.id)).not.toContain(late.id)
    })

    it('lo que ya tienes en el calendario tapa la guardia, no solo las correcciones', async () => {
      const { help, boards } = services
      // Una pizarra de 18:00 a 19:00 a la que va `eva`; y otra a la que no va.
      const at = (hours: number): string => new Date(TUESDAY_AFTERNOON + hours * HOUR).toISOString()
      const board = await boards.create(actor('sol'), {
        title: 'Punteros sin miedo',
        topic: 'punteros',
        place: 'Cluster 2',
        startsAt: at(1.5),
        endsAt: at(2.5),
        capacity: 5,
      })
      await boards.create(actor('sol'), {
        title: 'Otra que no le toca',
        topic: 'otra',
        place: 'Cluster 2',
        startsAt: at(0.5),
        endsAt: at(1),
        capacity: 5,
      })
      await boards.join(actor('eva'), board.id)

      const day = await help.setToday(actor('eva'), tarde)

      expect(day.busy).toEqual([{ start: '18:00', end: '19:00' }])
      // Nadie la puede reservar a esa hora, pero sí antes.
      await expectCode(
        help.book(actor('ana'), { helper: 'eva', start: '18:00', minutes: 30 }),
        'conflict',
      )
      expect(
        (await help.offers(actor('ana'))).find((offer) => offer.login === 'eva')?.freeStarts,
      ).toEqual(['17:00', '17:30'])

      // Quien organiza también está ocupado en la suya.
      expect((await help.today(actor('sol'))).busy).toEqual([
        { start: '17:00', end: '17:30' },
        { start: '18:00', end: '19:00' },
      ])
      // Y quien no va a ninguna, no.
      expect((await help.today(actor('leo'))).busy).toEqual([])
    })

    it('la guardia dice si sales de guardia: interruptor encendido y sentado en el campus', async () => {
      const { help, availability } = services

      expect((await help.today(actor('eva'))).presence).toEqual({ available: false, seat: null })

      await availability.set('eva', true)
      expect((await help.today(actor('eva'))).presence).toEqual({ available: true, seat: null })

      await community.seat({ eva: 'c1r2s3' })
      expect((await help.today(actor('eva'))).presence).toEqual({ available: true, seat: 'c1r2s3' })
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

      // Sin aceptar no hay sesión que valorar, ni códigos que validar.
      clock.advance(70 * MINUTE)
      await expectCode(
        services.meet.attendance(actor('eva'), `help:booking:${booking.id}`),
        'conflict',
      )
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

    it('si la cuota de 42 va justa, la agenda se sirve con lo guardado y se coge turno', async () => {
      const { help, quota } = services
      // Solo lo de cada persona: los eventos del campus se piden una vez para todo el mundo.
      const agendaCalls = (): number =>
        api.calls.filter((call) => AGENDA_CALL.test(call) && call.includes('/users/')).length

      // Con cuota, la guardia de `eva` lee su agenda de 42: tres peticiones.
      api.hourlyRemaining = 250
      await help.today(actor('eva'))
      expect(agendaCalls()).toBe(3)

      // Esa respuesta ya dijo que quedan 250: lo de `ana` espera, y su guardia sale igual.
      expect((await help.today(actor('ana'))).busy).toEqual([])
      expect(agendaCalls()).toBe(3)
      expect(await quota.statusFor('ana')).toMatchObject({
        level: 'tight',
        ticket: { number: 'A-001', ahead: 0 },
      })

      // Nadie pide nada, así que nadie se entera de que la cuota ha vuelto… hasta
      // que pasa la hora: lo que dijo 42 ya no vale y la cola pide lo de `ana`.
      expect(await quota.drain()).toBe(0)
      api.hourlyRemaining = 1200
      clock.advance(61 * MINUTE)
      expect(await quota.drain()).toBe(1)
      expect(agendaCalls()).toBe(6)
      expect(await quota.statusFor('ana')).toEqual({ level: 'ok', ticket: null })
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
})
