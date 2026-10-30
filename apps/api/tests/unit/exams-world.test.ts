import { describe, expect, it } from 'vitest'

import type { Actor } from '../../src/core/actor.js'
import type { SessionUser } from '../../src/core/session.js'
import { liveWorld } from '../../src/modules/exams/index.js'

/**
 * El examen en vivo de estudiantes o de piscineros (`docs/piscineros.md`): solo
 * la vista sin límites del dueño elige con `?world=`; a los demás no les cambia.
 */

const POOL_ACTOR: Actor = { login: 'albrodri', campusId: 22, admin: false, pool: true }
const user = (extra: Partial<SessionUser>): SessionUser => ({
  id: 1,
  login: 'albrodri',
  name: null,
  image: null,
  campusId: 22,
  role: 'pool',
  ...extra,
})

describe('de qué mundo es el examen en vivo', () => {
  it('sin límites, el que se pide', () => {
    const full = user({ preview: true, unrestricted: true })

    expect(liveWorld(full, { world: 'student' }, POOL_ACTOR).pool).toBe(false)
    expect(liveWorld(full, { world: 'pool' }, POOL_ACTOR).pool).toBe(true)
    expect(liveWorld(full, { world: 'otro' }, POOL_ACTOR)).toBe(POOL_ACTOR)
    expect(liveWorld(full, undefined, POOL_ACTOR)).toBe(POOL_ACTOR)
  })

  it('a cualquier otro (piscinero, vista normal, estudiante) no le cambia nada', () => {
    const student: Actor = { login: 'jdoe', campusId: 22, admin: false }

    expect(liveWorld(user({}), { world: 'student' }, POOL_ACTOR)).toBe(POOL_ACTOR)
    expect(liveWorld(user({ preview: true }), { world: 'student' }, POOL_ACTOR)).toBe(POOL_ACTOR)
    expect(liveWorld(user({ login: 'jdoe', role: 'student' }), { world: 'pool' }, student)).toBe(
      student,
    )
  })
})
