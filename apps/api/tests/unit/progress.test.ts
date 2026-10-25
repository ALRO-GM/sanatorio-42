/**
 * El avance en el common core (#87): por círculos (cada círculo pesa lo mismo)
 * y por horas estimadas sobre el plan de cada cual, con los proyectos entre los
 * que se elige (o con dos versiones) como una sola casilla, las líneas de cada
 * pace y las medias por población (`docs/blackhole.md`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { actor } from '../helpers/community.js'
import { createProgressService } from '../../src/modules/stats/progress.service.js'
import {
  circleMarks,
  curveOf,
  paceLines,
  standingOf,
  totalHours,
  unitsOf,
} from '../../src/modules/stats/progress.rules.js'
import type { PlanProject } from '../../src/modules/stats/progress.rules.js'
import { createProgressRepository } from '../../src/modules/stats/stats.repository.js'

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1)

// Un plan de juguete: círculo 0 con un proyecto; círculo 1 con dos, uno de
// ellos a elegir entre dos.
const PLAN: PlanProject[] = [
  { id: 1, slug: 'libft', circle: 0, hours: 70 },
  { id: 2, slug: 'printf', circle: 1, hours: 70 },
  { id: 3, slug: 'so_long', circle: 1, hours: 60 },
  { id: 4, slug: 'fdf', circle: 1, hours: 100 },
]
const CHOICES = { graphics: ['so_long', 'fdf'] }

describe('avance en el common core', () => {
  it('un grupo a elegir es una sola casilla, con su círculo más bajo y las horas del más corto', () => {
    expect(unitsOf(PLAN, CHOICES)).toEqual([
      { circle: 0, hours: 70, ids: [1], hoursById: new Map([[1, 70]]) },
      { circle: 1, hours: 70, ids: [2], hoursById: new Map([[2, 70]]) },
      {
        circle: 1,
        hours: 60,
        ids: [3, 4],
        hoursById: new Map([
          [3, 60],
          [4, 100],
        ]),
      },
    ])
    // Un proyecto repetido no se cuenta dos veces.
    expect(unitsOf([...PLAN, ...PLAN.slice(0, 1)], CHOICES)).toHaveLength(3)
  })

  it('por círculos pesan lo mismo; por horas, las de lo que hizo cada cual', () => {
    const units = unitsOf(PLAN, CHOICES)
    // libft el día 10 y fdf (del grupo) el día 40; printf, sin hacer.
    const done = new Map([
      [1, START + 10 * DAY],
      [4, START + 40 * DAY],
    ])
    const curve = curveOf(units, done, START, [0, 10, 30, 40, 60], START + 50 * DAY)

    // Círculo 0 entero (1/2) y medio círculo 1 (1/4): 75 %.
    expect(curve.circles).toEqual([0, 50, 50, 75, null])
    // Su plan son 70 + 70 + 100 (hizo FdF, no so_long): 240 h; lleva 170.
    expect(curve.hours).toEqual([0, 29.2, 29.2, 70.8, null])
    expect(totalHours(units, done)).toBe(240)
    // Sin nada hecho, el plan cuenta lo más corto: 200 h.
    expect(totalHours(units)).toBe(200)
  })

  it('quien ya no está, solo hasta el día en que salió', () => {
    const units = unitsOf(PLAN, CHOICES)
    const curve = curveOf(
      units,
      new Map([[1, START + DAY]]),
      START,
      [0, 10, 30],
      START + 99 * DAY,
      START + 20 * DAY,
    )

    expect(curve.circles).toEqual([0, 50, null])
  })

  it('dónde está hoy: el primer círculo con algo sin hacer, o 7 si no queda nada', () => {
    const units = unitsOf(PLAN, CHOICES)

    expect(standingOf(units, new Map())).toEqual({ circle: 0, circles: 0, hours: 0 })
    expect(standingOf(units, new Map([[1, START]]))).toEqual({ circle: 1, circles: 50, hours: 35 })
    expect(
      standingOf(
        units,
        new Map([
          [1, START],
          [2, START],
          [3, START],
        ]),
      ),
    ).toEqual({ circle: 7, circles: 100, hours: 100 })
  })

  it('las marcas del eje: dónde se acaba cada círculo', () => {
    const marks = circleMarks(unitsOf(PLAN, CHOICES))

    // Dos círculos: el 0 al 50 % y el 1 al 100 %; los que no hay, también al 100 %.
    expect(marks.slice(0, 3)).toEqual([50, 100, 100])
    expect(marks).toHaveLength(7)
  })

  it('cada pace pide tener cada círculo completo a sus días', () => {
    const lines = paceLines(unitsOf(PLAN, CHOICES))
    const fastest = lines.circles[0]

    expect(fastest?.pace).toBe(8)
    // Empieza en 0; el círculo 0 a los 8 días (50 %) y el 1 a los 32 (100 %).
    expect(fastest?.points.slice(0, 3)).toEqual([
      [0, 0],
      [8, 50],
      [32, 100],
    ])
    expect(lines.hours[0]?.points[1]).toEqual([8, 35])
    expect(lines.circles.map((line) => line.pace)).toEqual([8, 12, 15, 18, 22, 24])
  })
})

// --- El servicio, sobre una base de verdad ---------------------------------

const NOW = Date.parse('2026-10-25T12:00:00Z')
const MADRID = 22
const iso = (ms: number): string => new Date(ms).toISOString()

let db: Db

beforeEach(async () => {
  db = await openDatabase({ url: 'file::memory:' })
})

afterEach(() => {
  closeDatabase(db)
})

let nextRow = 1

/** Una persona con Libft (y printf si `printf`), su 42cursus y su campus. */
async function person(
  id: number,
  login: string,
  options: {
    campus?: number
    begin: number
    printf?: number | null
    cursus?: { grade: string; end?: number; active: number | null } | null
    track?: 'classic' | 'next'
  },
): Promise<void> {
  const campus = options.campus ?? MADRID
  const statements: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `INSERT INTO users (id, login, image, active, synced_at) VALUES (?, ?, ?, 1, ?)`,
      args: [id, login, `https://img/${login}.jpg`, iso(NOW)],
    },
    { sql: 'INSERT INTO campus_members VALUES (?, ?)', args: [campus, id] },
    {
      sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
            VALUES (?, ?, 1314, 'finished', 1, ?, ?, ?)`,
      args: [nextRow++, id, iso(options.begin + 10 * DAY), iso(options.begin), iso(NOW)],
    },
  ]

  if (options.printf !== undefined) {
    statements.push({
      sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nextRow++,
        id,
        options.track === 'next' ? 2687 : 1316,
        options.printf === null ? 'in_progress' : 'finished',
        options.printf === null ? null : 1,
        iso(options.printf ?? NOW - 2 * DAY),
        iso(options.begin + 11 * DAY),
        iso(NOW),
      ],
    })
  }
  if (options.track !== undefined) {
    statements.push({
      sql: `INSERT INTO user_tracks (login, track, rank, fetched_at) VALUES (?, ?, 0, ?)`,
      args: [login, options.track, iso(NOW)],
    })
  }
  if (options.cursus !== null && options.cursus !== undefined) {
    statements.push({
      sql: `INSERT INTO core_cursus (user_id, login, campus_id, begin_at, end_at, grade, active, alumni, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      args: [
        id,
        login,
        campus,
        iso(options.begin),
        options.cursus.end === undefined ? null : iso(options.cursus.end),
        options.cursus.grade,
        options.cursus.active,
        iso(NOW),
      ],
    })
  }
  for (const statement of statements) await db.execute(statement)
}

