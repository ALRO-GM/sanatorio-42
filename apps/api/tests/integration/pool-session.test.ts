import { afterEach, describe, expect, it } from 'vitest'

import type { ClusterMap, FoundPerson, PoolAccess } from '@sanatorio/contracts'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

const DAY = 86_400_000
const ago = (days: number): string => new Date(Date.now() - days * DAY).toISOString()
const PISCI = {
  id: 7,
  login: 'pisci',
  campus_users: [{ campus_id: 22, is_primary: true }],
  cursus_users: [{ cursus_id: 9, begin_at: ago(5) }],
  projects_users: [],
}
const seated = (id: number, login: string, host: string) => ({
  id: id * 10,
  host,
  begin_at: ago(0.01),
  end_at: null,
  campus_id: 22,
  user: { id, login, image: null },
})
/** Un estudiante y un piscinero sentados en el mismo campus. */
const LOCATIONS = {
  '/v2/campus/22/locations': [seated(1, 'albrodri', 'c2r17s2'), seated(7, 'pisci', 'c1r1s1')],
}

async function app(profile?: unknown): Promise<TestApp> {
  const built = await makeApp(
    {},
    { ...(profile === undefined ? {} : { profile }), routes: LOCATIONS },
  )

  apps.push(built)

  return built
}

/** La piscina abierta con esos permisos, como si se hubiera guardado en el panel. */
async function openPool(built: TestApp, allow: string[]): Promise<void> {
  await built.db.execute({
    sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
    args: [JSON.stringify({ open: true, message: '', allow }), new Date().toISOString()],
  })
}

const get = (built: TestApp, url: string, cookie: string) =>
  built.app.inject({ method: 'GET', url, headers: { cookie } })

const occupants = (map: ClusterMap): string[] => [
  ...map.clusters.flatMap((cluster) =>
    cluster.seats.flatMap((seat) => (seat.occupant === null ? [] : [seat.occupant.login])),
  ),
  ...map.unplaced.map((person) => person.login),
]

describe('un piscinero, con la piscina abierta', () => {
  it('entra, solo llega a lo permitido y solo ve a piscineros', async () => {
    const built = await app(PISCI)

    await openPool(built, ['clusters', 'people', 'red.rankings'])

    const cookie = await built.login()
    const access = json(await get(built, '/pool/access', cookie)) as PoolAccess

    expect(access.pool).toBe(true)
    // `red.rankings` sin `red` no cuenta.
    expect([...(access.allow ?? [])].sort()).toEqual(['clusters', 'people'])

    // Lo no permitido, 403 aunque la ruta exista; la base, siempre.
    expect((await get(built, '/projects/1/peers', cookie)).statusCode).toBe(403)
    expect((await get(built, '/network', cookie)).statusCode).toBe(403)
    expect((await get(built, '/leaderboard', cookie)).statusCode).toBe(403)
    expect((await get(built, '/me/legal', cookie)).statusCode).toBe(200)

    // En el mapa, él con nombre; el puesto del estudiante, ocupado sin nombre.
    const map = json(await get(built, '/map', cookie)) as ClusterMap
    const taken = map.clusters.flatMap((cluster) => cluster.seats.filter((seat) => seat.taken))

    expect(occupants(map)).toContain('pisci')
    expect(occupants(map)).not.toContain('albrodri')
    expect(taken.length).toBeGreaterThan(0)
    expect(taken.every((seat) => seat.occupant === null)).toBe(true)
    expect(JSON.stringify(taken)).not.toContain('albrodri')
    expect((await get(built, '/people/albrodri/card', cookie)).statusCode).toBe(404)
    expect(json(await get(built, '/users/search?q=alb', cookie))).toEqual([])
    expect(
      (json(await get(built, '/users/search?q=pis', cookie)) as FoundPerson[]).map((p) => p.login),
    ).toEqual(['pisci'])
  })

  it('con la piscina cerrada no entra, aunque tenga permisos guardados', async () => {
    const built = await app(PISCI)

    await built.db.execute({
      sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
      args: [JSON.stringify({ open: false, message: '', allow: ['clusters'] }), ago(0)],
    })
    await expect(built.login()).rejects.toThrow()
  })
})

describe('un estudiante', () => {
  it('ve a los piscineros sentados en el mapa, pero no en el buscador ni su ficha', async () => {
    const built = await app()

    await built.db.execute({
      sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
            VALUES (22, 7, 'pisci', NULL, ?, ?)`,
      args: [ago(5), ago(0)],
    })

    const cookie = await built.login()
    const map = json(await get(built, '/map', cookie)) as ClusterMap

    // En la sala está quien esté sentado, sea del grupo que sea.
    expect(occupants(map)).toEqual(expect.arrayContaining(['albrodri', 'pisci']))
    expect(map.clusters.every((cluster) => cluster.seats.every((seat) => !seat.taken))).toBe(true)
    expect(json(await get(built, '/users/search?q=pis', cookie))).toEqual([])
    expect((await get(built, '/people/pisci/card', cookie)).statusCode).toBe(404)
    expect((await get(built, '/users/pisci/profile', cookie)).statusCode).toBe(404)
    expect((json(await get(built, '/pool/access', cookie)) as PoolAccess).pool).toBe(false)
  })
})
