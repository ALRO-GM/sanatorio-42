import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SeatHeat, SeatHeatCell, SeatHeatCluster } from '@sanatorio/contracts'

import { SeatHeatMap } from '../../src/features/network/SeatHeatMap'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Un clúster de `rows` × `seats` con las horas dadas; lo que no está, 0. */
function clusterOf(
  id: string,
  rows: number,
  seats: number,
  hours: Record<string, number>,
  people: number,
): SeatHeatCluster {
  const cells: SeatHeatCell[] = []

  for (let row = 1; row <= rows; row += 1) {
    for (let seat = 1; seat <= seats; seat += 1) {
      const host = `${id}r${String(row)}s${String(seat)}`
      const used = hours[host] ?? 0

      cells.push({ host, row, seat, hours: used, people: used === 0 ? 0 : used > 30 ? 9 : 1 })
    }
  }

  return {
    id,
    rows,
    seatsPerRow: seats,
    hours: cells.reduce((sum, cell) => sum + cell.hours, 0),
    people,
    cells,
  }
}

const HEAT: SeatHeat = {
  days: 30,
  clusters: [
    clusterOf('c1', 2, 3, { c1r1s1: 37, c1r2s3: 4 }, 9),
    clusterOf('c2', 1, 2, { c2r1s1: 1 }, 1),
  ],
  max: 37,
}

function show(heat: SeatHeat = HEAT): HTMLElement[] {
  render(
    <I18nProvider>
      <SeatHeatMap heat={heat} />
    </I18nProvider>,
  )

  return [...document.querySelectorAll<HTMLElement>('.heat-cell[data-host]')]
}

const hosts = (cells: readonly HTMLElement[]): string[] =>
  cells.map((cell) => cell.dataset.host ?? '')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
})

