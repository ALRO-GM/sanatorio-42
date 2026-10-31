import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const defaults = await api.getPoolSettings()

afterEach(async () => {
  cleanup()
  await api.updatePoolSettings(defaults)
})

describe('un piscinero ve la piscina (docs/piscineros.md)', () => {
  it('en el tablón: el camino de shell y C, y aparte rushes, BSQ y exámenes', async () => {
    const user = userEvent.setup()

    await api.updatePoolSettings({ allow: ['tablon', 'tablon.graph'] })
    await openApp('#/tablon', { pool: true })

    const path = await screen.findByRole('region', { name: text('piscine.progress') }, WAIT)
    const apart = screen.getByRole('region', { name: text('piscine.apart') })

    expect(within(path).getAllByRole('button')).toHaveLength(16)
    expect(within(path).getByRole('button', { name: /^C Piscine Shell 00/ }).className).toContain(
      'shell',
    )
    expect(within(path).getByRole('button', { name: /^C Piscine C 13/ }).className).toContain(' c ')
    expect(within(apart).getAllByRole('button')).toHaveLength(8)
    // El grafo del common core no sale.
    expect(screen.queryByText(text('graph.title'))).toBeNull()

    // Un examen se abre como cualquier otro: su tablón, para preguntar.
    await user.click(within(apart).getByRole('button', { name: /^C Piscine Exam 01/ }))
    expect(
      await screen.findByText(
        new RegExp(text('board.openDoubts').replace('{project}', 'C Piscine Exam 01')),
        {},
        WAIT,
      ),
    ).toBeTruthy()
  }, 20_000)

  it('para pedir ayuda: lo que cuenta y, aparte, rushes, BSQ y exámenes', async () => {
    await api.updatePoolSettings({ allow: ['consulta'] })
    await openApp('#/consulta', { pool: true })

    const progress = await screen.findByRole('list', { name: text('piscine.progress') }, WAIT)
    const apart = screen.getByRole('list', { name: text('piscine.apart') })

    expect(within(progress).getAllByRole('button')).toHaveLength(16)
    expect(within(apart).getByRole('button', { name: /C Piscine BSQ/ })).toBeTruthy()
    expect(within(apart).getByRole('button', { name: /C Piscine Final Exam/ })).toBeTruthy()
  }, 20_000)

  it('su Avance es el de la piscina, sin plan, pace ni black hole', async () => {
    await api.updatePoolSettings({ allow: ['avance'] })
    await openApp('#/avance', { pool: true })

    expect(
      await screen.findByRole('img', { name: /^Gráfica de tu avance en la piscina/ }, WAIT),
    ).toBeTruthy()
    expect(
      screen.getByRole('checkbox', { name: new RegExp(text('piscine.chart.cohort')) }),
    ).toBeTruthy()
    expect(screen.queryByText(text('stats.progress.plan'))).toBeNull()
    expect(screen.queryByText(text('stats.progress.paces'))).toBeNull()
    // Sin la vista sin límites, ni la lista de los más avanzados ni los percentiles.
    expect(screen.queryByRole('heading', { name: text('piscine.top.listTitle') })).toBeNull()
  }, 20_000)

  it('sin límites: los más avanzados, la media de los mejores y quien cae entre dos percentiles', async () => {
    const user = userEvent.setup()

    await openApp('#/avance', { preview: 'full' })

    const list = await screen.findByRole('list', { name: text('piscine.top.listTitle') }, WAIT)

    // De entrada, los quince primeros; el resto, al pedirlo.
    expect(within(list).getAllByRole('listitem')).toHaveLength(15)
    await user.click(screen.getByRole('button', { name: /^Ver los 40/ }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(40)

    // La media de los mejores 10 %: cuatro de cuarenta, encendida de entrada.
    const legend = must(document.querySelector('.piscine-chart-legend'), 'la leyenda')

    expect(legend.textContent).toContain('Mejores 10 % (4)')

    // Entre P75 y P90, cada cual con su línea fina.
    const band = screen.getByRole('checkbox', { name: /^Piscineros entre P75 y P90/ })

    expect(document.querySelectorAll('.piscine-chart path title')).not.toHaveLength(0)
    const before = document.querySelectorAll('.piscine-chart path.progress-line').length

    await user.click(band)
    expect(document.querySelectorAll('.piscine-chart path.progress-line').length).toBeGreaterThan(
      before,
    )
  }, 20_000)
})
