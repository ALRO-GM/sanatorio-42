/**
 * Sugerencias de mejora con la burbuja de la cabecera (`docs/sugerencias.md`)
 * por HTTP: se mandan con el sitio donde se soltó, se validan, tienen tope por
 * persona y llegan al buzón del panel con su propuesta y su sitio.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { SuggestionInput, Ticket } from '@sanatorio/contracts'
import { cookieAs, json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

const HOUR = 3_600_000

/** Una sugerencia normal: soltada sobre el mapa de la sala de espera. */
const SUGGESTION: SuggestionInput = {
  problem: 'No sé qué significa el punto verde del mapa.',
  proposal: 'Una leyenda pequeña debajo del mapa.',
  place: {
    section: 'consulta',
    label: 'Mapa de dónde se sienta',
    detail: null,
    selector: 'main > div.block:nth-of-type(2) > [data-feedback="consulta.map"]',
    hash: '#/consulta',
    viewport: { width: 390, height: 844 },
    theme: 'classic-dark',
    lang: 'es',
    mode: 'normal',
  },
}

async function world(): Promise<{ built: TestApp; admin: string; student: string; pool: string }> {
  const built = await makeApp({ ADMIN_LOGINS: 'albrodri', GIT_SHA: 'abc1234' })

  apps.push(built)

  const admin = await built.adminLogin()
  const session = admin.split('; ')[0] ?? ''

  return {
    built,
    admin,
    student: cookieAs(session, 'mgomez', 'student'),
    pool: cookieAs(session, 'pisci', 'pool'),
  }
}

const send = (built: TestApp, cookie: string, body: unknown) =>
  built.app.inject({
    method: 'POST',
    url: '/tickets/suggestion',
    headers: { cookie, 'content-type': 'application/json' },
    payload: body as Record<string, unknown>,
  })

describe('POST /tickets/suggestion', () => {
  it('guarda el problema, la propuesta y el sitio, y la versión la pone la API', async () => {
    const { built, admin, student } = await world()

    const created = await send(built, student, SUGGESTION)

    expect(created.statusCode).toBe(201)

    const ticket = json(created) as Ticket

    expect(ticket).toMatchObject({
      login: 'mgomez',
      kind: 'idea',
      category: 'improvement',
      section: 'consulta',
      subject: SUGGESTION.problem,
      body: SUGGESTION.problem,
      proposal: SUGGESTION.proposal,
      status: 'open',
    })
    expect(ticket.place).toEqual({ ...SUGGESTION.place, version: 'abc1234' })

    // Llega al buzón del panel, con todo, y deja el aviso a quien administra.
    const inbox = json(
      await built.app.inject({ method: 'GET', url: '/admin/tickets', headers: { cookie: admin } }),
    ) as Ticket[]

    expect(inbox.find((row) => row.id === ticket.id)?.place?.label).toBe('Mapa de dónde se sienta')

    const notices = await built.db.execute({
      sql: "SELECT login FROM notices WHERE kind = 'ticket_new' AND ref = ?",
      args: [`ticket:${ticket.id}`],
    })

    expect(notices.rows.map((row) => row.login)).toEqual(['albrodri'])

    // Y quien la mandó la ve en lo suyo.
    const mine = json(
      await built.app.inject({ method: 'GET', url: '/tickets/mine', headers: { cookie: student } }),
    ) as Ticket[]

    expect(mine[0]?.proposal).toBe(SUGGESTION.proposal)
  })

  it('la propuesta es opcional y un detalle a mano se guarda', async () => {
    const { built, student } = await world()
    const { proposal: _skip, ...bare } = SUGGESTION
    const ticket = json(
      await send(built, student, {
        ...bare,
        place: { ...SUGGESTION.place, detail: 'El filtro de seniors' },
      }),
    ) as Ticket

    expect(ticket.proposal).toBeNull()
    expect(ticket.place?.detail).toBe('El filtro de seniors')

    // Una propuesta en blanco es lo mismo que ninguna.
    const blank = json(await send(built, student, { ...SUGGESTION, proposal: '   ' })) as Ticket

    expect(blank.proposal).toBeNull()
  })

  it('rechaza lo que no cuadra', async () => {
    const { built, student } = await world()
    const wrong: unknown[] = [
      {},
      { ...SUGGESTION, problem: 'ay' },
      { ...SUGGESTION, problem: 'x'.repeat(501) },
      { ...SUGGESTION, proposal: 'x'.repeat(501) },
      { ...SUGGESTION, place: undefined },
      { ...SUGGESTION, place: { ...SUGGESTION.place, section: 'Tablón!' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, label: '' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, label: 'a\nb' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, selector: '<script>' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, hash: 'javascript:alert(1)' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, viewport: { width: 0, height: 10 } } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, mode: 'loco' } },
      { ...SUGGESTION, place: { ...SUGGESTION.place, lang: 'español' } },
    ]

    for (const body of wrong) {
      expect((await send(built, student, body)).statusCode, JSON.stringify(body)).toBe(400)
    }

    const count = await built.db.execute('SELECT COUNT(*) AS n FROM tickets')

    expect(count.rows[0]?.n).toBe(0)
  })

  it('tiene tope: tres seguidas y diez al día por persona', async () => {
    const { built, student, admin } = await world()

    for (let index = 0; index < 3; index++) {
      expect((await send(built, student, SUGGESTION)).statusCode).toBe(201)
    }
    // La cuarta en diez minutos, no.
    expect((await send(built, student, SUGGESTION)).statusCode).toBe(409)
    // Otra persona sí puede.
    expect((await send(built, admin, SUGGESTION)).statusCode).toBe(201)

    // Diez en el día (ya cerradas, de hace unas horas): la undécima tampoco.
    await built.db.execute('DELETE FROM tickets')
    for (let index = 0; index < 10; index++) {
      await built.db.execute({
        sql: `INSERT INTO tickets (login, kind, subject, body, status, place, created_at)
              VALUES ('mgomez', 'idea', 'x', 'x', 'closed', '{}', ?)`,
        args: [new Date(Date.now() - (index + 1) * HOUR).toISOString()],
      })
    }
    expect((await send(built, student, SUGGESTION)).statusCode).toBe(409)
  })

  it('sin sesión, 401; un piscinero sin el buzón abierto, 403', async () => {
    const { built, pool } = await world()

    expect(
      (
        await built.app.inject({
          method: 'POST',
          url: '/tickets/suggestion',
          headers: { 'content-type': 'application/json' },
          payload: SUGGESTION as unknown as Record<string, unknown>,
        })
      ).statusCode,
    ).toBe(401)

    await built.db.execute({
      sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
      args: [
        JSON.stringify({ open: true, message: '', allow: ['expediente'] }),
        new Date().toISOString(),
      ],
    })
    expect((await send(built, pool, SUGGESTION)).statusCode).toBe(403)
  })
})
