/**
 * Tests del bus de eventos entre módulos.
 */

import { describe, expect, it } from 'vitest'

import { createEventBus } from '../../src/core/events.js'

describe('bus de eventos', () => {
  it('llama a todos los oyentes, en orden y esperando a cada uno', async () => {
    const events = createEventBus()
    const seen: string[] = []

    events.on('duty.started', async ({ login }) => {
      await Promise.resolve()
      seen.push(`primero:${login}`)
    })
    events.on('duty.started', ({ login }) => {
      seen.push(`segundo:${login}`)
    })

    await events.emit('duty.started', { login: 'ana' })

    expect(seen).toEqual(['primero:ana', 'segundo:ana'])
  })

  it('no hace nada si nadie escucha', async () => {
    await expect(createEventBus().emit('profile.viewed', { login: 'ana' })).resolves.toBeUndefined()
  })

  it('el fallo de un oyente llega a quien emite', async () => {
    const events = createEventBus()

    events.on('profile.viewed', () => {
      throw new Error('roto')
    })

    await expect(events.emit('profile.viewed', { login: 'ana' })).rejects.toThrow('roto')
  })
})
