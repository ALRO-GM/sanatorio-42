/**
 * Lo cifrado sigue funcionando (`docs/cifrado.md`): en la base solo hay
 * cifrado, y por la app sale el texto de siempre. Chat y conversaciones,
 * avisos, buzón y bloqueos, notas de las reservas y de la agenda, personas
 * ocultas, la descarga de datos y la anonimización.
 *
 * Familias de `docs/tests.md`: normal (cada columna), vacío (opcionales sin
 * texto siguen en `NULL`), imprevisible (una fila de antes en claro se lee; una
 * tocada da error), permisos (la descarga es de su dueño: quien ayudó no se
 * lleva la nota de quien pidió). Lo enorme y la clave errónea están en
 * `fields.test.ts` y `seal-existing.test.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { devFieldCipher, SealedFieldError } from '../../src/core/crypto/fields.js'
import { toText } from '../../src/core/db/rows.js'
import { createAgendaRepository } from '../../src/modules/agenda/agenda.repository.js'
import { createHelpRepository } from '../../src/modules/help/help.repository.js'
import { createHiddenService } from '../../src/modules/pool/hidden.service.js'
import { actor, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

/** Lo que hay guardado de verdad en una columna, sin pasar por la app. */
async function stored(db: Community['db'], sql: string): Promise<unknown[]> {
  return (await db.execute(sql)).rows.map((row) => Object.values(row)[0])
}

const SEALED = /^v1:[A-Za-z0-9_-]{8}:/

