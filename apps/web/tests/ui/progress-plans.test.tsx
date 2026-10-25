import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const legend = (key: string): RegExp => new RegExp(`^${text(key).split(' (')[0] ?? ''}`)
/** El grupo de botones de la gráfica (el primero) o de la clasificación (el segundo). */
const group = (key: string, index = 0): HTMLElement =>
  must(screen.getAllByRole('group', { name: text(key) })[index], `el grupo ${key}`)
const chartCard = (): HTMLElement =>
  must(document.querySelector<HTMLElement>('.progress-card'), 'la gráfica')
const axis = (): string[] =>
  [...chartCard().querySelectorAll('.progress-grid text')].map((node) => node.textContent)

afterEach(() => {
  cleanup()
})

describe('Avance por plan', () => {
  it('sale con el plan de quien mira y, con los dos, una media para C y otra para Python', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')

    // El de prueba es del plan con Python: una sola media, la suya.
    expect(
      await screen.findAllByText(legend('stats.progress.average'), {}, { timeout: 5000 }),
    ).not.toHaveLength(0)
    expect(screen.queryByText(legend('stats.progress.averageC'))).toBeNull()

    await user.click(
      within(group('stats.progress.plan')).getByRole('button', {
        name: text('stats.progress.plan.all'),
      }),
    )

    expect(screen.getAllByText(legend('stats.progress.averageC'))).not.toHaveLength(0)
    expect(screen.getAllByText(legend('stats.progress.averagePython'))).not.toHaveLength(0)
    expect(document.querySelector('.progress-line.average-c')).not.toBeNull()
    expect(document.querySelector('.progress-line.average-python')).not.toBeNull()
    expect(document.querySelector('.progress-line.average')).toBeNull()
  })
})

describe('Avance por población', () => {
  it('por defecto en curso + terminado; cada población con su gente en la leyenda', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(legend('stats.progress.average'), {}, { timeout: 5000 })

    const populations = group('stats.progress.population')

    expect(
      within(populations)
        .getByRole('button', { name: text('stats.progress.population.current') })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // En curso + terminado del plan con Python, en el campus: 110 personas.
    expect(within(chartCard()).getAllByText(/\(110 personas\)/)).not.toHaveLength(0)

    await user.click(
      within(populations).getByRole('button', {
        name: text('stats.progress.population.blackholed'),
      }),
    )
    expect(within(chartCard()).getAllByText(/\(231 personas\)/)).not.toHaveLength(0)
    await user.click(
      within(populations).getByRole('button', { name: text('stats.progress.population.finished') }),
    )
    expect(within(chartCard()).getAllByText(/\(33 personas\)/)).not.toHaveLength(0)

    // Quien no se sabe si sigue no entra: se dice cuántos son.
    expect(screen.getByText(/9 personas no entran en ninguna media/)).toBeTruthy()
  })

  it('el eje marca los círculos y, por horas, las horas de tu plan', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findAllByText(legend('stats.progress.average'), {}, { timeout: 5000 })

    expect(axis()).toEqual(['Inicio', ...[0, 1, 2, 3, 4, 5, 6].map((n) => `Círculo ${String(n)}`)])

    await user.click(
      within(group('stats.progress.measure')).getByRole('button', {
        name: text('stats.progress.measure.hours'),
      }),
    )
    const hours = axis()

    expect(hours[0]).toBe('0 h')
    // Arriba, las horas de todo tu common core (1456 en la API de mentira).
    expect(hours.at(-1)?.replace(/\D/g, '')).toBe('1456')
    expect(screen.getByText(/1\.?456 h\)/)).toBeTruthy()
  })
})

describe('Quién va más rápido', () => {
  const list = (): HTMLElement =>
    must(document.querySelector<HTMLElement>('.progress-ranking-scroll'), 'la lista')
  const rows = (): Element[] => [...list().querySelectorAll('li')]

  it('una página al principio, tu fila fija y más al pedirlo', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    expect(
      await screen.findByRole('heading', { name: text('stats.ranking.title') }, { timeout: 5000 }),
    ).toBeTruthy()
    await screen.findByText('240 personas', {}, { timeout: 5000 })

    // 50 filas de la página más la tuya, que va al final y fija con `sticky`.
    expect(rows()).toHaveLength(51)
    const pinned = list().querySelectorAll('.row.pinned')

    expect(pinned).toHaveLength(1)
    expect(pinned[0]?.classList.contains('me')).toBe(true)
    expect(rows().at(-1)).toBe(pinned[0])

    await user.click(screen.getByRole('button', { name: text('stats.ranking.more') }))
    await screen.findByText(
      (_, node) => node === list() && rows().length >= 100,
      {},
      { timeout: 5000 },
    )
    // Ya cargada su página, tu fila está en su puesto (y sigue fija), sin repetirse.
    expect(list().querySelectorAll('.row.pinned')).toHaveLength(1)
    expect(list().querySelectorAll('.row.me')).toHaveLength(1)
  }, 20_000)

  it('filtra por plan, kickoff y rangos; sin nadie, lo dice', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await screen.findByText('240 personas', {}, { timeout: 5000 })

    await user.click(
      within(group('stats.progress.plan', 1)).getByRole('button', { name: 'Python' }),
    )
    await screen.findByText(/^80 personas/, {}, { timeout: 5000 })

    const kickoff = screen.getByRole('combobox', { name: text('stats.ranking.kickoff') })

    await user.selectOptions(kickoff, '2026-09')
    await screen.findByText(/^40 personas/, {}, { timeout: 5000 })
    expect(group('stats.ranking.cohort')).toBeTruthy()

    // Solo quien terminó: el círculo mínimo, al tope.
    fireEvent.change(screen.getByRole('slider', { name: text('stats.ranking.circleMin') }), {
      target: { value: '7' },
    })
    expect(await screen.findByText(/^Círculos: de Terminado a Terminado/)).toBeTruthy()
    // Y como mucho un 10 %: quien terminó lleva el 100 %, así que nadie.
    fireEvent.change(screen.getByRole('slider', { name: text('stats.ranking.pctMax') }), {
      target: { value: '10' },
    })
    expect(await screen.findByText(text('stats.ranking.empty'), {}, { timeout: 5000 })).toBeTruthy()

    // Por horas: el rango de % es el de horas.
    await user.click(
      within(group('stats.ranking.by')).getByRole('button', {
        name: text('stats.ranking.by.hours'),
      }),
    )
    expect(screen.getByText(/^% por horas: de 0 a 10 %/)).toBeTruthy()
  }, 20_000)
})
