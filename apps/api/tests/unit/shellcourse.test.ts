/**
 * Curso de shell (API): va en orden, vuelve a ejecutar las órdenes antes de
 * dar el punto, guarda la mejor vez, cronometra los jefes con su reloj y da
 * los certificados de nivel. Lo que manda la web (estrellas, tiempo) no se cree.
 */
import { LIMITS, UNITS } from '@sanatorio/shellsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const [first, second] = UNITS
const at = (id: string) => {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw new Error(`falta ${id}`)

  return { unit, index }
}

/** Supera todas las unidades hasta `id` (sin incluirla), con su solución. */
async function reach(community: Community, login: string, id: string): Promise<void> {
  const { shellCourse } = community.services

  for (const unit of UNITS.slice(0, at(id).index)) {
    if (unit.limit !== undefined) await shellCourse.startBoss(actor(login), unit.id)

    const result = await shellCourse.attempt(actor(login), unit.id, { entries: unit.solution })

    expect(result.done, unit.id).toBe(true)
  }
}

describe('curso de shell', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('empieza vacío, va en orden y vuelve a ejecutar las órdenes', async () => {
    const { shellCourse } = services

    if (first === undefined || second === undefined) throw new Error('faltan unidades')
    expect(await shellCourse.course(actor('ana'))).toEqual({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await expectCode(
      shellCourse.attempt(actor('ana'), second.id, { entries: second.solution }),
      'conflict',
    )
    await expectCode(shellCourse.attempt(actor('ana'), 'nada', { entries: [] }), 'not_found')
    await expectCode(
      shellCourse.attempt(actor('ana'), first.id, { entries: 'ls' }),
      'invalid_input',
    )

    // Sin hacer lo que se pide no hay punto.
    expect(await shellCourse.attempt(actor('ana'), first.id, { entries: ['pwd'] })).toMatchObject({
      done: false,
      stars: 0,
      misses: ['output'],
    })

    const done = await shellCourse.attempt(actor('ana'), first.id, { entries: first.solution })

    expect(done).toMatchObject({ done: true, stars: 3, seconds: null })
    expect(done.course.stars).toEqual({ [first.id]: 3 })
    expect(
      (await shellCourse.attempt(actor('ana'), second.id, { entries: second.solution })).done,
    ).toBe(true)
  })

  it('las estrellas las calcula la API y se queda la mejor vez', async () => {
    const { shellCourse } = services

    await reach(community, 'ana', 'mkdir')

    const slow = [
      'mkdir ~/x',
      'rmdir ~/x',
      'mkdir -p ~/deploy/logs ~/deploy/config ~/deploy/releases',
      'touch ~/deploy/config/app.env',
    ]
    // La web no manda estrellas: si las manda, no se usan.
    const worse = await shellCourse.attempt(actor('ana'), 'mkdir', { entries: slow, stars: 3 })

    expect(worse).toMatchObject({ done: true, stars: 2, commands: 4 })
    expect(
      (
        await shellCourse.attempt(actor('ana'), 'mkdir', {
          entries: ['mkdir -p ~/deploy/{logs,config,releases} && touch ~/deploy/config/app.env'],
        })
      ).stars,
    ).toBe(3)
    // Una vez peor no quita lo conseguido.
    const again = await shellCourse.attempt(actor('ana'), 'mkdir', { entries: slow })

    expect(again.course.stars.mkdir).toBe(3)
    expect(again.course.best.mkdir).toEqual({ commands: 2, seconds: null })
  })

  it('los jefes van contra el reloj de la API', async () => {
    const { shellCourse } = services
    const { unit } = at('boss1')

    await reach(community, 'ana', 'boss1')
    // Sin empezar el contrarreloj no se corrige, y una unidad normal no tiene reloj.
    await expectCode(
      shellCourse.attempt(actor('ana'), 'boss1', { entries: unit.solution }),
      'conflict',
    )
    await expectCode(shellCourse.startBoss(actor('ana'), 'ls'), 'invalid_input')
    await expectCode(shellCourse.startBoss(actor('ana'), 'boss2'), 'conflict')

    const start = await shellCourse.startBoss(actor('ana'), 'boss1')

    expect(Date.parse(start.run.deadline) - Date.parse(start.run.startedAt)).toBe(180_000)
    expect(start.course.runs.boss1).toEqual(start.run)

    // Fuera de tiempo (y del margen de la red) no hay punto.
    community.clock.advance(186_000)
    expect(
      await shellCourse.attempt(actor('ana'), 'boss1', { entries: unit.solution }),
    ).toMatchObject({ done: false, stars: 0, seconds: 186, misses: ['time'] })
    expect((await shellCourse.course(actor('ana'))).runs).toEqual({})

    // Rápido, tres estrellas; a los tres cuartos, dos.
    await shellCourse.startBoss(actor('ana'), 'boss1')
    community.clock.advance(120_000)
    expect(
      await shellCourse.attempt(actor('ana'), 'boss1', { entries: unit.solution }),
    ).toMatchObject({ done: true, stars: 2, seconds: 120 })
    await shellCourse.startBoss(actor('ana'), 'boss1')
    community.clock.advance(30_000)

    const fast = await shellCourse.attempt(actor('ana'), 'boss1', { entries: unit.solution })

    expect(fast).toMatchObject({ done: true, stars: 3, seconds: 30 })
    expect(fast.course.best.boss1).toEqual({ commands: 2, seconds: 30 })
    // Superado, el reloj se quita.
    expect(fast.course.runs).toEqual({})
  })

  it('el jefe final da el certificado de su nivel', async () => {
    const { shellCourse } = services

    await reach(community, 'ana', 'final-beginner')
    await shellCourse.startBoss(actor('ana'), 'final-beginner')
    community.clock.advance(250_000)

    const result = await shellCourse.attempt(actor('ana'), 'final-beginner', {
      entries: at('final-beginner').unit.solution,
    })

    expect(result.done).toBe(true)
    expect(result.course.certificates).toEqual([
      { tier: 'beginner', stars: 3, seconds: 250, at: expect.any(String) },
    ])
  }, 30_000)

  it('topes: órdenes largas, intentos enormes e intentos seguidos', async () => {
    const { shellCourse } = services

    if (first === undefined) throw new Error('faltan unidades')
    await expectCode(
      shellCourse.attempt(actor('ana'), first.id, { entries: ['x'.repeat(LIMITS.entry + 1)] }),
      'invalid_input',
    )
    await expectCode(
      shellCourse.attempt(actor('ana'), first.id, {
        entries: Array.from({ length: LIMITS.attemptEntries + 1 }, () => 'ls'),
      }),
      'invalid_input',
    )
    // Lo que intenta salir del simulador o colgarlo falla y no cuenta.
    expect(
      await shellCourse.attempt(actor('ana'), first.id, {
        entries: [
          'rm -rf /',
          'cat /etc/shadow',
          'while true; do :; done',
          ':(){ :|:& };:',
          ...first.solution,
        ],
      }),
    ).toMatchObject({ done: true, stars: 3 })
    for (let i = 0; i < 29; i++)
      await shellCourse.attempt(actor('ana'), first.id, { entries: first.solution })
    await expectCode(
      shellCourse.attempt(actor('ana'), first.id, { entries: first.solution }),
      'rate_limited',
    )
  })

  it('cada cual ve solo lo suyo', async () => {
    const { shellCourse } = services

    if (first === undefined) throw new Error('faltan unidades')
    await shellCourse.attempt(actor('ana'), first.id, { entries: first.solution })
    expect((await shellCourse.course(actor('leo'))).stars).toEqual({})
  })
})
