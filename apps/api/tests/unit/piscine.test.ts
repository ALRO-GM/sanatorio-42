/**
 * El Avance de un piscinero (`docs/piscineros.md`): lo aprobado de Shell 00 …
 * C 13 al acabar cada día de piscina, sin rushes, BSQ ni exámenes, y las medias
 * de su piscina y de las anteriores de su campus.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { actor } from '../helpers/community.js'
import { PISCINE, PISCINE_PROGRESS } from '../../src/modules/replica/index.js'
import {
  meanLine,
  poolLinesOf,
  samePool,
  swimOf,
  POOL_DAYS,
} from '../../src/modules/stats/piscine.rules.js'
import { createPiscineProgressService } from '../../src/modules/stats/piscine.service.js'
import { createPiscineRepository } from '../../src/modules/stats/stats.repository.js'

const DAY = 86_400_000
const START = Date.UTC(2026, 9, 5, 8)
const NAMES = new Map([
  [1, 'Shell 00'],
  [2, 'Shell 01'],
  [3, 'C 00'],
])

describe('el plan de la piscina', () => {
  it('cuentan 16, en orden: Shell 00 y 01 y C 00 a C 13; aparte, rushes, BSQ y exámenes', () => {
    expect(PISCINE_PROGRESS.map((project) => project.short)).toEqual([
      'Shell 00',
      'Shell 01',
      ...Array.from({ length: 14 }, (_, n) => `C ${String(n).padStart(2, '0')}`),
    ])
    expect(PISCINE.filter((project) => project.group === 'rush').map((p) => p.slug)).toEqual([
      'c-piscine-rush-00',
      'c-piscine-rush-01',
      'c-piscine-rush-02',
      'c-piscine-bsq',
    ])
    expect(PISCINE.filter((project) => project.group === 'exam')).toHaveLength(4)
    // Ni las prácticas de examen ni la Reloaded (que es del 42cursus).
    expect(PISCINE.some((project) => /checkpoint|reloaded/.test(project.slug))).toBe(false)
  })
})

describe('la línea de un piscinero', () => {
  it('cuenta lo aprobado al acabar cada día, hasta hoy, con sus hitos', () => {
    const trace = swimOf(
      {
        login: 'pisci',
        start: START,
        done: new Map([
          [1, START + 2 * 3_600_000],
          [2, START + 2 * DAY + 3_600_000],
          [3, START + 2 * DAY + 7_200_000],
        ]),
      },
      START + 4.5 * DAY,
      NAMES,
    )

    expect(trace.line.slice(0, 6)).toEqual([1, 1, 3, 3, 3, null])
    expect(trace.line).toHaveLength(POOL_DAYS + 1)
    expect(trace.done).toBe(3)
    expect(trace.milestones).toEqual([
      { day: 0, projects: ['Shell 00'], value: 1 },
      { day: 2, projects: ['Shell 01', 'C 00'], value: 3 },
    ])
  })

  it('sin nada aprobado, ceros; lo de mañana todavía no cuenta', () => {
    const trace = swimOf(
      { login: 'nadie', start: START, done: new Map([[1, START + 10 * DAY]]) },
      START + DAY / 2,
      NAMES,
    )

    expect(trace.line.slice(0, 2)).toEqual([0, null])
    expect(trace.done).toBe(0)
    expect(trace.milestones).toEqual([])
  })

  it('una media con poca gente no se enseña', () => {
    expect(
      meanLine(
        [
          [1, 2],
          [3, null],
        ],
        2,
        2,
      ),
    ).toEqual([2, null])
    expect(meanLine([], 3, 1)).toEqual([null, null, null])
  })

  it('tu piscina es quien empezó a menos de una semana de ti', () => {
    expect(samePool(START + 2 * DAY, START)).toBe(true)
    expect(samePool(START - 2 * DAY, START)).toBe(true)
    expect(samePool(START - 40 * DAY, START)).toBe(false)
    expect(samePool(START + 40 * DAY, START)).toBe(false)
  })
})

describe('las últimas piscinas, para compararlas', () => {
  const swimmers = (start: number, count: number, done: Map<number, number>) =>
    Array.from({ length: count }, (_, n) => ({
      login: `p${String(start)}-${String(n)}`,
      start,
      done,
    }))

  it('los días con 20 o más empezando, de la más nueva a la más vieja, con su media', () => {
    const old = START - 120 * DAY
    const lines = poolLinesOf(
      [
        ...swimmers(START, 20, new Map()),
        // La vieja: todos aprobaron Shell 00 el día 1.
        ...swimmers(old, 25, new Map([[1, old + DAY + 3_600_000]])),
        // Quien repite un día suelto no es una piscina.
        ...swimmers(START - 60 * DAY, 3, new Map()),
        // La que aún no ha empezado, tampoco.
        ...swimmers(START + 30 * DAY, 30, new Map()),
      ],
      START + 2 * DAY,
      NAMES,
      10,
    )

    expect(lines.map((pool) => [pool.start, pool.people, pool.copied])).toEqual([
      ['2026-10-05', 20, false],
      ['2026-06-07', 25, true],
    ])
    expect(lines[1]?.line.slice(0, 3)).toEqual([0, 1, 1])
    // La que está en curso: lo que no ha vivido, sin dato.
    expect(lines[0]?.line.slice(0, 4)).toEqual([0, 0, 0, null])
  })

  it('sin nadie, ninguna', () => {
    expect(poolLinesOf([], START, NAMES, 10)).toEqual([])
  })
})

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

/** Los proyectos de la piscina en la réplica: ids desde el 100, en el orden de `PISCINE`. */
async function seedProjects(): Promise<Map<string, number>> {
  const ids = new Map(PISCINE.map((project, index) => [project.slug, 100 + index]))

  await db.batch(
    PISCINE.map((project) => ({
      sql: 'INSERT INTO projects (id, name, slug) VALUES (?, ?, ?)',
      args: [ids.get(project.slug) ?? 0, project.short, project.slug],
    })),
    'write',
  )

  return ids
}

