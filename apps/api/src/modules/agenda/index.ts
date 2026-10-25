/**
 * Módulo `agenda`: un Scrum individual alrededor de los proyectos del cursus
 * (`docs/agenda.md`). Metas con checkpoints, dailies y weeklies elegidos de
 * listas, y el tablero de cada sprint para su grupo.
 */

import type { FastifyInstance } from 'fastify'

import type { Db } from '../../core/db/database.js'
import { idParam } from '../../core/http/params.js'
import type { AppModule, RouteContext } from '../../core/module.js'
import { createAgendaRepository } from './agenda.repository.js'
import { createAgendaService } from './agenda.service.js'
import type { AgendaService, AgendaServiceOptions } from './agenda.service.js'

type GoalParams = { Params: { id: string } }
type CheckpointParams = { Params: { id: string; checkpoint: string } }

export type AgendaModule = AppModule & { service: AgendaService }

function registerAgendaRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  agenda: AgendaService,
): void {
  const goalOf = (raw: string): number => idParam(raw, 'La meta')
  const checkpointOf = (raw: string): number => idParam(raw, 'El checkpoint')

  /** `GET /agenda` → tus metas, los proyectos que puedes elegir y lo de 42 a lo que vas. */
  app.get('/agenda', async (request, reply) => {
    return reply.send(await agenda.view(await session.actor(request)))
  })

  /** `POST /agenda/goals` → pone una meta; `201` con ella. */
  app.post('/agenda/goals', async (request, reply) => {
    return reply.code(201).send(await agenda.create(await session.actor(request), request.body))
  })

  /** `PUT /agenda/goals/:id` → cambia el día, el avance, la nota o el estado. */
  app.put<GoalParams>('/agenda/goals/:id', async (request, reply) => {
    return reply.send(
      await agenda.update(await session.actor(request), goalOf(request.params.id), request.body),
    )
  })

  /** `DELETE /agenda/goals/:id` → la borra con todo lo suyo. `204`. */
  app.delete<GoalParams>('/agenda/goals/:id', async (request, reply) => {
    await agenda.remove(await session.actor(request), goalOf(request.params.id))

    return reply.code(204).send()
  })

  /** `POST /agenda/goals/:id/checkpoints` → `{ key }` o `{ text }`; devuelve la meta. */
  app.post<GoalParams>('/agenda/goals/:id/checkpoints', async (request, reply) => {
    return reply
      .code(201)
      .send(
        await agenda.addCheckpoint(
          await session.actor(request),
          goalOf(request.params.id),
          request.body,
        ),
      )
  })

  /** `PUT /agenda/goals/:id/checkpoints/:checkpoint` → `{ done }`; devuelve la meta. */
  app.put<CheckpointParams>('/agenda/goals/:id/checkpoints/:checkpoint', async (request, reply) => {
    return reply.send(
      await agenda.markCheckpoint(
        await session.actor(request),
        goalOf(request.params.id),
        checkpointOf(request.params.checkpoint),
        request.body,
      ),
    )
  })

  /** `DELETE /agenda/goals/:id/checkpoints/:checkpoint` → lo quita; devuelve la meta. */
  app.delete<CheckpointParams>(
    '/agenda/goals/:id/checkpoints/:checkpoint',
    async (request, reply) => {
      return reply.send(
        await agenda.removeCheckpoint(
          await session.actor(request),
          goalOf(request.params.id),
          checkpointOf(request.params.checkpoint),
        ),
      )
    },
  )

  /** `POST /agenda/goals/:id/entries` → apunta o reescribe un daily o weekly; devuelve la meta. */
  app.post<GoalParams>('/agenda/goals/:id/entries', async (request, reply) => {
    return reply.send(
      await agenda.saveEntry(await session.actor(request), goalOf(request.params.id), request.body),
    )
  })

  /** `GET /agenda/sprints/:id` → el tablero del sprint. Solo quien está dentro. */
  app.get<GoalParams>('/agenda/sprints/:id', async (request, reply) => {
    return reply.send(
      await agenda.board(await session.actor(request), idParam(request.params.id, 'El sprint')),
    )
  })
}

export function createAgendaModule(
  deps: Omit<AgendaServiceOptions, 'repository'> & { db: Db },
): AgendaModule {
  const { db, ...rest } = deps
  const service = createAgendaService({ ...rest, repository: createAgendaRepository(db) })

  return {
    name: 'agenda',
    personal: [
      { table: 'scrum_goals', logins: ['login'] },
      { table: 'scrum_checkpoints', logins: ['login'] },
      { table: 'scrum_entries', logins: ['login'] },
    ],
    service,
    routes: (app, context) => {
      registerAgendaRoutes(app, context, service)
    },
  }
}
