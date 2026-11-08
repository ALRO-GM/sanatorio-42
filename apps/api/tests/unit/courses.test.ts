/**
 * La parte de juego de los cursos (`docs/cursos-logros.md`): los logros salen
 * de lo superado en cada curso y se pueden lucir como título; las
 * clasificaciones son del campus, del mes o de siempre, y quien no se ve no
 * ocupa puesto.
 */

import type { CourseId } from '@sanatorio/contracts'
import { beforeEach, describe, expect, it } from 'vitest'

import { createAudience } from '../../src/core/audience.js'
import {
  COURSES,
  courseAchievements,
  courseBoards,
  inOrder,
} from '../../src/modules/courses/courses.rules.js'
import type { CoursesProgress, CourseTally, Done } from '../../src/modules/courses/courses.rules.js'
import { createCoursesRepository, createCoursesService } from '../../src/modules/courses/index.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const spec = (id: CourseId) => {
  const found = COURSES.find((course) => course.id === id)

  if (found === undefined) throw new Error(`falta ${id}`)

  return found
}

/** Todos los puntos de un curso: los niveles, los jefes y, en git, las pruebas de grupo. */
const everything = (id: CourseId): string[] => [
  ...new Set([...spec(id).tiers.flatMap((tier) => tier.units), ...spec(id).bosses]),
]

/** Lo superado: cada punto con sus estrellas y el día. */
function progress(
  given: Partial<Record<CourseId, [readonly string[], number, string]>>,
): CoursesProgress {
  const of = (id: CourseId): Map<string, Done> => {
    const entry = given[id]

    return new Map(
      entry === undefined ? [] : entry[0].map((unit) => [unit, { stars: entry[1], at: entry[2] }]),
    )
  }

  return { shell: of('shell'), git: of('git'), docker: of('docker'), k8s: of('k8s') }
}

const unlocked = (p: CoursesProgress): string[] =>
  courseAchievements(p)
    .filter((entry) => entry.unlocked)
    .map((entry) => entry.id)

describe('logros de los cursos', () => {
  it('sin nada hecho no hay ninguno, y cada uno dice cuánto falta', () => {
    const list = courseAchievements(progress({}))

    expect(list).toHaveLength(22)
    expect(list.every((entry) => !entry.unlocked && entry.progress === 0 && entry.goal > 0)).toBe(
      true,
    )
    expect(list.find((entry) => entry.id === 'courses_order')).toMatchObject({ goal: 4 })
  })

  it('el primer punto, cada certificado y los jefes con tres estrellas', () => {
    const shell = spec('shell')
    const beginner = shell.tiers[0]

    if (beginner === undefined) throw new Error('falta el nivel principiante')

    // Medio nivel: el primero sí, el certificado no, y cuenta lo que lleva.
    const half = beginner.units.slice(0, 3)
    const some = courseAchievements(progress({ shell: [half, 3, '2026-10-01'] }))

    expect(some.find((entry) => entry.id === 'shell_first')?.unlocked).toBe(true)
    expect(some.find((entry) => entry.id === 'shell_beginner')).toMatchObject({
      unlocked: false,
      progress: 3,
      goal: beginner.units.length,
    })

    // El nivel entero con dos estrellas: certificado, pero los jefes piden tres.
    const tier = unlocked(progress({ shell: [beginner.units, 2, '2026-10-01'] }))

    expect(tier).toEqual(['shell_first', 'shell_beginner'])

    const all = unlocked(progress({ shell: [everything('shell'), 3, '2026-10-01'] }))

    expect(all).toEqual([
      'shell_first',
      'shell_beginner',
      'shell_intermediate',
      'shell_advanced',
      'shell_bosses',
    ])
  })

  it('git: pruebas de grupo, jefe final y repasos de mundo', () => {
    const git = spec('git')

    expect(git.last).toBe('boss')
    expect(git.bosses).toContain('boss')
    expect(unlocked(progress({ git: [['w0-commit'], 1, '2026-10-01'] }))).toEqual(['git_first'])
    expect(
      unlocked(progress({ git: [['w0-commit', 'group1', 'group2', 'group3'], 3, '2026-10-01'] })),
    ).toEqual(['git_first', 'git_group'])
    expect(unlocked(progress({ git: [[...git.bosses], 3, '2026-10-01'] }))).toEqual([
      'git_first',
      'git_boss',
      'git_bosses',
    ])
  })

  it('los cuatro, y en el orden sugerido solo si se terminan uno detrás de otro', () => {
    const done = (id: CourseId, at: string): [readonly string[], number, string] => [
      [spec(id).last],
      1,
      at,
    ]
    const ordered = progress({
      shell: done('shell', '2026-01-01'),
      git: done('git', '2026-02-01'),
      docker: done('docker', '2026-03-01'),
      k8s: done('k8s', '2026-04-01'),
    })

    expect(inOrder(ordered)).toBe(4)
    expect(unlocked(ordered)).toEqual(
      expect.arrayContaining(['courses_explorer', 'courses_all', 'courses_order']),
    )

    // Docker antes que git: los cuatro sí, en orden no (la racha se corta en Docker).
    const mixed = progress({
      shell: done('shell', '2026-01-01'),
      git: done('git', '2026-03-01'),
      docker: done('docker', '2026-02-01'),
      k8s: done('k8s', '2026-04-01'),
    })

    expect(inOrder(mixed)).toBe(2)
    expect(unlocked(mixed)).toContain('courses_all')
    expect(unlocked(mixed)).not.toContain('courses_order')
    // Empezar no es terminar: sin shell terminado, el orden no empieza.
    expect(inOrder(progress({ git: done('git', '2026-01-01') }))).toBe(0)
  })
})