let nextRow = 1

/** Alguien del campus 22 con esos proyectos (slug → día en que lo aprobó, o `null` si sigue). */
async function person(
  id: number,
  login: string,
  start: number,
  projects: Record<string, number | null>,
  ids: Map<string, number>,
  pool: boolean,
): Promise<void> {
  const iso = (ms: number) => new Date(ms).toISOString()

  await db.batch(
    [
      {
        sql: 'INSERT INTO users (id, login, image, active, synced_at) VALUES (?, ?, NULL, 1, ?)',
        args: [id, login, iso(start)],
      },
      pool
        ? {
            sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
                  VALUES (22, ?, ?, NULL, ?, ?)`,
            args: [id, login, iso(start), iso(start)],
          }
        : { sql: 'INSERT INTO campus_members VALUES (22, ?)', args: [id] },
      ...Object.entries(projects).map(([slug, day]) => ({
        sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'x')`,
        args: [
          nextRow++,
          id,
          ids.get(slug) ?? 0,
          day === null ? 'in_progress' : 'finished',
          day === null ? null : 1,
          iso(start + (day ?? 0) * DAY + 3_600_000),
          iso(start + 3_600_000),
        ],
      })),
    ],
    'write',
  )
}

describe('el avance de la piscina', () => {
  it('tu línea y la media de tu piscina, sin rushes, exámenes ni otras piscinas', async () => {
    const ids = await seedProjects()
    const now = START + 3.5 * DAY
    const past = START - 120 * DAY

    // Tu piscina: tú y once más que aprobaron Shell 00 el día 0.
    await person(
      1,
      'pisci',
      START,
      { 'c-piscine-shell-00': 0, 'c-piscine-rush-00': 1, 'c-piscine-exam-00': 1 },
      ids,
      true,
    )
    for (let n = 0; n < 11; n++) {
      await person(10 + n, `mate${n}`, START, { 'c-piscine-shell-00': 0 }, ids, true)
    }
    // Una piscina anterior, aún en `pool_members` y otra de la copia del campus: no salen.
    for (let n = 0; n < 3; n++) {
      await person(
        50 + n,
        `viejo${n}`,
        past,
        { 'c-piscine-shell-00': 0, 'c-piscine-shell-01': 1, 'c-piscine-c-00': 2 },
        ids,
        n < 2,
      )
    }

    const service = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => now,
    })
    const data = await service.progress(
      actor('pisci', { pool: true }),
      22,
      ['mate1', 'viejo0'],
      () => true,
    )

    expect(data.steps).toHaveLength(16)
    // El rush y el examen aprobados no suman.
    expect(data.me?.line.slice(0, 5)).toEqual([1, 1, 1, 1, null])
    expect(data.me?.done).toBe(1)
    expect(data.startedAt).toBe(new Date(START).toISOString())
    // Tu piscina, sin ti: once con Shell 00.
    expect(data.cohort.people).toBe(11)
    expect(data.cohort.line.slice(0, 4)).toEqual([1, 1, 1, 1])
    expect(data.cohort.individuals).toEqual([])
    expect(data.cohort.since).toBe(new Date(START).toISOString())
    // Nada de otras piscinas: ni en la respuesta ni para compararse.
    expect(data).not.toHaveProperty('past')
    expect(data).not.toHaveProperty('pools')
    expect(data.others.map((each) => each.login)).toEqual(['mate1'])
  })

  it('sin estar en la piscina (quien administra mirándola): sin línea, con la última piscina', async () => {
    const ids = await seedProjects()

    for (let n = 0; n < 2; n++) {
      await person(10 + n, `mate${n}`, START, { 'c-piscine-shell-00': null }, ids, true)
    }

    const service = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => START + DAY,
    })
    const data = await service.progress(
      actor('admin', { pool: true }),
      22,
      [],
      (login) => login !== 'mate1',
    )

    expect(data.me).toBeNull()
    expect(data.startedAt).toBeNull()
    expect(data.cohort.people).toBe(2)
    // Con dos no hay media: van sus líneas, sin quien no se ve.
    expect(data.cohort.line[0]).toBeNull()
    expect(data.cohort.individuals.map((each) => each.login)).toEqual(['mate0'])
    // Sin la vista sin límites, la piscina entera no viene.
    expect(data).not.toHaveProperty('everyone')
  })

  it('la vista sin límites del dueño trae la línea de cada uno de la piscina, sin quien no se ve', async () => {
    const ids = await seedProjects()

    await person(
      10,
      'rapido',
      START,
      { 'c-piscine-shell-00': 0, 'c-piscine-shell-01': 1 },
      ids,
      true,
    )
    await person(11, 'lento', START, { 'c-piscine-shell-00': 1 }, ids, true)
    await person(12, 'oculto', START, { 'c-piscine-shell-00': 0 }, ids, true)

    const service = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => START + 3 * DAY,
    })
    const data = await service.progress(
      actor('albrodri', { pool: true }),
      22,
      [],
      (login) => login !== 'oculto',
      { everyone: true },
    )

    expect(data.everyone?.map((each) => [each.login, each.done]).sort()).toEqual([
      ['lento', 1],
      ['rapido', 2],
    ])
  })

  it('la vista sin límites compara las últimas piscinas, también las del historial', async () => {
    const ids = await seedProjects()
    const old = START - 91 * DAY
    const shell = ids.get('c-piscine-shell-00') ?? 0

    // La piscina de hace tres meses solo está en el historial: veinte, y la mitad
    // aprobó Shell 00 el día 2.
    await db.batch(
      Array.from({ length: 20 }, (_, n) => [
        {
          sql: `INSERT INTO piscine_members (campus_id, user_id, login, image, begin_at)
                VALUES (22, ?, ?, NULL, ?)`,
          args: [500 + n, `old${String(n)}`, new Date(old).toISOString()],
        },
        ...(n < 10
          ? [
              {
                sql: `INSERT INTO piscine_activity (campus_id, user_id, login, kind, ref, at)
                      VALUES (22, ?, ?, 'passed', ?, ?)`,
                args: [
                  500 + n,
                  `old${String(n)}`,
                  shell,
                  new Date(old + 2 * DAY + 3_600_000).toISOString(),
                ],
              },
            ]
          : []),
      ]).flat(),
      'write',
    )
    // Abandonaron los diez que no aprobaron nada.
    const asked: string[] = []
    const service = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => START + 3 * DAY,
      leftOf: (campusId, start) => {
        asked.push(`${String(campusId)} ${start}`)

        return Promise.resolve(
          new Set(Array.from({ length: 10 }, (_, n) => `old${String(n + 10)}`)),
        )
      },
    })
    const data = await service.progress(actor('albrodri', { pool: true }), 22, [], () => true, {
      everyone: true,
    })

    expect(data.pools).toHaveLength(1)
    expect(data.pools?.[0]).toMatchObject({ start: '2026-07-06', people: 20, copied: true })
    expect(data.pools?.[0]?.line.slice(0, 4)).toEqual([0, 0, 0.5, 0.5])
    // Quien sigue y quien abandonó, cada cual con su media.
    expect(asked).toEqual(['22 2026-07-06'])
    expect(data.pools?.[0]?.stayed).toMatchObject({ people: 10 })
    expect(data.pools?.[0]?.stayed?.line.slice(0, 4)).toEqual([0, 0, 1, 1])
    expect(data.pools?.[0]?.left?.line.slice(0, 4)).toEqual([0, 0, 0, 0])

    // Si no se puede saber quién abandonó, todo junto, sin fallar.
    const failing = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => START + 3 * DAY,
      leftOf: () => Promise.reject(new Error('sin abandono')),
    })
    const plain = await failing.progress(actor('albrodri', { pool: true }), 22, [], () => true, {
      everyone: true,
    })

    expect(plain.pools?.[0]).not.toHaveProperty('left')
  })

  it('en la vista de piscinero de quien administra lo ve como el más avanzado, con la piscina entera', async () => {
    const ids = await seedProjects()

    // La piscina: doce que empezaron el mismo día y una que se apuntó ocho días
    // tarde. Antes, la última fecha dejaba fuera a los doce.
    await person(
      10,
      'rapido',
      START,
      { 'c-piscine-shell-00': 0, 'c-piscine-shell-01': 1, 'c-piscine-c-00': 2 },
      ids,
      true,
    )
    await person(
      11,
      'oculto',
      START,
      {
        'c-piscine-shell-00': 0,
        'c-piscine-shell-01': 0,
        'c-piscine-c-00': 0,
        'c-piscine-c-01': 1,
      },
      ids,
      true,
    )
    // Empata con «rapido» en aprobados, pero llegó al último más tarde.
    await person(
      12,
      'empate',
      START,
      { 'c-piscine-shell-00': 0, 'c-piscine-shell-01': 1, 'c-piscine-c-00': 3 },
      ids,
      true,
    )
    for (let n = 0; n < 9; n++) {
      await person(20 + n, `mate${n}`, START, { 'c-piscine-shell-00': 1 }, ids, true)
    }
    await person(40, 'tarde', START + 8 * DAY, {}, ids, true)

    const service = createPiscineProgressService({
      piscine: createPiscineRepository(db),
      now: () => START + 9 * DAY,
    })
    const sees = (login: string) => login !== 'oculto'
    const data = await service.progress(
      actor('albrodri', { pool: true }),
      22,
      ['rapido', 'mate0'],
      sees,
      { preview: true },
    )

    // Quien no se ve no hace de ti.
    expect(data.standIn).toEqual({ login: 'rapido', image: null })
    expect(data.me?.done).toBe(3)
    expect(data.startedAt).toBe(new Date(START).toISOString())
    // La piscina entera, sin «rapido» (que eres tú) ni quien se apuntó tarde.
    expect(data.cohort.people).toBe(11)
    expect(data.others.map((each) => each.login)).toEqual(['mate0'])

    // La vista sin límites trae también a quien hace de ti.
    const full = await service.progress(actor('albrodri', { pool: true }), 22, [], sees, {
      preview: true,
      everyone: true,
    })

    expect(full.everyone?.map((each) => each.login)).toContain('rapido')
    expect(full.everyone).toHaveLength(11)

    // Un piscinero de verdad que aún no se ha copiado nunca ve la línea de otro.
    const fresh = await service.progress(actor('nuevo', { pool: true }), 22, [], sees)

    expect(fresh.me).toBeNull()
    expect(fresh).not.toHaveProperty('standIn')
    expect(fresh.cohort.people).toBe(12)
  })

  it('un campus sin nadie: todo vacío, sin fallar', async () => {
    const service = createPiscineProgressService({ piscine: createPiscineRepository(db) })
    const data = await service.progress(actor('pisci', { pool: true }), 99, [], () => true)

    expect(data.me).toBeNull()
    expect(data.cohort).toEqual({
      line: data.days.map(() => null),
      people: 0,
      individuals: [],
      since: null,
    })
  })
})
