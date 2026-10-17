/**
 * Módulo `facility`: avisos al staff de problemas del edificio o de los
 * ordenadores (#77 del buzón).
 */

import type { Db } from '../../core/db/database.js'
import { idParam } from '../../core/http/params.js'
import type { IdParams } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import { createFacilityService } from './facility.service.js'
import type { FacilityService } from './facility.service.js'

type FacilityDeps = {
  db: Db
  seatOf: (campusId: number, login: string) => Promise<string | null>
  slack?: ((text: string) => Promise<void>) | null
  /** Si una cuenta de staff sigue teniendo acceso. */
  staffActive: (id: number) => Promise<boolean>
  now?: () => number
}

export type FacilityModule = AppModule & { service: FacilityService }

export function createFacilityModule(deps: FacilityDeps): FacilityModule {
  const service = createFacilityService({
    db: deps.db,
    seatOf: deps.seatOf,
    slack: deps.slack ?? null,
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })
  const report = (id: string): number => idParam(id, 'El aviso')

  return {
    name: 'facility',
    personal: [{ table: 'facility_reports', logins: ['login', 'resolved_by'] }],
    service,
    routes: (app, { session }) => {
      /** `POST /facility/reports` → `FacilityReportInput`: avisa al staff de un problema. 201. */
      app.post('/facility/reports', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.report(await session.actor(request), request.body))
      })

      /** `GET /admin/facility` → los avisos del campus (abiertos y los resueltos esta semana). */
      app.get('/admin/facility', async (request, reply) => {
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.forAdmin(await session.actor(request)))
      })

      /** `POST /admin/facility/:id/resolve` → lo da por resuelto. 204. */
      app.post<IdParams>('/admin/facility/:id/resolve', async (request, reply) => {
        await service.resolveAsAdmin(await session.actor(request), report(request.params.id))

        return reply.code(204).send()
      })

      /** `GET /staff/facility` → los avisos de todos los campus, para el staff. */
      app.get('/staff/facility', async (request, reply) => {
        const staff = session.staff(request)

        if (!(await deps.staffActive(staff.id))) {
          return reply
            .code(401)
            .send({ error: 'unauthenticated', message: 'Esa cuenta de staff ya no tiene acceso' })
        }
        reply.header('Cache-Control', 'private, no-store')

        return reply.send(await service.forStaff())
      })

      /** `POST /staff/facility/:id/resolve` → el staff lo da por resuelto. 204. */
      app.post<IdParams>('/staff/facility/:id/resolve', async (request, reply) => {
        const staff = session.staff(request)

        if (!(await deps.staffActive(staff.id))) {
          return reply
            .code(401)
            .send({ error: 'unauthenticated', message: 'Esa cuenta de staff ya no tiene acceso' })
        }
        await service.resolveAsStaff(staff.name, report(request.params.id))

        return reply.code(204).send()
      })
    },
  }
}
