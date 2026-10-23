/**
 * Módulo `staff`: documentos con código de verificación y las cuentas que los
 * comprueban.
 *
 * Las rutas de `/staff/…` piden una sesión de staff, que no es la de la gente:
 * se abre con una clave en `POST /auth/staff` y no sirve para ninguna otra
 * ruta de la web.
 */

import { tableStore } from '../../core/db/data-store.js'
import { idParam } from '../../core/http/params.js'
import type { AppModule } from '../../core/module.js'
import { COMPARE_MAX_CHARS, createStaffService } from './staff.service.js'
import type { StaffService, StaffServiceOptions } from './staff.service.js'

export type StaffModule = AppModule & { service: StaffService }

export function createStaffModule(deps: StaffServiceOptions): StaffModule {
  const service = createStaffService(deps)

  return {
    name: 'staff',
    personal: [
      // El informe es de la persona de la que habla (`login`): quien lo pidió
      // para otra se lleva que lo pidió, no las horas ni el CSV. El `hash` es
      // lo que permite al staff comprobar un documento: no se da.
      {
        table: 'report_exports',
        logins: ['login', 'requested_by'],
        omit: ['hash'],
        give: {
          requested_by: [
            'code',
            'requested_by',
            'period_from',
            'period_to',
            'row_count',
            'created_at',
          ],
        },
      },
      // Quien administra creó la cuenta; el nombre del staff y su clave no son suyos.
      {
        table: 'staff_accounts',
        logins: ['created_by'],
        omit: ['key_hash', 'salt'],
        give: { created_by: ['id', 'created_by', 'created_at', 'revoked_at'] },
      },
    ],
    service,
    stores: [
      tableStore(deps.db, {
        id: 'exports',
        table: 'report_exports',
        login: 'requested_by',
        date: { column: 'created_at', as: 'iso' },
        show: [
          'code',
          'login',
          'requested_by',
          'period_from',
          'period_to',
          'total_minutes',
          'created_at',
        ],
      }),
      tableStore(deps.db, {
        id: 'staff_checks',
        table: 'staff_checks',
        login: 'staff',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'staff', 'code', 'outcome', 'created_at'],
      }),
    ],
    routes: (app, { session }) => {
      // --- Para quien administra ---------------------------------------------
      /** `GET /admin/staff` → las cuentas de staff. */
      app.get('/admin/staff', async (request, reply) => {
        return reply.send(await service.accounts(await session.actor(request)))
      })

      /** `POST /admin/staff` → `{ name }`. Devuelve la cuenta y su clave, una sola vez. */
      app.post('/admin/staff', async (request, reply) => {
        return reply
          .code(201)
          .send(await service.createAccount(await session.actor(request), request.body))
      })

      /** `DELETE /admin/staff/:id` → retira el acceso. 204. */
      app.delete<{ Params: { id: string } }>('/admin/staff/:id', async (request, reply) => {
        await service.revoke(await session.actor(request), idParam(request.params.id, 'La cuenta'))

        return reply.code(204).send()
      })

      // --- Para el staff ------------------------------------------------------
      /** `GET /staff/me` → quién eres. `401` si la cuenta ya no tiene acceso. */
      app.get('/staff/me', async (request, reply) => {
        const staff = session.staff(request)

        if (!(await service.active(staff.id))) {
          return reply.code(401).send({
            error: 'unauthenticated',
            message: 'Esa cuenta de staff ya no tiene acceso',
          })
        }

        return reply.send({ name: staff.name })
      })

      /** `GET /staff/documents/:code` → el documento emitido con ese código. */
      app.get<{ Params: { code: string } }>('/staff/documents/:code', async (request, reply) => {
        return reply.send(await service.document(session.staff(request), request.params.code))
      })

      /** `POST /staff/documents/:code/compare` → `{ content }`: ¿es el mismo fichero? */
      app.post<{ Params: { code: string } }>(
        '/staff/documents/:code/compare',
        // Un año de horas no llega a 100 kB, pero el staff puede subir un
        // fichero cualquiera: se le deja margen y el servicio corta por tamaño.
        { bodyLimit: COMPARE_MAX_CHARS * 4 + 1024 },
        async (request, reply) => {
          return reply.send(
            await service.compare(session.staff(request), request.params.code, request.body),
          )
        },
      )
    },
  }
}

export type { IssuedExport, StaffService } from './staff.service.js'
