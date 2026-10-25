/**
 * Tiempo de los cursos: la estimación de cada punto (la misma función para la
 * web y la API) y el tiempo activo que se apunta al superar un punto, en los
 * dos cursos. Solo se apunta lo que sale, con lo que se estimaba entonces.
 */
import { ESTIMATE, estimateSeconds, wordsIn } from '@sanatorio/course'
import {
  estimateOfGitCourse,
  estimateOfLevel,
  estimateOfWorld,
  LEVELS,
  WORLDS,
} from '@sanatorio/gitsim'
import {
  BLOCKS,
  estimateOf,
  estimateOfBlock,
  estimateOfCourse,
  estimateOfTier,
  TIERS,
  UNITS,
} from '@sanatorio/shellsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { toNumber, toText } from '../../src/core/db/rows.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('estimación de tiempo', () => {
  it('cuenta palabras de textos sueltos y listas, y se salta lo que falta', () => {
    expect(wordsIn('uno dos  tres', undefined, ['cuatro cinco', ''], '   ')).toBe(5)
    expect(wordsIn()).toBe(0)
  })

  it('una unidad: lectura, órdenes y margen, redondeado al minuto y uno como poco', () => {
    expect(estimateSeconds({ kind: 'unit', words: 0, commands: 0 })).toBe(
      Math.round(ESTIMATE.baseSeconds / 60) * 60,
    )
    const short = estimateSeconds({ kind: 'unit', words: 180, commands: 1 })
    const long = estimateSeconds({ kind: 'unit', words: 1800, commands: 10 })

    expect(short % 60).toBe(0)
    expect(long).toBeGreaterThan(short)
    expect(
      estimateSeconds({ kind: 'unit', words: 180, commands: 1, remote: true }),
    ).toBeGreaterThan(short)
    expect(estimateSeconds({ kind: 'unit', words: -1e6, commands: 0 })).toBe(60)
  })

  it('un contrarreloj: algo más que el límite, por los intentos', () => {
    const boss = estimateSeconds({ kind: 'boss', words: 100, commands: 30, limit: 300 })

    expect(boss).toBeGreaterThan(300)
    // Las órdenes no cuentan en un jefe: manda el reloj.
    expect(estimateSeconds({ kind: 'boss', words: 100, commands: 1, limit: 300 })).toBe(boss)
  })

  it('curso de shell: los niveles suman el curso y los bloques, su nivel sin el jefe final', () => {
    const tiers = TIERS.map(estimateOfTier)

    expect(tiers.reduce((a, b) => a + b, 0)).toBe(estimateOfCourse())
    for (const tier of TIERS) {
      const blocks = BLOCKS.filter((block) => block.tier === tier).map((block) =>
        estimateOfBlock(block.n),
      )
      const final = UNITS.find((unit) => unit.tier === tier && unit.kind === 'final')

      if (final === undefined) throw new Error(`falta el jefe final de ${tier}`)
      expect(blocks.reduce((a, b) => a + b, 0) + estimateOf(final)).toBe(estimateOfTier(tier))
    }
    for (const unit of UNITS) {
      expect(estimateOf(unit), unit.id).toBeGreaterThanOrEqual(60)
      if (unit.limit !== undefined) expect(estimateOf(unit), unit.id).toBeGreaterThan(unit.limit)
    }
    // Un curso de unas horas, no de minutos ni de días.
    expect(estimateOfCourse()).toBeGreaterThan(2 * 3600)
    expect(estimateOfCourse()).toBeLessThan(12 * 3600)
  })

  it('curso de git: los mundos suman el curso, con las pruebas de grupo', () => {
    expect(WORLDS.reduce((sum, world) => sum + estimateOfWorld(world), 0)).toBe(
      estimateOfGitCourse(),
    )
    expect(estimateOfGitCourse()).toBeGreaterThan(
      LEVELS.reduce((sum, level) => sum + estimateOfLevel(level), 0),
    )
    expect(estimateOfWorld(99)).toBe(0)
  })
})

type Row = Record<string, unknown>

async function times(community: Community): Promise<Row[]> {
  return (await community.db.execute('SELECT * FROM course_times ORDER BY id')).rows
}

describe('tiempo activo al superar un punto', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('curso de shell: se apunta al salir, con la estimación; no al fallar ni sin tiempo', async () => {
    const { shellCourse } = services
    const [first, second] = UNITS

    if (first === undefined || second === undefined) throw new Error('faltan unidades')

    await shellCourse.attempt(actor('ana'), first.id, { entries: ['pwd'], activeSeconds: 40 })
    expect(await times(community)).toEqual([])

    await shellCourse.attempt(actor('ana'), first.id, {
      entries: first.solution,
      activeSeconds: 125,
    })
    // Repetir para mejorar también cuenta, marcado como repetición.
    await shellCourse.attempt(actor('ana'), first.id, {
      entries: first.solution,
      activeSeconds: 30,
    })
    // Sin tiempo (una web vieja) se da el punto igual, pero no se apunta nada.
    await shellCourse.attempt(actor('ana'), second.id, { entries: second.solution })

    const rows = await times(community)

    expect(
      rows.map((row) => [
        toText(row.course),
        toText(row.unit),
        toNumber(row.active_seconds),
        toNumber(row.first),
      ]),
    ).toEqual([
      ['shell', first.id, 125, 1],
      ['shell', first.id, 30, 0],
    ])
    expect(toNumber(rows[0]?.estimate_seconds)).toBe(estimateOf(first))
    expect(toText(rows[0]?.login)).toBe('ana')
  })

  it('no admite tiempos imposibles', async () => {
    const { shellCourse } = services
    const unit = UNITS[0]

    if (unit === undefined) throw new Error('faltan unidades')
    for (const activeSeconds of [-1, 1.5, 6 * 3600 + 1, '60', null]) {
      await expectCode(
        shellCourse.attempt(actor('ana'), unit.id, { entries: unit.solution, activeSeconds }),
        'invalid_input',
      )
    }
    expect(await times(community)).toEqual([])
  })

  it('curso de git: también se apunta, con la estimación del punto', async () => {
    const { gitCourse } = services
    const level = LEVELS[0]

    if (level === undefined) throw new Error('faltan puntos')
    await community.seat({ ana: 'c1r2s3' })
    await gitCourse.attempt(actor('ana'), level.id, { lines: [], activeSeconds: 10 })
    expect(await times(community)).toEqual([])

    await gitCourse.attempt(actor('ana'), level.id, { lines: level.solution, activeSeconds: 200 })

    const [row] = await times(community)

    expect(row).toMatchObject({ login: 'ana', course: 'git', unit: level.id })
    expect(toNumber(row?.active_seconds)).toBe(200)
    expect(toNumber(row?.estimate_seconds)).toBe(estimateOfLevel(level))
    expect(toNumber(row?.first)).toBe(1)
  })
})