describe('columnas cifradas', () => {
  const community = useCommunity()
  let db: Community['db']
  let services: Community['services']

  beforeEach(() => {
    ;({ db, services } = community)
  })

  const ADMIN = actor('root', { admin: true })

  it('chat: en la base va cifrado; el hilo, la bandeja, el aviso y el registro dan el texto', async () => {
    await services.meet.send(actor('ana'), null, {
      id: 'dm:ana:eva',
      kind: 'text',
      body: '¿Me echas un ojo al malloc?',
    })

    const [body] = await stored(db, 'SELECT body FROM event_messages')

    expect(body).toMatch(SEALED)
    expect(String(body)).not.toContain('malloc')

    const thread = await services.meet.thread(actor('eva'), null, 'dm:ana:eva')

    expect(thread.messages.map((message) => message.body)).toEqual(['¿Me echas un ojo al malloc?'])

    const inbox = await services.meet.conversations(actor('eva'))

    expect(inbox.items.find((item) => item.id === 'dm:ana:eva')?.last?.body).toBe(
      '¿Me echas un ojo al malloc?',
    )

    // El aviso lleva un trozo del mensaje: también cifrado.
    const [noticeText] = await stored(db, "SELECT text FROM notices WHERE kind = 'chat'")

    expect(noticeText).toMatch(SEALED)
    expect((await services.notices.list(actor('eva'))).items[0]?.text).toBe(
      '¿Me echas un ojo al malloc?',
    )

    // Moderación: quien administra lee el texto, no el cifrado.
    expect((await services.meet.log(ADMIN)).map((entry) => entry.body)).toEqual([
      '¿Me echas un ojo al malloc?',
    ])
  })

  it('un aviso sin texto («lo he visto») sigue sin cuerpo, no con un cifrado vacío', async () => {
    await services.meet.send(actor('ana'), null, { id: 'dm:ana:eva', kind: 'seen' })

    expect(await stored(db, 'SELECT body FROM event_messages')).toEqual([null])
  })

  it('un mensaje de antes del cifrado, en claro, se sigue leyendo', async () => {
    await db.execute(
      `INSERT INTO event_messages (event_id, login, kind, body, created_at)
       VALUES ('dm:ana:eva', 'ana', 'text', 'de antes', '2026-10-01T10:00:00.000Z')`,
    )

    const thread = await services.meet.thread(actor('eva'), null, 'dm:ana:eva')

    expect(thread.messages.map((message) => message.body)).toEqual(['de antes'])
  })

  it('un mensaje tocado en la base no se enseña como si nada: da error', async () => {
    await services.meet.send(actor('ana'), null, { id: 'dm:ana:eva', kind: 'text', body: 'hola' })
    // Se cambia un carácter de los datos cifrados (el cuarto trozo).
    await db.execute(
      `UPDATE event_messages SET body =
         substr(body, 1, 36) || (CASE substr(body, 37, 1) WHEN 'A' THEN 'B' ELSE 'A' END)
         || substr(body, 38)`,
    )

    await expect(services.meet.thread(actor('eva'), null, 'dm:ana:eva')).rejects.toThrow(
      SealedFieldError,
    )
  })

  it('buzón: incidencia, sugerencia y respuesta van cifradas y se leen en claro', async () => {
    const ticket = await services.admin.openTicket(actor('ana'), {
      kind: 'issue',
      subject: 'El mapa no carga',
      body: 'Desde ayer el mapa se queda en blanco en el cluster 3',
    })
    const idea = await services.admin.openSuggestion(actor('ana'), {
      problem: 'La lista es muy larga',
      proposal: 'Un buscador arriba',
      place: {
        section: 'tablon',
        label: 'Lista de proyectos',
        detail: null,
        selector: 'main > div.block',
        hash: '#/tablon',
        viewport: { width: 390, height: 844 },
        theme: 'classic-dark',
        lang: 'es',
        mode: 'normal',
      },
    })

    expect(idea.proposal).toBe('Un buscador arriba')

    await services.admin.answerTicket(ADMIN, ticket.id, { answer: 'Arreglado, gracias' })

    for (const column of ['subject', 'body', 'answer']) {
      const [value] = await stored(db, `SELECT ${column} FROM tickets WHERE id = ${ticket.id}`)

      expect(value, column).toMatch(SEALED)
    }
    expect(await stored(db, `SELECT proposal FROM tickets WHERE id = ${idea.id}`)).toEqual([
      expect.stringMatching(SEALED),
    ])
    // Sin propuesta, sigue en `NULL`.
    expect(await stored(db, `SELECT proposal FROM tickets WHERE id = ${ticket.id}`)).toEqual([null])

    const mine = await services.admin.myTickets(actor('ana'))
    const answered = mine.find((entry) => entry.id === ticket.id)

    expect(answered?.subject).toBe('El mapa no carga')
    expect(answered?.body).toBe('Desde ayer el mapa se queda en blanco en el cluster 3')
    expect(answered?.answer).toBe('Arreglado, gracias')
    expect((await services.admin.tickets(ADMIN)).map((entry) => entry.subject)).toContain(
      'El mapa no carga',
    )
  })

  it('bloqueo: el motivo va cifrado y la persona bloqueada lo lee', async () => {
    await services.admin.block(ADMIN, { login: 'leo', reason: 'Spam en los chats' })

    expect(await stored(db, 'SELECT reason FROM user_blocks')).toEqual([
      expect.stringMatching(SEALED),
    ])
    expect((await services.admin.accessOf('leo')).block?.reason).toBe('Spam en los chats')
    expect((await services.admin.people(ADMIN)).blocks[0]?.reason).toBe('Spam en los chats')
  })

  it('reservas de ayuda: la nota va cifrada, y sin nota sigue en NULL', async () => {
    const help = createHelpRepository(db, devFieldCipher)
    const base = {
      campusId: 22,
      helper: 'eva',
      requester: 'ana',
      projectId: 10,
      day: '2026-10-07',
      start: 17 * 60,
      minutes: 30,
    }
    const withNote = await help.create({ ...base, note: 'Me peta el printf con %p' })
    const without = await help.create({ ...base, start: 18 * 60, note: null })

    expect(await stored(db, `SELECT note FROM help_bookings WHERE id = ${withNote}`)).toEqual([
      expect.stringMatching(SEALED),
    ])
    expect((await help.booking(withNote))?.note).toBe('Me peta el printf con %p')
    expect((await help.booking(without))?.note).toBeNull()
  })

  it('agenda: lo escrito a mano va cifrado; lo elegido de las listas, no', async () => {
    const agenda = createAgendaRepository(db, devFieldCipher)
    const at = '2026-10-06T14:30:00.000Z'
    const goalId = await agenda.create(
      {
        login: 'ana',
        campusId: 22,
        projectId: 10,
        projectName: 'ft_printf',
        projectKind: 'c',
        targetDay: '2026-10-09',
        targetTime: null,
        progress: 0,
        note: 'Sin prisa',
      },
      [],
      at,
    )

    await agenda.addCheckpoint(goalId, 'ana', { key: null, text: 'Leer la norma' })

    const goal = await agenda.goal(goalId)

    if (goal === null) throw new Error('la meta no se ha guardado')

    await agenda.saveEntry(
      goal,
      {
        kind: 'daily',
        day: '2026-10-06',
        plan: [],
        outcome: 'partial',
        problem: 'other',
        problemOther: 'Me distraje',
        solution: 'other',
        solutionOther: 'Móvil fuera',
        progress: 20,
        note: 'Mañana más',
      },
      at,
    )

    expect(await stored(db, 'SELECT note FROM scrum_goals')).toEqual([
      expect.stringMatching(SEALED),
    ])
    expect(await stored(db, 'SELECT text FROM scrum_checkpoints')).toEqual([
      expect.stringMatching(SEALED),
    ])
    expect(await stored(db, 'SELECT outcome FROM scrum_entries')).toEqual(['partial'])
    expect(goal.note).toBe('Sin prisa')
    expect((await agenda.checkpointsOf([goalId])).get(goalId)?.[0]?.text).toBe('Leer la norma')

    const [entry] = (await agenda.entriesOf([goalId], 5)).get(goalId) ?? []

    expect([entry?.problemOther, entry?.solutionOther, entry?.note]).toEqual([
      'Me distraje',
      'Móvil fuera',
      'Mañana más',
    ])
  })

  it('personas ocultas: el motivo va cifrado y el panel lo lee', async () => {
    const hidden = createHiddenService({ db, fields: devFieldCipher })
    const list = await hidden.hide(ADMIN, 'leo', {
      fromStudents: true,
      fromPool: false,
      reason: 'Cuenta de pruebas del staff',
    })

    expect(list[0]?.reason).toBe('Cuenta de pruebas del staff')
    expect(await stored(db, 'SELECT reason FROM hidden_people')).toEqual([
      expect.stringMatching(SEALED),
    ])
  })

  it('la descarga da a cada cual su texto en claro, y la nota solo a quien la escribió', async () => {
    await services.meet.send(actor('ana'), null, {
      id: 'dm:ana:eva',
      kind: 'text',
      body: 'Gracias por lo de ayer',
    })
    await createHelpRepository(db, devFieldCipher).create({
      campusId: 22,
      helper: 'eva',
      requester: 'ana',
      projectId: 10,
      day: '2026-10-07',
      start: 17 * 60,
      minutes: 30,
      note: 'Nota de ana',
    })

    const mine = await services.legal.export(actor('ana'), null)

    expect(mine.tables.event_messages?.rows.map((row) => row.body)).toEqual([
      'Gracias por lo de ayer',
    ])
    expect(mine.tables.help_bookings?.rows[0]?.note).toBe('Nota de ana')

    // Quien ayudó se lleva su parte de la reserva, sin la nota.
    const helper = await services.legal.export(actor('eva'), null)

    expect(helper.tables.help_bookings?.rows[0]).not.toHaveProperty('note')
    // Y el aviso que recibió, con el trozo del mensaje en claro.
    expect(helper.tables.notices?.rows[0]?.text).toBe('Gracias por lo de ayer')
  })

  it('anonimizar no toca el texto: sigue cifrado y se lee con el login nuevo', async () => {
    await services.meet.send(actor('ana'), null, {
      id: 'dm:ana:eva',
      kind: 'text',
      body: 'Me voy de 42',
    })

    expect(
      (await services.legal.anonymize(actor('ana'), { confirm: 'ana' })).changed,
    ).toBeGreaterThan(0)

    const [row] = (await db.execute('SELECT login, body FROM event_messages')).rows

    expect(toText(row?.login)).toMatch(/^anon-/)
    expect(row?.body).toMatch(SEALED)
    expect((await services.meet.log(ADMIN)).map((entry) => entry.body)).toEqual(['Me voy de 42'])
  })
})
