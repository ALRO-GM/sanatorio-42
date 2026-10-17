/**
 * Tests de integración de lo que no estaba en la primera versión: las rutas de
 * comunidad, el selector de campus, el prefijo `/api` y el front servido desde
 * el mismo proceso.
 *
 * Igual que `server.test.ts`: la app entera, con login de verdad y `inject`.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  LiveExam,
  Calendar,
  ClusterMap,
  Expediente,
  GroupView,
  Peer,
  SyncStatus,
} from '@sanatorio/contracts'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []
const folders: string[] = []

async function app(...args: Parameters<typeof makeApp>): Promise<TestApp> {
  const built = await makeApp(...args)
  apps.push(built)
  return built
}

afterEach(async () => {
  // Por si algún test fijó el reloj.
  vi.useRealTimers()

  for (const built of apps.splice(0)) {
    await built.close()
  }
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

/** Cliente mínimo con la sesión puesta. */
function client(built: TestApp, cookie: string) {
  const call = async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: object) =>
    built.app.inject({
      method,
      url,
      headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
    })

  return {
    get: (url: string) => call('GET', url),
    post: (url: string, body?: object) => call('POST', url, body),
    put: (url: string, body?: object) => call('PUT', url, body),
    del: (url: string) => call('DELETE', url),
  }
}

