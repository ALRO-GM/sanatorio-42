/**
 * El test previo a cada prueba de grupo del curso de git: ocho preguntas
 * rápidas del banco de Not-games, de los mundos que se llevan hechos, y hay que
 * acertarlas todas. Si se falla (o se acaba el plazo), no se puede repetir
 * hasta una hora después; mientras, lo fallado está en el Repaso.
 *
 * Empezar otra vez a mitad de un test devuelve las mismas preguntas, y dejarlo
 * caducar cuenta como fallo: así no se pueden ir mirando preguntas gratis.
 */

import type { GitGateQuiz, GitGateResult, GitGateState } from '@sanatorio/contracts'
import { gateOf, LEVELS } from '@sanatorio/gitsim'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import { isoAt } from '../../core/time.js'

/** Lo que el banco de preguntas monta de un concepto (ver `modules/quiz`). */
export type GateRound = {
  conceptId: string
  prompt: string
  code: string | null
  options: string[]
  answer: number
  why: string
}

export type GateQuestions = {
  roundOf: (conceptId: string, random: () => number) => GateRound | null
  remember: (login: string, conceptId: string, correct: boolean, at: string) => Promise<void>
  /** La pregunta en el idioma de quien la mira; sin esto, tal como se montó. */
  localize?: <T extends GateRound>(round: T, lang: Lang) => T
}

type Lang = 'es' | 'en'

/** Los conceptos del banco que enseña cada mundo del curso. */
export const CONCEPTS_BY_WORLD: Readonly<Record<number, readonly string[]>> = {
  0: ['git-commit', 'git-status', 'gen-git-add'],
  1: [
    'git-branch-what',
    'git-head',
    'git-switch-c',
    'git-fast-forward',
    'git-merge-commit',
    'git-branch-delete',
  ],
  2: ['git-clone', 'git-fetch', 'git-tracking', 'git-push-rejected', 'gen-git-push'],
  3: ['git-rebase', 'git-cherry-pick', 'git-amend', 'git-relative'],
  4: ['git-reset', 'git-revert', 'git-stash', 'gen-git-conflict'],
  5: ['git-github-flow', 'git-gitflow', 'git-tag', 'git-trunk'],
}

const QUESTIONS = 8
const SECONDS_EACH = 20
const RETRY_MS = 3_600_000

const answerSchema = z.object({
  answers: z.array(z.number().int().min(0).max(9).nullable()).max(QUESTIONS),
})

const orNull = (value: unknown): string | null => (value === null ? null : toText(value))

type Stored = {
  rounds: GateRound[] | null
  deadline: string | null
  passedAt: string | null
  failedAt: string | null
}

export function createGateRepository(db: Db) {
  return {
    async all(login: string): Promise<Map<string, Stored>> {
      const result = await db.execute({
        sql: 'SELECT * FROM git_gates WHERE login = ?',
        args: [login],
      })

      return new Map(
        result.rows.map((row) => {
          const rounds = orNull(row.rounds)

          return [
            toText(row.gate),
            {
              rounds: rounds === null ? null : (JSON.parse(rounds) as GateRound[]),
              deadline: orNull(row.deadline),
              passedAt: orNull(row.passed_at),
              failedAt: orNull(row.failed_at),
            },
          ]
        }),
      )
    },

    async save(login: string, gate: string, state: Stored): Promise<void> {
      await db.execute({
        sql: `INSERT INTO git_gates (login, gate, rounds, deadline, passed_at, failed_at)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT (login, gate) DO UPDATE SET rounds = excluded.rounds,
                deadline = excluded.deadline, passed_at = excluded.passed_at,
                failed_at = excluded.failed_at`,
        args: [
          login,
          gate,
          state.rounds === null ? null : JSON.stringify(state.rounds),
          state.deadline,
          state.passedAt,
          state.failedAt,
        ],
      })
    },
  }
}

type GateRepository = ReturnType<typeof createGateRepository>

