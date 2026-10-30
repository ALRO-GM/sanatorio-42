import { afterEach, describe, expect, it } from 'vitest'

import type { LiveExam, PoolAccess } from '@sanatorio/contracts'
import { sign } from '../../src/modules/auth/signed-cookie.js'
import { json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

/**
 * La vista de piscinero de quien administra (`docs/piscineros.md`): entrar,
 * que todo le trate como a un piscinero (también el corte de `/admin/`), salir,
 * y que un piscinero de verdad no pueda usar la salida para hacerse estudiante.
 */

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

/** El `SESSION_SECRET` de `makeApp`. */
const SECRET = 'secreto-de-sesion-para-pruebas-de-treinta-y-dos'
const SESSION = '__Host-sanatorio_session'
const DAY = 86_400_000
/** Otra que administra, estudiante como `albrodri`. */
const OTHER = {
  id: 8,
  login: 'otra',
  campus_users: [{ campus_id: 22, is_primary: true }],
  cursus_users: [{ cursus_id: 21, begin_at: '2024-10-07T08:00:00.000Z' }],
  projects_users: [],
}
const PISCI = {
  id: 7,
  login: 'pisci',
  campus_users: [{ campus_id: 22, is_primary: true }],
  cursus_users: [{ cursus_id: 9, begin_at: new Date(Date.now() - 5 * DAY).toISOString() }],
  projects_users: [],
}

async function app(...args: Parameters<typeof makeApp>): Promise<TestApp> {
  const built = await makeApp(...args)

  apps.push(built)

  return built
}

const send = (built: TestApp, method: 'GET' | 'POST' | 'PUT', url: string, cookie: string) =>
  built.app.inject({ method, url, headers: { cookie } })

/** Las cookies con la de sesión cambiada por la que devuelve la respuesta. */
function withSession(cookie: string, response: { headers: Record<string, unknown> }): string {
  const fresh = String(response.headers['set-cookie']).split(';')[0] ?? ''

  expect(fresh.startsWith(`${SESSION}=`)).toBe(true)

  return cookie
    .split('; ')
    .map((part) => (part.startsWith(`${SESSION}=`) ? fresh : part))
    .join('; ')
}

/** Lo que va firmado dentro de la cookie de sesión. */
function payloadOf(cookie: string): Record<string, unknown> {
  const value = cookie.split('; ').find((part) => part.startsWith(`${SESSION}=`)) ?? ''
  const raw = value.slice(SESSION.length + 1).split('.')[0] ?? ''

  return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<string, unknown>
}

describe('la vista de piscinero de quien administra', () => {
  it('entra con la piscina cerrada, es piscinero a todos los efectos y vuelve', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const admin = await built.adminLogin()
    const entered = await send(built, 'POST', '/admin/pool/preview', admin)

    expect(entered.statusCode).toBe(204)

    const preview = withSession(admin, entered)

    // Firmado como piscinero, con la marca y la misma caducidad.
    expect(payloadOf(preview)).toMatchObject({ aud: 'pool', preview: true })
    expect(payloadOf(preview).exp).toBe(payloadOf(admin).exp)

    const access = json(await send(built, 'GET', '/pool/access', preview)) as PoolAccess

    expect(access).toMatchObject({ pool: true, preview: true })
    expect(access.allow).toContain('expediente')

    // El corte de piscineros: lo no permitido (y todo el panel) da 403.
    expect((await send(built, 'GET', '/admin/pool', preview)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/pool/preview', preview)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/leaderboard', preview)).statusCode).toBe(403)
    expect((await send(built, 'GET', '/me/legal', preview)).statusCode).toBe(200)

    // Y no administra: su expediente lo dice como el de cualquier piscinero.
    const profile = json(await send(built, 'GET', '/me/profile', preview)) as { admin: boolean }

    expect(profile.admin).toBe(false)

    const left = await send(built, 'POST', '/pool/preview/exit', preview)

    expect(left.statusCode).toBe(204)

    const back = withSession(preview, left)

    expect(payloadOf(back)).toMatchObject({ aud: 'student', role: 'student' })
    expect(payloadOf(back)).not.toHaveProperty('preview')
    expect(payloadOf(back).exp).toBe(payloadOf(admin).exp)
    expect((json(await send(built, 'GET', '/pool/access', back)) as PoolAccess).pool).toBe(false)
    expect((await send(built, 'GET', '/admin/pool', back)).statusCode).toBe(200)

    // Ya fuera, salir otra vez no hace nada.
    expect((await send(built, 'POST', '/pool/preview/exit', back)).statusCode).toBe(403)
  })

  it('sin límites: solo el dueño, con todo abierto menos el panel, y vuelve', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri' })
    const owner = await built.adminLogin()

    expect((json(await send(built, 'GET', '/pool/access', owner)) as PoolAccess).owner).toBe(true)

    const entered = await send(built, 'POST', '/admin/pool/preview/full', owner)

    expect(entered.statusCode).toBe(204)

    const full = withSession(owner, entered)

    expect(payloadOf(full)).toMatchObject({ aud: 'pool', preview: true, unrestricted: true })
    expect(json(await send(built, 'GET', '/pool/access', full))).toEqual({
      pool: true,
      allow: null,
      preview: true,
      unrestricted: true,
    })

    // Lo que los permisos no abren (exámenes, la clasificación) pasa; el panel, no.
    expect((await send(built, 'GET', '/exams/stats', full)).statusCode).not.toBe(403)
    expect((await send(built, 'GET', '/leaderboard', full)).statusCode).toBe(200)
    expect((await send(built, 'GET', '/admin/pool', full)).statusCode).toBe(403)
    expect((json(await send(built, 'GET', '/me/profile', full)) as { admin: boolean }).admin).toBe(
      false,
    )

    const back = withSession(full, await send(built, 'POST', '/pool/preview/exit', full))

    expect(payloadOf(back)).not.toHaveProperty('unrestricted')
    expect((json(await send(built, 'GET', '/pool/access', back)) as PoolAccess).pool).toBe(false)
  })

  it('sin límites: otro que administra no entra, ni firmándose la marca', async () => {
    const built = await app({ ADMIN_LOGINS: 'albrodri,otra' }, { profile: OTHER })
    const admin = await built.adminLogin()

    expect((json(await send(built, 'GET', '/pool/access', admin)) as PoolAccess).owner).toBe(
      undefined,
    )
    expect((await send(built, 'POST', '/admin/pool/preview/full', admin)).statusCode).toBe(403)

    // Su vista normal con la marca firmada a mano: sin ser el dueño no cuenta.
    const preview = withSession(admin, await send(built, 'POST', '/admin/pool/preview', admin))
    const forged = `${SESSION}=${sign(
      SECRET,
      Buffer.from(JSON.stringify({ ...payloadOf(preview), unrestricted: true })).toString(
        'base64url',
      ),
    )}`

    expect(
      (json(await send(built, 'GET', '/pool/access', forged)) as PoolAccess).unrestricted,
    ).toBe(undefined)
    expect((await send(built, 'GET', '/leaderboard', forged)).statusCode).toBe(403)
  })

  it('sin límites, Exámenes enseña el de la piscina con los C Piscine Exam de cada cual', async () => {
    const at = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString()
    const piscineExam = { id: 1301, name: 'C Piscine Exam 00', slug: 'c-piscine-exam-00' }
    const built = await app(
      { ADMIN_LOGINS: 'albrodri' },
      {
        routes: {
          '/v2/campus/22/events': [],
          // Un examen solo de la piscina (cursus 9): los estudiantes no lo tienen.
          '/v2/campus/22/exams': [
            {
              id: 910,
              name: 'C Piscine Exam',
              location: 'c1',
              begin_at: at(-30),
              end_at: at(150),
              cursus_ids: [9],
            },
          ],
          '/v2/exams/910/exams_users': [{ id: 1, user: { id: 40, login: 'ppool' } }],
          '/v2/projects_users': [
            {
              id: 6001,
              status: 'in_progress',
              'validated?': null,
              final_mark: null,
              project: piscineExam,
              user: { id: 40, login: 'ppool' },
              teams: [{ id: 9001, final_mark: null, 'validated?': null, created_at: at(-20) }],
            },
          ],
        },
      },
    )

    await built.db.execute({
      sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
            VALUES (22, 40, 'ppool', NULL, ?, ?)`,
      args: [at(-10 * 24 * 60), at(0)],
    })
    // El examen de la piscina ya se conoce: alguien lo tenía de antes.
    await built.services.repositories.replica.ingestProjectUsers(
      [{ id: 5999, status: 'finished', project: piscineExam, user: { id: 41, login: 'otro' } }],
      22,
    )

    const owner = await built.adminLogin()
    const full = withSession(owner, await send(built, 'POST', '/admin/pool/preview/full', owner))
    const pool = json(await send(built, 'GET', '/exams/live?world=pool', full)) as LiveExam

    expect(pool).toMatchObject({ running: true, exam: { id: 910 } })
    expect(pool.groups.map((group) => [group.name, group.people.map((one) => one.login)])).toEqual([
      ['C Piscine Exam 00', ['ppool']],
    ])
    expect(pool.groups[0]?.people[0]).toMatchObject({ status: 'inProgress' })

    // El de los estudiantes no tiene ese examen.
    expect(
      (json(await send(built, 'GET', '/exams/live?world=student', full)) as LiveExam).exam,
    ).toBeNull()
  })

  it('quien no administra no entra, y sin sesión es 401', async () => {
    const built = await app()
    const student = await built.login()

    expect((await send(built, 'POST', '/admin/pool/preview', student)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/pool/preview/full', student)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/pool/preview/exit', student)).statusCode).toBe(403)
    expect(
      (await built.app.inject({ method: 'POST', url: '/admin/pool/preview' })).statusCode,
    ).toBe(401)
  })

  it('un piscinero de verdad no puede usar la salida para hacerse estudiante', async () => {
    const built = await app({}, { profile: PISCI })

    await built.db.execute({
      sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
      args: [
        JSON.stringify({ open: true, message: '', allow: ['expediente'] }),
        new Date().toISOString(),
      ],
    })

    const pisci = await built.login()

    expect((await send(built, 'POST', '/pool/preview/exit', pisci)).statusCode).toBe(403)
    expect((await send(built, 'POST', '/admin/pool/preview', pisci)).statusCode).toBe(403)
    expect((json(await send(built, 'GET', '/pool/access', pisci)) as PoolAccess).preview).toBe(
      undefined,
    )

    // La marca va firmada: añadírsela a mano rompe la firma y no hay sesión.
    const [, value = ''] = pisci.split('=')
    const forged = Buffer.from(JSON.stringify({ ...payloadOf(pisci), preview: true })).toString(
      'base64url',
    )
    const tampered = `${SESSION}=${forged}.${value.split('.')[1] ?? ''}`

    expect((await send(built, 'POST', '/pool/preview/exit', tampered)).statusCode).toBe(401)

    // Y aunque alguien la firmara, sin administrar no sale.
    const signed = `${SESSION}=${sign(SECRET, forged)}`

    expect((await send(built, 'POST', '/pool/preview/exit', signed)).statusCode).toBe(403)
  })
})