/** Dentro de `days` días, como `YYYY-MM-DD` (UTC, que es la zona del campus de los tests). */
const dayIn = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe('réplica vista desde fuera', () => {
  it('la sala de espera sale del login, sin pedir nada más a 42', async () => {
    const built = await app()
    const http = client(built, await built.login())
    const before = built.provider.requests.length

    const response = await http.get('/me/projects?scope=all')

    expect(json(response)).toEqual([
      { id: 10, name: 'ft_printf', status: 'in_progress' },
      { id: 11, name: 'libft', status: 'finished' },
    ])
    expect(built.provider.requests.length).toBe(before)
  })

  it('la lista de compañeros trae el puesto y solo gasta la primera vez', async () => {
    const built = await app()
    const http = client(built, await built.login())

    const first = await http.get('/projects/10/peers')

    expect(json(first) as Peer[]).toEqual([
      {
        login: 'mgomez',
        image: 'https://img/mgomez-medium.png',
        location: 'c3r7p7',
        available: false,
        status: 'in_progress',
        perfect: false,
        preReview: false,
      },
    ])
    // En el proyecto hay tres personas de Madrid, aunque solo una sea accionable.
    expect(first.headers['x-total-participants']).toBe('3')
    expect(first.headers['x-partial']).toBe('false')

    const before = built.provider.requests.length
    await http.get('/projects/10/peers')
    expect(built.provider.requests.length).toBe(before)
  })

  it('un especialista aparece en cuanto se pone de guardia', async () => {
    const built = await app({}, {})
    const http = client(built, await built.login())
    // `jdoe` aprobó ft_printf; se sienta y se pone de guardia.
    await built.services.repositories.availability.set('jdoe', true)
    built.provider.routes['/v2/campus/22/locations'] = [
      { id: 1, host: 'c1r1s1', end_at: null, user: { id: 2, login: 'jdoe' } },
    ]

    const peers = json(await http.get('/projects/10/peers')) as Peer[]

    expect(peers[0]).toMatchObject({ login: 'jdoe', location: 'c1r1s1', status: 'finished' })
  })

  it('GET /campuses baja el catálogo y marca los que se replican', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect(json(await http.get('/campuses'))).toEqual([
      { id: 22, name: 'Madrid', city: 'Madrid', country: 'Spain', tracked: true },
      { id: 58, name: 'Barcelona', city: 'Barcelona', country: 'Spain', tracked: false },
    ])
  })

  it('elegir otro campus cambia de quién es la lista', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect((await http.put('/me/settings', { campusId: 58 })).statusCode).toBe(204)

    const profile = json(await http.get('/me/profile')) as Expediente & { homeCampusId: number }
    expect(profile.campusId).toBe(58)
    expect(profile.homeCampusId).toBe(22)

    // Las peticiones a 42 van ahora filtradas por Barcelona.
    await http.get('/projects/10/peers')
    expect(
      built.provider.requests.some((request) => request.url.includes('/v2/campus/58/locations')),
    ).toBe(true)
    expect(
      built.provider.requests.some((request) =>
        decodeURIComponent(request.url).includes('filter[campus]=58'),
      ),
    ).toBe(true)
  })

  it('GET /sync/status cuenta cómo va la copia', async () => {
    const built = await app()
    const http = client(built, await built.login())
    await http.get('/projects/10/peers')

    const status = json(await http.get('/sync/status')) as SyncStatus

    expect(status.running).toBe(false)
    expect(status.replica.projectUsers).toBeGreaterThan(0)
    expect(status.campuses[0]).toMatchObject({ id: 22, present: 2 })
  })

  it('una cuenta bloqueada no pasa por ninguna ruta, pida o no permisos', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect((await http.get('/campuses')).statusCode).toBe(200)

    await built.services.admin.block(
      { login: 'jefa', campusId: 22, admin: true },
      { login: 'albrodri', reason: 'pruebas' },
    )

    // Rutas que solo leen la cookie, rutas que piden el "actor" y escrituras.
    for (const url of [
      '/campuses',
      '/sync/status',
      '/usage',
      '/quota',
      '/pulse',
      '/events/alerts',
      '/notices',
      '/users/eva/profile',
      '/me/profile',
      '/boards',
    ]) {
      const response = await http.get(url)

      expect([url, response.statusCode]).toEqual([url, 403])
      expect(json(response)).toMatchObject({ error: 'forbidden' })
    }
    expect((await http.put('/me/availability', { available: true })).statusCode).toBe(403)
    // Las de sesión siguen: tiene que poder ver quién es y salir.
    expect((await http.get('/auth/me')).statusCode).toBe(200)

    await built.services.admin.unblock({ login: 'jefa', campusId: 22, admin: true }, 'albrodri')
    expect((await http.get('/campuses')).statusCode).toBe(200)
  })

  it('al 90 % del tráfico del mes solo entra quien administra; al 95 %, ni eso', async () => {
    // `albrodri` no administra en esta app; en la otra, sí.
    const plain = await app()
    const student = client(plain, await plain.login())
    const managed = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = client(managed, await managed.adminLogin())
    const boss = { login: 'jefa', campusId: 22, admin: true }

    for (const built of [plain, managed]) {
      await built.services.admin.setBudget(boss, { monthlyBytes: 1_000_000 })
      built.services.admin.count('alguien', 900_000)
    }

    // Quien no administra: fuera, con sesión o sin ella. Le quedan las rutas de sesión.
    for (const url of ['/campuses', '/pulse', '/admin/consumption']) {
      const response = await student.get(url)

      expect([url, response.statusCode]).toEqual([url, 503])
      expect(json(response)).toMatchObject({ error: 'service_stopped' })
      expect(Number(response.headers['retry-after'])).toBeGreaterThan(0)
    }
    expect((await plain.app.inject({ method: 'GET', url: '/campuses' })).statusCode).toBe(503)
    expect((await student.get('/auth/me')).statusCode).toBe(200)

    // Quien administra sigue entrando, y puede identificarse si no tenía sesión.
    expect((await admin.get('/campuses')).statusCode).toBe(200)
    expect((await admin.get('/admin/consumption')).statusCode).toBe(200)
    expect((await managed.app.inject({ method: 'GET', url: '/auth/login' })).statusCode).toBe(302)

    // Al 95 % ya no entra nadie: solo queda la comprobación de salud.
    managed.services.admin.count('alguien', 50_000)
    for (const url of ['/campuses', '/admin/consumption', '/auth/me']) {
      expect([url, (await admin.get(url)).statusCode]).toEqual([url, 503])
    }
    expect((await managed.app.inject({ method: 'GET', url: '/auth/login' })).statusCode).toBe(503)
    expect((await managed.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200)
  })

  it('todo esto pide sesión', async () => {
    const built = await app()

    for (const url of [
      '/campuses',
      '/sync/status',
      '/me/profile',
      '/groups',
      '/boards',
      '/map',
      '/projects/10/map',
      '/doubts/graph',
      '/help/today',
      '/help/offers',
      '/leaderboard',
      '/me/health',
      '/users/eva/profile',
      '/usage',
      '/tickets/mine',
      '/admin/consumption',
      '/admin/people',
      '/admin/tickets',
      '/admin/messages',
      '/events/thread?id=board:1',
      '/events/attendance?id=board:1',
      '/events/report',
      '/quota',
      '/admin/quota',
      '/events/report?format=csv',
      '/admin/checkins?id=board:1',
      '/network',
      '/network/mine',
      '/network/strictest',
      '/network/pair?a=ana&b=eva',
      '/network/people?q=a',
      '/calendar?from=2026-10-01T00:00:00Z&to=2026-10-08T00:00:00Z',
      '/avatars/albrodri',
      '/projects/10/doubts',
    ]) {
      expect((await built.app.inject({ method: 'GET', url })).statusCode).toBe(401)
    }
  })
})

