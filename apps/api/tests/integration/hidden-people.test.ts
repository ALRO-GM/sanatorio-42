/**
 * Personas ocultas (`docs/personas-ocultas.md`): quien administra oculta a
 * alguien a un grupo y para ese grupo desaparece del mapa, el buscador, su
 * ficha y su perfil, la sala de espera, la red de correcciones y la de
 * asientos. El otro grupo no lo nota y la persona oculta se sigue viendo.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type {
  ClusterMap,
  FoundPerson,
  HiddenCandidate,
  HiddenPerson,
  NetworkGraph,
  Peer,
  SeatGraph,
  SeatHeat,
} from '@sanatorio/contracts'
import { userId } from '../helpers/fixtures.js'
import { cookieAs, json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

const HOUR = 3_600_000
const ago = (hours: number): string => new Date(Date.now() - hours * HOUR).toISOString()
const seated = (login: string, host: string) => ({
  id: userId(login) * 10,
  host,
  begin_at: ago(4),
  end_at: null,
  campus_id: 22,
  user: { id: userId(login), login, image: null },
})
/** Tres estudiantes juntos (`mgomez` al lado) y dos piscineros en otra fila. */
const LOCATIONS = {
  '/v2/campus/22/locations': [
    seated('albrodri', 'c2r2s3'),
    seated('mgomez', 'c2r2s4'),
    seated('amiga', 'c2r2s5'),
    seated('pisci', 'c1r1s1'),
    seated('pisci2', 'c1r1s2'),
  ],
}

const get = (built: TestApp, url: string, cookie: string) =>
  built.app.inject({ method: 'GET', url, headers: { cookie } })

const occupants = (map: ClusterMap): string[] => [
  ...map.clusters.flatMap((cluster) =>
    cluster.seats.flatMap((seat) => (seat.occupant === null ? [] : [seat.occupant.login])),
  ),
  ...map.unplaced.map((person) => person.login),
]

type Seen = {
  map: string[]
  search: string[]
  card: number
  profile: number
  network: string[]
  seats: string[]
  /** Los puestos con horas en el mapa de calor: no lleva nombres, pero sí dónde. */
  heat: string[]
}

/** Lo que `cookie` ve de `who`: mapa, buscador, ficha, perfil y las dos redes. */
async function seenBy(built: TestApp, cookie: string, who: string): Promise<Seen> {
  const [map, search, card, profile, network, seats, heat] = await Promise.all([
    get(built, '/map', cookie),
    get(built, `/users/search?q=${who.slice(0, 3)}`, cookie),
    get(built, `/people/${who}/card`, cookie),
    get(built, `/users/${who}/profile`, cookie),
    get(built, '/network', cookie),
    get(built, '/network/seats?days=7', cookie),
    get(built, '/network/seats/heat?days=7', cookie),
  ])

  return {
    map: occupants(json(map) as ClusterMap),
    search: (json(search) as FoundPerson[]).map((person) => person.login),
    card: card.statusCode,
    profile: profile.statusCode,
    network: (json(network) as NetworkGraph).nodes.map((node) => node.login),
    seats: (json(seats) as SeatGraph).people.map((person) => person.login),
    heat: (json(heat) as SeatHeat).clusters.flatMap((cluster) =>
      cluster.cells.filter((cell) => cell.hours > 0).map((cell) => cell.host),
    ),
  }
}

const peersOf = async (built: TestApp, cookie: string): Promise<string[]> =>
  (json(await get(built, '/projects/10/peers', cookie)) as Peer[]).map((peer) => peer.login)

