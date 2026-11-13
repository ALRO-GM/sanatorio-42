/**
 * La XP de los logros de los cursos y la celebración de lo desbloqueado
 * (`docs/cursos-logros.md`): cada logro da su XP una sola vez, también a quien
 * lo consiguió antes de que diera XP; y lo nuevo se celebra una vez, sin
 * lluvia de ventanas por lo que ya se tenía.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { COURSES } from '../../src/modules/courses/courses.rules.js'
import { COURSE_XP, HELP_KINDS, XP_KIND } from '../../src/modules/profile/xp.rules.js'
import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const AT = '2026-10-02T10:00:00.000Z'

/** Los puntos de un nivel del curso de shell (0: principiante, 1: intermedio…). */
function shellTier(index: number): readonly string[] {
  const tier = COURSES.find((course) => course.id === 'shell')?.tiers[index]

  if (tier === undefined) throw new Error(`falta el nivel ${index}`)

  return tier.units
}

describe('XP de los logros de los cursos (reglas)', () => {
  it('cada logro da algo, más cuanto más cuesta, y todos juntos 1070 (nivel 6)', () => {
    const amounts = Object.values(COURSE_XP)

    expect(amounts).toHaveLength(27)
    expect(amounts.every((xp) => xp > 0)).toBe(true)
    expect(amounts.reduce((sum, xp) => sum + xp, 0)).toBe(1070)
    expect(COURSE_XP.shell_first).toBeLessThan(COURSE_XP.shell_beginner)
    expect(COURSE_XP.shell_beginner).toBeLessThan(COURSE_XP.shell_advanced)
    expect(COURSE_XP.courses_all).toBe(Math.max(...amounts))
    // No es ayudar: no cuenta para la clasificación de quién ayuda más.
    expect(HELP_KINDS).not.toContain(XP_KIND.COURSE_ACHIEVEMENT)
  })
})

