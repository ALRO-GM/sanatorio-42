/**
 * Tests del buzón de avisos: quién se entera de qué, y cuándo deja de contar.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { HOUR, MINUTE, TUESDAY_AFTERNOON, actor, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('buzón de avisos', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']

  beforeEach(() => {
    ;({ services, clock } = community)
  })

  /** Lo que hay sin leer en el buzón de alguien, resumido. */
  const inbox = async (login: string): Promise<string[]> =>
    (await services.notices.list(actor(login))).items
      .filter((notice) => !notice.read)
      .map((notice) => `${notice.kind} de ${notice.from ?? '-'}: ${notice.text ?? ''}`)

  const malloc = {
    title: 'malloc: dónde vive tu memoria',
    place: 'Cluster 1',
    startsAt: new Date(TUESDAY_AFTERNOON + 24 * HOUR).toISOString(),
    endsAt: new Date(TUESDAY_AFTERNOON + 25 * HOUR).toISOString(),
    capacity: 5,
  }

  it('quien manda algo al buzón se entera de la respuesta, y quien administra de que ha llegado', async () => {
    const { admin, notices } = services
    const boss = actor('eva', { admin: true })

    await admin.setRole(boss, { login: 'leo', admin: true })

    const idea = await admin.openTicket(actor('ana'), {
      kind: 'idea',
      subject: 'Modo oscuro',
      body: 'Para las noches de piscina',
    })

    // `leo` administra desde el panel: le llega. A `ana`, que es quien lo manda, no.
    expect(await inbox('leo')).toEqual(['ticket_new de ana: Modo oscuro'])
    expect(await inbox('ana')).toEqual([])

    await admin.answerTicket(boss, idea.id, { answer: 'Ya está hecho.' })

    expect(await notices.list(actor('ana'))).toMatchObject({
      unread: 1,
      items: [
        { kind: 'ticket_answered', ref: `ticket:${idea.id}`, from: 'eva', text: 'Modo oscuro' },
      ],
    })
    expect(await notices.unread('ana')).toBe(1)

    // Leerlo lo quita de la cuenta, pero sigue en el buzón.
    const [first] = (await notices.list(actor('ana'))).items

    expect(await notices.read(actor('ana'), { ids: [first?.id ?? 0] })).toMatchObject({
      unread: 0,
      items: [{ kind: 'ticket_answered', read: true }],
    })
    // Nadie lee los avisos de otra persona.
    await notices.read(actor('ana'), {})
    expect(await notices.unread('leo')).toBe(1)
  })

  it('los mensajes de un chat se juntan en un solo aviso, que se va al abrir el chat', async () => {
    const { boards, meet, notices } = services
    const board = await boards.create(actor('eva'), malloc)
    const id = `board:${board.id}`

    await boards.join(actor('ana'), board.id)
    await boards.join(actor('leo'), board.id)

    await meet.send(actor('eva'), null, { id, kind: 'text', body: 'Traed el portátil' })
    await meet.send(actor('eva'), null, { id, kind: 'late', minutes: 10, reason: 'transport' })
    // "Lo he visto" no avisa a nadie.
    await meet.send(actor('leo'), null, { id, kind: 'seen' })

    expect(await notices.list(actor('ana'))).toMatchObject({
      unread: 1,
      items: [{ kind: 'chat', ref: id, from: 'eva', count: 2 }],
    })
    // Quien escribe no se avisa a sí.
    expect(await inbox('eva')).toEqual([])

    // `ana` abre el chat: ya los ha visto.
    await meet.thread(actor('ana'), null, id)
    expect(await notices.unread('ana')).toBe(0)
    // `leo` escribió después de esos mensajes: también los tenía delante.
    expect(await notices.unread('leo')).toBe(0)

    // Lo siguiente que llegue es un aviso nuevo, que empieza a contar de cero.
    await meet.send(actor('leo'), null, { id, kind: 'text', body: '¿En qué sala?' })
    expect((await notices.list(actor('ana'))).items[0]).toMatchObject({
      from: 'leo',
      text: '¿En qué sala?',
      count: 1,
      read: false,
    })
  })

  it('las reservas de ayuda avisan a la otra parte en cada paso', async () => {
    const { help } = services

    await help.setToday(actor('eva'), {
      windows: [{ start: '17:00', end: '19:00' }],
      maxMinutes: 120,
    })

    const first = await help.book(actor('ana'), {
      helper: 'eva',
      projectId: 10,
      start: '17:00',
      minutes: 30,
    })

    expect(await inbox('eva')).toEqual(['booking_requested de ana: 17:00–17:30 · ft_printf'])

    await help.respond(actor('eva'), first.id, true)
    expect(await inbox('ana')).toEqual(['booking_accepted de eva: 17:00–17:30'])

    await help.cancel(actor('ana'), first.id)
    expect(await inbox('eva')).toContain('booking_cancelled de ana: 17:00–17:30')

    const second = await help.book(actor('leo'), { helper: 'eva', start: '18:00', minutes: 30 })

    await help.respond(actor('eva'), second.id, false)
    expect(await inbox('leo')).toEqual(['booking_declined de eva: 18:00–18:30'])
  })

  it('las dudas avisan a quien preguntó y a quien la resolvió', async () => {
    const { doubts } = services
    const doubt = await doubts.create(actor('ana'), 10, { body: '¿Cómo pruebo sin tester?' })

    // Responderse a una misma no avisa.
    await doubts.answer(actor('ana'), doubt.id, { body: 'Sigo atascada' })
    expect(await inbox('ana')).toEqual([])

    const answers = await doubts.answer(actor('eva'), doubt.id, { body: 'Con un main de prueba' })

    expect(await inbox('ana')).toEqual(['doubt_answered de eva: ¿Cómo pruebo sin tester?'])

    await doubts.setResolved(actor('ana'), doubt.id, {
      resolved: true,
      answerId: answers.at(-1)?.id,
    })
    expect(await inbox('eva')).toEqual(['doubt_solved de ana: ¿Cómo pruebo sin tester?'])
  })

  it('una pizarra que cambia de hora o se cancela avisa a quien iba', async () => {
    const { boards } = services
    const board = await boards.create(actor('eva'), malloc)

    await boards.join(actor('ana'), board.id)

    // Cambiar solo el título no molesta a nadie.
    await boards.update(actor('eva'), board.id, { ...malloc, title: 'malloc y free' })
    expect(await inbox('ana')).toEqual([])

    await boards.update(actor('eva'), board.id, { ...malloc, place: 'Cluster 3' })
    expect(await inbox('ana')).toEqual(['board_changed de eva: malloc: dónde vive tu memoria'])

    await boards.cancel(actor('eva'), board.id)
    expect(await inbox('ana')).toContain('board_cancelled de eva: malloc: dónde vive tu memoria')
  })

  it('en un grupo de terapia se avisa de quien se apunta y de que se cierra', async () => {
    const { therapy } = services
    const group = await therapy.create(actor('ana'), {
      projectId: 10,
      place: 'Cluster 2',
      dates: ['2026-10-08'],
      start: '16:00',
      end: '18:00',
      capacity: 4,
    })

    await therapy.join(actor('leo'), group.id)
    expect(await inbox('ana')).toEqual(['group_joined de leo: ft_printf'])

    await therapy.close(actor('ana'), group.id)
    expect(await inbox('leo')).toEqual(['group_closed de ana: ft_printf'])
  })

  it('los avisos leídos se borran al mes, y los que nadie lee a los tres', async () => {
    const { notices } = services

    await notices.add({ to: ['ana'], kind: 'chat', ref: 'board:1', from: 'eva' })
    await notices.add({ to: ['leo'], kind: 'chat', ref: 'board:1', from: 'eva' })
    await notices.read(actor('ana'), {})

    clock.advance(31 * 24 * HOUR + MINUTE)
    expect(await notices.purge()).toBe(1)
    expect(await notices.unread('leo')).toBe(1)

    clock.advance(60 * 24 * HOUR)
    expect(await notices.purge()).toBe(1)
  })
})
