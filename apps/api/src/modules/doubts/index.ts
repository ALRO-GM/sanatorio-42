/**
 * Módulo `doubts`: el tablón de dudas (post-its por proyecto) y la guía corta
 * que mantienen quienes ya lo aprobaron.
 */

import type { Db } from '../../core/db/database.js'
import type { Notify } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { XpService } from '../profile/index.js'
import type { Curriculum, ReplicaRepository } from '../replica/index.js'
import { createDoubtsRepository } from './doubts.repository.js'
import { createGuideChangesRepository } from './guide-changes.repository.js'
import { registerDoubtsRoutes } from './doubts.routes.js'
import { createDoubtsService } from './doubts.service.js'
import type { DoubtsService, DoubtsServiceOptions } from './doubts.service.js'
import { given } from '../../core/options.js'

type DoubtsModuleDeps = {
  db: Db
  replica: ReplicaRepository
  curriculum: Curriculum
  xp: XpService
  notify?: Notify
  /** Las correcciones copiadas de 42, para el grafo de correcciones. */
  corrections?: DoubtsServiceOptions['corrections']
  now?: () => number
}

export type DoubtsModule = AppModule & { service: DoubtsService }

export function createDoubtsModule(deps: DoubtsModuleDeps): DoubtsModule {
  const service = createDoubtsService({
    doubts: createDoubtsRepository(deps.db),
    changes: createGuideChangesRepository(deps.db),
    curriculum: deps.curriculum,
    xp: deps.xp,
    replica: deps.replica,
    ...given({ notify: deps.notify, corrections: deps.corrections, now: deps.now }),
  })

  return {
    name: 'doubts',
    personal: [
      { table: 'doubts', logins: ['author'] },
      { table: 'doubt_answers', logins: ['author'] },
      { table: 'guides', logins: ['updated_by'] },
      { table: 'guide_proposals', logins: ['author'] },
      // Quien validó un cambio se lleva que lo validó; el texto es de quien lo propuso.
      {
        table: 'guide_changes',
        logins: ['proposer', 'validator'],
        give: {
          validator: [
            'id',
            'campus_id',
            'project_id',
            'section',
            'validator',
            'accepted_at',
            'revoked_at',
          ],
        },
      },
      { table: 'guide_change_flags', logins: ['login'] },
      { table: 'guide_strikes', logins: ['login'] },
    ],
    service,
    routes: (app, context) => {
      registerDoubtsRoutes(app, context, service)
    },
  }
}

export type { DoubtsService } from './doubts.service.js'
