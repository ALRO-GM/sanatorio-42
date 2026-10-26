/**
 * Abrir el Avance con opciones (`progressHref`): desde tu estado de salud, con
 * tu plan, quien sigue y quien se tragó el black hole de tu campus, los paces
 * y tu línea. Manda en esa visita sin tocar lo guardado, y la dirección vuelve
 * a ser `#/avance`.
 */
import { cleanup, screen, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { progressHref } from '../../src/shared/links'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const pressed = (key: string): string[] =>
  within(must(screen.getAllByRole('group', { name: text(key) })[0], key))
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent)
const series = (): string[] =>
  [...document.querySelectorAll<SVGGElement>('.progress-card .progress-series')].map(
    (node) => node.dataset.series ?? '',
  )

afterEach(() => {
  cleanup()
  localStorage.removeItem('sanatorio_progress_range')
})

describe('Avance desde un enlace', () => {
  it('tu estado de salud enlaza al Avance con tu plan, y se llama así en español', async () => {
    await openApp('#/expediente')

    expect(
      await screen.findByText(text('health.title'), { selector: '.eyebrow' }, { timeout: 5000 }),
    ).toBeTruthy()
    expect(text('health.title')).toBe('Tu estado de salud')
    const link = await screen.findByRole(
      'link',
      { name: text('health.compare') },
      { timeout: 5000 },
    )

    // En la API de mentira vas por el plan de Python.
    expect(link.getAttribute('href')).toBe(
      progressHref({
        plan: ['next'],
        pop: ['current', 'blackholed'],
        scope: ['campus'],
        paces: true,
        me: true,
      }),
    )
  })

  it('el enlace enciende lo que pide, solo esta vez, y limpia la dirección', async () => {
    await openApp(
      progressHref({
        plan: ['classic'],
        pop: ['current', 'blackholed'],
        scope: ['campus'],
        paces: true,
        me: true,
        range: '8',
      }),
    )
    await screen.findAllByText(/^C · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })

    expect(pressed('stats.progress.plan')).toEqual(['C'])
    expect(pressed('stats.progress.population')).toEqual([
      text('stats.progress.population.current'),
      text('stats.progress.population.blackholed'),
    ])
    expect(pressed('stats.progress.scope')).toEqual(['Madrid'])
    expect(series()).toEqual(['classic-current-22', 'classic-blackholed-22', 'me'])
    expect(
      screen.getByRole('checkbox', { name: text('stats.progress.paces') }).matches(':checked'),
    ).toBe(true)
    // Pedía 8 meses, que ya no se ofrecen: cae en el siguiente que hay, 12.
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: text('common.period') }).value,
    ).toBe('12')
    // El periodo del enlace no se guarda (abrir la web empieza sin nada guardado),
    // y recargar ya no repite el enlace.
    expect(localStorage.getItem('sanatorio_progress_range')).toBeNull()
    expect(window.location.hash).toBe('#/avance')
  })

  it('con «todos», la media de todos los campus juntos y ninguna de un campus', async () => {
    await openApp(progressHref({ plan: ['next'], scope: ['all'], range: 'all' }))
    await screen.findAllByText(
      /^Python · En curso \+ terminado · Todos los campus/,
      {},
      { timeout: 5000 },
    )

    expect(pressed('stats.progress.scope')).toEqual([])
    expect(
      screen.getByRole('checkbox', { name: text('stats.progress.together') }).matches(':checked'),
    ).toBe(true)
    expect(series()).toEqual(['next-current-all', 'me'])
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: text('common.period') }).value,
    ).toBe('all')
  })
})
