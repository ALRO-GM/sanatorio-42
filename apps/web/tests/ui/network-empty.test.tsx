/**
 * Red: unos filtros que no dejan a nadie no dejan la página vacía. Se vuelve
 * sola a la vista de partida (tu red) y lo dice. En las dos redes: la de
 * correcciones y la de asientos. Y si tu red sale vacía, se ve la del campus.
 */
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp, settle, wholeCampus } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Red sin resultados', () => {
  it('correcciones: sin nadie, vuelve a tu red y quita el filtro', async () => {
    const getNetwork = api.getNetwork.bind(api)

    // Con «solo mutuas» no queda nadie, y esa respuesta no trae opciones (como
    // la API cuando el filtro no deja ni un proyecto).
    vi.spyOn(api, 'getNetwork').mockImplementation(async (params) => {
      const graph = await getNetwork(params)

      return params.mutual === true
        ? {
            ...graph,
            nodes: [],
            links: [],
            topPairs: [],
            projects: [],
            timeline: [],
            available: graph.available.slice(0, 1),
          }
        : graph
    })
    await openApp('#/red', { detail: 'datos' })
    await wholeCampus()
    // Hasta que llega el primer grafo.
    await waitFor(
      () => {
        expect(document.querySelector('canvas.force-graph')).not.toBeNull()
      },
      { timeout: 5000 },
    )

    const mutual = screen.getByRole<HTMLInputElement>('checkbox', {
      name: text('net.mutualOnly'),
    })

    fireEvent.click(mutual)
    // Sin nadie, vuelve a tu red: se dice, el grafo sigue y el filtro se quita.
    expect(await screen.findByText(text('net.resetEmpty'), {}, { timeout: 3000 })).toBeTruthy()
    await settle(900)
    expect(screen.queryByText(text('net.empty'))).toBeNull()
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: text('net.mutualOnly') }).checked,
    ).toBe(false)
  }, 20_000)

  it('correcciones: si tu red sale vacía, se ve la del campus', async () => {
    const getNetwork = api.getNetwork.bind(api)
    const asked: (string | undefined)[] = []

    // Quien mira no sale en la red (como quien la ve como piscinero desde el
    // panel): con su login elegido, nadie.
    vi.spyOn(api, 'getNetwork').mockImplementation(async (params) => {
      asked.push(params.login)
      const graph = await getNetwork(params)

      return params.login === undefined
        ? graph
        : { ...graph, nodes: [], links: [], topPairs: [], timeline: [] }
    })
    // Sin quitar a la persona elegida: de entrada, tu red.
    await openApp('#/red', { detail: 'datos' })
    expect(await screen.findByText(text('net.resetGeneric'), {}, { timeout: 5000 })).toBeTruthy()
    await settle(900)
    expect(asked.at(-1)).toBeUndefined()
    expect(screen.queryByText(text('net.empty'))).toBeNull()
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()
  }, 20_000)

  it('asientos: un periodo sin nadie vuelve a todo el periodo', async () => {
    const user = userEvent.setup()
    const getSeatGraph = api.getSeatGraph.bind(api)

    // Solo «3 meses» sale vacío: «todo» (lo de entrada) y «1 mes» tienen gente.
    vi.spyOn(api, 'getSeatGraph').mockImplementation(async (days) =>
      days > 40 && days < 120
        ? {
            days,
            people: [],
            links: [],
            totals: { people: 0, pairs: 0, communities: 0, hours: 0 },
          }
        : getSeatGraph(days),
    )
    await openApp('#/asientos', { detail: 'datos' })
    await wholeCampus()
    await screen.findByText(text('seats.title'), {}, { timeout: 5000 })
    await settle(600)
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()

    const period = screen.getByRole<HTMLSelectElement>('combobox', {
      name: text('common.period'),
    })

    await user.selectOptions(period, '3')
    expect(await screen.findByText(text('net.resetEmpty'), {}, { timeout: 3000 })).toBeTruthy()
    await settle(600)
    expect(screen.queryByText(text('seats.empty'))).toBeNull()
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: text('common.period') }).value,
    ).toBe('all')
  }, 20_000)
})
