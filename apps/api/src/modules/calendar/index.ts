/**
 * Módulo `calendar`: el calendario personal, con lo de Sanatorio y lo de 42.
 *
 * No tiene tablas: compone lo que saben `help`, `therapy`, `boards` y la agenda
 * de 42 de `replica`.
 */

import type { AppModule } from '../../core/module.js'
import type { BoardsService } from '../boards/index.js'
import type { HelpService } from '../help/index.js'
import type { Agenda, ReplicaRepository } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'
import { registerCalendarRoutes } from './calendar.routes.js'
import { createCalendarService } from './calendar.service.js'
import type { CalendarService } from './calendar.service.js'

type CalendarModuleDeps = {
  replica: ReplicaRepository
  agenda: Agenda
  help: HelpService
  therapy: TherapyService
  boards: BoardsService
}

export type CalendarModule = AppModule & { service: CalendarService }

export function createCalendarModule(deps: CalendarModuleDeps): CalendarModule {
  const service = createCalendarService(deps)

  return {
    name: 'calendar',
    service,
    routes: (app, context) => {
      registerCalendarRoutes(app, context, service)
    },
  }
}

export type { CalendarService } from './calendar.service.js'
