/**
 * Curso de git: solo desde un puesto del clúster, en orden, y la API vuelve a
 * ejecutar los comandos antes de dar el punto (con la mejor vez guardada).
 */
import { LEVELS } from '@sanatorio/gitsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const [first, second] = LEVELS

describe('curso de git', () => {
  const community = useCommunity()
  let services: Community['services']
  let seat: Community['seat']

  beforeEach(() => {
    ;({ services, seat } = community)
  })

  it('sin puesto en el clúster no se juega', async () => {
    const { gitCourse } = services

    expect(await gitCourse.course(actor('ana'))).toEqual({ seat: null, stars: {} })
    await expectCode(
      gitCourse.attempt(actor('ana'), first?.id ?? '', { lines: first?.solution ?? [] }),
      'forbidden',
    )
  })

  it('re-ejecuta los comandos, va en orden y guarda la mejor vez', async () => {
    const { gitCourse } = services

    if (first === undefined || second === undefined) throw new Error('faltan niveles')
    await seat({ ana: 'c1r2s3' })
    await expectCode(
      gitCourse.attempt(actor('ana'), second.id, { lines: second.solution }),
      'conflict',
    )
    await expectCode(gitCourse.attempt(actor('ana'), 'nada', { lines: [] }), 'not_found')
    await expectCode(
      gitCourse.attempt(actor('ana'), first.id, { lines: 'git commit' }),
      'invalid_input',
    )

    // Sin hacer lo que se pide no hay punto.
    expect(
      await gitCourse.attempt(actor('ana'), first.id, { lines: ['git commit'] }),
    ).toMatchObject({
      done: false,
      stars: 0,
      misses: ['main'],
      course: { seat: 'c1r2s3', stars: {} },
    })

    const slow = ['git commit', 'git branch x', 'git branch -D x', 'git commit']
    const better = await gitCourse.attempt(actor('ana'), first.id, { lines: slow })

    expect(better).toMatchObject({ done: true, stars: 2 })
    expect(
      (await gitCourse.attempt(actor('ana'), first.id, { lines: first.solution })).course.stars,
    ).toEqual({ [first.id]: 3 })
    // Una vez peor no quita lo conseguido.
    expect((await gitCourse.attempt(actor('ana'), first.id, { lines: slow })).course.stars).toEqual(
      { [first.id]: 3 },
    )
    expect(
      (await gitCourse.attempt(actor('ana'), second.id, { lines: second.solution })).done,
    ).toBe(true)
  })
})
