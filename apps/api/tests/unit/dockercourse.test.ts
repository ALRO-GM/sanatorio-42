/**
 * Curso de Docker (API): el mismo servicio que el de shell con el motor de
 * Docker y sus tablas. Va en orden, vuelve a ejecutar las órdenes, guarda la
 * mejor vez, cronometra los jefes con su reloj, da el certificado de nivel y
 * apunta el tiempo activo como curso `docker`. No se mezcla con el de shell.
 */
import { LIMITS, UNITS } from '@sanatorio/dockersim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const at = (id: string) => {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw new Error(`falta ${id}`)

  return { unit, index }
}

const first = at('docker-hello').unit

async function reach(community: Community, login: string, id: string): Promise<void> {
  const { dockerCourse } = community.services

  for (const unit of UNITS.slice(0, at(id).index)) {
    if (unit.limit !== undefined) await dockerCourse.startBoss(actor(login), unit.id)

    const result = await dockerCourse.attempt(actor(login), unit.id, { entries: unit.solution })

    expect(result.done, unit.id).toBe(true)
  }
}

describe('curso de Docker', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('empieza vacío, va en orden, vuelve a ejecutar y no se mezcla con el de shell', async () => {
    const { dockerCourse, shellCourse } = services
    const second = at('docker-detached').unit

    expect(await dockerCourse.course(actor('ana'))).toEqual({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await expectCode(
      dockerCourse.attempt(actor('ana'), second.id, { entries: second.solution }),
      'conflict',
    )
    await expectCode(dockerCourse.attempt(actor('ana'), 'nada', { entries: [] }), 'not_found')
    await expectCode(
      dockerCourse.attempt(actor('ana'), first.id, { entries: 'docker run hello-world' }),
      'invalid_input',
    )
    expect(
      await dockerCourse.attempt(actor('ana'), first.id, { entries: ['docker ps'] }),
    ).toMatchObject({ done: false, stars: 0 })

    const done = await dockerCourse.attempt(actor('ana'), first.id, {
      entries: first.solution,
      activeSeconds: 95,
    })

    expect(done).toMatchObject({ done: true, stars: 3, seconds: null })
    expect((await shellCourse.course(actor('ana'))).stars).toEqual({})

    const times = await community.db.execute(
      "SELECT course, unit, active_seconds FROM course_times WHERE login = 'ana'",
    )

    expect(times.rows).toEqual([
      expect.objectContaining({ course: 'docker', unit: first.id, active_seconds: 95 }),
    ])
  })

  it('las estrellas las pone la API: dos pasos de más, una estrella menos', async () => {
    const { dockerCourse } = services

    await reach(community, 'ana', 'docker-lifecycle')

    const slow = ['docker start cache', 'docker stop legacy', 'docker rm legacy']

    expect(
      await dockerCourse.attempt(actor('ana'), 'docker-lifecycle', { entries: slow, stars: 3 }),
    ).toMatchObject({ done: true, stars: 2, commands: 3 })

    const best = await dockerCourse.attempt(actor('ana'), 'docker-lifecycle', {
      entries: at('docker-lifecycle').unit.solution,
    })

    expect(best.course.best['docker-lifecycle']).toEqual({ commands: 2, seconds: null })
  })

  it('los jefes van contra el reloj de la API y el final da el certificado', async () => {
    const { dockerCourse } = services
    const boss = at('docker-boss-oncall').unit

    await reach(community, 'ana', boss.id)
    await expectCode(
      dockerCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
      'conflict',
    )
    await expectCode(dockerCourse.startBoss(actor('ana'), first.id), 'invalid_input')
    await dockerCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(((boss.limit ?? 0) + 10) * 1000)
    expect(
      await dockerCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({ done: false, misses: ['time'] })
    await dockerCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(30_000)
    expect(
      await dockerCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({ done: true, stars: 3, seconds: 30 })

    await reach(community, 'ana', 'docker-final-beginner')
    await dockerCourse.startBoss(actor('ana'), 'docker-final-beginner')
    community.clock.advance(200_000)

    const final = await dockerCourse.attempt(actor('ana'), 'docker-final-beginner', {
      entries: at('docker-final-beginner').unit.solution,
    })

    expect(final.course.certificates).toEqual([
      { tier: 'beginner', stars: 3, seconds: 200, at: expect.any(String) },
    ])
  }, 30_000)

  it('topes: órdenes largas, intentos enormes y lo que intenta salir del simulador', async () => {
    const { dockerCourse } = services

    await expectCode(
      dockerCourse.attempt(actor('ana'), first.id, { entries: ['x'.repeat(LIMITS.entry + 1)] }),
      'invalid_input',
    )
    await expectCode(
      dockerCourse.attempt(actor('ana'), first.id, {
        entries: Array.from({ length: LIMITS.attemptEntries + 1 }, () => 'docker ps'),
      }),
      'invalid_input',
    )
    expect(
      await dockerCourse.attempt(actor('ana'), first.id, {
        entries: [
          'docker run --privileged -v /:/host alpine:3.20 cat /host/etc/shadow',
          'while true; do docker ps; done',
          ...first.solution,
        ],
      }),
    ).toMatchObject({ done: true })
    expect((await dockerCourse.course(actor('leo'))).stars).toEqual({})
  })
})
