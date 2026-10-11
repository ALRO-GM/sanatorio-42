/**
 * Rutas del tablón de dudas y de la guía de cada proyecto.
 */

import type { FastifyInstance } from 'fastify'

import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { RouteContext } from '../../core/module.js'
import type { DoubtsService } from './doubts.service.js'

export function registerDoubtsRoutes(
  app: FastifyInstance,
  { session }: RouteContext,
  doubts: DoubtsService,
): void {
  /**
   * `GET /doubts/graph` → el common core por círculos, con el estado de quien
   * pregunta en cada proyecto y dónde hace falta una mano.
   */
  app.get('/doubts/graph', async (request, reply) => {
    return reply.send(await doubts.graph(await session.actor(request), session.user(request).id))
  })

  /** `GET /projects/:id/doubts` → guía, propuestas y post-its del proyecto. */
  app.get<IdParams>('/projects/:id/doubts', async (request, reply) => {
    return reply.send(
      await doubts.board(await session.actor(request), idParam(request.params.id, 'El proyecto')),
    )
  })

  /** `POST /projects/:id/doubts` → pega un post-it. */
  app.post<IdParams>('/projects/:id/doubts', async (request, reply) => {
    return reply
      .code(201)
      .send(
        await doubts.create(
          await session.actor(request),
          idParam(request.params.id, 'El proyecto'),
          request.body,
        ),
      )
  })

  /** `GET /doubts/:id` → la duda con sus respuestas. */
  app.get<IdParams>('/doubts/:id', async (request, reply) => {
    return reply.send(
      await doubts.detail(await session.actor(request), idParam(request.params.id, 'La duda')),
    )
  })

  /** `PUT /doubts/:id` → `{ body }`. Cambia el texto. Solo quien la puso, y si no está resuelta. */
  app.put<IdParams>('/doubts/:id', async (request, reply) => {
    return reply.send(
      await doubts.update(
        await session.actor(request),
        idParam(request.params.id, 'La duda'),
        request.body,
      ),
    )
  })

  /** `POST /doubts/:id/answers` → responde. Devuelve todas las respuestas. */
  app.post<IdParams>('/doubts/:id/answers', async (request, reply) => {
    return reply
      .code(201)
      .send(
        await doubts.answer(
          await session.actor(request),
          idParam(request.params.id, 'La duda'),
          request.body,
        ),
      )
  })

  /**
   * `PUT /doubts/:id/resolved` → `{ resolved: true, answerId }` para darla por
   * resuelta con esa respuesta, o `{ resolved: false }` para reabrirla. Solo
   * quien la puso.
   */
  app.put<IdParams>('/doubts/:id/resolved', async (request, reply) => {
    await doubts.setResolved(
      await session.actor(request),
      idParam(request.params.id, 'La duda'),
      request.body,
    )

    return reply.code(204).send()
  })

  app.delete<IdParams>('/doubts/:id', async (request, reply) => {
    await doubts.remove(await session.actor(request), idParam(request.params.id, 'La duda'))

    return reply.code(204).send()
  })

  /** `PUT /projects/:id/guide` → reescribe la guía. Solo especialistas. */
  app.put<IdParams>('/projects/:id/guide', async (request, reply) => {
    return reply.send(
      await doubts.saveGuide(
        await session.actor(request),
        idParam(request.params.id, 'El proyecto'),
        request.body,
      ),
    )
  })

  /** `POST /projects/:id/guide/proposals` → `{ section, body }`. Cualquiera. */
  app.post<IdParams>('/projects/:id/guide/proposals', async (request, reply) => {
    await doubts.propose(
      await session.actor(request),
      idParam(request.params.id, 'El proyecto'),
      request.body,
    )

    return reply.code(204).send()
  })

  /** `POST /guide-proposals/:id/accept` y `…/reject`. Solo especialistas. */
  for (const decision of ['accept', 'reject'] as const) {
    app.post<IdParams>(`/guide-proposals/:id/${decision}`, async (request, reply) => {
      await doubts.reviewProposal(
        await session.actor(request),
        idParam(request.params.id, 'La propuesta'),
        decision === 'accept',
      )

      return reply.code(204).send()
    })
  }

  /**
   * `POST /guide-changes/:id/flag` → señala un cambio ya validado como
   * desacertado. Devuelve `{ revoked }`: `true` si con esta señal se ha retirado.
   */
  app.post<IdParams>('/guide-changes/:id/flag', async (request, reply) => {
    return reply.send({
      revoked: await doubts.flagChange(
        await session.actor(request),
        idParam(request.params.id, 'El cambio'),
      ),
    })
  })
}