describe('comunidad por HTTP', () => {
  it('ponerse de guardia desbloquea el primer logro', async () => {
    const built = await app()
    const http = client(built, await built.login())

    await http.put('/me/availability', { available: true })

    const profile = json(await http.get('/me/profile')) as Expediente
    expect(profile.achievements.find((entry) => entry.id === 'first_duty')?.unlocked).toBe(true)
    expect(profile.xp).toEqual({ total: 0, level: 1, floor: 0, next: 50 })
  })

  it('la guardia de hoy: abrir franjas, verlas y no poder reservarse a uno mismo', async () => {
    // A primera hora: las franjas del test (de 10 a 12) aún no han empezado. Sin
    // fijar el reloj, el test fallaría según la hora a la que se lanzara.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-06T06:00:00.000Z'))

    const built = await app()
    const http = client(built, await built.login())

    const saved = await http.put('/help/today', {
      windows: [
        { start: '10:00', end: '11:00' },
        { start: '10:30', end: '12:00' },
      ],
      maxMinutes: 60,
    })
    expect(saved.statusCode).toBe(200)
    // Las franjas que se pisan se juntan.
    expect(json(saved)).toMatchObject({
      windows: [{ start: '10:00', end: '12:00' }],
      maxMinutes: 60,
      bookedMinutes: 0,
      mustRate: false,
      blocked: [],
    })

    expect((await http.put('/help/today', { windows: [], maxMinutes: 45 })).statusCode).toBe(400)
    expect(
      (await http.post('/help/bookings', { helper: 'albrodri', start: '10:00', minutes: 30 }))
        .statusCode,
    ).toBe(400)
    // Quien se ofrece no se ve a sí mismo en la lista.
    expect(json(await http.get('/help/offers'))).toEqual([])
    expect(json(await http.get('/help/reputation'))).toEqual({
      asked: { prepared: 0, curious: 0, autonomous: 0, basics: 0 },
    })
  })

  it('el ranking empieza vacío', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect(json(await http.get('/leaderboard'))).toEqual({ period: 'month', entries: [], me: null })
    expect(json(await http.get('/leaderboard?period=all'))).toMatchObject({ period: 'all' })
  })

  it('una terapia de grupo: abrir, verla y cerrarla', async () => {
    const built = await app()
    const http = client(built, await built.login())

    const created = await http.post('/groups', {
      projectId: 10,
      place: 'Cluster 1 · Planta 2',
      dates: [dayIn(1), dayIn(3)],
      start: '16:00',
      end: '18:00',
    })
    expect(created.statusCode).toBe(201)
    const group = json(created) as { id: number; capacity: number }
    expect(group.capacity).toBe(5)

    expect(json(await http.get('/groups?project=10'))).toHaveLength(1)
    expect(json(await http.get('/groups?project=11'))).toHaveLength(0)

    expect((await http.del(`/groups/${group.id}`)).statusCode).toBe(204)
    expect(json(await http.get('/groups'))).toEqual([])
  })

  it('un cuerpo mal formado es un 400 con el campo que falla', async () => {
    const built = await app()
    const http = client(built, await built.login())

    const response = await http.post('/groups', { projectId: 10, place: '', dates: ['ayer'] })

    expect(response.statusCode).toBe(400)
    expect(json(response)).toMatchObject({ error: 'invalid_input' })
  })

  it('el tablón: pegar una duda, responderla y darla por resuelta', async () => {
    const built = await app()
    const http = client(built, await built.login())

    const created = await http.post('/projects/10/doubts', {
      body: '¿Qué devuelve ft_substr si start se pasa?',
    })
    expect(created.statusCode).toBe(201)
    const doubt = json(created) as { id: number }

    const answered = await http.post(`/doubts/${doubt.id}/answers`, { body: 'Una cadena vacía' })
    expect(answered.statusCode).toBe(201)
    const [answer] = json(answered) as { id: number }[]

    // Sin decir qué respuesta la resolvió, no se puede dar por resuelta.
    expect((await http.put(`/doubts/${doubt.id}/resolved`, { resolved: true })).statusCode).toBe(
      400,
    )
    expect(
      (await http.put(`/doubts/${doubt.id}/resolved`, { resolved: true, answerId: answer?.id }))
        .statusCode,
    ).toBe(204)
    expect(json(await http.get(`/doubts/${doubt.id}`))).toMatchObject({
      solvedAnswerId: answer?.id,
    })

    const board = json(await http.get('/projects/10/doubts')) as {
      project: { name: string }
      canEditGuide: boolean
      doubts: { status: string; answers: number }[]
    }
    expect(board.project.name).toBe('ft_printf')
    // `albrodri` lo tiene en curso: todavía no puede tocar la guía.
    expect(board.canEditGuide).toBe(false)
    expect(board.doubts).toMatchObject([{ status: 'resolved', answers: 1 }])

    expect(
      (await http.put('/projects/10/guide', { start: [], problems: [], concepts: [] })).statusCode,
    ).toBe(403)
    // En libft (11) sí: lo aprobó.
    expect(
      (
        await http.put('/projects/11/guide', {
          start: ['Monta primero el Makefile'],
          problems: [],
          concepts: [],
        })
      ).statusCode,
    ).toBe(200)
  })

  it('una pizarra: proponerla, verla en el calendario y cancelarla', async () => {
    const built = await app()
    const http = client(built, await built.login())
    const startsAt = new Date(Date.now() + 86_400_000)

    const created = await http.post('/boards', {
      title: 'Funciones variádicas',
      topic: 'ft_printf',
      place: 'Cluster 1',
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + 3_600_000).toISOString(),
    })
    expect(created.statusCode).toBe(201)
    const board = json(created) as { id: number }

    expect(json(await http.get('/boards'))).toMatchObject([
      { id: board.id, title: 'Funciones variádicas', host: 'albrodri', mine: true, attendees: 0 },
    ])

    expect((await http.del(`/boards/${board.id}`)).statusCode).toBe(204)
    expect(json(await http.get('/boards'))).toEqual([])
  })

  it('un id que no es un número da 400 en cualquier ruta', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect((await http.get('/doubts/abc')).statusCode).toBe(400)
    expect((await http.post('/groups/1e3/join')).statusCode).toBe(400)
    expect((await http.del('/boards/-1')).statusCode).toBe(400)
  })
})

