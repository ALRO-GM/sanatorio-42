/**
 * Curso de git: solo desde un puesto del clúster, en orden, y la API vuelve a
 * ejecutar los comandos antes de dar el punto (con la mejor vez guardada).
 */
import { LEVELS } from '@sanatorio/gitsim'
import { beforeEach, describe, expect, it } from 'vitest'

import { CONCEPTS_BY_WORLD } from '../../src/modules/gitcourse/gates.js'
import { toText } from '../../src/core/db/rows.js'
import { BANK } from '../../src/modules/quiz/bank/index.js'
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

    expect(await gitCourse.course(actor('ana'))).toEqual({ seat: null, stars: {}, gates: {} })
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
      course: { seat: 'c1r2s3', stars: {}, gates: {} },
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

describe('curso de git: test previo a una prueba de grupo', () => {
  const community = useCommunity()

  it('hace falta el mundo; 100 % para pasar; si se falla, una hora de espera', async () => {
    const { services, seat, clock, db } = community
    const { gitCourse } = services
    const answersOf = async () => {
      const result = await db.execute({
        sql: "SELECT rounds FROM git_gates WHERE login = 'ana' AND gate = 'group1'",
        args: [],
      })

      return (JSON.parse(toText(result.rows[0]?.rounds)) as { answer: number }[]).map(
        (round) => round.answer,
      )
    }

    await seat({ ana: 'c1r2s3' })
    await expectCode(gitCourse.startGate(actor('ana'), 'group1'), 'conflict')
    await expectCode(gitCourse.startGate(actor('ana'), 'nada'), 'not_found')
    for (const level of LEVELS.slice(0, LEVELS.findIndex((each) => each.id === 'w1-world') + 1)) {
      await gitCourse.attempt(actor('ana'), level.id, { lines: level.solution })
    }

    const quiz = await gitCourse.startGate(actor('ana'), 'group1')

    expect(quiz.questions).toHaveLength(8)
    expect(JSON.stringify(quiz)).not.toMatch(/"answer"/)
    // Volver a empezar a mitad da las mismas preguntas.
    expect(await gitCourse.startGate(actor('ana'), 'group1')).toEqual(quiz)

    // Una mal: suspenso, al Repaso, y una hora sin poder repetir.
    const right = await answersOf()
    const failed = await gitCourse.answerGate(actor('ana'), 'group1', {
      answers: right.map((answer, index) => (index === 0 ? (answer + 1) % 4 : answer)),
    })

    expect(failed).toMatchObject({ passed: false, right: 7, total: 8 })
    expect(failed.course.gates.group1).toMatchObject({ passed: false })
    expect(failed.course.gates.group1?.retryAt).not.toBeNull()
    expect((await services.quiz.review(actor('ana'))).length).toBeGreaterThan(0)
    await expectCode(gitCourse.startGate(actor('ana'), 'group1'), 'rate_limited')
    await expectCode(gitCourse.answerGate(actor('ana'), 'group1', { answers: [] }), 'conflict')

    // Dejarlo caducar también cuenta como fallo.
    clock.advance(3_600_001)
    await gitCourse.startGate(actor('ana'), 'group1')
    clock.advance(8 * 20_000 + 1)
    expect((await gitCourse.course(actor('ana'))).gates.group1?.retryAt).not.toBeNull()
    await expectCode(gitCourse.startGate(actor('ana'), 'group1'), 'rate_limited')

    // Todo bien y a tiempo: aprobado, para siempre.
    clock.advance(3_600_001)
    await gitCourse.startGate(actor('ana'), 'group1')

    const passed = await gitCourse.answerGate(actor('ana'), 'group1', {
      answers: await answersOf(),
    })

    expect(passed).toMatchObject({ passed: true, right: 8 })
    expect(passed.course.gates.group1).toEqual({ passed: true, retryAt: null })
    await expectCode(gitCourse.startGate(actor('ana'), 'group1'), 'conflict')
  })

  it('cada concepto del test está en el banco', () => {
    for (const ids of Object.values(CONCEPTS_BY_WORLD)) {
      for (const id of ids)
        expect(
          BANK.some((concept) => concept.id === id),
          id,
        ).toBe(true)
    }
  })
})
