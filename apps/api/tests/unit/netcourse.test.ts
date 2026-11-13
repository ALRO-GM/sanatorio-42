/**
 * Curso de NetPractice (API): el servicio de los cursos de terminal con el
 * motor de redes y sus tablas. Va en orden, vuelve a mirar cada comprobación,
 * pone las estrellas por las que hicieron falta, cronometra los jefes con su
 * reloj, da el certificado de nivel, apunta el tiempo activo como curso `net`
 * y da sus logros sin tocar los de los otros cuatro cursos.
 */
import { encodeEntry, LIMITS, solutionOf, UNITS } from '@sanatorio/netsim'
import type { Unit } from '@sanatorio/netsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const at = (id: string) => {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw new Error(`falta ${id}`)

  return { unit, index }
}

const solved = (unit: Unit): string[] => [encodeEntry(solutionOf(unit))]
const first = at('net-octets').unit
const WRONG = encodeEntry({ 'q0.network': '192.168.1.42' })

async function reach(community: Community, login: string, id: string): Promise<void> {
  const { netCourse } = community.services

  for (const unit of UNITS.slice(0, at(id).index)) {
    if (unit.limit !== undefined) await netCourse.startBoss(actor(login), unit.id)

    const result = await netCourse.attempt(actor(login), unit.id, { entries: solved(unit) })

    expect(result.done, unit.id).toBe(true)
    // Cada intento cuenta para el tope por persona: que el reloj lo deje atrás.
    community.clock.advance(30_000)
  }
}