describe('un solo proceso para la web y la API', () => {
  it('las rutas responden igual con el prefijo /api', async () => {
    const built = await app()
    const cookie = await built.login()

    const response = await built.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    })

    expect(response.statusCode).toBe(200)
    expect(json(response)).toMatchObject({ login: 'albrodri' })
    expect((await built.app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
  })

  it('sirve el front compilado y cachea para siempre lo que lleva hash', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'sanatorio-front-'))
    folders.push(folder)
    mkdirSync(join(folder, 'assets'))
    writeFileSync(join(folder, 'index.html'), '<!doctype html><title>Sanatorio 42</title>')
    writeFileSync(join(folder, 'assets', 'index-abc123.js'), 'console.log(42)')

    const built = await app({ STATIC_DIR: folder })

    const home = await built.app.inject({ method: 'GET', url: '/' })
    expect(home.statusCode).toBe(200)
    expect(home.headers['content-type']).toContain('text/html')
    expect(home.headers['cache-control']).toBe('no-cache')

    const asset = await built.app.inject({ method: 'GET', url: '/assets/index-abc123.js' })
    expect(asset.headers['cache-control']).toContain('immutable')
    expect(asset.body).toBe('console.log(42)')

    // La API sigue donde estaba, y lo que no existe bajo /api es un 404 en JSON.
    expect((await built.app.inject({ method: 'GET', url: '/api/health' })).statusCode).toBe(200)
    const missing = await built.app.inject({ method: 'GET', url: '/api/nope' })
    expect(missing.statusCode).toBe(404)
    expect(json(missing)).toMatchObject({ error: 'not_found' })

    // Un fichero que no existe es un 404, no la portada.
    expect((await built.app.inject({ method: 'GET', url: '/assets/viejo.js' })).statusCode).toBe(
      404,
    )
  })

  it('la demostración se sirve desde /demo, con su propia portada', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'sanatorio-web-'))
    folders.push(folder)
    mkdirSync(join(folder, 'demo', 'assets'), { recursive: true })
    writeFileSync(join(folder, 'index.html'), '<!doctype html><title>Sanatorio 42</title>')
    writeFileSync(join(folder, 'demo', 'index.html'), '<!doctype html><title>Demo</title>')
    writeFileSync(join(folder, 'demo', 'assets', 'index-abc123.js'), 'console.log("demo")')

    const built = await app({ STATIC_DIR: folder })
    const get = (url: string) => built.app.inject({ method: 'GET', url })

    for (const url of ['/demo', '/demo/', '/demo/?x=1', '/demo/index.html', '/demo/lo-que-sea']) {
      const page = await get(url)

      expect(page.statusCode, url).toBe(200)
      expect(page.body, url).toContain('<title>Demo</title>')
      expect(page.headers['cache-control'], url).toBe('no-cache')
    }

    const asset = await get('/demo/assets/index-abc123.js')
    expect(asset.headers['cache-control']).toContain('immutable')
    expect(asset.body).toBe('console.log("demo")')

    // Lo que solo se le parece es de la web de verdad, y lo que no existe, un 404.
    expect((await get('/demostracion')).body).toContain('<title>Sanatorio 42</title>')
    expect((await get('/')).body).toContain('<title>Sanatorio 42</title>')
    expect((await get('/demo/assets/viejo.js')).statusCode).toBe(404)
    expect((await get('/demo/../index.html')).body).not.toContain('<title>Demo</title>')
    // Y la demo no abre ninguna puerta a la API: sin sesión sigue siendo 401.
    expect((await get('/api/me/projects')).statusCode).toBe(401)
    expect((await get('/demo/api/me/projects')).body).toContain('<title>Demo</title>')
  })

  it('sin demostración compilada, /demo es un 404 y lo demás sigue igual', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'sanatorio-web-'))
    folders.push(folder)
    writeFileSync(join(folder, 'index.html'), '<!doctype html><title>Sanatorio 42</title>')

    const built = await app({ STATIC_DIR: folder })

    expect((await built.app.inject({ method: 'GET', url: '/demo/' })).statusCode).toBe(404)
    expect((await built.app.inject({ method: 'GET', url: '/' })).statusCode).toBe(200)
  })
})

