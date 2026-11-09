import { afterEach, describe, expect, it } from 'vitest'

import type {
  SeatGraph,
  SeatHeat,
  SeatWeightsPreview,
  SeatWeightsState,
} from '@sanatorio/contracts'
import { createSeatUsage } from '../../src/modules/network/seating.usage.js'
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
          url: '/network/seats?days=3651',
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

  it('el mapa de calor mide igual que el grafo, con el plano entero y sin el otro mundo', async () => {
    const built = await makeApp(
      {},
      {
        routes: {
          '/v2/campus/22/locations': [
            seated(1, 'albrodri', 'c2r2s3', 4),
            seated(2, 'atascado', 'c2r2s5', 96),
            seated(3, 'larga', 'c3r1s1', 20),
            seated(4, 'pisci', 'c2r1s2', 4),
            // Un nombre que no es de un puesto: cuenta en el grafo, no se coloca.
            seated(5, 'raro', 'portatil-7', 3),
          ],
        },
      },
    )

    apps.push(built)
    await built.db.execute({
      sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
            VALUES (22, 4, 'pisci', NULL, ?, ?)`,
      args: [ago(24), ago(0)],
    })

    const cookie = await built.login()

    await built.app.inject({ method: 'GET', url: '/map', headers: { cookie } })
    await built.db.execute({
      sql: 'UPDATE seat_sessions SET first_seen_at = ? WHERE login = ?',
      args: [ago(2), 'atascado'],
    })
    await built.db.execute({
      sql: "UPDATE seat_sessions SET first_seen_at = begin_at WHERE login <> 'atascado'",
    })
    // Otra sesión de ayer en el mismo puesto, de otra persona: suma horas y gente.
    await built.db.execute({
      sql: `INSERT INTO seat_sessions (location_id, campus_id, user_id, login, host, begin_at, first_seen_at, seen_at)
            VALUES (999, 22, 6, 'ayer', 'c2r2s3', ?, ?, ?)`,
      args: [ago(30), ago(30), ago(27)],
    })

    const get = async <T>(url: string): Promise<T> =>
      json(await built.app.inject({ method: 'GET', url, headers: { cookie } })) as T
    const heat = await get<SeatHeat>('/network/seats/heat?days=7')
    const graph = await get<SeatGraph>('/network/seats?days=7')
    const cell = (host: string) =>
      heat.clusters.flatMap((cluster) => cluster.cells).find((one) => one.host === host)

    expect(heat.days).toBe(7)
    expect(heat.clusters.map((cluster) => cluster.id)).toEqual(['c2', 'c3'])
    // c2 llega hasta la fila 2 y el puesto 5: 10 casillas, las vacías a 0.
    expect(heat.clusters[0]).toMatchObject({ id: 'c2', rows: 2, seatsPerRow: 5 })
    expect(heat.clusters[0]?.cells).toHaveLength(10)
    expect(cell('c2r1s1')).toEqual({ host: 'c2r1s1', row: 1, seat: 1, hours: 0, people: 0 })
    // El piscinero no deja huella para un estudiante.
    expect(cell('c2r1s2')).toMatchObject({ hours: 0, people: 0 })
    // 4 h ahora y 3 h ayer, de dos personas.
    expect(cell('c2r2s3')).toEqual({ host: 'c2r2s3', row: 2, seat: 3, hours: 7, people: 2 })
    // Desde que se vio (2 h y el margen), no 96; y 20 h seguidas cuentan 12.
    expect(cell('c2r2s5')?.hours).toBeGreaterThanOrEqual(2)
    expect(cell('c2r2s5')?.hours).toBeLessThanOrEqual(2.3)
    expect(cell('c3r1s1')).toMatchObject({ hours: 12, people: 1 })
    expect(heat.max).toBe(12)
    // Por clúster: c2, las horas de sus puestos y tres personas distintas
    // (albrodri, ayer y atascado); c3, la sesión larga.
    const c2 = heat.clusters[0]

    expect(c2?.people).toBe(3)
    expect(c2?.hours).toBeCloseTo(
      (c2?.cells ?? []).reduce((sum, one) => sum + one.hours, 0),
      0,
    )
    expect(heat.clusters[1]).toMatchObject({ id: 'c3', hours: 12, people: 1 })

    // Las mismas horas que el grafo, persona a persona.
    const hoursOf = (login: string) => graph.people.find((one) => one.login === login)?.hours
    expect(cell('c2r2s5')?.hours).toBe(hoursOf('atascado'))
    expect(cell('c3r1s1')?.hours).toBe(hoursOf('larga'))
    expect((hoursOf('albrodri') ?? 0) + (hoursOf('ayer') ?? 0)).toBe(cell('c2r2s3')?.hours)
    expect(hoursOf('raro')).toBe(3)

    // Un periodo de un día deja fuera lo de ayer; uno imposible, 400.
    const short = await get<SeatHeat>('/network/seats/heat?days=1')

    expect(short.max).toBe(12)
    expect(short.clusters[0]?.cells.find((one) => one.host === 'c2r2s3')).toMatchObject({
      hours: 4,
      people: 1,
    })
    expect(
      (
        await built.app.inject({
          method: 'GET',
          url: '/network/seats/heat?days=0',
          headers: { cookie },
        })
      ).statusCode,
    ).toBe(400)
    // A mano: dos fechas; al revés, 400.
    for (const [url, status] of [
      ['/network/seats?from=2020-01-01&to=2030-01-01', 200],
      ['/network/seats/heat?from=2020-01-01', 200],
      ['/network/seats?from=2026-10-10&to=2026-10-01', 400],
      ['/network/seats?from=ayer', 400],
    ] as const) {
      expect(
        (await built.app.inject({ method: 'GET', url, headers: { cookie } })).statusCode,
        url,
      ).toBe(status)
    }

    // Con el uso ya sumado (`seat_usage`) sale lo mismo, sin leer las sesiones.
    const usage = createSeatUsage({ db: built.db })

    expect(heat.through).toBeNull()
    expect(await usage.step()).toBeGreaterThan(0)
    // Lo ya sumado no se vuelve a sumar.
    expect(await usage.step()).toBe(0)

    const summed = await get<SeatHeat>('/network/seats/heat?days=8')

    expect(summed.through).not.toBeNull()
    expect(summed.clusters).toEqual(heat.clusters)
    expect(summed.max).toBe(heat.max)

    // Una sesión abierta que se alarga suma solo lo nuevo: una hora más.
    await built.db.execute({
      sql: "UPDATE seat_sessions SET seen_at = ? WHERE login = 'ayer'",
      args: [ago(26)],
    })
    expect(await usage.step()).toBe(1)

    const longer = await get<SeatHeat>('/network/seats/heat?days=9')
    const longerCell = longer.clusters[0]?.cells.find((one) => one.host === 'c2r2s3')

    expect(longerCell).toMatchObject({ hours: 8, people: 2 })
    expect(longer.clusters[0]?.people).toBe(3)

    // Hoy solo: lo de ayer no cuenta, y el piscinero tampoco.
    const today = await get<SeatHeat>('/network/seats/heat?days=1')

    expect(today.clusters[0]?.cells.find((one) => one.host === 'c2r2s3')?.people).toBe(1)
    expect(today.clusters[0]?.cells.find((one) => one.host === 'c2r1s2')).toMatchObject({
      hours: 0,
      people: 0,
    })
  })

  it('una fecha que no existe es un 400 y los periodos nuevos tienen tope por minuto', async () => {
    const built = await makeApp({}, { routes: { '/v2/campus/22/locations': [] } })

    apps.push(built)

    const cookie = await built.login()
    const get = async (url: string): Promise<number> =>
      (await built.app.inject({ method: 'GET', url, headers: { cookie } })).statusCode

    expect(await get('/network/seats?from=2026-02-31')).toBe(400)
    expect(await get('/network/seats?from=2026-13-01')).toBe(400)

    // Veinte periodos distintos se calculan; el siguiente espera. Lo ya
    // calculado sigue saliendo de la caché.
    for (let days = 1; days <= 20; days += 1) {
      expect(await get(`/network/seats?days=${String(days)}`)).toBe(200)
    }
    expect(await get('/network/seats/heat?days=21')).toBe(429)
    expect(await get('/network/seats?days=20')).toBe(200)
  })

  it('un periodo antiguo no cuenta las sesiones que empezaron después', async () => {
    const built = await makeApp({}, { routes: LOCATIONS })

    apps.push(built)

    const cookie = await built.login()

    await built.app.inject({ method: 'GET', url: '/map', headers: { cookie } })
    await built.db.execute('UPDATE seat_sessions SET first_seen_at = begin_at')

    const graph = json(
      await built.app.inject({
        method: 'GET',
        url: '/network/seats?from=2020-01-01&to=2020-01-02',
        headers: { cookie },
      }),
    ) as SeatGraph

    expect(graph.people).toEqual([])
    expect(graph.totals.hours).toBe(0)
  })

  it('sin historial, el plano conocido sale entero a 0', async () => {
    const built = await makeApp({}, { routes: { '/v2/campus/22/locations': [] } })

    apps.push(built)
    await built.db.execute({
      sql: "INSERT INTO seats (campus_id, host, seen_at) VALUES (22, 'c1r2s3', ?)",
      args: [ago(100)],
    })

    const cookie = await built.login()
    const heat = json(
      await built.app.inject({ method: 'GET', url: '/network/seats/heat', headers: { cookie } }),
    ) as SeatHeat

    expect(heat).toMatchObject({ days: 30, max: 0 })
    expect(heat.clusters).toEqual([
      expect.objectContaining({ id: 'c1', rows: 2, seatsPerRow: 3, hours: 0, people: 0 }),
    ])
    expect(heat.clusters[0]?.cells.every((one) => one.hours === 0 && one.people === 0)).toBe(true)
  })
})

describe('pesos de los puestos desde el panel (docs/asientos.md)', () => {
  /** Los de siempre, pero «al lado» no cuenta y la fila de delante, sí. */
  const TRIED = [
    [0, 0, 1, 0, 1, 0, 0],
    [0, 0, 2, 9, 2, 0, 0],
    [0, 0, 1.5, 0, 1.5, 0, 0],
  ]

  it('se prueban sin guardar, se guardan y la red se recalcula; solo admins', async () => {
    const built = await makeApp({ ADMIN_LOGINS: 'albrodri' }, { routes: LOCATIONS })

    apps.push(built)

    const admin = await built.adminLogin()

    await built.app.inject({ method: 'GET', url: '/map', headers: { cookie: admin } })
    await built.db.execute('UPDATE seat_sessions SET first_seen_at = begin_at')

    const state = json(
      await built.app.inject({
        method: 'GET',
        url: '/admin/seat-weights',
        headers: { cookie: admin },
      }),
    ) as SeatWeightsState

    expect(state).toMatchObject({ updatedBy: null, grid: state.defaults })
    expect(state.grid[1]).toEqual([0, 3, 2, 0, 2, 3, 0])

    const preview = await built.app.inject({
      method: 'POST',
      url: '/admin/seat-weights/preview',
      headers: { cookie: admin },
      payload: { grid: TRIED, days: 7 },
    })
    const tried = json(preview) as SeatWeightsPreview
    const pairs = (graph: SeatGraph) => graph.links.map((link) => `${link.source}-${link.target}`)

    expect(preview.statusCode).toBe(200)
    // Sin «al lado», la amiga ya no se une; el centro (la propia persona) no cuenta aunque pese 9.
    expect(pairs(tried.graph)).not.toContain('albrodri-amiga')
    expect(tried.current.pairs).toBeGreaterThan(tried.proposed.pairs)
    expect(tried.current.modularity).toBeGreaterThanOrEqual(-0.5)

    // Probar no cambia nada.
    const before = json(
      await built.app.inject({
        method: 'GET',
        url: '/network/seats?days=7',
        headers: { cookie: admin },
      }),
    ) as SeatGraph

    expect(pairs(before)).toContain('albrodri-amiga')

    const saved = await built.app.inject({
      method: 'PUT',
      url: '/admin/seat-weights',
      headers: { cookie: admin },
      payload: { grid: TRIED },
    })

    expect(saved.statusCode).toBe(200)
    expect(json(saved)).toMatchObject({ updatedBy: 'albrodri' })
    expect((json(saved) as SeatWeightsState).grid[1]?.[3]).toBe(0)

    const after = json(
      await built.app.inject({
        method: 'GET',
        url: '/network/seats?days=7',
        headers: { cookie: admin },
      }),
    ) as SeatGraph

    expect(pairs(after)).not.toContain('albrodri-amiga')

    // Mal formados: ni de otro tamaño ni fuera de 0 a 10.
    for (const grid of [[[1, 2, 3]], TRIED.map((row) => row.map(() => 11)), 'pesos']) {
      const wrong = await built.app.inject({
        method: 'PUT',
        url: '/admin/seat-weights',
        headers: { cookie: admin },
        payload: { grid },
      })

      expect(wrong.statusCode).toBe(400)
    }

    // Sin el panel abierto no se ven ni se prueban.
    const cookie = await built.login()

    for (const [method, url] of [
      ['GET', '/admin/seat-weights'],
      ['POST', '/admin/seat-weights/preview'],
      ['PUT', '/admin/seat-weights'],
    ] as const) {
      const denied = await built.app.inject({
        method,
        url,
        headers: { cookie },
        payload: { grid: TRIED, days: 7 },
      })

      expect([401, 403]).toContain(denied.statusCode)
    }
  })
})