describe('curso de NetPractice', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('empieza vacío, va en orden, vuelve a mirar y no se mezcla con los otros cursos', async () => {
    const { netCourse, shellCourse, dockerCourse } = services
    const second = at('net-mask').unit

    expect(await netCourse.course(actor('ana'))).toEqual({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await expectCode(
      netCourse.attempt(actor('ana'), second.id, { entries: solved(second) }),
      'conflict',
    )
    await expectCode(netCourse.attempt(actor('ana'), 'nada', { entries: [] }), 'not_found')
    await expectCode(
      netCourse.attempt(actor('ana'), first.id, { entries: solved(first)[0] }),
      'invalid_input',
    )
    // Decir «hecho» no vale: la API mira la configuración con su motor.
    expect(
      await netCourse.attempt(actor('ana'), first.id, { entries: [WRONG], done: true, stars: 3 }),
    ).toMatchObject({
      done: false,
      stars: 0,
      commands: 1,
      misses: expect.arrayContaining(['q0.network']),
    })
    expect(await netCourse.attempt(actor('ana'), first.id, { entries: [] })).toMatchObject({
      done: false,
      commands: 0,
    })

    const done = await netCourse.attempt(actor('ana'), first.id, {
      entries: solved(first),
      activeSeconds: 140,
    })

    expect(done).toMatchObject({ done: true, stars: 3, commands: 1, seconds: null })
    expect(done.course.stars).toEqual({ [first.id]: 3 })
    expect((await shellCourse.course(actor('ana'))).stars).toEqual({})
    expect((await dockerCourse.course(actor('ana'))).stars).toEqual({})
    expect((await netCourse.course(actor('leo'))).stars).toEqual({})

    const times = await community.db.execute(
      "SELECT course, unit, active_seconds, first FROM course_times WHERE login = 'ana'",
    )

    expect(times.rows).toEqual([
      expect.objectContaining({ course: 'net', unit: first.id, active_seconds: 140, first: 1 }),
    ])
  })

  it('las estrellas las pone la API por las comprobaciones, y se guarda la mejor vez', async () => {
    const { netCourse } = services
    const slow = await netCourse.attempt(actor('ana'), first.id, {
      entries: [WRONG, WRONG, WRONG, ...solved(first)],
      stars: 3,
    })

    expect(slow).toMatchObject({ done: true, stars: 1, commands: 4 })

    const better = await netCourse.attempt(actor('ana'), first.id, {
      entries: [WRONG, ...solved(first)],
    })

    expect(better).toMatchObject({ stars: 2, commands: 2 })

    // Una vez peor no baja lo guardado.
    const worse = await netCourse.attempt(actor('ana'), first.id, {
      entries: [WRONG, WRONG, WRONG, WRONG, ...solved(first)],
    })

    expect(worse.stars).toBe(1)
    expect(worse.course.stars[first.id]).toBe(2)
    expect(worse.course.best[first.id]).toEqual({ commands: 2, seconds: null })
  })

  it('un esquema se corrige por lo que hace la red: vale cualquier dirección del rango', async () => {
    const { netCourse } = services
    const pair = at('net-pair').unit

    await reach(community, 'ana', pair.id)
    expect(
      await netCourse.attempt(actor('ana'), pair.id, {
        entries: [encodeEntry({ 'cache.eth0.ip': '10.0.6.2' })],
      }),
    ).toMatchObject({ done: false, misses: ['goal:api>cache'] })
    expect(
      await netCourse.attempt(actor('ana'), pair.id, {
        entries: [encodeEntry({ 'cache.eth0.ip': '10.0.5.200' })],
      }),
    ).toMatchObject({ done: true, stars: 3 })
  }, 30_000)

  it('los jefes van contra el reloj de la API y el final da el certificado y los logros', async () => {
    const { netCourse, courses } = services
    const boss = at('net-boss-inventory').unit
    const limit = boss.limit ?? 0

    await reach(community, 'ana', boss.id)
    await expectCode(
      netCourse.attempt(actor('ana'), boss.id, { entries: solved(boss) }),
      'conflict',
    )
    await expectCode(netCourse.startBoss(actor('ana'), first.id), 'invalid_input')
    await expectCode(netCourse.startBoss(actor('leo'), boss.id), 'conflict')

    const started = await netCourse.startBoss(actor('ana'), boss.id)

    expect(Date.parse(started.run.deadline) - Date.parse(started.run.startedAt)).toBe(limit * 1000)
    expect(started.course.runs[boss.id]).toEqual(started.run)
    community.clock.advance((limit + 10) * 1000)
    expect(await netCourse.attempt(actor('ana'), boss.id, { entries: solved(boss) })).toMatchObject(
      {
        done: false,
        misses: ['time'],
      },
    )
    // Pasado de tiempo ya no se enseña en marcha: hay que volver a empezar.
    expect((await netCourse.course(actor('ana'))).runs).toEqual({})
    await netCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(40_000)
    expect(await netCourse.attempt(actor('ana'), boss.id, { entries: solved(boss) })).toMatchObject(
      {
        done: true,
        stars: 3,
        seconds: 40,
      },
    )

    await reach(community, 'ana', 'net-final-beginner')
    await netCourse.startBoss(actor('ana'), 'net-final-beginner')
    community.clock.advance(200_000)

    const final = await netCourse.attempt(actor('ana'), 'net-final-beginner', {
      entries: solved(at('net-final-beginner').unit),
    })

    expect(final.course.certificates).toEqual([
      { tier: 'beginner', stars: 3, seconds: 200, at: expect.any(String) },
    ])

    const achievements = await courses.achievements('ana')
    const mine = Object.fromEntries(achievements.map((each) => [each.id, each]))

    expect(mine.net_first).toMatchObject({ unlocked: true })
    expect(mine.net_beginner).toMatchObject({ unlocked: true })
    expect(mine.net_intermediate).toMatchObject({ unlocked: false, progress: 0 })
    expect(mine.net_bosses).toMatchObject({ unlocked: false, progress: 4, goal: 12 })
    // NetPractice va aparte del orden sugerido: no cuenta para «empezar los cuatro».
    expect(mine.courses_explorer).toMatchObject({ progress: 0, goal: 4 })
  }, 60_000)

  it('topes: comprobaciones largas, intentos enormes y demasiados seguidos', async () => {
    const { netCourse } = services

    await expectCode(
      netCourse.attempt(actor('ana'), first.id, { entries: ['x'.repeat(LIMITS.entry + 1)] }),
      'invalid_input',
    )
    await expectCode(
      netCourse.attempt(actor('ana'), first.id, {
        entries: Array.from({ length: LIMITS.attemptEntries + 1 }, () => WRONG),
      }),
      'invalid_input',
    )
    await expectCode(
      netCourse.attempt(actor('ana'), first.id, { entries: solved(first), activeSeconds: -1 }),
      'invalid_input',
    )
    expect(
      await netCourse.attempt(actor('ana'), first.id, {
        entries: ['{"__proto__":{"q0.network":"x"}}', 'while(true){}', ...solved(first)],
      }),
    ).toMatchObject({ done: true, stars: 2, commands: 3 })
    for (let attempt = 0; attempt < 29; attempt += 1)
      await netCourse.attempt(actor('leo'), first.id, { entries: [WRONG] })
    expect(await netCourse.attempt(actor('leo'), first.id, { entries: [WRONG] })).toMatchObject({
      done: false,
    })
    await expectCode(
      netCourse.attempt(actor('leo'), first.id, { entries: [WRONG] }),
      'rate_limited',
    )
    // El tope es por persona.
    expect((await netCourse.course(actor('ana'))).stars[first.id]).toBe(2)
  })
})
