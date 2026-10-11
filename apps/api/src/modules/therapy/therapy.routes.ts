/**
 * Rutas de las terapias de grupo.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { TherapyService } from './therapy.service.js'

export function registerTherapyRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  therapy: TherapyService,
): void {
  /** `GET /groups` → grupos abiertos del campus. Con `?project=`, los de ese proyecto. */
  app.get<{ Querystring: { project?: string } }>('/groups', async (request, reply) => {
    const actor = await session.actor(request)
    const project = request.query.project

    return reply.send(
      await therapy.list(
        actor,
        project === undefined ? undefined : idParam(project, 'El proyecto'),
      ),
    )
  })

  /** `POST /groups` → abre un grupo. */
  app.post('/groups', async (request, reply) => {
    return reply.code(201).send(await therapy.create(await session.actor(request), request.body))
  })

  /** `PUT /groups/:id` → cambia el grupo. Solo quien lo abrió, o quien modera. */
  app.put<IdParams>('/groups/:id', async (request, reply) => {
    return reply.send(
      await therapy.update(
        await session.actor(request),
        idParam(request.params.id, 'El grupo'),
        request.body,
      ),
    )
  })

  app.post<IdParams>('/groups/:id/join', async (request, reply) => {
    await therapy.join(await session.actor(request), idParam(request.params.id, 'El grupo'))

    return reply.code(204).send()
  })

  app.delete<IdParams>('/groups/:id/join', async (request, reply) => {
    await therapy.leave(await session.actor(request), idParam(request.params.id, 'El grupo'))

    return reply.code(204).send()
  })

  /** `DELETE /groups/:id` → cierra el grupo. Solo quien lo abrió, o quien modera. */
  app.delete<IdParams>('/groups/:id', async (request, reply) => {
    await therapy.close(await session.actor(request), idParam(request.params.id, 'El grupo'))

    return reply.code(204).send()
  })
}
