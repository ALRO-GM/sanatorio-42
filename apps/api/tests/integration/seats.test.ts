import { afterEach, describe, expect, it } from 'vitest'

import type { SeatGraph } from '@sanatorio/contracts'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

const HOUR = 3_600_000
const ago = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString()
const seated = (id: number, login: string, host: string, hours: number) => ({
  id: id * 10,
  host,
  begin_at: ago(hours),
  end_at: null,
  campus_id: 22,
  user: { id, login, image: null },
})
/** Una amiga al lado, alguien enfrente, un piscinero detrás y alguien lejos. */
const LOCATIONS = {
  '/v2/campus/22/locations': [
    seated(1, 'albrodri', 'c2r2s3', 4),
    seated(2, 'amiga', 'c2r2s5', 4),
    seated(3, 'enfrente', 'c2r2s4', 1),
    seated(4, 'pisci', 'c2r1s2', 4),
    seated(5, 'lejos', 'c1r9s9', 4),
  ],
}

describe('red de asientos (docs/asientos.md)', () => {
  it('guarda cada sesión y une a quien se sienta cerca, sin piscineros para un estudiante', async () => {
    const built = await makeApp({}, { routes: LOCATIONS })

    apps.push(built)
    await built.db.execute({
      sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
            VALUES (22, 4, 'pisci', NULL, ?, ?)`,
      args: [ago(24), ago(0)],
    })

    const cookie = await built.login()

    // Abrir el mapa trae la foto de los puestos, y con ella el historial.
    await built.app.inject({ method: 'GET', url: '/map', headers: { cookie } })

    const log = await built.db.execute('SELECT login, host FROM seat_sessions ORDER BY login')

    // Como si se hubieran visto desde que entraron (la foto va cada pocos minutos).
    await built.db.execute('UPDATE seat_sessions SET first_seen_at = begin_at')

    expect(log.rows.map((row) => `${row.login as string}@${row.host as string}`)).toEqual([
      'albrodri@c2r2s3',
      'amiga@c2r2s5',
      'enfrente@c2r2s4',
      'lejos@c1r9s9',
      'pisci@c2r1s2',
    ])

    const response = await built.app.inject({
      method: 'GET',
      url: '/network/seats?days=7',
      headers: { cookie },
    })
    const graph = json(response) as SeatGraph

    expect(response.statusCode).toBe(200)
    expect(graph.people.map((person) => person.login)).not.toContain('pisci')
    // 4 h al lado: 12; 1 h enfrente: 2 con cada uno.
    expect(graph.links).toEqual(
      expect.arrayContaining([
        { source: 'albrodri', target: 'amiga', closeness: 12, hours: 4 },
        { source: 'albrodri', target: 'enfrente', closeness: 2, hours: 1 },
      ]),
    )
    expect(graph.people.find((person) => person.login === 'lejos')).toMatchObject({
      partners: 0,
      alone: 1,
      usual: ['c1r9s9'],
    })
    expect(
      (
        await built.app.inject({
          method: 'GET',
          url: '/network/seats?days=999',
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(400)
  })

  it('cuenta desde que se vio la sesión y como mucho 12 h seguidas', async () => {
    // Un puesto de examen que no echa a nadie: 42 da la entrada de hace cuatro días.
    const built = await makeApp(
      {},
      {
        routes: {
          '/v2/campus/22/locations': [
            seated(1, 'albrodri', 'c2r2s3', 4),
            seated(2, 'atascado', 'c2r2s5', 96),
            seated(3, 'larga', 'c3r1s1', 20),
          ],
        },
      },
    )

    apps.push(built)

    const cookie = await built.login()

    await built.app.inject({ method: 'GET', url: '/map', headers: { cookie } })
    // A `atascado` se le vio por primera vez hace 2 h; `larga` lleva 20 h vista.
    await built.db.execute({
      sql: 'UPDATE seat_sessions SET first_seen_at = ? WHERE login = ?',
      args: [ago(2), 'atascado'],
    })
    await built.db.execute({
      sql: "UPDATE seat_sessions SET first_seen_at = begin_at WHERE login IN ('albrodri', 'larga')",
    })

    const graph = json(
      await built.app.inject({ method: 'GET', url: '/network/seats?days=7', headers: { cookie } }),
    ) as SeatGraph
    const hours = (login: string): number | undefined =>
      graph.people.find((person) => person.login === login)?.hours

    // 2 h vistas (más el margen de la foto), no 96.
    expect(hours('atascado')).toBeGreaterThanOrEqual(2)
    expect(hours('atascado')).toBeLessThanOrEqual(2.3)
    // 20 h seguidas cuentan como 12.
    expect(hours('larga')).toBe(12)
    expect(hours('albrodri')).toBe(4)
  })
})
