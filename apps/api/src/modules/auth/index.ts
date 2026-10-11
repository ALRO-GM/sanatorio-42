/**
 * Módulo `auth`: login con OAuth de 42, cookie de sesión firmada y la
 * resolución de "quién hace esta petición".
 */

import type { Env } from '../../config/env.js'
import type { AppModule } from '../../core/module.js'
import type { SessionReader } from '../../core/session.js'
import type { ApiUser } from '../../integrations/forty-two/types.js'
import type { ProfilesRepository } from '../profile/index.js'
import { registerAuthRoutes } from './auth.routes.js'
import { createAuthService } from './auth.service.js'
import type { AuthService } from './auth.service.js'
import { createOAuthClient } from './oauth-client.js'
import { createSessionReader } from './session.js'

export type AuthModuleDeps = {
  env: Env
  fetchImpl?: typeof fetch
  /** Preferencias de cada persona: de ahí sale el campus que está mirando. */
  profiles: ProfilesRepository
  /**
   * Se llama con el perfil de `/v2/me` al terminar el login. Devuelve el campus
   * principal, que se guarda en la cookie.
   */
  onLogin: (profile: ApiUser) => Promise<{ campusId: number }>
  /** Aviso de actividad, para que la sincronización sepa que hay alguien mirando. */
  onActivity?: () => void
  /** Permisos y bloqueos del panel de administración. */
  access?: (
    login: string,
  ) => Promise<{ admin: boolean; block: { reason: string; until: string | null } | null }>
}

export type AuthModule = AppModule & {
  service: AuthService
  session: SessionReader
}

export function createAuthModule(deps: AuthModuleDeps): AuthModule {
  const { env } = deps

  const oauth = createOAuthClient({
    authorizeUrl: `${env.FORTY_TWO_API_BASE}/oauth/authorize`,
    tokenUrl: env.FORTY_TWO_TOKEN_URL,
    clientId: env.FORTY_TWO_UID,
    clientSecret: env.FORTY_TWO_SECRET,
    redirectUri: env.FORTY_TWO_REDIRECT_URI,
    userAgent: env.FORTY_TWO_USER_AGENT,
    scopes: env.oauthScopes,
    fetchImpl: deps.fetchImpl ?? fetch,
  })

  const service = createAuthService({
    oauth,
    secret: env.SESSION_SECRET,
    frontendUrl: env.FRONTEND_URL,
    onLogin: deps.onLogin,
  })

  const session = createSessionReader({
    auth: service,
    profiles: deps.profiles,
    defaultCampusId: env.DEFAULT_CAMPUS_ID,
    adminLogins: env.adminLogins,
    ...(deps.access === undefined ? {} : { access: deps.access }),
    ...(deps.onActivity === undefined ? {} : { onActivity: deps.onActivity }),
  })

  return {
    name: 'auth',
    service,
    session,
    routes: (app) => {
      registerAuthRoutes(app, { auth: service, frontendUrl: env.FRONTEND_URL })
    },
  }
}

export type { AuthService } from './auth.service.js'
