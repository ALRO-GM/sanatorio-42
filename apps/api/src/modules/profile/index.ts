/**
 * Módulo `profile`: el expediente. XP, niveles, títulos, logros, reacciones y
 * las preferencias de cada persona (campus que mira, idioma).
 *
 * Otros módulos reparten XP a través de `xp.award`; las reglas (cuánto vale
 * cada cosa) están en `xp.rules.ts`.
 */

import type { Db } from '../../core/db/database.js'
import type { EventBus } from '../../core/events.js'
import type { AppModule } from '../../core/module.js'
import type { Curriculum, ReplicaRepository } from '../replica/index.js'
import { registerProfileRoutes } from './profile.routes.js'
import { createProfilesRepository } from './profiles.repository.js'
import type { ProfilesRepository } from './profiles.repository.js'
import { createXpRepository } from './xp.repository.js'
import { createXpService } from './xp.service.js'
import type { XpService, XpServiceOptions } from './xp.service.js'

export type ProfileModuleDeps = {
  db: Db
  replica: ReplicaRepository
  curriculum: Curriculum
  events: EventBus
  hacker?: XpServiceOptions['hacker']
  master?: XpServiceOptions['master']
  now?: () => number
}

export type ProfileModule = AppModule & {
  xp: XpService
  profiles: ProfilesRepository
}

export function createProfileModule(deps: ProfileModuleDeps): ProfileModule {
  const profiles = createProfilesRepository(deps.db)
  const xp = createXpService({
    xp: createXpRepository(deps.db),
    profiles,
    replica: deps.replica,
    curriculum: deps.curriculum,
    ...(deps.hacker === undefined ? {} : { hacker: deps.hacker }),
    ...(deps.master === undefined ? {} : { master: deps.master }),
    ...(deps.now === undefined ? {} : { now: deps.now }),
  })

  deps.events.on('duty.started', ({ login }) => xp.markFirstDuty(login))

  return {
    name: 'profile',
    personal: [
      { table: 'profiles', logins: ['login'] },
      { table: 'xp_events', logins: ['login'] },
      { table: 'reactions', logins: ['from_login', 'to_login'] },
      { table: 'pace_refs', logins: ['login'] },
    ],
    xp,
    profiles,
    routes: (app, context) => {
      registerProfileRoutes(app, context, { xp, events: deps.events })
    },
  }
}

export { XP_AMOUNT, XP_KIND } from './xp.rules.js'
export type { ProfilesRepository } from './profiles.repository.js'
export type { XpService } from './xp.service.js'

export { MASTER_AT } from './xp.service.js'
