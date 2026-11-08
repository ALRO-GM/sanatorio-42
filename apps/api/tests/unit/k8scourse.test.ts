/**
 * Curso de Kubernetes (API): el mismo servicio que el de shell y el de Docker,
 * con el motor de Kubernetes y sus tablas. Va en orden, vuelve a ejecutar las
 * órdenes, guarda la mejor vez, cronometra los jefes con su reloj, da el
 * certificado de nivel y apunta el tiempo activo como curso `k8s`. No se
 * mezcla con los otros.
 */
import { LIMITS, UNITS } from '@sanatorio/k8ssim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const at = (id: string) => {
  const index = UNITS.findIndex((unit) => unit.id === id)
  const unit = UNITS[index]

  if (unit === undefined) throw new Error(`falta ${id}`)

  return { unit, index }
}

const first = at('k8s-hola').unit

async function reach(community: Community, login: string, id: string): Promise<void> {
  const { k8sCourse } = community.services

  for (const unit of UNITS.slice(0, at(id).index)) {
    if (unit.limit !== undefined) await k8sCourse.startBoss(actor(login), unit.id)

    const result = await k8sCourse.attempt(actor(login), unit.id, { entries: unit.solution })

    expect(result.done, unit.id).toBe(true)
  }
}

describe('curso de Kubernetes', () => {
  const community = useCommunity()
  let services: Community['services']

  beforeEach(() => {
    ;({ services } = community)
  })

  it('empieza vacío, va en orden, vuelve a ejecutar y no se mezcla con el de Docker', async () => {
    const { k8sCourse, dockerCourse } = services
    const second = at('k8s-pods').unit

    expect(await k8sCourse.course(actor('ana'))).toEqual({
      stars: {},
      best: {},
      runs: {},
      certificates: [],
    })
    await expectCode(
      k8sCourse.attempt(actor('ana'), second.id, { entries: second.solution }),
      'conflict',
    )
    await expectCode(k8sCourse.attempt(actor('ana'), 'nada', { entries: [] }), 'not_found')
    await expectCode(
      k8sCourse.attempt(actor('ana'), first.id, { entries: 'kubectl get nodes' }),
      'invalid_input',
    )
    expect(
      await k8sCourse.attempt(actor('ana'), first.id, { entries: ['kubectl get nodes -o name'] }),
    ).toMatchObject({
      done: false,
      stars: 0,
    })

    const done = await k8sCourse.attempt(actor('ana'), first.id, {
      entries: first.solution,
      activeSeconds: 80,
    })

    expect(done).toMatchObject({ done: true, stars: 3, seconds: null })
    expect((await dockerCourse.course(actor('ana'))).stars).toEqual({})

    const times = await community.db.execute(
      "SELECT course, unit, active_seconds FROM course_times WHERE login = 'ana'",
    )

    expect(times.rows).toEqual([
      expect.objectContaining({ course: 'k8s', unit: first.id, active_seconds: 80 }),
    ])
  })

  it('las estrellas las pone la API: un paso de más, una estrella menos', async () => {
    const { k8sCourse } = services

    await reach(community, 'ana', 'k8s-pods')

    const slow = [
      'kubectl run web --image=nginx:1.27',
      'kubectl label pod prueba borrar=si',
      'kubectl delete pod prueba',
    ]

    expect(
      await k8sCourse.attempt(actor('ana'), 'k8s-pods', { entries: slow, stars: 3 }),
    ).toMatchObject({
      done: true,
      stars: 2,
      commands: 3,
    })

    const best = await k8sCourse.attempt(actor('ana'), 'k8s-pods', {
      entries: at('k8s-pods').unit.solution,
    })

    expect(best.course.best['k8s-pods']).toEqual({ commands: 2, seconds: null })
  })

  it('los jefes van contra el reloj de la API y el final da el certificado', async () => {
    const { k8sCourse } = services
    const boss = at('k8s-jefe-primer-dia').unit

    await reach(community, 'ana', boss.id)
    await expectCode(
      k8sCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
      'conflict',
    )
    await expectCode(k8sCourse.startBoss(actor('ana'), first.id), 'invalid_input')
    await k8sCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(((boss.limit ?? 0) + 10) * 1000)
    expect(
      await k8sCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({
      done: false,
      misses: ['time'],
    })
    await k8sCourse.startBoss(actor('ana'), boss.id)
    community.clock.advance(30_000)
    expect(
      await k8sCourse.attempt(actor('ana'), boss.id, { entries: boss.solution }),
    ).toMatchObject({
      done: true,
      stars: 3,
      seconds: 30,
    })

    await reach(community, 'ana', 'k8s-final-principiante')
    await k8sCourse.startBoss(actor('ana'), 'k8s-final-principiante')
    community.clock.advance(300_000)

    const final = await k8sCourse.attempt(actor('ana'), 'k8s-final-principiante', {
      entries: at('k8s-final-principiante').unit.solution,
    })

    expect(final.course.certificates).toEqual([
      { tier: 'beginner', stars: 3, seconds: 300, at: expect.any(String) },
    ])
  }, 60_000)

  it('topes: órdenes largas, intentos enormes y lo que intenta salir del simulador', async () => {
    const { k8sCourse } = services

    await expectCode(
      k8sCourse.attempt(actor('ana'), first.id, { entries: ['x'.repeat(LIMITS.entry + 1)] }),
      'invalid_input',
    )
    await expectCode(
      k8sCourse.attempt(actor('ana'), first.id, {
        entries: Array.from({ length: LIMITS.attemptEntries + 1 }, () => 'kubectl get pods'),
      }),
      'invalid_input',
    )
    expect(
      await k8sCourse.attempt(actor('ana'), first.id, {
        entries: [
          'kubectl run x --image=alpine --overrides=\'{"spec":{"hostPID":true}}\' -- cat /etc/shadow',
          'kubectl apply -f https://example.com/malo.yaml',
          'while true; do kubectl get pods; done',
          ...first.solution,
        ],
      }),
    ).toMatchObject({ done: true })
    expect((await k8sCourse.course(actor('leo'))).stars).toEqual({})
  })
})