const service = () =>
  createProgressService({
    progress: createProgressRepository(db),
    circles: (track) =>
      Promise.resolve(
        track === 'classic'
          ? new Map([
              [1314, 0],
              [1316, 1],
            ])
          : new Map([
              [1314, 0],
              [2687, 1],
            ]),
      ),
    now: () => NOW,
  })

async function projects(): Promise<void> {
  for (const [id, slug, hours] of [
    [1314, '42cursus-libft', 70],
    [1316, '42cursus-ft_printf', 55],
    [2687, '42next-push_swap', 70],
    [1471, '42cursus-push_swap', 50],
  ] as const) {
    await db.execute({
      sql: 'INSERT INTO projects (id, name, slug, hours) VALUES (?, ?, ?, ?)',
      args: [id, slug, slug, hours],
    })
  }
}

describe('medias por población', () => {
  it('terminados, en curso + terminados y absorbidos por separado; quien no se sabe, en ninguna', async () => {
    await projects()
    const begin = NOW - 300 * DAY
    let id = 100

    // Doce que siguen (printf a medias), doce que terminaron y doce que se fueron.
    for (let n = 0; n < 12; n++) {
      await person(id++, `sigue${String(n)}`, {
        begin,
        printf: null,
        cursus: { grade: 'Cadet', active: 1 },
      })
      await person(id++, `acabo${String(n)}`, {
        begin,
        printf: begin + 40 * DAY,
        cursus: { grade: 'Transcender', active: 1 },
      })
      await person(id++, `fuera${String(n)}`, {
        begin,
        cursus: { grade: 'Cadet', end: begin + 100 * DAY, active: 0 },
      })
    }
    // Sin copia del cursus, y con fin pero la cuenta abierta: no se sabe.
    await person(id++, 'nose', { begin, printf: begin + 20 * DAY, cursus: null })
    await person(id++, 'raro', { begin, cursus: { grade: 'Cadet', end: begin, active: 1 } })

    const progress = await service().progress(actor('sigue0'), null)

    expect(progress.people.current['campus-classic']).toBe(24)
    expect(progress.people.finished['campus-classic']).toBe(12)
    expect(progress.people.blackholed['campus-classic']).toBe(12)
    expect(progress.census.campus.classic).toEqual({
      finished: 12,
      active: 12,
      blackholed: 12,
      unknown: 2,
    })
    // A los 60 días: los terminados llevan los dos círculos; los que siguen, uno.
    const at60 = progress.days.indexOf(60)

    expect(progress.averages.circles.finished['campus-classic'][at60]).toBe(100)
    expect(progress.averages.circles.current['campus-classic'][at60]).toBe(75)
    expect(progress.averages.circles.blackholed['campus-classic'][at60]).toBe(50)
    // Los absorbidos no siguen después de salir (día 100).
    expect(
      progress.averages.circles.blackholed['campus-classic'][progress.days.indexOf(120)],
    ).toBeNull()
    expect(progress.averages.circles.current['campus-next'].every((value) => value === null)).toBe(
      true,
    )

    // Ejes: el círculo 0 se acaba al 50 % y las horas son las de su plan (70 + 55).
    expect(progress.axis.circles.slice(0, 2)).toEqual([50, 100])
    expect(progress.axis.hours).toBe(125)
    // En el plan nuevo, push_swap tiene dos versiones: cuenta la más corta.
    expect(progress.axis.planHours).toEqual({ classic: 125, next: 120 })
  })

  it('quien hizo la otra versión de un proyecto lo tiene hecho, con sus horas', async () => {
    await projects()
    await person(1, 'pyt', {
      begin: NOW - 100 * DAY,
      track: 'next',
      cursus: { grade: 'Cadet', active: 1 },
    })
    await db.execute({
      sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
            VALUES (999, 1, 1471, 'finished', 1, ?, ?, ?)`,
      args: [iso(NOW - 50 * DAY), iso(NOW - 80 * DAY), iso(NOW)],
    })

    const progress = await service().progress(actor('pyt'), null)

    expect(progress.track).toBe('next')
    expect(progress.me?.circles.filter((value) => value !== null).at(-1)).toBe(100)
    // Su plan: Libft (70) y la push_swap vieja (50).
    expect(progress.axis.hours).toBe(120)
  })
})

describe('quién va más rápido', () => {
  const filters = {
    by: 'circle' as const,
    plan: 'all' as const,
    kickoff: null,
    cohort: 'only' as const,
    circleMin: 0,
    circleMax: 7,
    pctMin: 0,
    pctMax: 100,
  }
  const page = { offset: 0, limit: 50 }
  const all = () => true

  it('solo el campus, sin absorbidos ni dudosos; quien terminó va arriba', async () => {
    await projects()
    await person(1, 'ana', {
      begin: Date.parse('2025-09-29T08:00:00Z'),
      printf: NOW - 5 * DAY,
      cursus: { grade: 'Cadet', active: 1 },
    })
    await person(2, 'leo', {
      begin: Date.parse('2026-02-02T08:00:00Z'),
      cursus: { grade: 'Cadet', active: 1 },
    })
    await person(3, 'eva', {
      begin: Date.parse('2024-03-11T08:00:00Z'),
      cursus: { grade: 'Alumni', active: 0 },
    })
    await person(4, 'bh', {
      begin: Date.parse('2025-09-29T08:00:00Z'),
      cursus: { grade: 'Cadet', end: NOW - 99 * DAY, active: 0 },
    })
    await person(5, 'nose', { begin: Date.parse('2025-09-29T08:00:00Z'), cursus: null })
    await person(6, 'otro', {
      campus: 46,
      begin: Date.parse('2025-09-29T08:00:00Z'),
      cursus: { grade: 'Cadet', active: 1 },
    })

    const ranking = await service().ranking(actor('leo'), filters, page, all)

    expect(
      ranking.entries.map((entry) => [entry.rank, entry.login, entry.circle, entry.circles]),
    ).toEqual([
      // Quien terminó y quien ya lo tiene todo aprobado empatan.
      [1, 'ana', 7, 100],
      [1, 'eva', 7, 100],
      [3, 'leo', 1, 50],
    ])
    expect(ranking.total).toBe(3)
    expect(ranking.me).toMatchObject({ rank: 3, login: 'leo' })
    expect(ranking.entries[1]).toEqual({
      rank: 1,
      login: 'eva',
      image: 'https://img/eva.jpg',
      track: 'classic',
      circle: 7,
      circles: 100,
      hours: 100,
    })
    expect(ranking.kickoffs).toEqual([
      { month: '2026-02', people: 1 },
      { month: '2025-09', people: 1 },
      { month: '2024-03', people: 1 },
    ])

    // Por kickoff: solo ese, o ese y los siguientes.
    const only = await service().ranking(
      actor('leo'),
      { ...filters, kickoff: '2025-09' },
      page,
      all,
    )

    expect(only.entries.map((entry) => entry.login)).toEqual(['ana'])
    expect(only.me).toBeNull()

    const since = await service().ranking(
      actor('leo'),
      { ...filters, kickoff: '2025-09', cohort: 'since' },
      page,
      all,
    )

    expect(since.entries.map((entry) => entry.login)).toEqual(['ana', 'leo'])

    // Rangos y páginas; quien no se ve no ocupa puesto, pero una misma se ve siempre.
    const framed = await service().ranking(actor('leo'), { ...filters, circleMax: 6 }, page, all)

    expect(framed.entries.map((entry) => entry.login)).toEqual(['leo'])

    const paged = await service().ranking(
      actor('leo'),
      filters,
      { offset: 1, limit: 1 },
      (login) => login !== 'eva',
    )

    expect(paged.total).toBe(2)
    expect(paged.entries.map((entry) => [entry.rank, entry.login])).toEqual([[2, 'leo']])
    expect(paged.entries.some((entry) => entry.login === 'eva')).toBe(false)
    expect(paged.me?.rank).toBe(2)

    const python = await service().ranking(actor('leo'), { ...filters, plan: 'next' }, page, all)

    expect(python).toEqual({ kickoffs: [], total: 0, offset: 0, entries: [], me: null })
  })
})
