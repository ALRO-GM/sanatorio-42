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

import { api } from '../../src/shared/api'
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
    expect(within(rail).getByRole('combobox', { name: text('common.period') })).toBeTruthy()
    expect(
      within(rail).getByRole('checkbox', { name: text('stats.progress.together') }),
    ).toBeTruthy()
    expect(within(rail).getByRole('checkbox', { name: text('stats.progress.paces') })).toBeTruthy()
    // La gráfica no lleva opciones dentro: solo la lupa, que la ajusta a lo que se ve.
    expect(
      within(chartCard())
        .queryAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([text('stats.progress.zoom')])
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
      chartCard().querySelector('[data-series="next-finished-22-nvelasco"]'),
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

  it('tu línea sube en escalón el día de Libft y cae justo en la raya del círculo 0', async () => {
    await openApp('#/avance')
    await ready()

    const circle0 = must(
      [...chartCard().querySelectorAll('.progress-grid')].find(
        (grid) => grid.textContent === 'Círculo 0',
      ),
      'la raya del círculo 0',
    )
    const lineY = Number(circle0.querySelector('line')?.getAttribute('y1'))
    const first = must(
      chartCard().querySelector('[data-series="me"] .progress-milestone'),
      'tu primer hito (Libft)',
    )
    const points = [
      ...(chartCard()
        .querySelector('[data-series="me"] .progress-line')
        ?.getAttribute('d')
        ?.matchAll(/[ML]([\d.]+),([\d.]+)/g) ?? []),
    ].map(([, px, py]) => [Number(px), Number(py)] as const)
    // El trazo va con un decimal; el hito, con todos.
    const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.06
    const at = points.findIndex(
      ([px, py]) => near(px, Number(first.getAttribute('cx'))) && near(py, lineY),
    )

    // El hito está en la raya, y el punto de antes es el mismo día, abajo: un escalón.
    expect(Number(first.getAttribute('cy'))).toBeCloseTo(lineY, 5)
    expect(at).toBeGreaterThan(0)
    expect(points[at - 1]?.[0]).toBe(points[at]?.[0])
    expect(points[at - 1]?.[1]).toBeGreaterThan(lineY)
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

describe('Avance: la forma de las líneas', () => {
  it('a saltos por proyecto de entrada; continua y suave al elegirla, y se recuerda', async () => {
    const user = userEvent.setup()
    const mine = (): string =>
      chartCard().querySelector('[data-series="me"] .progress-line')?.getAttribute('d') ?? ''

    await openApp('#/avance')
    await ready()
    const group = screen.getByRole('group', { name: text('stats.progress.shape') })

    // A saltos: solo rectas.
    expect(mine()).toMatch(/^M/)
    expect(mine()).not.toContain('C')

    await user.click(
      within(group).getByRole('button', { name: text('stats.progress.shape.smooth') }),
    )
    expect(mine()).toContain('C')
    expect(localStorage.getItem('sanatorio_progress_shape')).toBe('smooth')

    await user.click(
      within(group).getByRole('button', { name: text('stats.progress.shape.steps') }),
    )
    expect(mine()).not.toContain('C')
  })

  it('recta (#115): sin curvas y con menos puntos que a saltos', async () => {
    const user = userEvent.setup()
    const mine = (): string =>
      chartCard().querySelector('[data-series="me"] .progress-line')?.getAttribute('d') ?? ''

    await openApp('#/avance')
    await ready()
    const group = screen.getByRole('group', { name: text('stats.progress.shape') })
    const steps = (mine().match(/L/g) ?? []).length

    await user.click(
      within(group).getByRole('button', { name: text('stats.progress.shape.straight') }),
    )
    expect(mine()).not.toContain('C')
    // De esquina a esquina: sin los dos puntos de cada escalón.
    expect((mine().match(/L/g) ?? []).length).toBeLessThan(steps)
    expect(localStorage.getItem('sanatorio_progress_shape')).toBe('straight')
  })
})

describe('Avance: los paces cuadran con tu estado de salud (#87)', () => {
  /** La línea de un pace: su trazo. */
  const paceLine = (): string =>
    chartCard().querySelector('.progress-pace path')?.getAttribute('d') ?? ''

  it('a saltos, cada pace es una escalera que sube el día de su plazo', async () => {
    await openApp('#/avance')
    await ready()
    const points = (paceLine().match(/-?[\d.]+,-?[\d.]+/g) ?? []).map((pair) => pair.split(','))

    // En una escalera, cada punto comparte x o y con el anterior.
    expect(points.length).toBeGreaterThan(4)
    points.slice(1).forEach(([x, y], index) => {
      const [px, py] = points[index] ?? []

      expect(x === px || y === py).toBe(true)
    })
  })

  it('con tus días de bonus, las líneas empiezan más tarde y se dice', async () => {
    const health = await api.getHealth()

    // Empezaste hace 146 días; con este plazo de pace 12, tu día cero cae 20 después.
    vi.spyOn(api, 'getHealth').mockResolvedValue({
      ...health,
      declared: {
        pace: 12,
        circle: 3,
        deadline: new Date(Date.parse(health.startedAt ?? '') + 154 * 86_400_000)
          .toISOString()
          .slice(0, 10),
        updatedAt: new Date().toISOString(),
      },
    })
    await openApp('#/avance')
    await ready()
    expect(await screen.findByText(/^Las líneas de pace empiezan \d+ días más tarde/)).toBeTruthy()
  })

  it('sin pace anotado, ni se mueven ni se dice nada', async () => {
    await openApp('#/avance')
    await ready()
    expect(screen.queryByText(/^Las líneas de pace empiezan/)).toBeNull()
  })
})
