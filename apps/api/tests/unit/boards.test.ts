/**
 * Tests de las pizarras, el chat de los eventos y la asistencia con códigos.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { unionMinutes, validSpan, windowOf } from '../../src/modules/attendance/attendance.rules.js'
import {
  MINUTE,
  HOUR,
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

  beforeEach(() => {
    ;({ services, clock } = community)
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

    it('no se puede proponer con más de dos meses de antelación', async () => {
      const { boards } = services

      // Dentro de dos meses, sí.
      const near = await boards.create(actor('eva'), malloc(24 * 60))

      // Un año equivocado al escribir la fecha, no.
      await expectCode(boards.create(actor('eva'), malloc(24 * 365 * 3)), 'invalid_input')
      await expectCode(boards.create(actor('eva'), malloc(24 * 63)), 'invalid_input')
      // Ni llevándose allí una que ya existe.
      await expectCode(boards.update(actor('eva'), near.id, malloc(24 * 200)), 'invalid_input')
      await expect(boards.update(actor('eva'), near.id, malloc(24 * 30))).resolves.toMatchObject({
        id: near.id,
      })
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
      // Al refrescar se piden solo los posteriores al último que ya se tiene.
      const second = thread.messages[1]?.id

      expect((await meet.thread(actor('ana'), null, id, second)).messages).toMatchObject([
        { login: 'eva', kind: 'text' },
      ])
      expect((await meet.thread(actor('ana'), null, id, '999')).messages).toEqual([])
      await expectCode(meet.thread(actor('ana'), null, id, 'x'), 'invalid_input')

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

    it('ni los mensajes ni el registro de códigos se borran solos: los quita quien administra', async () => {
      const { boards, meet, attendance } = services
      const wipe = services.admin.wipe.bind(services.admin)
      const board = await boards.create(actor('eva'), malloc())
      const id = `board:${board.id}`
      const admin = actor('eva', { admin: true })

      await boards.join(actor('ana'), board.id)
      await meet.send(actor('ana'), null, { id, kind: 'text', body: 'viejo' })
      clock.advance(24 * HOUR)
      await validate(id, 'eva', 'ana', 'start')
      clock.advance(60 * MINUTE)
      await validate(id, 'eva', 'ana', 'end')

      clock.advance(88 * 24 * HOUR)
      // La primera pizarra ya pasó: el mensaje reciente va en otra.
      const later = await boards.create(actor('eva'), malloc(24 * 92))

      await meet.send(actor('eva'), null, { id: `board:${later.id}`, kind: 'text', body: 'nuevo' })

      // Pasa más de un año y sigue todo.
      clock.advance(400 * 24 * HOUR)
      expect((await meet.log(admin)).map((message) => message.body)).toContain('viejo')
      expect(await meet.checkins(admin, id)).toHaveLength(2)

      // Se borran los mensajes de antes de una fecha: el reciente se queda.
      const texts = async (): Promise<(string | null)[]> =>
        (await meet.log(admin))
          .filter((message) => message.kind === 'text')
          .map((message) => message.body)

      expect(await texts()).toEqual(expect.arrayContaining(['viejo', 'nuevo']))
      await wipe(admin, { kind: 'messages', before: '2026-12-01' }, true)
      expect(await texts()).toEqual(['nuevo'])
      // O los de una persona, de una fecha en adelante.
      expect(
        await wipe(admin, { kind: 'messages', login: 'ana', from: '2026-01-01' }, true),
      ).toEqual({
        rows: 0,
      })
      expect(
        await wipe(admin, { kind: 'messages', login: 'eva', from: '2026-12-01' }, false),
      ).toEqual({
        rows: 1,
      })

      // El registro de intentos, entero; el tiempo validado no es de este registro.
      expect(await wipe(admin, { kind: 'checkins' }, true)).toEqual({ rows: 2 })
      expect(await meet.checkins(admin, id)).toEqual([])
      expect(await attendance.attended(id)).toEqual(['ana'])
    })

    it('un aviso de evento hay que contestarlo: si no, a la media hora se da por no asistido', async () => {
      const { boards, meet } = services
      const first = await boards.create(actor('eva'), { ...malloc(1), capacity: 5 })
      const second = await boards.create(actor('eva'), { ...malloc(2), capacity: 5 })
      const ids = [`board:${first.id}`, `board:${second.id}`]
      const states = async (login: string): Promise<string[]> =>
        (await meet.alerts(actor(login), null)).alerts.map(
          (alert) => `${alert.event.id} ${alert.state}`,
        )

      await boards.join(actor('ana'), first.id)
      await boards.join(actor('ana'), second.id)
      // `leo` no va a ninguna: no tiene nada que contestar.
      expect(await states('leo')).toEqual([])

      // Las dos pendientes, por orden de inicio: la primera que llega, la primera que sale.
      expect(await states('ana')).toEqual([`${ids[0]} pending`, `${ids[1]} pending`])
      // Se pregunte las veces que se pregunte (otra pestaña, otro día), siguen ahí.
      expect(await states('ana')).toHaveLength(2)

      // Contestar a una la quita de la lista; vale cualquiera de las tres respuestas.
      await meet.send(actor('ana'), null, { id: ids[0], kind: 'late', minutes: 10 })
      expect(await states('ana')).toEqual([`${ids[1]} pending`])
      // Un mensaje de texto no es una respuesta.
      await meet.send(actor('ana'), null, { id: ids[1], kind: 'text', body: 'a ver si llego' })
      expect(await states('ana')).toEqual([`${ids[1]} pending`])

      // Empieza la segunda (a las dos horas) y pasan 29 minutos: todavía se puede contestar.
      clock.advance(2 * HOUR + 29 * MINUTE)
      expect(await states('ana')).toEqual([`${ids[1]} pending`])

      // A los 31 ya no: se le da por no asistida y se le dice.
      clock.advance(2 * MINUTE)
      expect(await states('ana')).toEqual([`${ids[1]} missed`])
      expect((await meet.thread(actor('eva'), null, ids[1])).messages.at(-1)).toMatchObject({
        login: 'ana',
        kind: 'absent',
        reason: 'missed',
      })
      // Sigue saliendo hasta que lo cierra, y solo se apunta una vez.
      expect(await states('ana')).toEqual([`${ids[1]} missed`])
      expect(
        (await meet.thread(actor('eva'), null, ids[1])).messages.filter(
          (message) => message.kind === 'absent',
        ),
      ).toHaveLength(1)

      // Nadie cierra el aviso de otra persona.
      await meet.ackAlert(actor('leo'), ids[1])
      expect(await states('ana')).toHaveLength(1)
      await meet.ackAlert(actor('ana'), ids[1])
      expect(await states('ana')).toEqual([])
    })

    it('nadie inunda un chat: ocho mensajes por minuto y evento', async () => {
      const { boards, meet } = services
      const board = await boards.create(actor('eva'), malloc())
      const id = `board:${board.id}`

      await boards.join(actor('ana'), board.id)

      for (let sent = 0; sent < 8; sent += 1) {
        await meet.send(actor('ana'), null, { id, kind: 'text', body: `mensaje ${sent}` })
      }
      await expectCode(
        meet.send(actor('ana'), null, { id, kind: 'text', body: 'otro' }),
        'conflict',
      )
      // El tope es de cada persona, y se pasa solo.
      await meet.send(actor('eva'), null, { id, kind: 'text', body: 'tranquila' })
      clock.advance(61_000)
      await meet.send(actor('ana'), null, { id, kind: 'text', body: 'ya' })
      expect((await meet.thread(actor('eva'), null, id)).messages).toHaveLength(10)
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

      // Quien asiste no los ve, pero sí cuándo vale cada uno.
      expect(await meet.attendance(actor('ana'), id)).toEqual({
        role: 'guest',
        codes: null,
        mine: null,
        people: [],
        window: {
          startFrom: new Date(Date.parse(board.startsAt) - 10 * MINUTE).toISOString(),
          startUntil: new Date(Date.parse(board.startsAt) + 30 * MINUTE).toISOString(),
          endUntil: new Date(Date.parse(board.endsAt) + 30 * MINUTE).toISOString(),
          minStay: 10,
        },
        attemptsLeft: 5,
      })

      // Falta un día: el código de inicio todavía no vale.
      await expectCode(meet.checkin(actor('ana'), { id, code: codes.start }), 'conflict')

      clock.advance(24 * HOUR - 5 * MINUTE)

      // No se puede terminar sin haber empezado, ni con un código inventado.
      await expectCode(meet.checkin(actor('ana'), { id, code: codes.end }), 'conflict')
      await expectCode(meet.checkin(actor('ana'), { id, code: 'ZZZZ' }), 'invalid_input')
      // Ni validar quien la imparte, ni quien no está apuntado.
      await expectCode(meet.checkin(actor('eva'), { id, code: codes.start }), 'conflict')
      await expectCode(meet.checkin(actor('leo'), { id, code: codes.start }), 'forbidden')

      const started = await meet.checkin(actor('ana'), { id, code: codes.start.toLowerCase() })

      // Con solo el de inicio todavía no hay duración: no vale.
      expect(started).toMatchObject({ phase: 'start', presence: { endedAt: null, minutes: null } })
      // Y el de fin no vale nada más empezar.
      await expectCode(meet.checkin(actor('ana'), { id, code: codes.end }), 'conflict')

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

    it('quien imparte gana XP cuando ya ha pasado y alguien validó los dos códigos, y solo una vez', async () => {
      const { boards, xp } = services
      const board = await boards.create(actor('eva'), malloc())
      const id = `board:${board.id}`
      await boards.join(actor('ana'), board.id)

      // Antes de que ocurra, nada.
      await boards.settle()
      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)

      clock.advance(24 * HOUR)
      await validate(id, 'eva', 'ana', 'start')
      clock.advance(90 * MINUTE)
      await validate(id, 'eva', 'ana', 'end')

      // Acaba de terminar, pero el código de fin aún no ha caducado: se espera.
      await boards.settle()
      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)

      clock.advance(31 * MINUTE)
      await boards.settle()
      await boards.settle()

      const eva = await xp.expediente(actor('eva'))
      expect(eva.xp.total).toBe(50)
      expect(eva.achievements.find((entry) => entry.id === 'board_teacher')?.unlocked).toBe(true)
    })

    it('una pizarra a la que no va nadie no da XP, y apuntarse sin validar los códigos tampoco', async () => {
      const { boards, xp } = services
      await boards.create(actor('eva'), malloc())
      const second = await boards.create(actor('eva'), malloc(30))
      const id = `board:${second.id}`

      // `ana` se apunta a la segunda y valida el inicio, pero no el fin.
      await boards.join(actor('ana'), second.id)
      clock.advance(30 * HOUR)
      await validate(id, 'eva', 'ana', 'start')

      clock.advance(48 * HOUR)
      await boards.settle()

      expect((await xp.expediente(actor('eva'))).xp.total).toBe(0)
    })

    describe('tiempo validado', () => {
      /** Una pizarra de `eva` de hora y media, con el reloj puesto `offset` antes o después de su inicio. */
      const boardAt = async (
        guests: string[],
        offset = 0,
      ): Promise<{ id: string; startsAt: number }> => {
        const { boards } = services
        const board = await boards.create(actor('eva'), { ...malloc(), capacity: 5 })

        for (const guest of guests) {
          await boards.join(actor(guest), board.id)
        }

        clock.advance(24 * HOUR + offset)

        return { id: `board:${board.id}`, startsAt: Date.parse(board.startsAt) }
      }

      it('las cuentas: se recorta al horario, con margen, y nunca pasa de lo previsto', () => {
        const schedule = { startsAt: 100 * MINUTE, endsAt: 190 * MINUTE }

        // Validar un cuarto de hora antes no regala un cuarto de hora: solo el margen.
        expect(validSpan(85 * MINUTE, 150 * MINUTE, schedule)).toEqual({
          from: 90 * MINUTE,
          to: 150 * MINUTE,
          minutes: 60,
        })
        // De punta a punta con los dos márgenes serían 110: cuenta la duración prevista.
        expect(validSpan(80 * MINUTE, 220 * MINUTE, schedule).minutes).toBe(90)
        // Los minutos a medias no cuentan.
        expect(validSpan(100 * MINUTE, 130 * MINUTE + 59_000, schedule).minutes).toBe(30)
        // Un evento corto admite menos retraso: la mitad de lo que dura.
        expect(windowOf({ startsAt: 0, endsAt: 30 * MINUTE })).toEqual({
          startFrom: -10 * MINUTE,
          startUntil: 15 * MINUTE,
          endUntil: 60 * MINUTE,
        })
        // Quien organiza: el rato con alguien delante, sin contar dos veces a quien coincide.
        expect(
          unionMinutes([
            { from: 0, to: 60 * MINUTE },
            { from: 20 * MINUTE, to: 90 * MINUTE },
            { from: 120 * MINUTE, to: 130 * MINUTE },
          ]),
        ).toBe(100)
      })

      it('llegar tarde cuenta desde que llegas, y demasiado tarde ya no cuenta', async () => {
        const { id } = await boardAt(['ana', 'leo'], 20 * MINUTE)

        await validate(id, 'eva', 'ana', 'start')

        // A los 31 minutos el código de inicio ha caducado.
        clock.advance(11 * MINUTE)
        await expectCode(validate(id, 'eva', 'leo', 'start'), 'conflict')

        clock.advance(59 * MINUTE) // justo al terminar
        expect((await validate(id, 'eva', 'ana', 'end')).presence.minutes).toBe(70)
        await expectCode(validate(id, 'eva', 'leo', 'end'), 'conflict')
      })

      it('irse antes cuenta hasta que te vas', async () => {
        const { id } = await boardAt(['ana'])

        await validate(id, 'eva', 'ana', 'start')
        clock.advance(25 * MINUTE)

        expect((await validate(id, 'eva', 'ana', 'end')).presence.minutes).toBe(25)
      })

      it('validar el de fin fuera de plazo no cuenta nada', async () => {
        const { id } = await boardAt(['ana'])

        await validate(id, 'eva', 'ana', 'start')

        // Hasta media hora después de terminar se admite, pero el tiempo no pasa del previsto…
        clock.advance(90 * MINUTE + 31 * MINUTE)
        await expectCode(validate(id, 'eva', 'ana', 'end'), 'conflict')

        expect((await services.meet.attendance(actor('ana'), id)).mine).toMatchObject({
          endedAt: null,
          minutes: null,
        })
        expect(await services.attendance.attended(id)).toEqual([])
      })

      it('validar tarde el de fin, pero en plazo, no suma más que lo previsto', async () => {
        const { id } = await boardAt(['ana'], -10 * MINUTE)

        await validate(id, 'eva', 'ana', 'start')
        clock.advance(10 * MINUTE + 90 * MINUTE + 25 * MINUTE)

        expect((await validate(id, 'eva', 'ana', 'end')).presence.minutes).toBe(90)
      })

      it('repetir un código no mueve nada', async () => {
        const { id } = await boardAt(['ana'])

        await validate(id, 'eva', 'ana', 'start')
        clock.advance(40 * MINUTE)
        const ended = await validate(id, 'eva', 'ana', 'end')

        clock.advance(30 * MINUTE)
        expect(await validate(id, 'eva', 'ana', 'start')).toMatchObject({
          presence: ended.presence,
        })
        expect(await validate(id, 'eva', 'ana', 'end')).toEqual(ended)
        expect(ended.presence.minutes).toBe(40)
      })

      it('los códigos no se adivinan probando: cinco fallos y se acabó', async () => {
        const { meet } = services
        const { id } = await boardAt(['ana', 'leo'])
        const codes = (await meet.attendance(actor('eva'), id)).codes ?? { start: '', end: '' }
        const wrong = ['2222', '3333', '4444', '5555', '6666'].filter(
          (code) => code !== codes.start && code !== codes.end,
        )

        for (const code of wrong) {
          await expectCode(meet.checkin(actor('ana'), { id, code }), 'invalid_input')
        }

        expect((await meet.attendance(actor('ana'), id)).attemptsLeft).toBe(0)
        // Ni con el bueno.
        await expectCode(meet.checkin(actor('ana'), { id, code: codes.start }), 'forbidden')
        // El tope es de cada persona: `leo` valida sin problema.
        await meet.checkin(actor('leo'), { id, code: codes.start })

        // Todo queda en el registro, y solo lo lee quien administra.
        await expectCode(meet.checkins(actor('eva'), id), 'forbidden')
        expect(
          (await meet.checkins(actor('eva', { admin: true }), id)).map((entry) => [
            entry.login,
            entry.phase,
            entry.outcome,
          ]),
        ).toEqual([
          ...wrong.map(() => ['ana', null, 'wrong_code']),
          ['ana', null, 'locked'],
          ['leo', 'start', 'ok'],
        ])
      })

      it('el informe da a cada quien su tiempo, y a quien imparte el rato con alguien delante', async () => {
        const { meet } = services
        const { id, startsAt } = await boardAt(['ana', 'leo'])

        // `ana`: de 0 a 60. `leo`: de 20 a 90.
        await validate(id, 'eva', 'ana', 'start')
        clock.advance(20 * MINUTE)
        await validate(id, 'eva', 'leo', 'start')
        clock.advance(40 * MINUTE)
        await validate(id, 'eva', 'ana', 'end')
        clock.advance(30 * MINUTE)
        await validate(id, 'eva', 'leo', 'end')

        const at = (minutes: number): string => new Date(startsAt + minutes * MINUTE).toISOString()
        const common = {
          eventId: id,
          kind: 'board',
          title: 'malloc: dónde vive tu memoria',
          day: '2026-10-07',
          scheduledMinutes: 90,
        }
        const admin = actor('otro', { admin: true })

        expect(await meet.report(admin, { login: 'all' })).toEqual({
          from: '2026-09-08',
          to: '2026-10-07',
          totalMinutes: 220,
          rows: [
            {
              ...common,
              login: 'ana',
              role: 'guest',
              from: at(0),
              to: at(60),
              minutes: 60,
              with: ['eva'],
            },
            {
              ...common,
              login: 'eva',
              role: 'host',
              from: at(0),
              to: at(90),
              minutes: 90,
              with: ['ana', 'leo'],
            },
            {
              ...common,
              login: 'leo',
              role: 'guest',
              from: at(20),
              to: at(90),
              minutes: 70,
              with: ['eva'],
            },
          ],
        })

        // Cada quien ve lo suyo; lo de otra persona, solo quien administra.
        expect((await meet.report(actor('leo'), {})).rows).toMatchObject([
          { login: 'leo', minutes: 70 },
        ])
        expect((await meet.report(actor('eva'), {})).totalMinutes).toBe(90)
        await expectCode(meet.report(actor('leo'), { login: 'ana' }), 'forbidden')
        expect((await meet.report(admin, { login: 'ana' })).totalMinutes).toBe(60)
        // Fuera del periodo no sale nada, y un periodo al revés no vale.
        expect((await meet.report(admin, { login: 'all', to: '2026-10-06' })).rows).toEqual([])
        await expectCode(
          meet.report(admin, { from: '2026-10-08', to: '2026-10-07' }),
          'invalid_input',
        )

        // En CSV, con las horas del campus (16:30 en Madrid).
        // La última línea es el código de verificación, el mismo que va en el nombre.
        const issued = await meet.reportCsv(actor('leo'), {})

        expect(issued.code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
        expect(issued.fileName).toMatch(
          new RegExp(
            `^horas-validadas_leo_\\d{4}-\\d{2}-\\d{2}_\\d{4}-\\d{2}-\\d{2}_${issued.code}\\.csv$`,
          ),
        )
        expect(issued.csv.split('\r\n')).toEqual([
          '\uFEFF"login";"rol";"tipo";"evento";"titulo";"fecha";"inicio";"fin";"minutos_validados";"minutos_previstos";"con"',
          `"leo";"asiste";"pizarra";"${id}";"malloc: dónde vive tu memoria";"2026-10-07";"16:50";"18:00";"70";"90";"eva"`,
          `"codigo_de_verificacion";"${issued.code}"`,
          '',
        ])
      })

      it('un título que parece una fórmula no se ejecuta al abrir el CSV', async () => {
        const { boards, meet } = services
        const board = await boards.create(actor('eva'), { ...malloc(), title: '=HYPERLINK("x")' })
        const id = `board:${board.id}`

        await boards.join(actor('ana'), board.id)
        clock.advance(24 * HOUR)
        await validate(id, 'eva', 'ana', 'start')
        clock.advance(30 * MINUTE)
        await validate(id, 'eva', 'ana', 'end')

        expect((await meet.reportCsv(actor('ana'), {})).csv).toContain(`"'=HYPERLINK(""x"")"`)
      })

      it('una sesión de ayuda cuenta el tiempo de las dos personas', async () => {
        const { meet } = services

        await helpSession('ana')

        // De 17:00 a 17:30, aunque el código de fin se validara a las 17:35.
        expect((await meet.report(actor('eva'), {})).rows).toMatchObject([
          {
            login: 'eva',
            role: 'host',
            kind: 'help',
            title: 'ft_printf',
            minutes: 30,
            with: ['ana'],
          },
        ])
        expect((await meet.report(actor('ana'), {})).rows).toMatchObject([
          { login: 'ana', role: 'guest', minutes: 30, scheduledMinutes: 30, with: ['eva'] },
        ])
      })
    })

    it('solo la cambia quien la imparte; quien modera puede apuntarse o retirarla', async () => {
      const { boards } = services
      const board = await boards.create(actor('eva'), malloc())
      const boss = actor('mod', { admin: true })

      await expectCode(boards.update(boss, board.id, malloc()), 'forbidden')
      // Para quien modera es una pizarra más: se apunta como cualquiera.
      expect(await boards.list(boss)).toMatchObject([
        { id: board.id, mine: false, canCancel: true, joined: false },
      ])
      await boards.join(boss, board.id)
      expect(await boards.list(boss)).toMatchObject([{ joined: true, attendees: 1 }])
      expect(await boards.list(actor('eva'))).toMatchObject([{ mine: true, canCancel: true }])
      expect(await boards.list(actor('ana'))).toMatchObject([{ mine: false, canCancel: false }])
      await boards.leave(boss, board.id)
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