/** La app con estudiantes, piscineros, sus correcciones y la piscina abierta. */
async function world(): Promise<{ built: TestApp; admin: string; student: string; pool: string }> {
  const built = await makeApp({ ADMIN_LOGINS: 'albrodri' }, { routes: LOCATIONS })

  apps.push(built)
  await built.db.batch(
    [
      ...['pisci', 'pisci2'].map((login) => ({
        sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
              VALUES (22, ?, ?, NULL, ?, ?)`,
        args: [userId(login), login, ago(24 * 5), ago(0)],
      })),
      ...[
        ['albrodri', 'mgomez', 21],
        ['mgomez', 'albrodri', 21],
        ['albrodri', 'amiga', 21],
        ['pisci', 'pisci2', 9],
        ['pisci2', 'pisci', 9],
      ].map(([corrector, corrected, cursus], index) => ({
        sql: `INSERT INTO corrections (id, campus_id, corrector, corrected, begin_at, final_mark, positive, cursus)
              VALUES (?, 22, ?, ?, ?, 100, 1, ?)`,
        args: [9000 + index, corrector ?? '', corrected ?? '', ago(48), cursus ?? 21],
      })),
      {
        sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
        args: [
          JSON.stringify({
            open: true,
            message: '',
            allow: ['expediente', 'clusters', 'people', 'red', 'red.seats'],
          }),
          ago(0),
        ],
      },
    ],
    'write',
  )

  const admin = await built.adminLogin()
  const student = admin.split('; ')[0] ?? ''
  const pool = cookieAs(student, 'pisci', 'pool')

  // El mapa trae la foto de los puestos: con ella, la réplica y el historial de asientos.
  await get(built, '/map', student)

  return { built, admin, student, pool }
}

async function hide(
  built: TestApp,
  admin: string,
  login: string,
  body: Record<string, unknown>,
): Promise<{ status: number; list: HiddenPerson[] }> {
  const response = await built.app.inject({
    method: 'PUT',
    url: `/admin/hidden/${login}`,
    headers: { cookie: admin, 'content-type': 'application/json' },
    payload: body,
  })

  return { status: response.statusCode, list: json(response) as HiddenPerson[] }
}

describe('personas ocultas', () => {
  it('oculta a los estudiantes: desaparece para ellos, no para los piscineros, y se ve a sí misma', async () => {
    const { built, admin, student, pool } = await world()
    const before = await seenBy(built, student, 'mgomez')

    // Antes, en todos los sitios.
    expect(before.map).toContain('mgomez')
    expect(before.search).toContain('mgomez')
    expect(before.card).toBe(200)
    expect(before.profile).toBe(200)
    expect(before.network).toContain('mgomez')
    expect(before.seats).toContain('mgomez')
    // El mapa de calor, solo con los de su mundo: los puestos de los piscineros, a 0.
    expect(before.heat).toEqual(['c2r2s3', 'c2r2s4', 'c2r2s5'])
    expect(await peersOf(built, student)).toContain('mgomez')

    const saved = await hide(built, admin, 'MGomez', {
      fromStudents: true,
      fromPool: false,
      reason: '  lo pidió  ',
    })

    expect(saved.status).toBe(200)
    expect(saved.list).toEqual([
      expect.objectContaining({
        login: 'mgomez',
        group: 'student',
        fromStudents: true,
        fromPool: false,
        reason: 'lo pidió',
        by: 'albrodri',
      }),
    ])

    // Para un estudiante (también quien administra, fuera del panel), no existe.
    const after = await seenBy(built, student, 'mgomez')

    expect(after.map).not.toContain('mgomez')
    expect(after.map).toContain('albrodri')
    expect(after.search).not.toContain('mgomez')
    expect(after.card).toBe(404)
    expect(after.profile).toBe(404)
    expect(after.network).not.toContain('mgomez')
    expect(after.network).toContain('amiga')
    expect(after.seats).not.toContain('mgomez')
    expect(after.seats).toContain('amiga')
    // Su puesto sigue en el plano, pero sin sus horas.
    expect(after.heat).toEqual(['c2r2s3', 'c2r2s5'])
    expect(await peersOf(built, student)).not.toContain('mgomez')

    // Ella se sigue viendo, y ve a los demás.
    const self = await seenBy(built, cookieAs(student, 'mgomez', 'student'), 'mgomez')

    expect(self.map).toEqual(expect.arrayContaining(['mgomez', 'albrodri']))
    expect(self.search).toContain('mgomez')
    expect(self.card).toBe(200)
    expect(self.profile).toBe(200)
    expect(self.network).toEqual(expect.arrayContaining(['mgomez', 'albrodri']))
    expect(self.seats).toEqual(expect.arrayContaining(['mgomez', 'albrodri']))

    // Un piscinero no lo nota: los suyos, como siempre.
    const pisci = await seenBy(built, pool, 'pisci2')

    expect(pisci.map).toEqual(expect.arrayContaining(['pisci', 'pisci2']))
    expect(pisci.search).toContain('pisci2')
    expect(pisci.card).toBe(200)
    expect(pisci.network).toContain('pisci2')
    expect(pisci.seats).toContain('pisci2')
    expect(pisci.heat).toEqual(['c1r1s1', 'c1r1s2'])

    // Al quitarla, vuelve al momento.
    const removed = await built.app.inject({
      method: 'DELETE',
      url: '/admin/hidden/mgomez',
      headers: { cookie: admin },
    })

    expect(json(removed)).toEqual([])
    expect((await seenBy(built, student, 'mgomez')).map).toContain('mgomez')
  })

  it('oculta a los piscineros: desaparece para ellos y los estudiantes siguen igual', async () => {
    const { built, admin, student, pool } = await world()

    expect(
      (await hide(built, admin, 'pisci2', { fromStudents: false, fromPool: true })).status,
    ).toBe(200)
    expect(
      (await hide(built, admin, 'amiga', { fromStudents: false, fromPool: true })).status,
    ).toBe(200)

    const pisci = await seenBy(built, pool, 'pisci2')

    expect(pisci.map).toContain('pisci')
    expect(pisci.map).not.toContain('pisci2')
    expect(pisci.search).not.toContain('pisci2')
    expect(pisci.card).toBe(404)
    expect(pisci.network).not.toContain('pisci2')
    expect(pisci.seats).not.toContain('pisci2')
    expect(pisci.heat).toEqual(['c1r1s1'])

    // Ocultar a una estudiante a los piscineros no cambia nada para los estudiantes.
    const seen = await seenBy(built, student, 'amiga')

    expect(seen.map).toContain('amiga')
    expect(seen.search).toContain('amiga')
    expect(seen.card).toBe(200)
    expect(seen.network).toContain('amiga')

    // Y el piscinero oculto se ve a sí mismo.
    const self = await seenBy(built, cookieAs(student, 'pisci2', 'pool'), 'pisci2')

    expect(self.map).toEqual(expect.arrayContaining(['pisci', 'pisci2']))
    expect(self.card).toBe(200)

    const list = json(await get(built, '/admin/hidden', admin)) as HiddenPerson[]

    expect(list.map((entry) => [entry.login, entry.group]).sort()).toEqual([
      ['amiga', 'student'],
      ['pisci2', 'pool'],
    ])
  })

  it('en el tablón: su duda no existe y sus respuestas no salen', async () => {
    const { built, admin, student } = await world()
    const hiddenCookie = cookieAs(student, 'mgomez', 'student')
    const post = async (cookie: string, url: string, body: string) =>
      json(
        await built.app.inject({
          method: 'POST',
          url,
          headers: { cookie, 'content-type': 'application/json' },
          payload: { body },
        }),
      ) as { id: number }

    await hide(built, admin, 'mgomez', { fromStudents: true, fromPool: false })

    const hers = await post(hiddenCookie, '/projects/10/doubts', 'No me compila el printf')
    const mine = await post(student, '/projects/10/doubts', '¿Cómo va el va_arg?')

    await post(hiddenCookie, `/doubts/${String(mine.id)}/answers`, 'Mira el man de stdarg')

    expect((await get(built, `/doubts/${String(hers.id)}`, student)).statusCode).toBe(404)
    expect((await get(built, `/doubts/${String(hers.id)}`, hiddenCookie)).statusCode).toBe(200)

    const replies = (cookie: string) =>
      get(built, `/doubts/${String(mine.id)}`, cookie).then((response) =>
        (json(response) as { replies: { author: string }[] }).replies.map((reply) => reply.author),
      )

    expect(await replies(student)).toEqual([])
    expect(await replies(hiddenCookie)).toEqual(['mgomez'])

    const board = json(await get(built, '/projects/10/doubts', student)) as {
      doubts: { author: string }[]
    }

    expect(board.doubts.map((doubt) => doubt.author)).toEqual(['albrodri'])
  })

  it('el buscador del panel encuentra a gente de los dos grupos', async () => {
    const { built, admin } = await world()
    const found = json(await get(built, '/admin/hidden/search?q=pis', admin)) as HiddenCandidate[]

    expect(found.map((person) => [person.login, person.group])).toEqual([
      ['pisci', 'pool'],
      ['pisci2', 'pool'],
    ])
    expect(
      (json(await get(built, '/admin/hidden/search?q=mgo', admin)) as HiddenCandidate[]).map(
        (person) => person.group,
      ),
    ).toEqual(['student'])
    // Lo escrito no es un comodín.
    expect(json(await get(built, '/admin/hidden/search?q=%25%25', admin))).toEqual([])
  })

  it('sin grupo, con un login raro o sin el panel abierto, no', async () => {
    const { built, admin, student, pool } = await world()

    expect(
      (await hide(built, admin, 'mgomez', { fromStudents: false, fromPool: false })).status,
    ).toBe(400)
    expect((await hide(built, admin, 'mgomez', { fromStudents: true })).status).toBe(400)
    expect(
      (await hide(built, admin, 'mgomez', { fromStudents: true, fromPool: true, extra: 1 })).status,
    ).toBe(400)
    expect(
      (
        await hide(built, admin, 'mgomez', {
          fromStudents: true,
          fromPool: true,
          reason: 'x'.repeat(501),
        })
      ).status,
    ).toBe(400)
    expect(
      (await hide(built, admin, '..%2Fx', { fromStudents: true, fromPool: true })).status,
    ).toBe(400)
    expect((await get(built, '/admin/hidden/search?q=a', admin)).statusCode).toBe(400)

    // Sin el segundo factor (solo la sesión), un piscinero o alguien que no administra: 403.
    for (const cookie of [student, pool, cookieAs(student, 'amiga', 'student')]) {
      expect((await get(built, '/admin/hidden', cookie)).statusCode).toBe(403)
      expect(
        (
          await built.app.inject({
            method: 'PUT',
            url: '/admin/hidden/mgomez',
            headers: { cookie, 'content-type': 'application/json' },
            payload: { fromStudents: true, fromPool: true },
          })
        ).statusCode,
      ).toBe(403)
    }
    expect(json(await get(built, '/admin/hidden', admin))).toEqual([])
  })
})
