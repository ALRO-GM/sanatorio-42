/**
 * La ruta del álbum de correcciones (`GET /corrections/collection`) con la app
 * entera: sesión, validación, permisos de piscinero y mundos separados.
 */

import { afterEach, describe, expect, it } from 'vitest'

import type { CorrectionCollection } from '@sanatorio/contracts'
import { cookieAs, json, makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

const apps: TestApp[] = []

afterEach(async () => {
  for (const built of apps.splice(0)) await built.close()
})

const ago = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString()

async function world(allow: string[]): Promise<{ built: TestApp; student: string; pool: string }> {
  const built = await makeApp({ ADMIN_LOGINS: 'albrodri' })

  apps.push(built)
  await built.db.batch(
    [
      {
        sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
              VALUES (22, 77, 'pisci', NULL, ?, ?)`,
        args: [ago(5), ago(0)],
      },
      {
        sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
        args: [JSON.stringify({ open: true, message: '', allow }), ago(0)],
      },
    ],
    'write',
  )

  const admin = await built.adminLogin()
  const student = admin.split('; ')[0] ?? ''

  return { built, student, pool: cookieAs(student, 'pisci', 'pool') }
}

const get = (built: TestApp, url: string, cookie?: string) =>
  built.app.inject({
    method: 'GET',
    url,
    headers: cookie === undefined ? {} : { cookie },
  })

describe('GET /corrections/collection', () => {
  it('pide sesión y valida el grupo', async () => {
    const { built, student } = await world([])

    expect((await get(built, '/corrections/collection')).statusCode).toBe(401)
    expect((await get(built, '/corrections/collection?group=rivales', student)).statusCode).toBe(
      400,
    )

    const ok = await get(built, '/corrections/collection?group=world', student)

    expect(ok.statusCode).toBe(200)
    expect(json(ok) as CorrectionCollection).toEqual(
      expect.objectContaining({ group: 'world', me: null, rows: [] }),
    )
  })

  it('a un piscinero solo le abre la ruta con el permiso de «Mis correcciones»', async () => {
    const closed = await world(['tablon', 'tablon.graph'])

    expect((await get(closed.built, '/corrections/collection', closed.pool)).statusCode).toBe(403)

    const open = await world(['tablon', 'tablon.corrections'])
    const response = await get(open.built, '/corrections/collection', open.pool)

    expect(response.statusCode).toBe(200)
    // La piscina no tiene círculos.
    expect(
      (json(response) as CorrectionCollection).standings.map((one) => one.group),
    ).not.toContain('circle')
  })
})
