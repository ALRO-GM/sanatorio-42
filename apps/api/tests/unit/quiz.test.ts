/**
 * Not-games: las reglas (quién recibe qué, dificultad, orden de respuestas,
 * puntos) y la partida entera en cada modo, con el reloj de mentira.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import type { QuizRoom } from '@sanatorio/contracts'

import type { Concept } from '../../src/modules/quiz/bank/types.js'
import {
  fits,
  languagesOf,
  levelOf,
  orderFor,
  pickConcepts,
  pointsFor,
  seeded,
} from '../../src/modules/quiz/quiz.rules.js'
import { COUNTDOWN_MS, REVEAL_MS } from '../../src/modules/quiz/quiz.service.js'
import { actor, expectCode, MADRID, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'
import { projectUser } from '../helpers/fixtures.js'

const concept = (id: string, needs: Concept['needs'], level: Concept['level'] = 2): Concept => ({
  id,
  topic: 't',
  needs,
  kind: 'quick',
  level,
  forms: [{ ask: ['¿Pregunta?'], right: ['Sí'] }],
  wrong: ['No', 'Quizá', 'Nunca'],
  why: 'Porque sí, y es largo.',
})

describe('reglas de Not-games', () => {
  it('cada cual recibe lo que ha estudiado: no Python a quien solo hizo C', () => {
    const cOnly = { slugs: new Set(['42cursus-libft']) }
    const python = { slugs: new Set(['42cursus-libft', 'python-module-00']) }

    expect([...languagesOf(python.slugs)].sort()).toEqual(['c', 'python'])
    expect(fits(concept('g', {}), cOnly)).toBe(true)
    expect(fits(concept('py', { lang: 'python' }), cOnly)).toBe(false)
    expect(fits(concept('py', { lang: 'python' }), python)).toBe(true)
    expect(fits(concept('lib', { projects: ['42cursus-libft'] }), cOnly)).toBe(true)
    expect(fits(concept('shell', { projects: ['42cursus-minishell'] }), cOnly)).toBe(false)
    // Sin ningún proyecto (recién llegado) solo le sale lo general.
    expect(fits(concept('c', { lang: 'c' }), { slugs: new Set() })).toBe(false)
  })

  it('en grupo solo sale lo que les vale a todos, o solo lo general', () => {
    const bank = [concept('g', {}), concept('c', { lang: 'c' }), concept('py', { lang: 'python' })]
    const people = [
      { slugs: new Set(['42cursus-libft']) },
      { slugs: new Set(['python-module-00', '42cursus-libft']) },
    ]
    const base = { kinds: 'mixed', difficulty: 'rising', levels: new Map(), count: 10 } as const
    const ids = (pool: 'common' | 'general') =>
      pickConcepts(bank, people, { ...base, pool }, seeded(1))
        .map((c) => c.id)
        .sort()

    expect(ids('common')).toEqual(['c', 'g'])
    expect(ids('general')).toEqual(['g'])
  })

  it('la dificultad sigue a lo que falla la gente, sin dar saltos con pocas respuestas', () => {
    expect(levelOf(2, 5, 5)).toBe(2)
    expect(levelOf(2, 19, 19)).toBe(2)
    expect(levelOf(2, 200, 2)).toBe(1)
    expect(levelOf(2, 200, 190)).toBe(5)
    expect(levelOf(1, 200, 90)).toBe(3)
  })

  it('en «de fácil a difícil» las preguntas van subiendo; si escasea un nivel, se completa', () => {
    const bank = [1, 5, 3, 2, 4].map((level) => concept(`n${level}`, {}, level as Concept['level']))
    const picked = pickConcepts(
      bank,
      [{ slugs: new Set() }],
      { pool: 'general', kinds: 'mixed', difficulty: 'rising', levels: new Map(), count: 5 },
      seeded(3),
    )

    expect(picked.map((c) => c.level)).toEqual([1, 2, 3, 4, 5])
    const hard = pickConcepts(
      bank,
      [{ slugs: new Set() }],
      { pool: 'general', kinds: 'mixed', difficulty: 'hard', levels: new Map(), count: 3 },
      seeded(3),
    )

    expect(
      hard
        .map((c) => c.level)
        .slice(0, 2)
        .sort(),
    ).toEqual([4, 5])
    expect(hard).toHaveLength(3)
  })

  it('cada persona ve las respuestas en su orden, y siempre el mismo', () => {
    const ana = orderFor('1:0:ana', 4)

    expect([...ana].sort()).toEqual([0, 1, 2, 3])
    expect(orderFor('1:0:ana', 4)).toEqual(ana)
    const others = ['leo', 'eva', 'uma', 'sol', 'teo'].map((login) =>
      orderFor(`1:0:${login}`, 4).join(),
    )

    expect(new Set([ana.join(), ...others]).size).toBeGreaterThan(1)
  })

  it('acertar suma; fallar solo resta en la versión competitiva', () => {
    expect(pointsFor(true, false)).toBe(1)
    expect(pointsFor(false, false)).toBe(0)
    expect(pointsFor(false, true)).toBe(-1)
    expect(pointsFor(null, true)).toBe(0)
  })
})

describe('partidas de Not-games', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Community['db']

  beforeEach(async () => {
    ;({ services, clock, db } = community)
    // Todos han tocado C (Libft); `uma` además Python.
    await services.repositories.replica.ingestProjectUsers(
      ['ana', 'leo', 'eva', 'uma', 'sol'].map((login) =>
        projectUser(login, {
          projectId: 20,
          projectName: 'Libft',
          slug: '42cursus-libft',
          status: 'finished',
        }),
      ),
      MADRID,
    )
  })

  /** La respuesta buena de la pregunta de ahora, leída de la base. */
  const rightOf = async (room: QuizRoom): Promise<number> => {
    const row = await db.execute({
      sql: 'SELECT answer FROM quiz_rounds WHERE room_id = ? AND idx = ?',
      args: [room.id, room.question?.index ?? 0],
    })

    return Number(row.rows[0]?.answer)
  }
  /** Una mala de la pregunta de ahora. */
  const wrongOf = async (room: QuizRoom): Promise<number> => ((await rightOf(room)) + 1) % 4

  /** Deja pasar la cuenta atrás de la primera pregunta. */
  const begin = async (id: number, as = 'ana'): Promise<QuizRoom> => {
    clock.advance(COUNTDOWN_MS)

    return services.quiz.view(actor(as), id)
  }

  /** Deja que se acabe el tiempo de la pregunta de ahora y pasa justo a la siguiente. */
  const nextQuestion = async (room: QuizRoom): Promise<QuizRoom> => {
    const endsAt = Date.parse(room.question?.endsAt ?? room.now)

    // El margen para respuestas tardías (1 s) y lo que se enseña la respuesta.
    clock.advance(endsAt + 1_000 + REVEAL_MS - clock.now())

    return services.quiz.view(actor('ana'), room.id)
  }

  it('duelo: dos personas, la buena no llega hasta revelar y gana quien más acierta', async () => {
    const { quiz } = services
    const created = await quiz.create(actor('ana'), { mode: 'duel', pool: 'general', questions: 5 })

    expect(created).toMatchObject({ status: 'lobby', host: 'ana', joinable: true })
    await expectCode(quiz.start(actor('ana'), created.id), 'conflict')
    await quiz.join(actor('leo'), created.id, {})
    // Un duelo es de dos: la tercera no entra.
    expect((await quiz.view(actor('eva'), created.id)).joinable).toBe(false)
    await expectCode(quiz.join(actor('eva'), created.id, {}), 'conflict')
    await expectCode(quiz.start(actor('leo'), created.id), 'forbidden')

    const started = await quiz.start(actor('ana'), created.id)

    expect(started.status).toBe('playing')
    // Cuenta atrás: aún no se ve la pregunta ni se puede contestar.
    expect(started.question).toMatchObject({ prompt: '', options: [] })
    await expectCode(quiz.answer(actor('ana'), created.id, { question: 0, option: 0 }), 'conflict')

    let room = await begin(created.id)

    expect(room.question?.options).toHaveLength(4)
    expect(room.question?.answer).toBeNull()
    expect(JSON.stringify(room)).not.toContain('"why":"')

    for (let index = 0; index < 5; index++) {
      const right = await rightOf(room)

      await quiz.answer(actor('ana'), created.id, { question: index, option: right })
      room = await quiz.answer(actor('leo'), created.id, {
        question: index,
        option: await wrongOf(room),
      })
      // Contestaron los dos: se revela ya, sin esperar al tiempo.
      expect(room.phase).toBe('reveal')
      expect(room.question?.answer).toBe(right)
      expect(room.question?.results).toEqual(
        expect.arrayContaining([
          { login: 'ana', correct: true },
          { login: 'leo', correct: false },
        ]),
      )
      // No se contesta dos veces.
      await expectCode(
        quiz.answer(actor('ana'), created.id, { question: index, option: right }),
        'conflict',
      )
      clock.advance(REVEAL_MS)
      room = await quiz.view(actor('ana'), created.id)
    }

    expect(room.status).toBe('done')
    expect(room.winners).toEqual(['ana'])
    expect(room.players.find((p) => p.login === 'ana')).toMatchObject({ score: 5, correct: 5 })
  })

  it('competitivo: fallar resta; no contestar, no', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), {
      mode: 'ffa',
      competitive: true,
      pool: 'general',
      questions: 5,
    })

    await quiz.join(actor('leo'), id, {})
    await quiz.start(actor('ana'), id)

    const room = await begin(id)

    await quiz.answer(actor('ana'), id, { question: 0, option: await wrongOf(room) })
    // leo no contesta: se acaba el tiempo.
    const after = await nextQuestion(room)

    expect(after.players.find((p) => p.login === 'ana')?.score).toBe(-1)
    expect(after.players.find((p) => p.login === 'leo')?.score).toBe(0)
    expect(after.question?.index).toBe(1)
  })

  it('equipos: cada cual en el suyo, y gana el equipo que más suma', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'teams', pool: 'general', questions: 5 })

    await quiz.join(actor('leo'), id, { team: 'a' })
    await expectCode(quiz.start(actor('ana'), id), 'conflict')
    await quiz.join(actor('eva'), id, { team: 'b' })
    // Sin decir equipo, al que tenga menos gente.
    await quiz.join(actor('uma'), id, {})
    expect((await quiz.view(actor('ana'), id)).players.find((p) => p.login === 'uma')?.team).toBe(
      'b',
    )
    await quiz.start(actor('ana'), id)

    let room = await begin(id)

    for (let index = 0; index < 5; index++) {
      const right = await rightOf(room)

      for (const login of ['ana', 'leo'])
        await quiz.answer(actor(login), id, { question: index, option: right })
      for (const login of ['eva', 'uma'])
        await quiz.answer(actor(login), id, { question: index, option: await wrongOf(room) })
      clock.advance(REVEAL_MS)
      room = await quiz.view(actor('ana'), id)
    }

    expect(room.winners).toEqual(['a'])
  })

  it('supervivencia: tres vidas, no contestar también quita, y gana quien queda', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), {
      mode: 'survival',
      pool: 'general',
      questions: 10,
      competitive: true,
    })

    expect((await quiz.view(actor('ana'), id)).settings.competitive).toBe(false)
    await expectCode(quiz.start(actor('ana'), id), 'conflict')
    await quiz.join(actor('leo'), id, {})
    await quiz.start(actor('ana'), id)

    let room = await begin(id)

    expect(room.players.every((p) => p.lives === 3)).toBe(true)
    // leo falla una y deja pasar dos: fuera. ana acierta las tres.
    for (let index = 0; index < 3; index++) {
      await quiz.answer(actor('ana'), id, { question: index, option: await rightOf(room) })
      if (index === 0) {
        // Contestan los dos: se revela al momento.
        await quiz.answer(actor('leo'), id, { question: index, option: await wrongOf(room) })
        clock.advance(REVEAL_MS)
        room = await quiz.view(actor('ana'), id)
      } else {
        room = await nextQuestion(room)
      }
    }

    expect(room.players.find((p) => p.login === 'leo')).toMatchObject({ lives: 0, out: true })
    expect(room.status).toBe('done')
    expect(room.winners).toEqual(['ana'])
  })

  it('el círculo mínimo deja fuera a quien no llega, y nadie está en dos salas', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general', minCircle: 3 })
    const view = await quiz.view(actor('leo'), id)

    expect(view.joinable).toBe(false)
    expect(view.whyNot).toMatch(/círculo 3/)
    await expectCode(quiz.join(actor('leo'), id, {}), 'conflict')
    await expectCode(quiz.create(actor('ana'), { mode: 'duel' }), 'conflict')
  })

  it('una sola persona puede practicar en todos contra todos', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('sol'), { mode: 'ffa', pool: 'general', questions: 5 })
    const started = await quiz.start(actor('sol'), id)

    expect(started.status).toBe('playing')
  })

  it('sin preguntas que valgan a todos, no empieza; con lo general, sí', async () => {
    const { quiz } = services
    // `pis` no tiene ningún proyecto: solo le vale lo general.
    const { id } = await quiz.create(actor('ana'), {
      mode: 'ffa',
      pool: 'common',
      kinds: 'long',
      difficulty: 'hard',
      questions: 5,
    })

    await quiz.join(actor('pis'), id, {})
    const started = await quiz.start(actor('ana'), id)

    // Lo largo y general basta, porque se completa con los niveles cercanos.
    expect(started.status).toBe('playing')
  })

  it('validación y permisos: ajustes raros, salas que no existen, respuestas imposibles', async () => {
    const { quiz } = services

    await expectCode(quiz.create(actor('ana'), { mode: 'póker' }), 'invalid_input')
    await expectCode(quiz.create(actor('ana'), { mode: 'ffa', questions: 2 }), 'invalid_input')
    await expectCode(quiz.create(actor('ana'), { mode: 'ffa', questions: 1000 }), 'invalid_input')
    await expectCode(quiz.view(actor('ana'), 999), 'not_found')

    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general', questions: 50 })

    // Fuera de supervivencia, como mucho treinta.
    expect((await quiz.view(actor('ana'), id)).settings.questions).toBe(30)
    await quiz.start(actor('ana'), id)
    await begin(id)
    await expectCode(quiz.answer(actor('ana'), id, { question: 0, option: 7 }), 'invalid_input')
    await expectCode(quiz.answer(actor('ana'), id, { question: 0, option: -1 }), 'invalid_input')
    await expectCode(quiz.answer(actor('ana'), id, { question: 3, option: 0 }), 'conflict')
    await expectCode(quiz.answer(actor('leo'), id, { question: 0, option: 0 }), 'forbidden')
  })

  it('si se va quien creó la sala, pasa a la siguiente; si se queda vacía, se borra', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general' })

    await quiz.join(actor('leo'), id, {})
    await quiz.leave(actor('ana'), id)
    expect(await quiz.view(actor('leo'), id)).toMatchObject({
      host: 'leo',
      players: [{ login: 'leo' }],
    })

    await quiz.leave(actor('leo'), id)
    await expectCode(quiz.view(actor('leo'), id), 'not_found')
    // Salir de una sala en la que no estás no hace nada (ni rompe).
    const other = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general' })

    await expect(quiz.leave(actor('leo'), other.id)).resolves.toBeUndefined()
    expect((await quiz.view(actor('ana'), other.id)).players).toHaveLength(1)
  })

  it('jugando, quien sale se va de la sala y puede entrar en otra; la partida sigue', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general', questions: 5 })

    await quiz.join(actor('leo'), id, {})
    await quiz.join(actor('eva'), id, {})
    await quiz.start(actor('ana'), id)
    await quiz.leave(actor('leo'), id)

    const room = await quiz.view(actor('ana'), id)

    expect(room.players.map((p) => p.login)).toEqual(['ana', 'eva'])
    expect(room.status).toBe('playing')
    await expect(
      quiz.create(actor('leo'), { mode: 'ffa', pool: 'general' }),
    ).resolves.toMatchObject({ host: 'leo' })
  })

  it('un duelo acaba si se va uno, y el resultado queda guardado', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'duel', pool: 'general', questions: 5 })

    await quiz.join(actor('leo'), id, {})
    await quiz.start(actor('ana'), id)
    await quiz.leave(actor('leo'), id)

    expect(await quiz.view(actor('ana'), id)).toMatchObject({ status: 'done', winners: ['ana'] })

    const results = await db.execute('SELECT game, mode, login, won FROM game_results')

    expect(results.rows).toEqual([
      expect.objectContaining({ game: 'quiz', mode: 'duel', login: 'ana', won: 1 }),
    ])

    // Acabada, en cuanto se va la última, se borra.
    await quiz.leave(actor('ana'), id)
    await expectCode(quiz.view(actor('ana'), id), 'not_found')
  })

  it('en equipos, si un equipo se queda sin nadie, la partida acaba', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'teams', pool: 'general', questions: 5 })

    await quiz.join(actor('leo'), id, { team: 'b' })
    await quiz.join(actor('eva'), id, { team: 'a' })
    await quiz.start(actor('ana'), id)
    await quiz.leave(actor('leo'), id)

    expect((await quiz.view(actor('ana'), id)).status).toBe('done')
  })

  it('el Repaso guarda lo que fallas, con definición y ejemplo, y lo marca superado al acertarlo', async () => {
    const { quiz } = services

    expect(await quiz.review(actor('ana'))).toEqual([])

    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general', questions: 5 })

    await quiz.start(actor('ana'), id)
    let room = await begin(id)
    const conceptOf = async (index: number): Promise<string> => {
      const row = await db.execute({
        sql: 'SELECT concept_id FROM quiz_rounds WHERE room_id = ? AND idx = ?',
        args: [id, index],
      })
      const value = row.rows[0]?.concept_id

      return typeof value === 'string' ? value : ''
    }
    const missed = await conceptOf(0)

    await quiz.answer(actor('ana'), id, { question: 0, option: await wrongOf(room) })

    const review = await quiz.review(actor('ana'))

    expect(review).toEqual([
      expect.objectContaining({ conceptId: missed, misses: 1, mastered: false }),
    ])
    expect(review[0]?.definition.length).toBeGreaterThan(40)
    expect(review[0]?.example.length).toBeGreaterThan(5)
    // A otra persona no le sale.
    expect(await quiz.review(actor('leo'))).toEqual([])

    // Acertarlo después lo marca como superado (sigue a la vista, abajo).
    await db.execute({
      sql: `UPDATE quiz_misses SET last_right_at = ? WHERE login = 'ana'`,
      args: [new Date(clock.now() + 1000).toISOString()],
    })
    expect((await quiz.review(actor('ana')))[0]?.mastered).toBe(true)
    room = await quiz.view(actor('ana'), id)
    expect(room.status).toBe('playing')
  })

  it('la lista enseña las salas abiertas del campus y las tuyas', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'duel', pool: 'general' })

    expect(await quiz.list(actor('leo'))).toEqual([
      expect.objectContaining({ id, host: 'ana', players: 1, joined: false }),
    ])
    expect((await quiz.list(actor('ana')))[0]).toMatchObject({ joined: true })
  })

  it('lo que falla la gente queda apuntado por concepto', async () => {
    const { quiz } = services
    const { id } = await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general', questions: 5 })

    await quiz.start(actor('ana'), id)
    const room = await begin(id)

    await quiz.answer(actor('ana'), id, { question: 0, option: await wrongOf(room) })
    const stats = await db.execute('SELECT shown, wrong FROM quiz_stats')

    expect(stats.rows.map((row) => [Number(row.shown), Number(row.wrong)])).toEqual([[1, 1]])
  })

  it('borra las salas que nadie empezó en dos horas', async () => {
    const { quiz } = services

    await quiz.create(actor('ana'), { mode: 'ffa', pool: 'general' })
    clock.advance(3 * 3_600_000)
    expect(await quiz.prune()).toBe(1)
    expect(await quiz.list(actor('ana'))).toEqual([])
  })
})
