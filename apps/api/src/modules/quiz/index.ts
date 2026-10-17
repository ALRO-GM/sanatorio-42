/**
 * Módulo `quiz`: Not-games, partidas de preguntas de programación entre
 * estudiantes. Duelo, equipos, todos contra todos y supervivencia, con las
 * preguntas de lo que saben los que juegan.
 */

import type { Db } from '../../core/db/database.js'
import type { AppModule } from '../../core/module.js'
import { BANK } from './bank/index.js'
import { createChessService, openTurnRoomsOf } from './games/index.js'
import type { ChessService } from './games/index.js'
import { registerTurnRoutes } from './games/turns.routes.js'
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

export type QuizModule = AppModule & { service: QuizService; chess: ChessService }

export function createQuizModule(deps: QuizModuleDeps): QuizModule {
  const quiz = createQuizRepository(deps.db)
  const clock = {
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.random === undefined ? {} : { random: deps.random }),
  }
  const service = createQuizService({
    quiz,
    bank: BANK,
    circlesOf: deps.circlesOf,
    imagesOf: deps.imagesOf,
    busyElsewhere: async (login) => (await openTurnRoomsOf(deps.db)(login)).length > 0,
    ...clock,
  })
  const chess = createChessService({
    db: deps.db,
    quiz,
    bank: BANK,
    circlesOf: deps.circlesOf,
    imagesOf: deps.imagesOf,
    ...clock,
  })

  return {
    name: 'quiz',
    personal: [
      { table: 'quiz_rooms', logins: ['host'] },
      { table: 'quiz_players', logins: ['login'] },
      { table: 'quiz_answers', logins: ['login'] },
      { table: 'game_results', logins: ['login'] },
      { table: 'turn_rooms', logins: ['host'] },
      { table: 'turn_players', logins: ['login'] },
    ],
    service,
    chess,
    routes: (app, context) => {
      registerQuizRoutes(app, context, service)
      registerTurnRoutes(app, context, chess)
    },
    jobs: [
      {
        name: 'limpieza de salas de Not-games',
        everyMs: 3_600_000,
        run: async () => {
          await service.prune()
          await chess.prune()
        },
      },
    ],
  }
}

export type { QuizService } from './quiz.service.js'