describe('mapa de calor de los puestos', () => {
  it('todos los clústeres a la vez, en cuadrícula: la fila 1 arriba y el puesto 1 a la izquierda', () => {
    const cells = show()

    expect(hosts(cells)).toEqual([
      'c1r1s1',
      'c1r1s2',
      'c1r1s3',
      'c1r2s1',
      'c1r2s2',
      'c1r2s3',
      'c2r1s1',
      'c2r1s2',
    ])
    expect(screen.getByRole('group', { name: 'Uso de los puestos de Clúster 1' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Uso de los puestos de Clúster 2' })).toBeTruthy()
    // Sin pastillas para elegir clúster: se ven todos.
    expect(screen.queryByRole('button', { name: /Clúster \d/ })).toBeNull()

    // Los números de puesto arriba y los de fila a la izquierda, en orden.
    const grid = must(document.querySelector('.heat-grid'), 'la cuadrícula del clúster 1')

    expect([...grid.querySelectorAll('.heat-axis')].map((axis) => axis.textContent)).toEqual([
      '1',
      '2',
      '3',
      '1',
      '2',
    ])
    // Nada del plano del mapa: ni puestos con relieve ni canto de pantalla.
    expect(document.querySelector('.seat, [class*="screen-"], .staggered')).toBeNull()
  })

  it('cada clúster dice sus horas, sus ordenadores usados y su gente distinta', () => {
    show()

    const [first, second] = [...document.querySelectorAll<HTMLElement>('.heat-cluster')]

    expect(within(must(first, 'el clúster 1')).getByText('Uso total: 41 h')).toBeTruthy()
    expect(within(must(first, 'el clúster 1')).getByText('Ordenadores usados: 2 de 6')).toBeTruthy()
    // La gente del clúster es la que da la API, no la suma de los puestos (10).
    expect(within(must(first, 'el clúster 1')).getByText('Personas distintas: 9')).toBeTruthy()
    expect(
      within(must(second, 'el clúster 2')).getByText('Ordenadores usados: 1 de 2'),
    ).toBeTruthy()
  })

  it('el puesto sin uso no lleva color; los usados van del azul (poco) al rojo (mucho)', () => {
    const cells = show()
    const at = (host: string) =>
      must(
        cells.find((cell) => cell.dataset.host === host),
        host,
      )

    expect(at('c1r1s2').classList).toContain('free')
    expect(at('c1r1s2').getAttribute('style')).toBeNull()
    // Lo más usado, en la última parada (rojo); lo menos, en la primera (azul).
    expect(at('c1r1s1').style.getPropertyValue('--to')).toBe('var(--heat-4)')
    expect(at('c1r1s1').style.getPropertyValue('--mix')).toBe('100%')
    expect(at('c2r1s1').style.getPropertyValue('--from')).toBe('var(--heat-0)')
    expect(at('c2r1s1').style.getPropertyValue('--mix')).toBe('0%')
    // La leyenda: sin uso, y del mínimo al máximo usado.
    const legend = must(document.querySelector('.heat-legend'), 'la leyenda')

    expect(within(legend as HTMLElement).getByText(text('seats.heat.unused'))).toBeTruthy()
    expect(legend.textContent).toContain('1 h')
    expect(legend.textContent).toContain('37 h')
  })

  it('cada puesto dice sus horas y su gente, al pasar o al enfocar y a quien no ve', () => {
    show()

    const busiest = screen.getByRole('img', { name: 'c1r1s1 · 37 h · 9 personas' })

    expect(screen.getByRole('img', { name: 'c1r2s3 · 4 h · 1 persona' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'c1r1s2 · 0 h · 0 personas' })).toBeTruthy()
    fireEvent.focus(busiest)
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toBe(
      'c1r1s1 · 37 h · 9 personas',
    )
    fireEvent.blur(busiest)
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull()
    fireEvent.mouseEnter(busiest)
    expect(screen.getByRole('tooltip', { hidden: true })).toBeTruthy()
    fireEvent.mouseLeave(busiest)
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull()
  })

  it('un clúster es una parada del tabulador y las flechas se mueven por él', () => {
    const cells = show()
    const at = (host: string) =>
      must(
        cells.find((cell) => cell.dataset.host === host),
        host,
      )

    expect(cells.filter((cell) => cell.tabIndex === 0).map((cell) => cell.dataset.host)).toEqual([
      'c1r1s1',
      'c2r1s1',
    ])
    at('c1r1s1').focus()
    fireEvent.keyDown(at('c1r1s1'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(at('c1r1s2'))
    fireEvent.keyDown(at('c1r1s2'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(at('c1r2s2'))
    expect(at('c1r2s2').tabIndex).toBe(0)
    // Por fuera del borde no pasa nada, y otra tecla tampoco.
    fireEvent.keyDown(at('c1r2s2'), { key: 'ArrowDown' })
    fireEvent.keyDown(at('c1r2s2'), { key: 'a' })
    expect(document.activeElement).toBe(at('c1r2s2'))
  })

  it('«Ver como tabla»: los puestos de todos los clústeres, del más al menos usado', () => {
    show()
    fireEvent.click(screen.getByText(text('seats.heat.table')))

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)

    expect(rows).toHaveLength(8)
    expect(rows[0]?.textContent).toContain('Clúster 1')
    expect(rows[0]?.textContent).toContain('c1r1s137')
    expect(rows[1]?.textContent).toContain('c1r2s34')
    expect(rows[2]?.textContent).toContain('Clúster 2')
    expect(rows[7]?.textContent).toContain('0')
  })

  it('sin puestos conocidos lo dice, y sin horas todo sale vacío y sin escala', () => {
    show({ days: 7, clusters: [], max: 0 })
    expect(screen.getByText(text('seats.heat.empty'))).toBeTruthy()
    cleanup()

    const cells = show({ days: 7, clusters: [clusterOf('c1', 2, 3, {}, 0)], max: 0 })

    expect(cells).toHaveLength(6)
    expect(cells.every((cell) => cell.classList.contains('free'))).toBe(true)
    expect(document.querySelector('.heat-ramp')).toBeNull()
    expect(screen.getByText('Ordenadores usados: 0 de 6')).toBeTruthy()
  })

  it('si todos los puestos usados tienen las mismas horas, van al final de la escala', () => {
    const cells = show({
      days: 7,
      clusters: [clusterOf('c1', 1, 2, { c1r1s1: 5, c1r1s2: 5 }, 2)],
      max: 5,
    })

    expect(cells.map((cell) => cell.style.getPropertyValue('--mix'))).toEqual(['100%', '100%'])
  })
})