describe('clasificaciones de los cursos (reglas)', () => {
  const tally = (
    login: string,
    course: CourseId,
    sums: Partial<Omit<CourseTally, 'login' | 'image' | 'course'>>,
  ): CourseTally => ({
    login,
    image: null,
    course,
    points: 0,
    units: 0,
    bosses: 0,
    certificates: 0,
    finished: 0,
    ...sums,
  })

  it('suma los cursos, empata con el mismo puesto y deja fuera a quien no se ve', () => {
    const rows = [
      tally('ana', 'shell', { points: 9, units: 3, bosses: 1 }),
      tally('ana', 'git', { points: 3, units: 1 }),
      tally('leo', 'shell', { points: 12, units: 4, bosses: 1, certificates: 1 }),
      tally('eva', 'docker', { points: 12, units: 4, bosses: 1, certificates: 1, finished: 0 }),
      tally('oculta', 'k8s', { points: 99, units: 33, bosses: 9, certificates: 3, finished: 1 }),
    ]
    const boards = courseBoards(rows, 'ana', (login) => login !== 'oculta')
    const byId = Object.fromEntries(boards.map((board) => [board.id, board]))

    expect(boards.map((board) => board.id)).toEqual([
      'total',
      'shell',
      'git',
      'docker',
      'k8s',
      'bosses',
      'certificates',
    ])
    // Los tres suman 12 puntos y 4 unidades: el mismo puesto.
    expect(byId.total?.ranking.map((entry) => [entry.login, entry.rank])).toEqual([
      ['ana', 1],
      ['eva', 1],
      ['leo', 1],
    ])
    expect(byId.total?.totals).toEqual([
      { key: 'people', value: 3 },
      { key: 'units', value: 12 },
      { key: 'finished', value: 0 },
    ])
    expect(byId.k8s?.ranking).toEqual([])
    expect(byId.certificates?.ranking.map((entry) => entry.login)).toEqual(['eva', 'leo'])
    expect(byId.certificates?.me).toBeNull()
    expect(byId.bosses?.me).toMatchObject({ login: 'ana', rank: 1, value: 1, extra: 12 })
  })

  it('vacío: todas las clasificaciones, sin nadie', () => {
    const boards = courseBoards([], 'ana')

    expect(boards).toHaveLength(7)
    expect(boards.every((board) => board.ranking.length === 0 && board.me === null)).toBe(true)
  })

  it('enorme: solo diez puestos, y el propio aunque vaya el último', () => {
    const rows = Array.from({ length: 500 }, (_, index) =>
      tally(`p${String(index).padStart(3, '0')}`, 'shell', { points: 1000 - index, units: 1 }),
    )
    const [total] = courseBoards(rows, 'p499')

    expect(total?.ranking).toHaveLength(10)
    expect(total?.me).toMatchObject({ login: 'p499', rank: 500 })
  })
})