/** Baraja (Fisher-Yates) con el azar que se le dé. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))

    ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
  }

  return copy
}

export function createGateService(deps: {
  gates: GateRepository
  questions: GateQuestions
  now: () => number
  random: () => number
}) {
  const retryOf = (state: Stored): string | null => {
    if (state.passedAt !== null || state.failedAt === null) return null

    const at = Date.parse(state.failedAt) + RETRY_MS

    return at > deps.now() ? isoAt(at) : null
  }
  const shown = (rounds: readonly GateRound[], lang: Lang): GateRound[] =>
    rounds.map((round) => deps.questions.localize?.(round, lang) ?? round)
  const quizOf = (gate: string, state: Stored, lang: Lang): GitGateQuiz => ({
    gate,
    questions: shown(state.rounds ?? [], lang).map(({ prompt, code, options }) => ({
      prompt,
      code,
      options,
    })),
    deadline: state.deadline ?? isoAt(deps.now()),
  })

  /** Un test empezado cuyo plazo pasó sin contestar cuenta como fallado. */
  async function settle(login: string, gate: string, state: Stored): Promise<Stored> {
    if (state.rounds === null || state.deadline === null || Date.parse(state.deadline) > deps.now())
      return state

    const failed = { ...state, rounds: null, deadline: null, failedAt: state.deadline }

    await deps.gates.save(login, gate, failed)

    return failed
  }

  return {
    async states(login: string): Promise<Record<string, GitGateState>> {
      const all = await deps.gates.all(login)
      const states: Record<string, GitGateState> = {}

      for (const [gate, stored] of all) {
        const state = await settle(login, gate, stored)

        states[gate] = { passed: state.passedAt !== null, retryAt: retryOf(state) }
      }

      return states
    },

    async start(
      login: string,
      id: string,
      stars: Record<string, number>,
      lang: Lang = 'es',
    ): Promise<GitGateQuiz> {
      const gate = gateOf(id)

      if (gate === undefined) throw domainError('not_found', 'Esa prueba no existe')
      if (stars[gate.after] === undefined) {
        const title = LEVELS.find((level) => level.id === gate.after)?.title ?? gate.after

        throw domainError('conflict', `Antes tienes que superar «${title}»`)
      }

      const before = (await deps.gates.all(login)).get(id)
      const state =
        before === undefined
          ? { rounds: null, deadline: null, passedAt: null, failedAt: null }
          : await settle(login, id, before)

      if (state.passedAt !== null) throw domainError('conflict', 'Este test ya lo pasaste')
      if (state.rounds !== null) return quizOf(id, state, lang)

      const retry = retryOf(state)

      if (retry !== null) {
        throw domainError('rate_limited', 'Hasta una hora después de fallarlo no se puede repetir')
      }

      const pool = Array.from({ length: gate.upTo + 1 }, (_, world) => [
        ...(CONCEPTS_BY_WORLD[world] ?? []),
      ]).flat()
      const rounds = shuffled(pool, deps.random)
        .slice(0, QUESTIONS)
        .map((conceptId) => deps.questions.roundOf(conceptId, deps.random))
        .filter((round) => round !== null)
      const started: Stored = {
        ...state,
        rounds,
        deadline: isoAt(deps.now() + rounds.length * SECONDS_EACH * 1000),
      }

      await deps.gates.save(login, id, started)

      return quizOf(id, started, lang)
    },

    async answer(
      login: string,
      id: string,
      input: unknown,
      lang: Lang = 'es',
    ): Promise<Omit<GitGateResult, 'course'>> {
      const { answers } = parse(answerSchema, input)
      const stored = (await deps.gates.all(login)).get(id)
      const rounds = stored?.rounds ?? null
      const deadline = stored?.deadline ?? null

      if (rounds === null || deadline === null) {
        throw domainError('conflict', 'No hay ningún test empezado')
      }

      const late = Date.parse(deadline) < deps.now()
      const at = isoAt(deps.now())
      const review = shown(rounds, lang).map((round, index) => ({
        prompt: round.prompt,
        code: round.code,
        options: round.options,
        answer: round.answer,
        chosen: answers[index] ?? null,
        why: round.why,
      }))
      const right = review.filter((each) => each.chosen === each.answer).length
      const passed = !late && right === rounds.length

      for (const [index, round] of rounds.entries()) {
        await deps.questions.remember(
          login,
          round.conceptId,
          review[index]?.chosen === round.answer,
          at,
        )
      }
      await deps.gates.save(login, id, {
        rounds: null,
        deadline: null,
        passedAt: passed ? at : null,
        failedAt: passed ? (stored?.failedAt ?? null) : late ? deadline : at,
      })

      return { passed, right, total: rounds.length, review }
    },
  }
}

export type GateService = ReturnType<typeof createGateService>
