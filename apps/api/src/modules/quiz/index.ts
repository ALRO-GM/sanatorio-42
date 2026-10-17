/**
 * Módulo `quiz`: Not-games, partidas de preguntas de programación entre
 * estudiantes. Duelo, equipos, todos contra todos y supervivencia, con las
 * preguntas de lo que saben los que juegan.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { BANK } from './bank/index.js'
import { createQuizRepository } from './quiz.repository.js'
import { registerQuizRoutes } from './quiz.routes.js'
import { createQuizService } from './quiz.service.js'
import type { QuizService } from './quiz.service.js'

type QuizModuleDeps = {
  db: Db
  circlesOf: (logins: readonly string[]) => Promise<Map<string, number>>
  imagesOf: (logins: readonly string[]) => Promise<Map<string, string | null>>
  now?: () => number
  random?: () => number
}

export type QuizModule = AppModule & { service: QuizService }

export function createQuizModule(deps: QuizModuleDeps): QuizModule {
  const service = createQuizService({
    quiz: createQuizRepository(deps.db),
    bank: BANK,
    circlesOf: deps.circlesOf,
    imagesOf: deps.imagesOf,
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.random === undefined ? {} : { random: deps.random }),
  })

  return {
    name: 'quiz',
    personal: [
      { table: 'quiz_rooms', logins: ['host'] },
      { table: 'quiz_players', logins: ['login'] },
      { table: 'quiz_answers', logins: ['login'] },
      { table: 'game_results', logins: ['login'] },
    ],
    service,
    routes: (app, context) => {
      registerQuizRoutes(app, context, service)
    },
    jobs: [
      {
        name: 'limpieza de salas de Not-games',
        everyMs: 3_600_000,
        run: async () => {
          await service.prune()
        },
      },
    ],
  }
}

export type { QuizService } from './quiz.service.js'
