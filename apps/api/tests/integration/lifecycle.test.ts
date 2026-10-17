/**
 * La app en marcha: el prefijo `/api`, los trabajos de fondo y el corte por los
 * límites del plan. Lo que protege producción aunque nadie esté mirando.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { guardLevelFrom } from '../../src/app/build-app.js'
import { makeApp } from '../helpers/test-app.js'
import type { TestApp } from '../helpers/test-app.js'

let app: TestApp | null = null
let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sanatorio-guard-'))
})

afterEach(async () => {
  vi.useRealTimers()
  await app?.close()
  app = null
  await rm(dir, { recursive: true, force: true })
})

describe('prefijo /api', () => {
  it('la misma ruta responde con y sin /api, y una consulta con /api dentro no se toca', async () => {
    app = await makeApp()

    const bare = await app.app.inject({ method: 'GET', url: '/health' })
    const prefixed = await app.app.inject({ method: 'GET', url: '/api/health' })

    expect(prefixed.statusCode).toBe(bare.statusCode)
    expect(prefixed.body).toBe(bare.body)
    expect((await app.app.inject({ method: 'GET', url: '/api' })).statusCode).toBe(
      (await app.app.inject({ method: 'GET', url: '/' })).statusCode,
    )
    expect((await app.app.inject({ method: 'GET', url: '/api?x=1' })).statusCode).toBe(
      (await app.app.inject({ method: 'GET', url: '/?x=1' })).statusCode,
    )
    // `/apix` no es `/api` + `x`.
    expect((await app.app.inject({ method: 'GET', url: '/apihealth' })).statusCode).toBe(404)
  })
})

describe('nivel de la guardia de la máquina', () => {
  it('pasa a solo admins al 90 % y para del todo al 95 %', () => {
    expect(guardLevelFrom('')).toBe('ok')
    expect(guardLevelFrom('basura')).toBe('ok')
    expect(guardLevelFrom('89.9')).toBe('ok')
    expect(guardLevelFrom('90')).toBe('admin_only')
    expect(guardLevelFrom(' 94\n')).toBe('admin_only')
    expect(guardLevelFrom('95')).toBe('stopped')
    expect(guardLevelFrom('250')).toBe('stopped')
    expect(guardLevelFrom('-5')).toBe('ok')
  })
})

describe('trabajos de fondo', () => {
  /** Arranca los trabajos, deja pasar una hora y cuenta lo pedido a 42. */
  async function callsInAnHour(guard: string): Promise<number> {
    const file = join(dir, 'guard-level')

    await writeFile(file, guard)
    app = await makeApp({ GUARD_LEVEL_FILE: file })
    // La guardia se lee al refrescar el presupuesto: una petición cualquiera.
    await app.app.inject({ method: 'GET', url: '/health/db' })
    await app.services.admin.level()

    vi.useFakeTimers()
    const before = app.provider.requests.length

    app.start()
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    const after = app.provider.requests.length

    vi.useRealTimers()

    return after - before
  }

  it('con el plan holgado, la copia de fondo pide cosas a 42', async () => {
    expect(await callsInAnHour('10')).toBeGreaterThan(0)
  })

  it('al 90 % del plan no sale nada de fondo hacia 42', async () => {
    expect(await callsInAnHour('90')).toBe(0)
  })

  it('un trabajo que falla se apunta y no tira la app', async () => {
    const written: string[] = []
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      written.push(String(chunk))

      return true
    })

    app = await makeApp({}, { routes: {} })
    vi.useFakeTimers()
    app.provider.routes['/v2/campus/22/locations'] = () => {
      throw new Error('42 caída')
    }
    app.start()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    vi.useRealTimers()
    stderr.mockRestore()

    // La app sigue contestando.
    expect((await app.app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200)
    expect(written.every((line) => !line.includes('Unhandled'))).toBe(true)
  })
})
