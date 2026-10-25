/**
 * Mundos separados en el calendario y en las salas de evento
 * (`docs/piscineros.md`): un estudiante no ve lo de la piscina ni a ningún
 * piscinero; un piscinero solo ve lo de la piscina y a los piscineros de su
 * campus.
 *
 * Montaje de `tests/helpers/community.ts`: servicios de verdad, SQLite en
 * memoria y una 42 de mentira que da los eventos y exámenes del campus.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { HOUR, MADRID, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

/** Un piscinero de Madrid. */
const pia = actor('pia', { pool: true })
const ana = actor('ana')

describe('mundos separados en el calendario y los eventos', () => {
  const community = useCommunity()
  let services: Community['services']

  /** Dentro de `hours` horas, en ISO. */
  const at = (hours: number): string => new Date(community.clock.now() + hours * HOUR).toISOString()
  const event = (id: number, cursus: number[] | null | undefined) => ({
    id,
    name: `Evento ${id}`,
    kind: 'conference',
    begin_at: at(20 + id / 1000),
    end_at: at(21 + id / 1000),
    ...(cursus === undefined ? {} : { cursus_ids: cursus }),
  })
  const range = (): [string, string] => [at(-24), at(24 * 7)]
  const idsOf = async (who: typeof ana): Promise<string[]> =>
    (await services.calendar.between(who, null, ...range())).events.map((entry) => entry.id)

  beforeEach(async () => {
    ;({ services } = community)
    // `pia` está en la piscina de octubre de Madrid.
    await services.poolMembers.enter(MADRID, {
      id: 900,
      login: 'pia',
      cursus_users: [{ cursus_id: 9, begin_at: '2026-10-01T08:00:00.000Z' }],
    })
    community.api.events.set(MADRID, [
      event(1, [21]),
      event(2, [9]),
      // Límite: de los dos cursus a la vez, lo ven los dos.
      event(3, [9, 21]),
      // Vacío o sin decir: como siempre, del 42cursus.
      event(4, []),
      event(5, undefined),
      event(6, null),
      // De otro cursus (Discovery), ni para unos ni para otros.
      event(7, [3]),
    ])
    community.api.exams.set(MADRID, [
      { id: 70, name: 'Exam Rank 02', begin_at: at(30), end_at: at(33), cursus: [{ id: 21 }] },
      { id: 71, name: 'C Piscine Exam 00', begin_at: at(30), end_at: at(34), cursus: [{ id: 9 }] },
    ])
  })

  describe('eventos y exámenes del campus', () => {
    it('un estudiante no recibe lo que es solo de la piscina', async () => {
      expect(await idsOf(ana)).toEqual([
        'event:1',
        'event:3',
        'event:4',
        'event:5',
        'event:6',
        'exam:70',
      ])
    })

    it('un piscinero solo recibe lo de la piscina', async () => {
      expect(await idsOf(pia)).toEqual(['event:2', 'event:3', 'exam:71'])
    })

    it('se guarda de qué cursus es cada uno, y NULL si 42 no lo dice', async () => {
      await idsOf(ana)

      const rows = await community.db.execute(
        'SELECT source, id, cursus FROM agenda_events ORDER BY source, id',
      )

      expect(rows.rows.map((row) => [row.source, row.id, row.cursus])).toEqual([
        ['event', 1, '[21]'],
        ['event', 2, '[9]'],
        ['event', 3, '[9,21]'],
        ['event', 4, '[]'],
        ['event', 5, null],
        ['event', 6, null],
        ['event', 7, '[3]'],
        ['exam', 70, '[21]'],
        ['exam', 71, '[9]'],
      ])
    })

    it('una fila de antes de la migración (sin cursus) es de estudiantes', async () => {
      // La primera lectura ya ha copiado el campus: lo que se escriba ahora se queda.
      await idsOf(ana)
      await community.db.execute({
        sql: `INSERT INTO agenda_events (source, id, campus_id, name, begin_at, end_at)
              VALUES ('event', 99, ?, 'De antes', ?, ?)`,
        args: [MADRID, at(40), at(41)],
      })

      expect(await idsOf(ana)).toContain('event:99')
      expect(await idsOf(pia)).not.toContain('event:99')
    })

    it('sin eventos en el campus, los dos calendarios salen vacíos de 42', async () => {
      community.api.events.set(MADRID, [])
      community.api.exams.set(MADRID, [])

      expect(await idsOf(ana)).toEqual([])
      expect(await idsOf(pia)).toEqual([])
    })

    it('un id de cursus que no es un número no se guarda', async () => {
      community.api.events.set(MADRID, [
        { ...event(8, [9]), cursus_ids: [9, 'x', 2.5] as unknown as number[] },
      ])
      community.api.exams.set(MADRID, [])

      expect(await idsOf(pia)).toEqual(['event:8'])
      expect(
        (await community.db.execute('SELECT cursus FROM agenda_events WHERE id = 8')).rows[0]
          ?.cursus,
      ).toBe('[9]')
    })
  })

  describe('salas y gente de los eventos', () => {
    const board = {
      title: 'Repaso de punteros',
      place: 'Cluster 1',
      capacity: 5,
    }
    const create = (who: typeof ana) =>
      services.boards.create(who, { ...board, startsAt: at(26), endsAt: at(27) })
    /** Alguien que ya estaba apuntado (de antes de separar los grupos): sin pasar por `join`. */
    const sneak = (id: number, login: string) =>
      community.db.execute({
        sql: 'INSERT INTO board_attendees (board_id, login, joined_at) VALUES (?, ?, ?)',
        args: [id, login, at(0)],
      })

    it('una pizarra de un piscinero no sale en el calendario de un estudiante', async () => {
      const mine = await create(pia)

      expect(await idsOf(ana)).not.toContain(`board:${mine.id}`)
      expect(await idsOf(pia)).toContain(`board:${mine.id}`)
    })

    it('un piscinero no se apunta a una pizarra de estudiantes, ni abre su sala aunque estuviera dentro', async () => {
      const theirs = await create(ana)

      await expectCode(services.boards.join(pia, theirs.id), 'not_found')
      await sneak(theirs.id, 'pia')

      await expectCode(services.meet.thread(pia, null, `board:${theirs.id}`), 'forbidden')
      await expectCode(
        services.meet.send(pia, null, { id: `board:${theirs.id}`, kind: 'text', body: 'Hola' }),
        'forbidden',
      )
      await expectCode(services.meet.attendance(pia, `board:${theirs.id}`), 'forbidden')
    })

    it('ni un estudiante la de un piscinero', async () => {
      const mine = await create(pia)

      await expectCode(services.boards.join(ana, mine.id), 'not_found')
      await sneak(mine.id, 'ana')

      await expectCode(services.meet.thread(ana, null, `board:${mine.id}`), 'forbidden')
    })

    it('en el chat de un evento no salen los mensajes ni el login de un piscinero', async () => {
      const theirs = await create(ana)
      const id = `board:${theirs.id}`

      await services.meet.send(ana, null, { id, kind: 'text', body: 'Traed portátil' })
      await community.db.execute({
        sql: `INSERT INTO event_messages (event_id, login, kind, body, created_at)
              VALUES (?, 'pia', 'text', 'Me cuelo', ?)`,
        args: [id, at(0)],
      })

      const thread = await services.meet.thread(ana, null, id)

      expect(thread.messages.map((message) => message.login)).toEqual(['ana'])
    })

    it('una conversación directa con un piscinero no sale en la lista de un estudiante', async () => {
      await community.db.execute({
        sql: `INSERT INTO event_messages (event_id, login, kind, body, created_at)
              VALUES ('dm:ana:pia', 'pia', 'text', 'Hola', ?)`,
        args: [at(0)],
      })

      expect((await services.meet.conversations(ana)).items).toEqual([])
      await expectCode(services.meet.thread(ana, null, 'dm:ana:pia'), 'forbidden')
      await expectCode(services.meet.thread(pia, null, 'dm:ana:pia'), 'forbidden')
    })

    it('al escribir en una sala no se avisa a nadie del otro mundo', async () => {
      const theirs = await create(ana)
      const id = `board:${theirs.id}`

      await sneak(theirs.id, 'pia')
      await services.boards.join(actor('leo'), theirs.id)
      await services.meet.send(ana, null, { id, kind: 'text', body: '¿Venís?' })

      const notices = await community.db.execute({
        sql: "SELECT login FROM notices WHERE kind = 'chat' AND ref = ?",
        args: [id],
      })

      expect(notices.rows.map((row) => row.login)).toEqual(['leo'])
    })
  })
})
