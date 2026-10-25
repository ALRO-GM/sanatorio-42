/**
 * Avance: lo de cada persona. Quien terminó tiene el tramo del 100 % resaltado
 * y un trofeo el día exacto; cada día en que alguien aprobó algo es un punto, y
 * su ficha dice qué proyectos (con el ratón y con el teclado). Las opciones
 * van en el panel de la derecha.
 */
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const chartCard = (): HTMLElement =>
  must(document.querySelector<HTMLElement>('.progress-card'), 'la gráfica')
const svg = (): SVGSVGElement =>
  must(chartCard().querySelector<SVGSVGElement>('.progress-chart svg'), 'el dibujo')
const ready = () =>
  screen.findAllByText(/^Python · En curso \+ terminado · Madrid/, {}, { timeout: 5000 })
/** El primer `x` de un trazo de SVG (`M123.4,56.7…`). */
const firstX = (d: string | null): number => Number(/^M([\d.]+),/.exec(d ?? '')?.[1])

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Avance: quien terminó y sus hitos', () => {
  it('las opciones van en el panel de la derecha, aparte de la gráfica', async () => {
    await openApp('#/avance')
    await ready()

    const rail = screen.getByRole('complementary', { name: text('stats.progress.options') })

    for (const key of [
      'stats.progress.measure',
      'stats.progress.plan',
      'stats.progress.population',
      'stats.progress.scope',
    ]) {
      expect(within(rail).getByRole('group', { name: text(key) })).toBeTruthy()
    }
    expect(within(rail).getByRole('combobox', { name: text('rank.period') })).toBeTruthy()
    expect(within(rail).getByRole('checkbox', { name: text('stats.progress.paces') })).toBeTruthy()
    // La gráfica no lleva opciones dentro.
    expect(within(chartCard()).queryAllByRole('button')).toHaveLength(0)
  })

  it('el tramo terminado se resalta y el trofeo cae el día en que terminó', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()
    await user.click(
      within(screen.getByRole('group', { name: text('stats.progress.population') })).getByRole(
        'button',
        { name: text('stats.progress.population.finished') },
      ),
    )

    const series = must(
      chartCard().querySelector('[data-series="next-finished-campus-nvelasco"]'),
      'la línea de nvelasco',
    )
    const stretch = must(series.querySelector('.progress-finished'), 'su tramo terminado')
    // nvelasco terminó el día 212 (la API de mentira).
    const trophy = screen.getByRole('img', { name: /nvelasco: common core terminado el día 212/ })
    const [, tx, ty] =
      /translate\(([\d.]+),([\d.]+)\)/.exec(trophy.getAttribute('transform') ?? '') ?? []

    expect(Number(tx)).toBeCloseTo(firstX(stretch.getAttribute('d')), 1)
    // A los 212 días de un eje de dos años (730), entre los márgenes del dibujo (76 y 600).
    expect(Number(tx)).toBeCloseTo(76 + (212 / 730) * (640 - 76 - 40), 0)
    // Arriba del todo: el 100 % (el final del círculo 6).
    expect(Number(ty)).toBe(12)
    expect(screen.getByText(text('stats.progress.finished'))).toBeTruthy()
  })

  it('al pasar por un hito, la ficha dice qué se aprobó ese día', async () => {
    await openApp('#/avance')
    await ready()

    vi.spyOn(svg(), 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 640,
      height: 280,
      right: 640,
      bottom: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    const first = must(
      chartCard().querySelector('[data-series="me"] .progress-milestone'),
      'tu primer hito',
    )

    fireEvent.pointerMove(svg(), {
      clientX: Number(first.getAttribute('cx')),
      clientY: Number(first.getAttribute('cy')),
    })
    const tip = await screen.findByRole('status')

    expect(tip.textContent).toContain('1 proyecto aprobado: Libft')
    expect(first.classList.contains('on')).toBe(true)
  })

  it('con el teclado se va de un día o hito al siguiente', async () => {
    const user = userEvent.setup()

    await openApp('#/avance')
    await ready()
    svg().focus()
    await user.keyboard('{Home}')
    expect((await screen.findByRole('status')).textContent).toContain('Día 0')

    // Por la derecha hasta el primer hito: Libft.
    for (
      let turn = 0;
      turn < 10 && !screen.getByRole('status').textContent.includes('aprobado');
      turn++
    ) {
      await user.keyboard('{ArrowRight}')
    }
    expect(screen.getByRole('status').textContent).toContain('Libft')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
