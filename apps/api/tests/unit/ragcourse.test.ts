/**
 * Curso de RAG (API): el mismo servicio que los cursos de terminal con el
 * motor de RAG y sus tablas. Va en orden, vuelve a corregir cada comprobación,
 * pone las estrellas por comprobaciones (o por su reloj en los jefes), guarda
 * la mejor vez, da el certificado de nivel y apunta el tiempo activo como
 * curso `rag`. No se mezcla con los demás cursos.
 */
import { encodeRun, LIMITS, UNITS } from '@sanatorio/ragsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const at = (id: string) => {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw new Error(`falta ${id}`)

  return { unit, index }
}

const first = at('rag-why').unit
const OFF = encodeRun({ t: 0, c: { context: false } })

async function reach(community: Community, login: string, id: string): Promise<void> {
  const { ragCourse } = community.services

  for (const unit of UNITS.slice(0, at(id).index)) {
    if (unit.limit !== undefined) await ragCourse.startBoss(actor(login), unit.id)

    const result = await ragCourse.attempt(actor(login), unit.id, { entries: unit.solution })

    expect(result.done, unit.id).toBe(true)
  }
}

describe('curso de RAG', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('empieza vacío, va en orden, vuelve a corregir y no se mezcla con el de shell', async () => {
    const { ragCourse, shellCourse } = services
    const second = at('rag-corpus').unit

    expect(await ragCourse.course(actor('ana'))).toEqual({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await expectCode(
      ragCourse.attempt(actor('ana'), second.id, { entries: second.solution }),
      'conflict',
    )
    await expectCode(ragCourse.attempt(actor('ana'), 'nada', { entries: [] }), 'not_found')
    await expectCode(ragCourse.attempt(actor('ana'), first.id, { entries: OFF }), 'invalid_input')
    await expectCode(ragCourse.attempt(actor('ana'), first.id, {}), 'invalid_input')
    // Decir «hecho» no vale: sin una comprobación que cumpla, no hay punto.
    expect(
      await ragCourse.attempt(actor('ana'), first.id, { entries: [OFF], done: true, stars: 3 }),
    ).toMatchObject({ done: false, stars: 0, commands: 1, misses: ['task:0'] })

    const done = await ragCourse.attempt(actor('ana'), first.id, {
      entries: first.solution,
      activeSeconds: 95,
    })

    expect(done).toMatchObject({ done: true, stars: 3, commands: 2, seconds: null })
    expect((await shellCourse.course(actor('ana'))).stars).toEqual({})
    expect((await ragCourse.course(actor('leo'))).stars).toEqual({})

    const times = await community.db.execute(
      "SELECT course, unit, active_seconds FROM course_times WHERE login = 'ana'",
    )

    expect(times.rows).toEqual([
      expect.objectContaining({ course: 'rag', unit: first.id, active_seconds: 95 }),
    ])
  })

  it('las estrellas las pone la API: más comprobaciones, menos estrellas, y se guarda la mejor vez', async () => {
    const { ragCourse } = services
    const win = first.solution.at(-1) ?? ''

    expect(
      await ragCourse.attempt(actor('ana'), first.id, {
        entries: [OFF, OFF, OFF, OFF, win],
        stars: 3,
      }),
    ).toMatchObject({ done: true, stars: 2, commands: 5 })

    const best = await ragCourse.attempt(actor('ana'), first.id, { entries: [win] })

    expect(best).toMatchObject({ stars: 3, commands: 1 })
    expect(best.course.stars[first.id]).toBe(3)
    expect(best.course.best[first.id]).toEqual({ commands: 1, seconds: null })

    // Repetirlo peor no baja lo guardado.
    const worse = await ragCourse.attempt(actor('ana'), first.id, {
      entries: [...Array<string>(8).fill(OFF), win],
    })

    expect(worse.stars).toBe(1)
    expect(worse.course.stars[first.id]).toBe(3)
    expect(worse.course.best[first.id]).toEqual({ commands: 1, seconds: null })
  })

  it('los jefes van contra el reloj de la API y el final da el certificado', async () => {
    const { ragCourse } = services
    const boss = at('rag-boss-invents').unit

    await reach(community, 'ana', boss.id)
    await expectCode(
      ragCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
      'conflict',
    )
    await expectCode(ragCourse.startBoss(actor('ana'), first.id), 'invalid_input')
    await expectCode(ragCourse.startBoss(actor('leo'), boss.id), 'conflict')
    await ragCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(((boss.limit ?? 0) + 10) * 1000)
    expect(
      await ragCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({ done: false, misses: ['time'] })

    const started = await ragCourse.startBoss(actor('ana'), boss.id)

    expect(started.course.runs[boss.id]).toEqual(started.run)
    community.clock.advance(30_000)
    // A medias: falta una tarea y el reloj sigue.
    expect(
      await ragCourse.attempt(actor('ana'), boss.id, { entries: boss.solution.slice(0, 1) }),
    ).toMatchObject({ done: false, misses: ['task:1'], seconds: 30 })
    expect(
      await ragCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({ done: true, stars: 3, seconds: 30 })

    await reach(community, 'ana', 'rag-final-beginner')
    await ragCourse.startBoss(actor('ana'), 'rag-final-beginner')
    community.clock.advance(200_000)

    const final = await ragCourse.attempt(actor('ana'), 'rag-final-beginner', {
      entries: at('rag-final-beginner').unit.solution,
    })

    expect(final.course.certificates).toEqual([
      { tier: 'beginner', stars: 3, seconds: 200, at: expect.any(String) },
    ])
  }, 30_000)

  it('topes: comprobaciones largas, intentos enormes, formas raras y demasiada prisa', async () => {
    const { ragCourse } = services

    await expectCode(
      ragCourse.attempt(actor('ana'), first.id, { entries: ['x'.repeat(LIMITS.entry + 1)] }),
      'invalid_input',
    )
    await expectCode(
      ragCourse.attempt(actor('ana'), first.id, {
        entries: Array.from({ length: LIMITS.attemptEntries + 1 }, () => OFF),
      }),
      'invalid_input',
    )
    await expectCode(
      ragCourse.attempt(actor('ana'), first.id, { entries: first.solution, activeSeconds: -1 }),
      'invalid_input',
    )
    // Lo que no es una comprobación se salta; lo disparatado se recorta a sus topes.
    expect(
      await ragCourse.attempt(actor('ana'), first.id, {
        entries: [
          '{"__proto__":{"context":true},"t":0}',
          '{"t":0,"c":{"context":"sí","size":1e300,"sources":"todo"}}',
          '<script>alert(1)</script>',
          ...first.solution,
        ],
      }),
    ).toMatchObject({ done: true, commands: 3 })
    // Treinta intentos en diez minutos son muchos: el siguiente espera.
    for (let index = 0; index < 29; index += 1)
      await ragCourse.attempt(actor('ana'), first.id, { entries: [] })
    await expectCode(ragCourse.attempt(actor('ana'), first.id, { entries: [] }), 'rate_limited')
    expect((await ragCourse.attempt(actor('leo'), first.id, { entries: [] })).done).toBe(false)
  })
})