describe('mapa de clusters', () => {
  it('coloca a cada persona en su puesto y resalta a quien está de guardia', async () => {
    const built = await app({}, {})
    const http = client(built, await built.login())
    // `jdoe` aprobó ft_printf, se sienta y se pone de guardia. `mgomez` lo está
    // haciendo y está sentado, pero no de guardia.
    await built.services.repositories.availability.set('jdoe', true)
    built.provider.routes['/v2/campus/22/locations'] = [
      { id: 1, host: 'c1r1s1', end_at: null, user: { id: 2, login: 'jdoe' } },
      { id: 2, host: 'c1r2s3', end_at: null, user: { id: 3, login: 'mgomez' } },
      { id: 3, host: 'sala-rara', end_at: null, user: { id: 9001, login: 'otra' } },
    ]

    const map = json(await http.get('/projects/10/map')) as ClusterMap

    expect(map.clusters).toHaveLength(1)
    expect(map.clusters[0]).toMatchObject({
      id: 'c1',
      rows: 2,
      seatsPerRow: 3,
      occupied: 2,
      onDuty: 1,
    })
    const seats = map.clusters[0]?.seats ?? []

    // El plano se completa: 2 filas × 3 puestos, ocupados o no.
    expect(seats.map((seat) => seat.host)).toEqual([
      'c1r1s1',
      'c1r1s2',
      'c1r1s3',
      'c1r2s1',
      'c1r2s2',
      'c1r2s3',
    ])
    expect(seats[0]).toMatchObject({
      row: 1,
      seat: 1,
      occupant: { login: 'jdoe', duty: 'specialist', me: false, projects: [] },
      reservation: null,
    })
    // `mgomez` tiene ft_printf en curso: sale en su ficha.
    expect(seats[5]?.occupant).toMatchObject({
      login: 'mgomez',
      duty: null,
      projects: ['ft_printf'],
    })
    // Los que nadie ha ocupado nunca salen libres, y se pueden reservar.
    expect(seats[1]).toEqual({
      host: 'c1r1s2',
      row: 1,
      seat: 2,
      occupant: null,
      reservation: null,
      broken: null,
    })
    // Quien mira hace ft_printf; `jdoe` lo aprobó con un 100.
    expect(map.me).toEqual({ circle: null, projects: ['ft_printf'] })
    expect(seats[0]?.occupant).toMatchObject({ finishedMine: 100, circle: null })
    expect(seats[5]?.occupant).toMatchObject({ finishedMine: null })
    // Un puesto cuyo nombre no encaja en una cuadrícula no se pierde.
    expect(map.unplaced).toEqual([expect.objectContaining({ host: 'sala-rara', duty: null })])
  })

  it('enseña el círculo de cada persona con el rango que se guardó, sin preguntar a 42', async () => {
    const built = await app({}, {})
    const http = client(built, await built.login())
    built.provider.routes['/v2/campus/22/locations'] = [
      { id: 2, host: 'c1r2s3', end_at: null, user: { id: 3, login: 'mgomez' } },
    ]
    await built.db.execute(
      `INSERT INTO user_tracks (login, track, rank, ranks, fetched_at)
       VALUES ('mgomez', 'classic', 2, '[]', '2026-01-01T00:00:00.000Z')`,
    )

    const map = json(await http.get('/map')) as ClusterMap
    const seat = map.clusters[0]?.seats.find((one) => one.host === 'c1r2s3')

    // Con el rango 2 completado va por el círculo 3.
    expect(seat?.occupant).toMatchObject({ login: 'mgomez', circle: 3 })
  })

  it('recuerda los puestos que ha visto aunque ya no haya nadie', async () => {
    const built = await app({}, {})
    const http = client(built, await built.login())
    built.provider.routes['/v2/campus/22/locations'] = [
      { id: 1, host: 'c2r1s1', end_at: null, user: { id: 2, login: 'jdoe' } },
    ]
    await http.get('/map')

    // Se levanta: la siguiente foto llega vacía.
    built.provider.routes['/v2/campus/22/locations'] = []
    await built.services.sync.pollLocations(22)

    const map = json(await http.get('/map')) as ClusterMap

    expect(map.clusters[0]?.seats).toEqual([
      { host: 'c2r1s1', row: 1, seat: 1, occupant: null, reservation: null, broken: null },
    ])
  })

  it('marca los puestos reservados por un grupo de terapia', async () => {
    const built = await app()
    const http = client(built, await built.login())

    const created = await http.post('/groups', {
      projectId: 10,
      place: 'Cluster 1',
      dates: [dayIn(1)],
      start: '16:00',
      end: '18:00',
      capacity: 3,
      seats: ['C1R2S1', 'c1r2s2', 'c1r2s2'],
    })

    expect(created.statusCode).toBe(201)
    const group = json(created) as GroupView
    // Normalizados a minúsculas y sin repetidos.
    expect(group.seats).toEqual(['c1r2s1', 'c1r2s2'])

    const map = json(await http.get('/map')) as ClusterMap
    const reserved = map.clusters
      .flatMap((cluster) => cluster.seats)
      .filter((seat) => seat.reservation)

    expect(reserved.map((seat) => seat.host)).toEqual(['c1r2s1', 'c1r2s2'])
    expect(reserved[0]?.reservation).toMatchObject({ groupId: group.id, start: '16:00' })

    // Al cerrar el grupo, los puestos quedan libres.
    await http.del(`/groups/${group.id}`)
    const after = json(await http.get('/map')) as ClusterMap
    expect(
      after.clusters.flatMap((cluster) => cluster.seats).some((seat) => seat.reservation),
    ).toBe(false)
  })

  it('las plazas de un grupo salen de sus puestos, que tienen que estar juntos', async () => {
    const built = await app()
    const http = client(built, await built.login())
    const group = {
      projectId: 10,
      place: 'Cluster 1',
      dates: [dayIn(1)],
      start: '16:00',
      end: '18:00',
    }

    const created = await http.post('/groups', {
      ...group,
      capacity: 2,
      seats: ['c1r1s1', 'c1r1s2', 'c1r1s3'],
    })

    expect(created.statusCode).toBe(201)
    expect(json(created)).toMatchObject({ capacity: 3 })

    // Puestos a cuatro filas de distancia: no son un grupo.
    const apart = await http.post('/groups', { ...group, seats: ['c1r1s1', 'c1r5s1'] })

    expect(apart.statusCode).toBe(400)
    expect((json(apart) as { message: string }).message).toContain('seats')
  })

  it('un proyecto que no existe es un 404', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect((await http.get('/projects/999999/map')).statusCode).toBe(404)
  })
})

