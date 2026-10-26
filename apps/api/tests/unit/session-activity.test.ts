/**
 * Qué cuenta como alguien usando la web: lo que decide si la copia de 42 puede
 * entrar en su modo noche (`modules/replica/budget.ts`).
 */

import type { FastifyRequest } from 'fastify'
import { describe, expect, it } from 'vitest'

import { SESSION_COOKIE_NAME } from '../../src/core/http/cookies.js'
import type { AuthService } from '../../src/modules/auth/auth.service.js'
import { createSessionReader } from '../../src/modules/auth/session.js'
import type { ProfilesRepository } from '../../src/modules/profile/index.js'

function reader(onActivity: () => void) {
  const auth = {
    currentUser: () => ({
      id: 1,
      login: 'ana',
      name: 'Ana',
      image: null,
      campusId: 22,
      role: 'student',
    }),
  } as unknown as AuthService

  return createSessionReader({
    auth,
    profiles: {} as ProfilesRepository,
    defaultCampusId: 22,
    adminLogins: [],
    onActivity,
  })
}

const request = (headers: Record<string, string>) =>
  ({ headers: { cookie: `${SESSION_COOKIE_NAME}=x`, ...headers } }) as unknown as FastifyRequest

describe('actividad de la web', () => {
  it('una petición normal cuenta; la de una pestaña quieta (`x-idle`), no', () => {
    let seen = 0
    const sessions = reader(() => {
      seen += 1
    })

    sessions.user(request({}))
    expect(seen).toBe(1)

    // Una pestaña olvidada que se refresca sola: no impide el modo noche.
    expect(sessions.user(request({ 'x-idle': '1' })).login).toBe('ana')
    expect(seen).toBe(1)
  })
})
