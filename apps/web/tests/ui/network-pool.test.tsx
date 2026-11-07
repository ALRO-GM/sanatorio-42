/**
 * Red en la vista de piscinero sin límites (`docs/piscineros.md`): de partida,
 * la red de toda la piscina en curso o la última, desde su primer día y sin
 * nadie elegido. Fuera de esa vista, tu red, como siempre.
 */
import { cleanup, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { openApp } from './render'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Red de la piscina sin límites', () => {
  it('abre por la red de toda la piscina, desde su primer día', async () => {
    const access = await api.getPoolAccess()
    const getNetwork = vi.spyOn(api, 'getNetwork')

    await openApp('#/red', { preview: 'full' })
    await waitFor(
      () => {
        expect(getNetwork).toHaveBeenCalled()
      },
      { timeout: 5000 },
    )

    const first = getNetwork.mock.calls[0]?.[0]

    // Sin `preview` (fuera de la vista), el acceso de mentira no la trae.
    expect(access.poolStart).toBeUndefined()
    expect(first).not.toHaveProperty('login')
    expect(first?.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  }, 20_000)

  it('fuera de esa vista, tu red del último año', async () => {
    const getNetwork = vi.spyOn(api, 'getNetwork')

    await openApp('#/red')
    await waitFor(
      () => {
        expect(getNetwork).toHaveBeenCalled()
      },
      { timeout: 5000 },
    )
    expect(getNetwork.mock.calls[0]?.[0]).toHaveProperty('login')
  }, 20_000)
})