describe('exámenes en vivo', () => {
  const at = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString()
  const exam = { id: 1320, name: 'Exam Rank 02', slug: 'exam-rank-02' }

  it('enseña quién está en el examen de ahora, qué examen hace y su última nota', async () => {
    const built = await app(
      {},
      {
        routes: {
          '/v2/campus/22/events': [],
          '/v2/campus/22/exams': [
            { id: 710, name: 'Exam Session', location: 'c3', begin_at: at(-30), end_at: at(120) },
          ],
          '/v2/exams/710/exams_users': [
            { id: 1, user: { id: 2, login: 'jdoe' } },
            { id: 2, user: { id: 3, login: 'mgomez' } },
          ],
          // Lo nuevo de los exámenes desde que empezó: `jdoe` ya ha entregado.
          '/v2/projects_users': [
            {
              id: 5001,
              status: 'finished',
              'validated?': true,
              final_mark: 100,
              project: exam,
              user: { id: 2, login: 'jdoe' },
              teams: [{ id: 8001, final_mark: 100, 'validated?': true, closed_at: at(-5) }],
            },
          ],
        },
      },
    )
    const http = client(built, await built.login())

    // El examen ya se conoce: alguien lo tenía de antes.
    await built.services.repositories.replica.ingestProjectUsers(
      [
        {
          id: 4000,
          status: 'in_progress',
          project: exam,
          user: { id: 9, login: 'otra', location: null },
        },
      ],
      22,
    )

    const live = json(await http.get('/exams/live')) as LiveExam

    expect(live).toMatchObject({ running: true, exam: { id: 710, name: 'Exam Session' } })
    expect(live.groups.map((group) => [group.name, group.people.map((one) => one.login)])).toEqual([
      ['Exam Rank 02', ['jdoe']],
      [null, ['mgomez']],
    ])
    expect(live.groups[0]?.people[0]).toMatchObject({ mark: 100, passed: true })
  })

  it('sin examen hoy, no hay nada que enseñar', async () => {
    const built = await app(
      {},
      { routes: { '/v2/campus/22/events': [], '/v2/campus/22/exams': [] } },
    )
    const http = client(built, await built.login())

    expect(json(await http.get('/exams/live'))).toEqual({
      exam: null,
      running: false,
      groups: [],
      updatedAt: null,
    })
  })
})

