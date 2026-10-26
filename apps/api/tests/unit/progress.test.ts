/**
 * El avance en el common core (#87): por círculos (cada círculo pesa lo mismo)
 * y por horas estimadas sobre el plan de cada cual, con los proyectos entre los
 * que se elige (o con dos versiones) como una sola casilla, las líneas de cada
 * pace y las medias por población (`docs/blackhole.md`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ProgressArea, StatsProgress } from '@sanatorio/contracts'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { actor } from '../helpers/community.js'
import { createProgressService, daysUpTo } from '../../src/modules/stats/progress.service.js'
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
      { circle: 0, hours: 70, ids: [1], hoursById: new Map([[1, 70]]), moved: new Map() },
      { circle: 1, hours: 70, ids: [2], hoursById: new Map([[2, 70]]), moved: new Map() },
      {
        circle: 1,
        hours: 60,
        ids: [3, 4],
        hoursById: new Map([
          [3, 60],
          [4, 100],
        ]),
        moved: new Map(),
      },
    ])
    // Un proyecto repetido no se cuenta dos veces.
    expect(unitsOf([...PLAN, ...PLAN.slice(0, 1)], CHOICES)).toHaveLength(3)
  })

  it('por círculos cada uno pesa 1/7; por horas, las de lo que hizo cada cual', () => {
    const units = unitsOf(PLAN, CHOICES)
    // libft el día 10 y fdf (del grupo) el día 40; printf, sin hacer.
    const done = new Map([
      [1, START + 10 * DAY],
      [4, START + 40 * DAY],
    ])
    const curve = curveOf(units, done, START, [0, 10, 30, 40, 60], START + 50 * DAY)

    // Círculo 0 entero (1/7) y medio círculo 1, que lleva también el peso de los
    // círculos 2…6 que este plan no tiene (6/7 entre sus dos casillas): 4/7.
    expect(curve.circles).toEqual([0, 14.3, 14.3, 57.1, null])
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

    expect(curve.circles).toEqual([0, 14.3, null])
  })

  it('dónde está hoy: el primer círculo con algo sin hacer, o 7 si no queda nada', () => {
    const units = unitsOf(PLAN, CHOICES)

    expect(standingOf(units, new Map())).toEqual({ circle: 0, circles: 0, hours: 0 })
    expect(standingOf(units, new Map([[1, START]]))).toEqual({
      circle: 1,
      circles: 14.3,
      hours: 35,
    })
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

  it('las marcas del eje: (k + 1) / 7, fijas', () => {
    expect(circleMarks()).toEqual([14.3, 28.6, 42.9, 57.1, 71.4, 85.7, 100])
  })

  it('cada pace pide tener cada círculo completo a sus días', () => {
    const lines = paceLines(unitsOf(PLAN, CHOICES))
    const fastest = lines.circles[0]

    expect(fastest?.pace).toBe(8)
    // Empieza en 0; cada círculo, en su marca: el 0 a los 8 días y el 1 a los 32.
    expect(fastest?.points.slice(0, 3)).toEqual([
      [0, 0],
      [8, 14.3],
      [32, 28.6],
    ])
    expect(lines.hours[0]?.points[1]).toEqual([8, 35])
    expect(lines.circles.map((line) => line.pace)).toEqual([8, 12, 15, 18, 22, 24])
  })
})

// --- El servicio, sobre una base de verdad ---------------------------------

const NOW = Date.parse('2026-10-25T12:00:00Z')
const MADRID = 22

/** Las medias de tu campus: el primero (y, sin pedir otros, el único) de `campuses`. */
function here(progress: StatsProgress): ProgressArea {
  const [mine] = progress.campuses

  if (mine === undefined) throw new Error('sin las medias de tu campus')
  return mine
}
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
    /** Si terminó (grado de terminar): sin ft_transcendence y el examen 6 aprobados (`false`). */
    closed?: boolean
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
  // Quien tiene el grado de terminar aprobó ft_transcendence y el examen 6 (salvo `closed: false`).
  if (['Transcender', 'Alumni'].includes(options.cursus?.grade ?? '') && options.closed !== false) {
    for (const project of [1337, options.track === 'next' ? 2712 : 1324]) {
      statements.push({
        sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
              VALUES (?, ?, ?, 'finished', 1, ?, ?, ?)`,
        args: [
          nextRow++,
          id,
          project,
          iso(options.printf ?? options.begin + 20 * DAY),
          iso(options.begin),
          iso(NOW),
        ],
      })
    }
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
    [1337, 'ft_transcendence', 245],
    [1324, 'exam-rank-06', 0],
    [2712, '42next-exam-rank-06', 0],
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

    const progress = await service().progress(actor('sigue0'), [], () => true)

    expect(here(progress).people.current.classic).toBe(24)
    expect(here(progress).people.finished.classic).toBe(12)
    expect(here(progress).people.blackholed.classic).toBe(12)
    expect(here(progress).census.classic).toEqual({
      finished: 12,
      active: 12,
      blackholed: 12,
      unknown: 2,
    })
    // A los 60 días: los terminados llevan los dos círculos (el 1 se lleva el peso de
    // los que este plan no tiene); los que siguen, el 0 (1/7).
    const at60 = progress.days.indexOf(60)

    expect(here(progress).averages.circles.finished.classic[at60]).toBe(100)
    expect(here(progress).averages.circles.current.classic[at60]).toBe(57.1)
    expect(here(progress).averages.circles.blackholed.classic[at60]).toBe(14.3)
    // Los absorbidos no siguen después de salir (día 100).
    expect(
      here(progress).averages.circles.blackholed.classic[progress.days.indexOf(120)],
    ).toBeNull()
    expect(here(progress).averages.circles.current.next.every((value) => value === null)).toBe(true)

    // Ejes: las marcas fijas, (k + 1) / 7, y las horas son las de su plan (70 + 55).
    expect(progress.axis.circles.slice(0, 2)).toEqual([14.3, 28.6])
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

    const progress = await service().progress(actor('pyt'), [], () => true)

    expect(progress.track).toBe('next')
    expect(progress.me?.line.circles.filter((value) => value !== null).at(-1)).toBe(100)
    // Su plan: Libft (70) y la push_swap vieja (50).
    expect(progress.axis.hours).toBe(120)
  })

  it('la versión de C cuenta en su círculo de C, y Libft no va después de lo siguiente', async () => {
    await projects()
    const begin = NOW - 200 * DAY
    // En C, push_swap es del círculo 2; en Python, del 1.
    const adopting = createProgressService({
      progress: createProgressRepository(db),
      circles: (track) =>
        Promise.resolve(
          new Map(
            track === 'classic'
              ? [
                  [1314, 0],
                  [1316, 1],
                  [1471, 2],
                ]
              : [
                  [1314, 0],
                  [1316, 1],
                  [2687, 1],
                ],
          ),
        ),
      now: () => NOW,
    })

    await person(1, 'paso', { begin, track: 'next', cursus: { grade: 'Cadet', active: 1 } })
    // 42 reescribió la fecha de su Libft (sin fecha de apuntarse) mucho después;
    // ft_printf, apuntada el día 12 y aprobada el 30; la push_swap de C, el 60.
    await db.execute({
      sql: `UPDATE project_users SET updated_at_42 = ?, created_at_42 = NULL WHERE user_id = 1`,
      args: [iso(begin + 150 * DAY)],
    })
    for (const [project, opened, done] of [
      [1316, 12, 30],
      [1471, 40, 60],
    ] as const) {
      await db.execute({
        sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
              VALUES (?, 1, ?, 'finished', 1, ?, ?, ?)`,
        args: [nextRow++, project, iso(begin + done * DAY), iso(begin + opened * DAY), iso(NOW)],
      })
    }

    const progress = await adopting.progress(actor('paso'), [], () => true)

    // Libft, el día que se apuntó a ft_printf; con ella, el círculo 1 completo (la
    // push_swap de C va en el 2, que se lleva el peso de los que este plan no tiene).
    expect(progress.me?.milestones.map((each) => [each.day, each.value.circles])).toEqual([
      [12, 14.3],
      [30, 28.6],
      [60, 100],
    ])
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
      [3, 'leo', 1, 14.3],
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

// --- Todas las líneas, personas sueltas donde no hay media y quién terminó antes.

const everyone = () => true

async function campuses(): Promise<void> {
  for (const [id, name] of [
    [MADRID, 'Madrid'],
    [46, 'Barcelona'],
    [37, 'Malaga'],
  ] as const) {
    await db.execute({
      sql: 'INSERT INTO campuses (id, name, synced_at) VALUES (?, ?, ?)',
      args: [id, name, iso(NOW)],
    })
  }
}

describe('todas las líneas en una respuesta', () => {
  it('alcance × plan × población, de las dos medidas, con su gente', async () => {
    await projects()
    await campuses()
    const begin = NOW - 300 * DAY
    let id = 100

    for (let n = 0; n < 10; n++) {
      await person(id++, `c${String(n)}`, {
        begin,
        printf: null,
        cursus: { grade: 'Cadet', active: 1 },
      })
      await person(id++, `p${String(n)}`, {
        campus: 46,
        begin,
        printf: null,
        track: 'next',
        cursus: { grade: 'Cadet', active: 1 },
      })
    }

    const progress = await service().progress(actor('c0'), [], everyone)

    for (const area of [here(progress), progress.all]) {
      for (const measure of ['circles', 'hours'] as const) {
        for (const population of ['finished', 'current', 'blackholed'] as const) {
          expect(Object.keys(area.averages[measure][population]).sort()).toEqual([
            'classic',
            'next',
          ])
        }
      }
    }
    // Sin pedir campus, solo el tuyo; y todos juntos.
    expect(progress.campuses.map((each) => each.id)).toEqual([MADRID])
    expect(here(progress).people.current).toEqual({ classic: 10, next: 0 })
    expect(progress.all.id).toBeNull()
    expect(progress.all.people.current).toEqual({ classic: 10, next: 10 })
    expect(progress.all.averages.circles.current.next[progress.days.indexOf(30)]).toBe(14.3)
    expect(here(progress).name).toBe('Madrid')
    expect(progress.minPeople).toBe(10)
    // Diez por media: hay media, no personas sueltas.
    expect(here(progress).individuals.current.classic).toEqual([])
    expect(here(progress).individuals.current.next).toEqual([])
    // Lo que pesa: dos sitios, dos planes, tres poblaciones, dos medidas; unos pocos KB.
    expect(JSON.stringify(progress).length).toBeLessThan(30_000)
  })

  it('cada campus pedido con sus medias, en el orden de los que se pueden pedir', async () => {
    await projects()
    await campuses()
    const begin = NOW - 300 * DAY
    let id = 100

    for (let n = 0; n < 10; n++) {
      await person(id++, `c${String(n)}`, {
        begin,
        printf: null,
        cursus: { grade: 'Cadet', active: 1 },
      })
      await person(id++, `b${String(n)}`, {
        campus: 46,
        begin,
        printf: begin + 20 * DAY,
        cursus: { grade: 'Cadet', active: 1 },
      })
    }
    const followed = createProgressService({
      progress: createProgressRepository(db),
      circles: () =>
        Promise.resolve(
          new Map([
            [1314, 0],
            [1316, 1],
          ]),
        ),
      campusIds: [MADRID, 46, 37, 1],
      now: () => NOW,
    })
    // Mira París en sus preferencias (`campusId`), pero su campus es Madrid.
    const viewer = { ...actor('c0'), campusId: 1 }
    const mine = await followed.progress(viewer, [], everyone, { home: MADRID })

    // Por defecto, su campus: no el que mira.
    expect(mine.home).toBe(MADRID)
    expect(mine.campuses.map((each) => each.name)).toEqual(['Madrid'])
    // Se pueden pedir los que sigue la web, el suyo primero.
    expect(mine.available.map((each) => each.id)).toEqual([MADRID, 46, 37, 1])

    // Dos campus, cada uno con lo suyo; lo que no se sigue se ignora.
    const two = await followed.progress(viewer, [], everyone, {
      home: MADRID,
      campuses: [46, 999, MADRID],
    })
    const at30 = two.days.indexOf(30)

    expect(two.campuses.map((each) => each.id)).toEqual([MADRID, 46])
    expect(two.campuses.map((each) => each.people.current.classic)).toEqual([10, 10])
    expect(two.campuses.map((each) => each.averages.circles.current.classic[at30])).toEqual([
      14.3, 100,
    ])
    expect(two.all.people.current.classic).toBe(20)
    // Un campus sin nadie: vacío, sin romperse.
    const all = await followed.progress(viewer, [], everyone, { home: MADRID, campuses: 'all' })

    expect(all.campuses.map((each) => each.id)).toEqual([MADRID, 46, 37, 1])
    expect(all.campuses[2]?.people.current.classic).toBe(0)
    expect(all.campuses[2]?.averages.circles.current.classic.every((v) => v === null)).toBe(true)
    // Nada que valga: el suyo.
    const none = await followed.progress(viewer, [], everyone, { home: MADRID, campuses: [999] })

    expect(none.campuses.map((each) => each.id)).toEqual([MADRID])

    // Un piscinero solo puede pedir el suyo.
    const pool = await followed.progress({ ...viewer, pool: true }, [], everyone, {
      home: MADRID,
      campuses: 'all',
    })

    expect(pool.available.map((each) => each.id)).toEqual([MADRID])
    expect(pool.campuses.map((each) => each.id)).toEqual([MADRID])

    // La clasificación y las sugerencias, también de su campus.
    const ranking = await followed.ranking(
      viewer,
      {
        by: 'circle',
        plan: 'all',
        kickoff: null,
        cohort: 'only',
        circleMin: 0,
        circleMax: 7,
        pctMin: 0,
        pctMax: 100,
      },
      { offset: 0, limit: 50 },
      everyone,
      MADRID,
    )

    expect(ranking.total).toBe(10)
    expect(ranking.entries.every((entry) => entry.login.startsWith('c'))).toBe(true)
  })

  it('sin nadie: todo vacío, sin romperse', async () => {
    await projects()

    const progress = await service().progress(actor('nadie'), ['tampoco'], everyone)

    expect(progress.me).toBeNull()
    expect(here(progress).name).toBeNull()
    expect(progress.others).toEqual([])
    expect(progress.all.individuals.finished.next).toEqual([])
    expect(progress.all.people.current.classic).toBe(0)
  })
})

describe('con poca gente, la línea de cada persona', () => {
  it('una persona que terminó Python es su línea; con diez, la media', async () => {
    await projects()
    await campuses()
    const begin = NOW - 300 * DAY

    await person(1, 'yo', { begin, printf: null, cursus: { grade: 'Cadet', active: 1 } })
    await person(2, 'rapida', {
      begin,
      printf: begin + 40 * DAY,
      track: 'next',
      cursus: { grade: 'Transcender', active: 1 },
    })
    await person(3, 'oculta', {
      campus: 46,
      begin,
      printf: begin + 50 * DAY,
      track: 'next',
      cursus: { grade: 'Transcender', active: 1 },
    })
    await person(4, 'se-fue', {
      begin,
      track: 'next',
      cursus: { grade: 'Cadet', end: begin + 100 * DAY, active: 0 },
    })

    const sees = (login: string) => login !== 'oculta'
    const progress = await service().progress(actor('yo'), [], sees)

    expect(here(progress).people.finished.next).toBe(1)
    expect(here(progress).averages.circles.finished.next.every((value) => value === null)).toBe(
      true,
    )
    const [only] = here(progress).individuals.finished.next

    expect(here(progress).individuals.finished.next).toHaveLength(1)
    expect(only?.login).toBe('rapida')
    expect(only?.line.circles[progress.days.indexOf(45)]).toBe(100)
    // En todos los campus son dos, pero quien no se ve no sale (aunque cuente).
    expect(progress.all.people.finished.next).toBe(2)
    expect(progress.all.individuals.finished.next.map((each) => each.login)).toEqual(['rapida'])
    // Quien se tragó el black hole sale sin nombre, y solo hasta que se fue.
    const [gone] = here(progress).individuals.blackholed.next

    expect(gone?.login).toBeNull()
    expect(gone?.line.circles[progress.days.indexOf(120)]).toBeNull()

    // Con diez que terminaron, ya hay media y no van sueltas.
    for (let n = 0; n < 9; n++) {
      await person(10 + n, `fin${String(n)}`, {
        begin,
        printf: begin + 40 * DAY,
        track: 'next',
        cursus: { grade: 'Transcender', active: 1 },
      })
    }
    const more = await service().progress(actor('yo'), [], sees)

    expect(here(more).people.finished.next).toBe(10)
    expect(here(more).individuals.finished.next).toEqual([])
    expect(here(more).averages.circles.finished.next[more.days.indexOf(45)]).toBe(100)
  })
})

describe('compararse con varias personas', () => {
  it('en el orden pedido, sin una misma, sin quien no se ve y como mucho cinco', async () => {
    await projects()
    const begin = NOW - 100 * DAY
    const logins = ['ana', 'bea', 'cris', 'dani', 'eli', 'fran', 'gus']

    for (const [index, login] of logins.entries()) {
      await person(index + 1, login, { begin, cursus: { grade: 'Cadet', active: 1 } })
    }

    const progress = await service().progress(
      actor('ana'),
      ['gus', 'ana', 'bea', 'nadie', 'cris', 'dani', 'eli', 'fran'],
      (login) => login !== 'bea',
    )

    // Se queda con las cinco primeras que se ven (gus, nadie, cris, dani, eli);
    // nadie no tiene datos y no sale.
    expect(progress.others.map((each) => each.login)).toEqual(['gus', 'cris', 'dani', 'eli'])
    expect(progress.others[0]?.line.circles[0]).toBe(0)
  })
})

describe('quién terminó antes', () => {
  it('los del campus en orden y el primero de cada campus, sin ocultos ni traslados', async () => {
    await projects()
    await campuses()
    const begin = NOW - 400 * DAY
    const finished = { grade: 'Transcender', active: 1 }

    await person(1, 'yo', { begin, printf: null, cursus: { grade: 'Cadet', active: 1 } })
    await person(2, 'lenta', { begin, printf: begin + 90 * DAY, cursus: finished })
    await person(3, 'veloz', { begin, printf: begin + 30 * DAY, cursus: finished })
    await person(4, 'oculta', { begin, printf: begin + 10 * DAY, cursus: finished })
    await person(5, 'barna', { campus: 46, begin, printf: begin + 60 * DAY, cursus: finished })
    await person(6, 'barna2', { campus: 46, begin, printf: begin + 80 * DAY, cursus: finished })
    await person(7, 'pyt', {
      campus: 37,
      begin,
      printf: begin + 20 * DAY,
      track: 'next',
      cursus: finished,
    })
    // Sigue en el cursus: aunque lo tenga todo, no terminó.
    await person(8, 'cadete', {
      begin,
      printf: begin + 5 * DAY,
      cursus: { grade: 'Cadet', active: 1 },
    })
    // Trasladada: Transcender sin el plan aquí; no sirve de ejemplo.
    await person(9, 'traslado', { begin, cursus: finished })

    const fastest = await service().fastest(actor('yo'), (login) => login !== 'oculta')
    const logins = (list: { login: string }[]) => list.map((each) => each.login)

    expect(logins(fastest.campus.classic)).toEqual(['veloz', 'lenta'])
    expect(fastest.campus.classic[0]).toEqual({
      login: 'veloz',
      image: 'https://img/veloz.jpg',
      campus: 'Madrid',
      days: 30,
    })
    expect(logins(fastest.all.classic)).toEqual(['veloz', 'barna'])
    expect(fastest.all.classic[1]?.campus).toBe('Barcelona')
    expect(fastest.campus.next).toEqual([])
    expect(logins(fastest.all.next)).toEqual(['pyt'])
  })
})

describe('el plan de quien no lo tiene dicho', () => {
  it('un examen 42next no hace a nadie de Python; un proyecto solo de Python, sí', async () => {
    await projects()
    await db.execute({
      sql: 'INSERT INTO projects (id, name, slug, hours) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      args: [1320, 'exam', 'exam-rank-02', null, 1321, 'exam', '42next-exam-rank-02', null],
    })
    const begin = NOW - 100 * DAY

    await person(1, 'c-examen', { begin })
    await person(2, 'python', { begin })
    for (const [row, user, project] of [
      [900, 1, 1321],
      [901, 2, 2687],
    ] as const) {
      await db.execute({
        sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, updated_at_42, created_at_42, synced_at)
              VALUES (?, ?, ?, 'finished', 1, ?, ?, ?)`,
        args: [row, user, project, iso(begin + 30 * DAY), iso(begin + 25 * DAY), iso(NOW)],
      })
    }

    const withExams = createProgressService({
      progress: createProgressRepository(db),
      circles: (track) =>
        Promise.resolve(
          new Map([
            [1314, 0],
            [track === 'classic' ? 1316 : 2687, 1],
            [1320, 1],
          ]),
        ),
      now: () => NOW,
    })

    expect((await withExams.progress(actor('c-examen'), [], everyone)).track).toBe('classic')
    expect((await withExams.progress(actor('python'), [], everyone)).track).toBe('next')
  })
})

describe('«Todo»: las líneas llegan hasta quien más tiempo lleva', () => {
  it('cada 15 días hasta los dos años y, después, cada 30 hasta el último dato', () => {
    expect(daysUpTo(0).at(-1)).toBe(730)
    expect(daysUpTo(0)).toHaveLength(50)
    const long = daysUpTo(1000)

    expect(long.slice(48, 52)).toEqual([720, 730, 750, 780])
    expect(long.at(-1)).toBe(1020)
    // Con un dato absurdo (un inicio de hace 30 años), diez años como mucho.
    expect(daysUpTo(11_000).at(-1)).toBeLessThanOrEqual(3680)
    expect(daysUpTo(11_000).length).toBeLessThan(150)
  })

  it('con alguien de hace cinco años, su línea y la media siguen pasados los dos', async () => {
    await projects()
    const old = NOW - 5 * 365 * DAY

    await person(1, 'veterana', {
      begin: old,
      printf: old + 1500 * DAY,
      cursus: { grade: 'Cadet', active: 1 },
    })

    const progress = await service().progress(actor('veterana'), [], everyone)
    const at = progress.days.findIndex((day) => day >= 1600)

    expect(progress.days.at(-1)).toBeGreaterThanOrEqual(5 * 365)
    expect(progress.me?.line.circles[at]).toBe(100)
    expect(progress.me?.line.circles[progress.days.indexOf(730)]).toBe(14.3)
    expect(JSON.stringify(progress).length).toBeLessThan(40_000)
  })
})

describe('quien terminó acaba en el 100 %, con sus hitos', () => {
  /** Un plan que hoy pide además la push_swap (1471) en el círculo 0. */
  const grown = () =>
    createProgressService({
      progress: createProgressRepository(db),
      circles: () =>
        Promise.resolve(
          new Map([
            [1314, 0],
            [1316, 1],
            [1471, 0],
          ]),
        ),
      now: () => NOW,
    })
  /** Un aprobado más de alguien (`status` por si lo está repitiendo). */
  const pass = async (user: number, project: number, at: number, status = 'finished') => {
    await db.execute({
      sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, final_mark, updated_at_42, created_at_42, synced_at)
            VALUES (?, ?, ?, ?, 1, 100, ?, ?, ?)`,
      args: [nextRow++, user, project, status, iso(at), iso(at - DAY), iso(NOW)],
    })
  }

  it('mide a quien terminó contra lo que hizo, y a quien sigue contra el plan', async () => {
    await projects()
    await db.execute("UPDATE projects SET name = 'Libft' WHERE id = 1314")
    await db.execute("UPDATE projects SET name = 'ft_printf' WHERE id = 1316")
    const begin = NOW - 300 * DAY

    // Las dos hicieron Libft (día 10) y printf (día 40), no la push_swap que el plan pide hoy.
    await person(1, 'fin', {
      begin,
      printf: begin + 40 * DAY,
      cursus: { grade: 'Transcender', active: 1 },
    })
    await person(2, 'sigue', {
      begin,
      printf: begin + 40 * DAY,
      cursus: { grade: 'Cadet', active: 1 },
    })
    await person(3, 'oculta', {
      begin,
      printf: begin + 50 * DAY,
      cursus: { grade: 'Transcender', active: 1 },
    })
    // Quien terminó hace la push_swap meses después: no mueve su línea.
    await pass(1, 1471, begin + 200 * DAY)

    const sees = (login: string) => login !== 'oculta'
    const progress = await grown().progress(actor('fin'), ['sigue', 'oculta'], sees)
    const at = (day: number) => progress.days.indexOf(day)

    // Por círculos y por horas, el 100 % justo el día 45 (el primer punto tras el 40).
    expect(progress.me?.line.circles[at(30)]).toBe(14.3)
    expect(progress.me?.line.circles[at(45)]).toBe(100)
    expect(progress.me?.line.hours[at(45)]).toBe(100)
    // 70 de 125 h.
    expect(progress.me?.line.hours[at(30)]).toBe(56)
    expect(progress.me?.line.circles.filter((value) => value !== null).at(-1)).toBe(100)
    expect(progress.me?.finished).toBe(40)
    // Sus horas son las de lo que hizo: Libft (70) y printf (55).
    expect(progress.me?.hours).toBe(125)
    expect(progress.axis.hours).toBe(125)
    // Sus hitos, por día y con el nombre de cada proyecto; la push_swap no.
    expect(progress.me?.milestones).toEqual([
      { day: 10, projects: ['Libft'], value: { circles: 14.3, hours: 56 } },
      { day: 40, projects: ['ft_printf'], value: { circles: 100, hours: 100 } },
    ])

    // Quien sigue, contra el plan de hoy: medio círculo 0 por hacer (1/14 + 6/7).
    const [other] = progress.others

    expect(progress.others.map((each) => each.login)).toEqual(['sigue'])
    expect(other?.finished).toBeNull()
    expect(other?.line.circles[at(45)]).toBe(92.9)
    expect(other?.hours).toBe(175)
    expect(other?.milestones.map((each) => each.day)).toEqual([10, 40])

    // Las medias de quien terminó lo heredan; quien no se ve no sale en las sueltas.
    expect(here(progress).individuals.finished.classic.map((each) => each.login)).toEqual(['fin'])
    expect(here(progress).individuals.finished.classic[0]?.milestones).toHaveLength(2)
    // En la clasificación, quien terminó va con el 100 %.
    const ranking = await grown().ranking(
      actor('fin'),
      {
        by: 'circles',
        plan: 'all',
        kickoff: null,
        cohort: 'only',
        circleMin: 0,
        circleMax: 7,
        pctMin: 0,
        pctMax: 100,
      },
      { offset: 0, limit: 10 },
      sees,
    )

    expect(ranking.me).toMatchObject({ circle: 7, circles: 100, hours: 100 })
  })

  it('sin ft_transcendence y el examen 6, el grado no basta: no se sabe', async () => {
    await projects()
    const begin = NOW - 300 * DAY

    await person(1, 'grado', {
      begin,
      printf: begin + 40 * DAY,
      cursus: { grade: 'Transcender', active: 1 },
      closed: false,
    })
    await person(2, 'cerrado', {
      begin,
      printf: begin + 40 * DAY,
      cursus: { grade: 'Alumni', active: 0 },
    })

    const progress = await service().progress(actor('grado'), [], () => true)

    expect(here(progress).census.classic).toMatchObject({ finished: 1, unknown: 1 })
    expect(progress.me?.finished).toBeNull()
  })

  it('la media de quien terminó llega arriba y cada cual se queda en el 100 %', async () => {
    await projects()
    // Diez que terminaron: unos hace años y otros hace nada (no han vivido el día 600).
    for (let n = 0; n < 10; n++) {
      const begin = NOW - (n < 5 ? 900 : 80) * DAY

      await person(n + 1, `fin${String(n)}`, {
        begin,
        printf: begin + (30 + n * 5) * DAY,
        cursus: { grade: 'Transcender', active: 1 },
      })
    }

    const progress = await grown().progress(actor('fin0'), [], () => true)
    const average = here(progress).averages.circles.finished.classic
    const hours = here(progress).averages.hours.finished.classic

    // Arriba del todo (el final del círculo 6), y ahí se queda hasta el último punto.
    expect(average.at(-1)).toBe(100)
    expect(hours.at(-1)).toBe(100)
    expect(average[progress.days.indexOf(600)]).toBe(100)
    expect(progress.axis.circles.at(-1)).toBe(100)
    // La línea de quien terminó, plana en el 100 % desde que terminó hasta hoy.
    const line = progress.me?.line.circles ?? []
    const from = line.indexOf(100)

    expect(progress.days[from]).toBe(30)
    expect(line.slice(from).filter((value) => value !== null)).toEqual(
      line
        .slice(from)
        .filter((value) => value !== null)
        .map(() => 100),
    )
    expect(line.filter((value) => value !== null).length).toBeGreaterThan(from + 50)
  })

  it('lo aprobado que está repitiendo cuenta; quien se fue, sin nombre pero con sus hitos', async () => {
    await projects()
    const begin = NOW - 300 * DAY

    await person(1, 'repite', { begin, cursus: { grade: 'Cadet', active: 1 } })
    await pass(1, 1316, begin + 30 * DAY, 'in_progress')
    await person(2, 'se-fue', {
      begin,
      printf: begin + 20 * DAY,
      cursus: { grade: 'Cadet', end: begin + 100 * DAY, active: 0 },
    })

    const progress = await service().progress(actor('repite'), [], () => true)

    expect(progress.me?.milestones.map((each) => each.projects)).toEqual([
      ['42cursus-libft'],
      ['42cursus-ft_printf'],
    ])
    const [gone] = here(progress).individuals.blackholed.classic

    expect(gone?.login).toBeNull()
    expect(gone?.milestones.at(-1)).toEqual({
      day: 20,
      projects: ['42cursus-ft_printf'],
      value: { circles: 100, hours: 100 },
    })
  })
})
