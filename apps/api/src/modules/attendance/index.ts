/**
 * Módulo `attendance`: asistencia validada con códigos y el tiempo que sale de
 * ella. No tiene rutas: las de asistencia las pone `meet`, que sabe quién
 * participa en cada evento.
 */

import type { AppModule } from '../../core/module.js'
import { createAttendanceService } from './attendance.service.js'
import type { AttendanceService, AttendanceServiceOptions } from './attendance.service.js'

export type AttendanceModule = AppModule & { service: AttendanceService }

export function createAttendanceModule(deps: AttendanceServiceOptions): AttendanceModule {
  const service = createAttendanceService(deps)

  return {
    name: 'attendance',
    service,
    jobs: [
      {
        name: 'borrado de intentos de códigos antiguos',
        everyMs: 24 * 60 * 60_000,
        run: async () => {
          await service.purge()
        },
      },
    ],
  }
}

export { closed } from './attendance.rules.js'
export { EVENT_ID } from './attendance.service.js'
export type { AttendanceEvent, AttendanceService } from './attendance.service.js'