describe('calendario', () => {
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  /** Mañana a esa hora UTC, en ISO. */
  const tomorrow = (hour: number): string => {
    const date = new Date(Date.now() + DAY)

    date.setUTCHours(hour, 0, 0, 0)

    return date.toISOString()
  }
  const range = `from=${new Date(Date.now() - DAY).toISOString()}&to=${new Date(Date.now() + 7 * DAY).toISOString()}`

  /** Lo que 42 contesta para el campus y para `albrodri` (id 1). */
  const fortyTwo = {
    '/v2/campus/22/events': [
      {
        id: 500,
        name: 'Charla de Rust',
        description: 'Introducción',
        location: 'Auditorio',
        kind: 'conference',
        max_people: 50,
        nbr_subscribers: 12,
        begin_at: tomorrow(16),
        end_at: tomorrow(17),
      },
      {
        id: 501,
        name: 'Hackathon',
        location: '',
        kind: 'hackathon',
        max_people: 0,
        nbr_subscribers: 3,
        begin_at: tomorrow(9),
        end_at: tomorrow(20),
      },
    ],
    '/v2/campus/22/exams': [
      {
        id: 700,
        name: 'Exam Session Morning',
        location: 'c1',
        max_people: 40,
        nbr_subscribers: 8,
        begin_at: tomorrow(8),
        end_at: tomorrow(11),
      },
    ],
    '/v2/users/1/events_users': [{ id: 1, event_id: 500 }],
    '/v2/users/1/exams': [],
    '/v2/users/1/scale_teams': [
      {
        id: 900,
        begin_at: tomorrow(12),
        corrector: 'invisible',
        correcteds: [{ id: 1, login: 'albrodri' }],
        scale: { duration: 1800 },
        team: { project_id: 10 },
      },
    ],
  }

  it('junta los eventos de 42 con su tipo, sus plazas y su enlace', async () => {
    const built = await app({}, { routes: fortyTwo })
    const http = client(built, await built.login())

    const calendar = json(await http.get(`/calendar?${range}`)) as Calendar
    const byId = new Map(calendar.events.map((event) => [event.id, event]))

    // Apuntado a la charla, no al hackathon.
    expect(byId.get('event:500')).toMatchObject({
      kind: 'event_joined',
      title: 'Charla de Rust',
      place: 'Auditorio',
      joined: true,
      seats: { taken: 12, max: 50 },
      url: 'https://profile.intra.42.fr/events/500',
      section: null,
    })
    // En 42, `max_people: 0` es "sin tope", y un sitio vacío es que no lo hay.
    expect(byId.get('event:501')).toMatchObject({
      kind: 'event_open',
      joined: false,
      place: null,
      seats: { taken: 3, max: null },
    })
    expect(byId.get('exam:700')).toMatchObject({
      kind: 'exam',
      joined: false,
      url: 'https://profile.intra.42.fr/exams/700',
    })
    // De la corrección no se dice con quién: 42 lo oculta hasta la hora.
    expect(byId.get('evaluation:900')).toMatchObject({
      kind: 'evaluation',
      title: 'Te corrigen ft_printf',
      withLogin: null,
      end: new Date(Date.parse(tomorrow(12)) + 30 * 60_000).toISOString(),
    })
    expect(calendar.fortyTwoAt).not.toBeNull()
    // Ordenados por hora.
    expect(calendar.events.map((event) => event.start)).toEqual(
      [...calendar.events.map((event) => event.start)].sort(),
    )
  })

  it('lo de 42 se guarda: abrir el calendario otra vez no vuelve a preguntar', async () => {
    const built = await app({}, { routes: fortyTwo })
    const http = client(built, await built.login())

    await http.get(`/calendar?${range}`)
    const before = built.provider.requests.length
    const again = json(await http.get(`/calendar?${range}`)) as Calendar

    expect(built.provider.requests.length).toBe(before)
    expect(again.events.some((event) => event.id === 'event:500')).toBe(true)
  })

  it('al mirarlo (`fresh=1`), lo tuyo de 42 se vuelve a pedir si tiene más de dos minutos', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-06T06:00:00.000Z'))

    try {
      const built = await app({}, { routes: fortyTwo })
      const http = client(built, await built.login())
      const mine = (): number =>
        built.provider.requests.filter((request) => request.url.includes('/users/1/')).length

      await http.get(`/calendar?${range}`)
      const first = mine()

      // Al minuto y medio, ni de fondo ni al mirarlo: recargar sin parar no cuesta nada.
      vi.setSystemTime(new Date('2026-10-06T06:01:30.000Z'))
      await http.get(`/calendar?${range}&fresh=1`)
      expect(mine()).toBe(first)

      // A los tres minutos, de fondo sigue valiendo lo guardado; al mirarlo, no.
      vi.setSystemTime(new Date('2026-10-06T06:03:00.000Z'))
      await http.get(`/calendar?${range}`)
      expect(mine()).toBe(first)
      await http.get(`/calendar?${range}&fresh=1`)
      expect(mine()).toBe(first + 3)

      // Lo que no es 0 ni 1 no se adivina.
      expect((await http.get(`/calendar?${range}&fresh=si`)).statusCode).toBe(400)
    } finally {
      vi.useRealTimers()
    }
  })

  it('si 42 no contesta, el calendario sale igual con lo propio', async () => {
    // Sin rutas de agenda: 42 responde 404 a todo lo del calendario.
    const built = await app()
    const http = client(built, await built.login())

    const board = await http.post('/boards', {
      title: 'Punteros a función',
      place: 'Cluster 2',
      startsAt: tomorrow(15),
      endsAt: tomorrow(16),
    })
    expect(board.statusCode).toBe(201)

    const response = await http.get(`/calendar?${range}`)
    const calendar = json(response) as Calendar

    expect(response.statusCode).toBe(200)
    expect(calendar.fortyTwoAt).toBeNull()
    expect(calendar.events).toMatchObject([
      {
        kind: 'board',
        title: 'Punteros a función',
        joined: true,
        withLogin: 'albrodri',
        section: 'pizarras',
        url: null,
      },
    ])
  })

  it('incluye tus franjas de guardia y cada sesión de tus grupos de terapia', async () => {
    // A mediodía de hoy: una media hora que ya ha empezado no se puede abrir, y
    // con el reloj de verdad no quedaba franja que guardar a última hora del día.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date().setUTCHours(12, 0, 0, 0) })

    const built = await app()
    const http = client(built, await built.login())

    await http.put('/help/today', {
      windows: [{ start: '00:00', end: '23:30' }],
      maxMinutes: 60,
    })
    await http.post('/groups', {
      projectId: 10,
      place: 'Cluster 1',
      dates: [dayIn(1), dayIn(2), dayIn(3)],
      start: '16:00',
      end: '18:00',
    })

    const calendar = json(await http.get(`/calendar?${range}`)) as Calendar
    const kinds = (kind: string) => calendar.events.filter((event) => event.kind === kind)

    expect(kinds('help')).toMatchObject([{ title: 'Te ofreces a ayudar', section: 'guardia' }])
    // Tres días concretos: tres sesiones, una por día.
    expect(kinds('therapy')).toHaveLength(3)
    expect(kinds('therapy')[0]).toMatchObject({
      title: 'Terapia de ft_printf',
      place: 'Cluster 1',
      section: 'terapia',
      seats: { taken: 1, max: 5 },
    })
    // Cada sesión dura dos horas, sea cual sea la zona del campus.
    for (const session of kinds('therapy')) {
      expect(Date.parse(session.end) - Date.parse(session.start)).toBe(2 * HOUR)
    }
  })

  it('valida el intervalo', async () => {
    const built = await app()
    const http = client(built, await built.login())

    expect((await http.get('/calendar')).statusCode).toBe(400)
    expect(
      (await http.get('/calendar?from=2026-10-08T00:00:00Z&to=2026-10-01T00:00:00Z')).statusCode,
    ).toBe(400)
    expect(
      (await http.get('/calendar?from=2026-01-01T00:00:00Z&to=2026-12-31T00:00:00Z')).statusCode,
    ).toBe(400)
  })
})
