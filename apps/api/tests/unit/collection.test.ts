/**
 * El álbum de correcciones (`docs/correcciones-coleccion.md`): las reglas
 * (cromos, completitud, puestos, rareza, amistades) y el servicio sobre una
 * base en memoria, con quién se ve y quién no.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CorrectionCollection } from '@sanatorio/contracts'
import { createAudience } from '../../src/core/audience.js'
import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { createCollectionModule } from '../../src/modules/collection/index.js'
import {
  closestOf,
  isExamSlug,
  rankTallies,
  rarityOf,
  tallyOf,
} from '../../src/modules/collection/collection.rules.js'
import type { Collector, Tally } from '../../src/modules/collection/collection.rules.js'
import { actor, expectCode } from '../helpers/community.js'

const person = (login: string, finished: number[], corrected: number[] = []): Collector => ({
  login,
  image: null,
  kickoff: null,
  finished: new Set(finished),
  corrected: new Set(corrected),
})

const tally = (login: string, collected: number, eligible: number): Tally => ({
  login,
  image: null,
  collected,
  eligible,
  ratio: collected / eligible,
})

describe('reglas del álbum', () => {
  it('cuenta lo aprobado y vivo, y lo corregido aunque se haya retirado', () => {
    // 3 está retirado: sin corregirlo no cuenta; 4 también, pero lo corrigió.
    const alive = new Set([1, 2])

    expect(tallyOf(person('ana', [1, 2, 3, 4], [1, 4]), alive)).toEqual({
      login: 'ana',
      image: null,
      collected: 2,
      eligible: 3,
      ratio: 2 / 3,
    })
  })

  it('sin correcciones copiadas no da nada por retirado', () => {
    expect(tallyOf(person('ana', [1, 2, 3]), new Set())?.eligible).toBe(3)
    expect(tallyOf(person('ana', [1, 2, 3]), null)?.eligible).toBe(3)
  })

  it('quien no tiene nada que corregir no entra', () => {
    expect(tallyOf(person('ana', []), null)).toBeNull()
    expect(tallyOf(person('ana', [3], []), new Set([1]))).toBeNull()
  })

  it('pone puestos sin huecos: los empates comparten y el siguiente salta', () => {
    const ranked = rankTallies([
      tally('cero', 0, 4),
      tally('leo', 1, 2),
      tally('ana', 1, 2),
      tally('eva', 3, 3),
      tally('max', 2, 4),
    ])

    expect(ranked.map((entry) => [entry.login, entry.rank, entry.share])).toEqual([
      ['eva', 1, 1],
      // A igual porcentaje, más cromos va antes: 2 de 4 antes que 1 de 2.
      ['max', 2, 0.5],
      ['ana', 3, 0.5],
      ['leo', 3, 0.5],
      ['cero', 5, 0],
    ])
  })

  it('los exámenes no son cromos', () => {
    expect(
      ['exam-rank-02', '42next-exam-rank-03', 'c-piscine-exam-00', 'c-piscine-final-exam'].map(
        isExamSlug,
      ),
    ).toEqual([true, true, true, true])
    expect(['libft', 'examshell-trainer', 'c-piscine-c-00', null].map(isExamSlug)).toEqual([
      false,
      false,
      false,
      false,
    ])
  })

  it('una clasificación vacía es vacía', () => {
    expect(rankTallies([])).toEqual([])
  })

  it('la rareza es la parte de quienes lo aprobaron que lo ha corregido', () => {
    const rarity = rarityOf(
      [person('ana', [1, 2], [1]), person('leo', [1], []), person('eva', [1, 2], [1, 2, 9])],
      [1, 2, 3],
    )

    expect(rarity).toEqual([
      { projectId: 1, eligible: 3, holders: 2, share: 0.667 },
      { projectId: 2, eligible: 2, holders: 1, share: 0.5 },
      // Nadie lo puede corregir: 0, no una división por cero.
      { projectId: 3, eligible: 0, holders: 0, share: 0 },
    ])
  })

  it('elige las amistades más cercanas que se ven y tienen álbum, sin repetir ni contarse', () => {
    const keep = (login: string) => login !== 'oculta'

    expect(closestOf(['ana', 'yo', 'oculta', 'leo', 'ana', 'eva'], 'yo', keep, 2)).toEqual([
      'ana',
      'leo',
    ])
    expect(closestOf([], 'yo', keep, 10)).toEqual([])
  })

  it('aguanta un campus enorme', () => {
    const many = Array.from({ length: 5000 }, (_, index) =>
      tally(`p${String(index)}`, index % 7, 7),
    )
    const ranked = rankTallies(many)

    expect(ranked).toHaveLength(5000)
    expect(ranked[0]?.rank).toBe(1)
    expect(ranked.at(-1)?.share).toBe(0)
  })
})

const MADRID = 22
const NOW = Date.parse('2026-10-06T14:30:00.000Z')
const ago = (days: number): string => new Date(NOW - days * 86_400_000).toISOString()

describe('servicio del álbum', () => {
  let db: Db
  let hidden: string[]

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
    hidden = []
    seated = {}

    // Gente de Madrid: `yo` y cuatro más; `zoe` es oculta a los estudiantes y
    // `pisci`/`pisca`, piscineros en curso. Proyectos 1, 2 y 3 del common core
    // (el 3, retirado: nadie lo corrige desde hace más de un año) y 100, 101 y
    // 102 de la piscina (102 es un examen: no se corrige entre peers).
    const users = ['yo', 'ana', 'leo', 'eva', 'zoe', 'pisci', 'pisca', 'lejos']
    const finished: [string, number][] = [
      ['yo', 1],
      ['yo', 2],
      ['yo', 3],
      ['yo', 4],
      ['ana', 1],
      ['ana', 2],
      ['leo', 1],
      ['eva', 1],
      ['zoe', 1],
      ['zoe', 2],
      ['pisci', 1],
      ['pisci', 100],
      ['pisci', 101],
      ['pisci', 102],
      ['pisca', 100],
    ]
    const corrections: [string, string, number, number, string][] = [
      // corrector, corregido, proyecto, cursus, cuándo
      ['yo', 'ana', 1, 21, ago(10)],
      ['yo', 'ana', 1, 21, ago(9)],
      ['ana', 'yo', 2, 21, ago(8)],
      ['ana', 'leo', 1, 21, ago(7)],
      ['leo', 'yo', 1, 21, ago(6)],
      ['zoe', 'yo', 1, 21, ago(5)],
      ['zoe', 'yo', 2, 21, ago(5)],
      ['yo', 'eva', 3, 21, ago(800)],
      ['pisci', 'pisca', 100, 9, ago(3)],
      ['pisca', 'pisci', 100, 9, ago(2)],
    ]

    await db.batch(
      [
        ...users.map((login, index) => ({
          sql: `INSERT INTO users (id, login, image, synced_at) VALUES (?, ?, NULL, ?)`,
          args: [index + 1, login, ago(0)],
        })),
        // `lejos` es de otro campus: no sale en Madrid.
        ...users.map((login, index) => ({
          sql: 'INSERT INTO campus_members (campus_id, user_id) VALUES (?, ?)',
          args: [login === 'lejos' ? 1 : MADRID, index + 1],
        })),
        ...[1, 2, 3].map((id) => ({
          sql: 'INSERT INTO projects (id, name, slug) VALUES (?, ?, ?)',
          args: [id, `P${String(id)}`, `p-${String(id)}`],
        })),
        // Un examen del plan: no se corrige entre peers, no es un cromo.
        {
          sql: "INSERT INTO projects (id, name, slug) VALUES (4, 'Exam Rank 02', 'exam-rank-02')",
          args: [],
        },
        ...[
          [100, 'c-piscine-shell-00'],
          [101, 'c-piscine-c-00'],
          [102, 'c-piscine-exam-00'],
        ].map(([id, slug]) => ({
          sql: 'INSERT INTO projects (id, name, slug) VALUES (?, ?, ?)',
          args: [id ?? 0, String(slug), String(slug)],
        })),
        ...[...finished, ['lejos', 1] as [string, number]].map(([login, projectId], index) => ({
          sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, synced_at)
                VALUES (?, ?, ?, 'finished', 1, ?)`,
          args: [index + 1, users.indexOf(login) + 1, projectId, ago(0)],
        })),
        // Un suspenso no es un cromo.
        {
          sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, synced_at)
                VALUES (900, 3, 2, 'finished', 0, ?)`,
          args: [ago(0)],
        },
        ...['pisci', 'pisca'].map((login) => ({
          sql: `INSERT INTO pool_members (campus_id, user_id, login, image, begin_at, updated_at)
                VALUES (?, ?, ?, NULL, ?, ?)`,
          args: [MADRID, users.indexOf(login) + 1, login, ago(20), ago(0)],
        })),
        ...corrections.map(([corrector, corrected, projectId, cursus, at], index) => ({
          sql: `INSERT INTO corrections (id, campus_id, corrector, corrected, project_id, begin_at, cursus)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [index + 1, MADRID, corrector, corrected, projectId, at, cursus],
        })),
        // Lo que `yo` corrigió en otro campus también cuenta para su álbum.
        {
          sql: `INSERT INTO corrections (id, campus_id, corrector, corrected, project_id, begin_at, cursus)
                VALUES (500, 1, 'yo', 'lejos', 2, ?, 21)`,
          args: [ago(4)],
        },
        // `yo` y `ana` entraron en septiembre de 2025; `leo`, en otro mes.
        ...[
          ['yo', '2025-09-01T08:00:00.000Z'],
          ['ana', '2025-09-15T08:00:00.000Z'],
          ['leo', '2024-02-01T08:00:00.000Z'],
        ].map(([login, begin]) => ({
          sql: `INSERT INTO core_cursus (user_id, login, campus_id, begin_at, updated_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [users.indexOf(login ?? '') + 1, login ?? '', MADRID, begin ?? '', ago(0)],
        })),
      ],
      'write',
    )
  })

  afterEach(() => {
    closeDatabase(db)
  })

  /** Con quién se sienta cada cual, de más cerca a menos (la red de asientos). */
  let seated: Record<string, string[]> = {}

  const build = () =>
    createCollectionModule({
      db,
      audience: createAudience(
        () => Promise.resolve(['pisci', 'pisca']),
        () => NOW,
        (pool) => Promise.resolve(pool ? [] : hidden),
        () => Promise.resolve(['pisci', 'pisca']),
      ),
      circles: (track) =>
        Promise.resolve(
          new Map(
            track === 'classic'
              ? [
                  [1, 0],
                  [2, 1],
                  [4, 1],
                ]
              : [[3, 1]],
          ),
        ),
      circlesOf: (logins) =>
        Promise.resolve(
          new Map(
            logins.flatMap((login): [string, number][] =>
              login === 'yo' || login === 'leo'
                ? [[login, 1]]
                : login === 'ana'
                  ? [[login, 2]]
                  : [],
            ),
          ),
        ),
      friendsOf: (who, limit) => Promise.resolve((seated[who.login] ?? []).slice(0, limit)),
      now: () => NOW,
    })

  const ask = (login: string, query: unknown, pool = false): Promise<CorrectionCollection> =>
    build().service.collection(actor(login, pool ? { pool: true } : {}), query)

  it('ordena a todo tu mundo, sin piscineros ni gente de otro campus', async () => {
    const result = await ask('yo', { group: 'world' })

    // yo: 1, 2 (corregido en otro campus) y 3 (retirado, pero corregido): 3 de 3.
    expect(result.me).toEqual(expect.objectContaining({ rank: 1, collected: 3, eligible: 3 }))
    expect(result.rows.map((row) => [row.login, row.rank, row.collected, row.eligible])).toEqual([
      ['yo', 1, 3, 3],
      // Mismo porcentaje y mismos cromos: mismo puesto.
      ['ana', 2, 2, 2],
      ['zoe', 2, 2, 2],
      ['leo', 4, 1, 1],
      ['eva', 5, 0, 1],
    ])
    expect(result.group).toBe('world')
  })

  it('quien está oculto no sale ni cuenta: ni en los puestos ni en la rareza', async () => {
    hidden = ['zoe']

    const result = await ask('yo', { group: 'world' })

    expect(result.rows.map((row) => [row.login, row.rank])).toEqual([
      ['yo', 1],
      ['ana', 2],
      ['leo', 3],
      ['eva', 4],
    ])
    expect(result.standings.find((one) => one.group === 'world')?.size).toBe(4)
    // Del 1 lo aprobaron yo, ana, leo y eva; lo han corregido yo, ana y leo.
    expect(result.rarity.find((one) => one.projectId === 1)).toEqual({
      projectId: 1,
      eligible: 4,
      holders: 3,
      share: 0.75,
    })
    // A sí misma se ve.
    expect((await ask('zoe', { group: 'world' })).me?.login).toBe('zoe')
  })

  it('compara con amistades, kickoff y círculo, cada uno con su etiqueta', async () => {
    const result = await ask('yo', {})

    expect(result.group).toBe('friends')
    // Con quien más se ha corregido: ana (3), y luego leo, zoe y eva (1 o 2).
    expect(result.rows.map((row) => row.login).sort()).toEqual(['ana', 'eva', 'leo', 'yo', 'zoe'])
    expect(result.standings).toEqual([
      { group: 'friends', label: null, size: 5, rank: 1 },
      { group: 'kickoff', label: '2025-09', size: 2, rank: 1 },
      { group: 'circle', label: '1', size: 2, rank: 1 },
      { group: 'world', label: null, size: 5, rank: 1 },
    ])

    const kickoff = await ask('yo', { group: 'kickoff' })

    expect(kickoff.rows.map((row) => row.login)).toEqual(['yo', 'ana'])

    const circle = await ask('yo', { group: 'circle' })

    expect(circle.rows.map((row) => row.login)).toEqual(['yo', 'leo'])
  })

  /** Nueve personas («nuevo0»…«nuevo8») que entran el 1 de septiembre, con el proyecto 1 aprobado. */
  const newcomers = (): Promise<unknown> =>
    db.batch(
      [
        ...Array.from({ length: 9 }, (_, index) => [
          {
            sql: `INSERT INTO users (id, login, image, synced_at) VALUES (?, ?, NULL, ?)`,
            args: [200 + index, `nuevo${String(index)}`, ago(0)],
          },
          {
            sql: 'INSERT INTO campus_members (campus_id, user_id) VALUES (?, ?)',
            args: [MADRID, 200 + index],
          },
          {
            sql: `INSERT INTO project_users (id, user_id, project_id, status, validated, synced_at)
                VALUES (?, ?, 1, 'finished', 1, ?)`,
            args: [300 + index, 200 + index, ago(0)],
          },
          {
            sql: `INSERT INTO core_cursus (user_id, login, campus_id, begin_at, updated_at)
                VALUES (?, ?, ?, '2025-09-01T08:00:00.000Z', ?)`,
            args: [200 + index, `nuevo${String(index)}`, MADRID, ago(0)],
          },
        ]).flat(),
      ],
      'write',
    )

  it('tus amistades son primero con quien más te sientas; las correcciones solo completan', async () => {
    // Se sienta sobre todo con eva y luego con leo; «nadie» no tiene álbum y no cuenta.
    seated = { yo: ['nadie', 'eva', 'leo'] }

    const result = await ask('yo', {})

    expect(result.rows.map((row) => row.login).sort()).toEqual(['ana', 'eva', 'leo', 'yo', 'zoe'])

    // Con diez de los asientos que tienen álbum, las correcciones ya no entran.
    await newcomers()
    seated = { yo: ['eva', ...Array.from({ length: 9 }, (_, i) => `nuevo${String(i)}`)] }

    const only = await ask('yo', {})

    expect(only.rows).toHaveLength(11)
    expect(only.rows.map((row) => row.login)).not.toContain('ana')
    expect(only.rows.map((row) => row.login)).toContain('eva')
  })

  it('el kickoff es el real del campus, como en el Avance: quien entra a destiempo va con el anterior', async () => {
    // Nueve personas entran el 1 de septiembre (una kickoff real) y leo llega
    // en noviembre de otro campus: va con la de septiembre, no con «2025-11».
    await newcomers()
    await db.execute(
      "UPDATE core_cursus SET begin_at = '2025-11-20T08:00:00.000Z' WHERE login = 'leo'",
    )

    const result = await ask('yo', { group: 'kickoff' })

    expect(result.standings.find((one) => one.group === 'kickoff')?.label).toBe('2025-09')
    expect(result.rows.map((row) => row.login)).toContain('leo')
    expect(result.rows).toHaveLength(12)
  })

  it('a quien no tiene nada que corregir le da la rareza y ningún puesto', async () => {
    const result = await ask('nadie', { group: 'world' })

    expect(result.me).toBeNull()
    expect(result.standings).toEqual([
      { group: 'friends', label: null, size: 0, rank: null },
      { group: 'world', label: null, size: 5, rank: null },
    ])
    expect(result.rarity.map((one) => one.projectId)).toEqual([1, 2, 3])
  })

  it('a un piscinero le da la piscina: sus cromos sin exámenes, sin círculo', async () => {
    const result = await ask('pisci', { group: 'world' }, true)

    expect(result.rows.map((row) => [row.login, row.collected, row.eligible])).toEqual([
      ['pisca', 1, 1],
      ['pisci', 1, 2],
    ])
    expect(result.standings.map((one) => one.group)).toEqual(['friends', 'kickoff', 'world'])
    expect(result.rarity.map((one) => one.projectId)).toEqual([100, 101])
    // Un grupo que no tiene sale vacío, sin fallar.
    expect(await ask('pisci', { group: 'circle' }, true)).toEqual(
      expect.objectContaining({ rows: [], me: null }),
    )
  })

  it('un estudiante no ve a los piscineros aunque le corrijan', async () => {
    const result = await ask('ana', { group: 'world' })

    expect(result.rows.map((row) => row.login)).not.toContain('pisci')
  })

  it('rechaza un grupo que no existe o mal escrito', async () => {
    await expectCode(ask('yo', { group: 'enemigos' }), 'invalid_input')
    await expectCode(ask('yo', { group: ['world'] }), 'invalid_input')
    await expectCode(ask('yo', { group: 'x'.repeat(10_000) }), 'invalid_input')
  })

  it('reutiliza lo del campus un rato en vez de recalcularlo en cada petición', async () => {
    const module = build()
    const first = await module.service.collection(actor('yo'), { group: 'world' })

    await db.execute({ sql: 'DELETE FROM project_users WHERE user_id = 2', args: [] })

    const second = await module.service.collection(actor('yo'), { group: 'world' })

    expect(second.rows).toEqual(first.rows)
  })
})
