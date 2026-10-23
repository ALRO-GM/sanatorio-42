/**
 * Módulo `attendance`: asistencia validada con códigos y el tiempo que sale de
 * ella. No tiene rutas: las de asistencia las pone `meet`, que sabe quién
 * participa en cada evento.
 */

import { tableStore } from '../../core/db/data-store.js'
import type { AppModule } from '../../core/module.js'
import { createAttendanceService } from './attendance.service.js'
import type { AttendanceService, AttendanceServiceOptions } from './attendance.service.js'

export type AttendanceModule = AppModule & { service: AttendanceService }

export function createAttendanceModule(deps: AttendanceServiceOptions): AttendanceModule {
  const service = createAttendanceService(deps)

  return {
    name: 'attendance',
    personal: [
      // Quien organizó se lleva que hubo asistencia a su evento, no quién ni a
      // qué hora: eso es de cada asistente.
      {
        table: 'event_attendance',
        logins: ['login', 'host'],
        give: { host: ['event_id', 'host', 'campus_id', 'title', 'starts_at', 'ends_at'] },
      },
      // El código escrito es el del evento: con él se validaría a otra persona.
      { table: 'event_checkins', logins: ['login'], omit: ['code'] },
    ],
    service,
    stores: [
      tableStore(deps.db, {
        id: 'checkins',
        table: 'event_checkins',
        login: 'login',
        date: { column: 'created_at', as: 'iso' },
        show: ['id', 'event_id', 'login', 'phase', 'outcome', 'created_at'],
      }),
    ],
  }
}

export { closed } from './attendance.rules.js'
export { EVENT_ID } from './attendance.service.js'
export type { AttendanceEvent, AttendanceService } from './attendance.service.js'
