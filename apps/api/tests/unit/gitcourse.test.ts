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

describe('curso de git: pruebas de grupo', () => {
  const community = useCommunity()
  const pass = async (...logins: string[]) => {
    for (const login of logins) {
      await community.db.execute({
        sql: "INSERT INTO git_gates (login, gate, passed_at) VALUES (?, 'group1', '2026-10-06T10:00:00.000Z')",
        args: [login],
      })
    }
  }

  it('hace falta puesto y el test; empieza quien creó la sala con el mínimo', async () => {
    const { services, seat } = community
    const { rooms } = services.gitCourse

    await expectCode(rooms.create(actor('ana'), { gate: 'group1' }), 'forbidden')
    await seat({ ana: 'c1r1s1', bea: 'c1r1s2', dani: 'c1r1s3' })
    await expectCode(rooms.create(actor('ana'), { gate: 'group1' }), 'conflict')
    await expectCode(rooms.create(actor('ana'), { gate: 'nada' }), 'not_found')
    await pass('ana', 'bea')

    const room = await rooms.create(actor('ana'), { gate: 'group1' })

    expect(room).toMatchObject({ status: 'lobby', host: 'ana', mine: null })
    await expectCode(rooms.create(actor('ana'), { gate: 'group1' }), 'conflict')
    await expectCode(rooms.start(actor('ana'), room.id), 'conflict')
    expect((await rooms.view(actor('dani'), room.id)).whyNot).toMatch(/test/)
    await expectCode(rooms.join(actor('dani'), room.id), 'conflict')
    expect((await rooms.list(actor('bea'), 'group1')).map((each) => each.id)).toEqual([room.id])

    await rooms.join(actor('bea'), room.id)
    await expectCode(rooms.start(actor('bea'), room.id), 'forbidden')

    const started = await rooms.start(actor('ana'), room.id)

    expect(started.status).toBe('playing')
    expect(started.mine?.repo.head).toEqual({ kind: 'branch', name: 'main' })
    expect(started.missions.every((each) => !each.done)).toBe(true)
    await expectCode(rooms.run(actor('dani'), room.id, { line: 'git status' }), 'forbidden')
  })

  it('cada cual en su repositorio con el mismo origin: al cumplir la misión, superada', async () => {
    const { services, seat } = community
    const { rooms } = services.gitCourse

    await seat({ ana: 'c1r1s1', bea: 'c1r1s2' })
    await pass('ana', 'bea')

    const { id } = await rooms.create(actor('ana'), { gate: 'group1' })

    await rooms.join(actor('bea'), id)
    await rooms.start(actor('ana'), id)

    const play = async (login: string, ...lines: string[]) => {
      for (const line of lines) {
        const result = await rooms.run(actor(login), id, { line })

        if (!result.ok) throw new Error(`${login}: ${line}: ${result.output.join(' / ')}`)
      }
    }

    for (const login of ['ana', 'bea']) {
      await play(
        login,
        `git switch -c ${login}`,
        `echo hola > ${login}.txt`,
        `git add ${login}.txt`,
        'git commit -m "Mio"',
        `git push origin ${login}`,
      )
    }

    // Un error no cambia nada, pero se ve.
    const wrong = await rooms.run(actor('bea'), id, { line: 'git merge nada' })

    expect(wrong.ok).toBe(false)
    expect(wrong.room.players.find((p) => p.login === 'bea')?.last).toBe('git merge nada')

    // Levantarse del puesto: no se juega.
    await seat({ ana: 'c1r1s1' })
    await expectCode(rooms.run(actor('bea'), id, { line: 'git status' }), 'forbidden')

    await play(
      'ana',
      'git switch main',
      'git fetch',
      'git merge origin/ana',
      'git merge origin/bea',
    )

    const last = await rooms.run(actor('ana'), id, { line: 'git push' })

    expect(last.room).toMatchObject({ status: 'done', result: 'passed' })
    expect((await services.gitCourse.course(actor('bea'))).stars.group1).toBe(3)
  })

  it('si se acaba el tiempo, se cierra sin superarla; salir deja la sala a otra persona', async () => {
    const { services, seat, clock } = community
    const { rooms } = services.gitCourse

    await seat({ ana: 'c1r1s1', bea: 'c1r1s2' })
    await pass('ana', 'bea')

    const { id } = await rooms.create(actor('ana'), { gate: 'group1' })

    await rooms.join(actor('bea'), id)
    await rooms.leave(actor('ana'), id)
    expect((await rooms.view(actor('bea'), id)).host).toBe('bea')
    await rooms.join(actor('ana'), id)
    await rooms.start(actor('bea'), id)
    clock.advance(61 * 60_000)
    expect(await rooms.view(actor('ana'), id)).toMatchObject({ status: 'done', result: 'expired' })
    await expectCode(rooms.run(actor('ana'), id, { line: 'git status' }), 'conflict')

    await rooms.leave(actor('ana'), id)
    await rooms.leave(actor('bea'), id)
    await expectCode(rooms.view(actor('ana'), id), 'not_found')
  })
})
