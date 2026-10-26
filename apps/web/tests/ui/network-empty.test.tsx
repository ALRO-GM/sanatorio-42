/**
 * Red: unos filtros que no dejan a nadie no bloquean la página. Las opciones
 * (escuelas, proyectos, periodo) siguen ahí, sacadas del último grafo con
 * gente, para poder cambiarlas y volver a ver el grafo. En las dos redes: la de
 * correcciones y la de asientos.
 */
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp, settle } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Red sin resultados', () => {
  it('correcciones: sin nadie, siguen las escuelas y los proyectos, y se puede volver', async () => {
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
    // Hasta que llega el primer grafo.
    await waitFor(
      () => {
        expect(document.querySelector('canvas.force-graph')).not.toBeNull()
      },
      { timeout: 5000 },
    )

    const project = screen.getByRole('combobox', { name: text('net.project') })
    const projects = within(project).getAllByRole('option').length

    expect(projects).toBeGreaterThan(1)

    const mutual = screen.getByRole('checkbox', { name: text('net.mutualOnly') })

    fireEvent.click(mutual)
    expect(await screen.findByText(text('net.empty'), {}, { timeout: 3000 })).toBeTruthy()
    expect(document.querySelector('canvas.force-graph')).toBeNull()
    // Las opciones del último grafo con gente siguen ahí.
    expect(
      within(screen.getByRole('combobox', { name: text('net.project') })).getAllByRole('option'),
    ).toHaveLength(projects)
    expect(screen.getByRole('group', { name: text('net.campuses') })).toBeTruthy()

    // Y se puede deshacer: vuelve el grafo.
    fireEvent.click(screen.getByRole('checkbox', { name: text('net.mutualOnly') }))
    await settle(900)
    expect(screen.queryByText(text('net.empty'))).toBeNull()
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()
  })

  it('asientos: un periodo sin nadie deja el selector para elegir otro', async () => {
    const user = userEvent.setup()
    const getSeatGraph = api.getSeatGraph.bind(api)

    vi.spyOn(api, 'getSeatGraph').mockImplementation(async (days) =>
      days > 40
        ? {
            days,
            people: [],
            links: [],
            totals: { people: 0, pairs: 0, communities: 0, hours: 0 },
          }
        : getSeatGraph(days),
    )
    await openApp('#/red', { detail: 'datos' })
    await user.click(
      await screen.findByRole('tab', { name: text('seats.view.seats') }, { timeout: 5000 }),
    )
    await settle(600)
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()

    const period = screen.getByRole<HTMLSelectElement>('combobox', {
      name: text('common.period'),
    })

    await user.selectOptions(period, '3')
    expect(await screen.findByText(text('seats.empty'), {}, { timeout: 3000 })).toBeTruthy()

    await user.selectOptions(
      screen.getByRole<HTMLSelectElement>('combobox', { name: text('common.period') }),
      '1',
    )
    await settle(600)
    expect(screen.queryByText(text('seats.empty'))).toBeNull()
    expect(document.querySelector('canvas.force-graph')).not.toBeNull()
  })
})