describe('clasificaciones y títulos de los cursos (API)', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  /** Apunta puntos superados a mano, como los dejaría cada curso. */
  async function pass(
    table: 'shell_progress' | 'docker_progress' | 'k8s_progress' | 'git_progress',
    login: string,
    units: readonly string[],
    at: string,
    stars = 3,
  ): Promise<void> {
    const column = table === 'git_progress' ? 'level' : 'unit'

    for (const unit of units) {
      await community.db.execute({
        sql: `INSERT INTO ${table} (login, ${column}, stars, commands, done_at) VALUES (?, ?, ?, 1, ?)`,
        args: [login, unit, stars, at],
      })
    }
  }

  it('del mes o de siempre, solo del campus y sin la gente oculta', async () => {
    const shell = everything('shell')

    await pass('shell_progress', 'ana', shell.slice(0, 2), '2026-09-20T10:00:00.000Z')
    await pass('shell_progress', 'ana', shell.slice(2, 3), '2026-10-02T10:00:00.000Z')
    await pass('shell_progress', 'leo', shell.slice(0, 2), '2026-10-03T10:00:00.000Z', 1)
    await pass('git_progress', 'eva', ['w0-commit'], '2026-10-04T10:00:00.000Z')
    // De nadie del campus: no sale.
    await pass('shell_progress', 'fuera', shell.slice(0, 5), '2026-10-04T10:00:00.000Z')

    const month = await services.courses.ranking(actor('ana'), 'month')
    const total = month.boards.find((board) => board.id === 'total')

    expect(total?.ranking.map((entry) => [entry.login, entry.value, entry.extra])).toEqual([
      ['ana', 3, 1],
      ['eva', 3, 1],
      ['leo', 2, 2],
    ])

    const all = await services.courses.ranking(actor('ana'), 'all')

    expect(all.boards[0]?.me).toMatchObject({ login: 'ana', rank: 1, value: 9, extra: 3 })
    expect(all.boards.find((board) => board.id === 'git')?.ranking).toHaveLength(1)

    // Quien está oculto a los estudiantes no ocupa puesto.
    const hidden = createCoursesService({
      repository: createCoursesRepository(community.db),
      audience: createAudience(
        () => Promise.resolve([]),
        community.clock.now,
        () => Promise.resolve(['ana']),
      ),
      now: community.clock.now,
    })
    const seen = await hidden.ranking(actor('leo'), 'all')

    expect(seen.boards[0]?.ranking.map((entry) => [entry.login, entry.rank])).toEqual([
      ['eva', 1],
      ['leo', 2],
    ])
    // Otro campus: nadie.
    const paris = await services.courses.ranking(actor('ana', { campusId: 1 }), 'all')

    expect(paris.boards.every((board) => board.ranking.length === 0)).toBe(true)
  })

  it('un logro conseguido es un título que se puede lucir; uno sin conseguir, no', async () => {
    const { xp } = services

    await expectCode(xp.updateSettings(actor('ana'), { title: 'shell_first' }), 'forbidden')
    await pass('shell_progress', 'ana', everything('shell').slice(0, 1), '2026-10-02T10:00:00.000Z')

    const record = await xp.expediente(actor('ana'))

    expect(record.titles.map((title) => title.id)).toContain('shell_first')
    expect(record.titles.map((title) => title.id)).not.toContain('shell_beginner')
    expect(record.achievements.find((entry) => entry.id === 'shell_first')?.unlocked).toBe(true)

    await xp.updateSettings(actor('ana'), { title: 'shell_first' })
    expect((await xp.expediente(actor('ana'))).title).toBe('shell_first')
    // Es el que sale en su ficha, la que ven los demás.
    expect(await xp.titleOf('ana')).toBe('shell_first')
    await expectCode(xp.updateSettings(actor('ana'), { title: 'k8s_advanced' }), 'forbidden')
  })
})
