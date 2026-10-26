/**
 * Lo que ve un piscinero de la piscina (`docs/piscineros.md`): su Avance, el
 * grafo del tablón y los proyectos para pedir ayuda, todos con la piscina y no
 * con el common core.
 */
import { afterEach, describe, expect, it } from 'vitest'

import type { HolyGraph, PiscineProgress, ProjectSummary } from '@sanatorio/contracts'
import { PISCINE } from '../../src/modules/replica/index.js'
import { cookieAs, json, makeApp } from '../helpers/test-app.js'
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
/** El id de cada proyecto de la piscina en la réplica: desde el 500, en su orden. */
const ID = new Map(PISCINE.map((project, index) => [project.slug, 500 + index]))

const get = (built: TestApp, url: string, cookie: string) =>
  built.app.inject({ method: 'GET', url, headers: { cookie } })

/** Un piscinero con la piscina abierta y algo hecho: Shell 00 aprobado, C 00 y el rush 00 empezados. */
async function piscinero(allow: string[]): Promise<{ built: TestApp; cookie: string }> {
  const built = await makeApp({}, { profile: PISCI })

  apps.push(built)
  await built.db.execute({
    sql: `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pool', ?, 'test', ?)`,
    args: [JSON.stringify({ open: true, message: '', allow }), ago(0)],
  })

  const cookie = await built.login()
  const row = (id: number, slug: string, status: string, validated: number | null) => ({
    sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, final_mark, updated_at_42, created_at_42, synced_at)
          VALUES (?, 7, ?, ?, ?, ?, ?, ?, 'x')`,
    args: [id, ID.get(slug) ?? 0, status, validated, validated === 1 ? 100 : null, ago(3), ago(5)],
  })

  await built.db.batch(
    [
      ...PISCINE.map((project) => ({
        sql: 'INSERT OR REPLACE INTO projects (id, name, slug) VALUES (?, ?, ?)',
        args: [ID.get(project.slug) ?? 0, `C Piscine ${project.short}`, project.slug],
      })),
      // La copia del campus trae a los piscineros con sus proyectos.
      {
        sql: `INSERT OR IGNORE INTO users (id, login, active, synced_at) VALUES (7, 'pisci', 1, 'x')`,
      },
      // Un proyecto del common core: a un piscinero no le sale.
      {
        sql: `INSERT INTO projects (id, name, slug, core) VALUES (1, 'Libft', '42cursus-libft', 1)`,
      },
      row(9001, 'c-piscine-shell-00', 'finished', 1),
      row(9002, 'c-piscine-c-00', 'in_progress', null),
      row(9003, 'c-piscine-rush-00', 'creating_group', null),
      row(9004, 'c-piscine-exam-00', 'finished', 0),
    ],
    'write',
  )

  return { built, cookie }
}

describe('un piscinero ve la piscina', () => {
  it('en el tablón: Shell y C en orden, y aparte rushes, BSQ y exámenes', async () => {
    const { built, cookie } = await piscinero(['tablon', 'tablon.graph'])
    const graph = json(await get(built, '/doubts/graph', cookie)) as HolyGraph

    expect(graph.kind).toBe('piscine')
    expect(graph.startedAt).not.toBeNull()

    const [progress, apart] = graph.circles

    expect(progress?.projects.map((project) => project.short)).toEqual(
      PISCINE.filter((p) => p.group === 'shell' || p.group === 'c').map((p) => p.short),
    )
    expect(new Set(progress?.projects.map((project) => project.group))).toEqual(
      new Set(['shell', 'c']),
    )
    expect(apart?.projects.map((project) => project.short)).toEqual([
      'Rush 00',
      'Rush 01',
      'Rush 02',
      'BSQ',
      'Exam 00',
      'Exam 01',
      'Exam 02',
      'Final',
    ])

    const status = new Map(
      graph.circles.flatMap((ring) => ring.projects.map((p) => [p.short, p.status])),
    )

    expect(status.get('Shell 00')).toBe('finished')
    expect(status.get('C 00')).toBe('in_progress')
    // Buscando grupo para el rush ya es tenerlo empezado; el examen suspendido, por hacer.
    expect(status.get('Rush 00')).toBe('in_progress')
    expect(status.get('Exam 00')).toBe('todo')
    expect(graph.circles.flatMap((ring) => ring.projects).some((p) => p.locked)).toBe(false)
    // Y el tablón de un examen se abre como cualquier otro.
    expect(
      (await get(built, `/projects/${ID.get('c-piscine-exam-01')}/doubts`, cookie)).statusCode,
    ).toBe(200)
  })

  it('para pedir ayuda: todos los de la piscina, lo que lleva en curso primero', async () => {
    const { built, cookie } = await piscinero(['consulta'])

    for (const url of ['/me/projects', '/me/projects?scope=all']) {
      const projects = json(await get(built, url, cookie)) as ProjectSummary[]

      expect(projects).toHaveLength(PISCINE.length)
      expect(projects.slice(0, 2).map((p) => p.name)).toEqual([
        'C Piscine C 00',
        'C Piscine Rush 00',
      ])
      expect(projects.find((p) => p.name === 'C Piscine Shell 00')).toMatchObject({
        status: 'finished',
        group: 'shell',
      })
      expect(projects.find((p) => p.name === 'C Piscine BSQ')).toEqual({
        id: ID.get('c-piscine-bsq'),
        name: 'C Piscine BSQ',
        group: 'rush',
      })
      expect(projects.some((p) => p.name === 'Libft')).toBe(false)
    }
  })

  it('su avance: lo aprobado de la piscina; un estudiante no tiene este', async () => {
    const { built, cookie } = await piscinero(['avance'])
    const response = await get(built, '/stats/progress/piscine?with=nadie,,%20', cookie)

    expect(response.statusCode).toBe(200)

    const data = json(response) as PiscineProgress

    expect(data.me?.done).toBe(1)
    expect(data.steps[0]).toEqual({ short: 'Shell 00', group: 'shell' })
    expect(data.others).toEqual([])
    expect(
      (await get(built, '/stats/progress/piscine', cookieAs(cookie, 'ana', 'student'))).statusCode,
    ).toBe(403)
  })

  it('sin el permiso del avance, 403', async () => {
    const { built, cookie } = await piscinero(['tablon'])

    expect((await get(built, '/stats/progress/piscine', cookie)).statusCode).toBe(403)
  })
})