describe('XP y celebración de los logros (API)', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  /** Apunta puntos superados del curso de shell, como los dejaría el curso. */
  async function pass(login: string, units: readonly string[]): Promise<void> {
    for (const unit of units) {
      await community.db.execute({
        sql: `INSERT INTO shell_progress (login, unit, stars, commands, done_at) VALUES (?, ?, 3, 1, ?)`,
        args: [login, unit, AT],
      })
    }
  }

  const courseXp = async (login: string): Promise<number> => {
    const result = await community.db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) AS xp, COUNT(*) AS times
            FROM xp_events WHERE login = ? AND kind = 'course_achievement'`,
      args: [login],
    })

    return Number(result.rows[0]?.xp)
  }

  it('el primer punto da su XP una sola vez, por mucho que se mire (también a la vez)', async () => {
    const { xp } = services

    await pass('ana', shellTier(0).slice(0, 1))

    const first = await xp.expediente(actor('ana'))

    expect(first.xp.total).toBe(COURSE_XP.shell_first)
    expect(first.earned.course_achievement).toEqual({ xp: COURSE_XP.shell_first, times: 1 })
    expect(first.achievements.find((entry) => entry.id === 'shell_first')).toMatchObject({
      unlocked: true,
      xp: COURSE_XP.shell_first,
    })
    // Los de siempre no dicen XP: no la dan.
    expect(first.achievements.find((entry) => entry.id === 'first_duty')?.xp).toBeUndefined()

    await Promise.all([
      xp.expediente(actor('ana')),
      xp.expediente(actor('ana')),
      xp.unlocks(actor('ana')),
    ])
    expect(await courseXp('ana')).toBe(COURSE_XP.shell_first)
    expect((await xp.expediente(actor('ana'))).xp.total).toBe(COURSE_XP.shell_first)
    // Sin nada hecho, nada.
    expect((await xp.expediente(actor('leo'))).xp.total).toBe(0)
  })

  it('quien ya los tenía cobra la XP al mirarse, sin ventanas por lo de antes', async () => {
    const { xp } = services

    // Lo de antes de que los logros dieran XP: dos certificados.
    await pass('ana', [...shellTier(0), ...shellTier(1)])
    expect(await courseXp('ana')).toBe(0)

    // La primera vez: cobra y lo apunta como ya celebrado.
    expect(await xp.unlocks(actor('ana'))).toEqual({ unlocks: [] })

    const expected = COURSE_XP.shell_first + COURSE_XP.shell_beginner + COURSE_XP.shell_intermediate

    expect(await courseXp('ana')).toBe(expected)
    // 75 XP: nivel 2, con su título; tampoco sale, era de antes.
    expect((await xp.expediente(actor('ana'))).xp.level).toBe(2)
    expect(await xp.unlocks(actor('ana'))).toEqual({ unlocks: [] })
  })

  it('lo nuevo sale una vez, hasta que se celebra, con su XP; y el nivel que trae', async () => {
    const { xp } = services

    // Al abrir la web, sin nada: la primera cuenta.
    expect(await xp.unlocks(actor('ana'))).toEqual({ unlocks: [] })

    await pass('ana', shellTier(0).slice(0, 1))
    expect((await xp.unlocks(actor('ana'))).unlocks).toEqual([
      { id: 'shell_first', kind: 'achievement', xp: COURSE_XP.shell_first, level: 0 },
    ])
    // Al recargar, sigue ahí: aún no se ha celebrado.
    expect((await xp.unlocks(actor('ana'))).unlocks.map((entry) => entry.id)).toEqual([
      'shell_first',
    ])

    await xp.unlocksSeen(actor('ana'), { ids: ['shell_first'] })
    expect(await xp.unlocks(actor('ana'))).toEqual({ unlocks: [] })

    // Dos certificados: dos logros y, con la XP, el nivel 2 y su título.
    await pass('ana', [...shellTier(0).slice(1), ...shellTier(1)])
    expect((await xp.unlocks(actor('ana'))).unlocks).toEqual([
      { id: 'shell_beginner', kind: 'achievement', xp: COURSE_XP.shell_beginner, level: 0 },
      {
        id: 'shell_intermediate',
        kind: 'achievement',
        xp: COURSE_XP.shell_intermediate,
        level: 0,
      },
      { id: 'interno', kind: 'level', xp: 0, level: 2 },
    ])

    // Cada persona, lo suyo: lo que celebra ana no toca a leo.
    expect(await xp.unlocks(actor('leo'))).toEqual({ unlocks: [] })
    await xp.unlocksSeen(actor('ana'), { ids: ['shell_beginner', 'shell_intermediate', 'interno'] })
    expect(await xp.unlocks(actor('ana'))).toEqual({ unlocks: [] })
  })

  it('lo celebrado solo apunta lo que se tiene, y lo raro se rechaza', async () => {
    const { xp } = services

    await xp.unlocks(actor('ana'))
    // Inventado o sin conseguir: no deja rastro, y luego sí sale al conseguirlo.
    await xp.unlocksSeen(actor('ana'), { ids: ['shell_first', 'jefe', 'no-existe', ''.padEnd(5)] })

    const rows = await community.db.execute({
      sql: 'SELECT unlock FROM unlock_announcements WHERE login = ?',
      args: ['ana'],
    })

    expect(rows.rows.map((row) => row.unlock)).toEqual([''])

    await pass('ana', shellTier(0).slice(0, 1))
    expect((await xp.unlocks(actor('ana'))).unlocks.map((entry) => entry.id)).toEqual([
      'shell_first',
    ])

    await expectCode(xp.unlocksSeen(actor('ana'), { ids: 'shell_first' }), 'invalid_input')
    await expectCode(xp.unlocksSeen(actor('ana'), {}), 'invalid_input')
    await expectCode(xp.unlocksSeen(actor('ana'), { ids: [''] }), 'invalid_input')
    await expectCode(
      xp.unlocksSeen(actor('ana'), { ids: Array.from({ length: 51 }, () => 'shell_first') }),
      'invalid_input',
    )
    await expectCode(xp.unlocksSeen(actor('ana'), { ids: ['x'.repeat(61)] }), 'invalid_input')
    // Vacío: no hace nada.
    await xp.unlocksSeen(actor('ana'), { ids: [] })
    expect((await xp.unlocks(actor('ana'))).unlocks).toHaveLength(1)
  })
})
