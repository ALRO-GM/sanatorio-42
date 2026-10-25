import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SeatHeat, SeatHeatCell } from '@sanatorio/contracts'

import { SeatHeatMap } from '../../src/features/map/SeatHeatMap'
import { DEFAULT_LOOK } from '../../src/features/map/look'
import type { MapLook } from '../../src/features/map/look'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Horas de cada puesto de un clúster de 2 filas y 3 puestos; lo que no está, 0. */
function heatOf(hours: Record<string, number>): SeatHeat {
  const cells: SeatHeatCell[] = []

  for (let row = 1; row <= 2; row += 1) {
    for (let seat = 1; seat <= 3; seat += 1) {
      const host = `c1r${String(row)}s${String(seat)}`
      const used = hours[host] ?? 0

      cells.push({ host, row, seat, hours: used, people: used === 0 ? 0 : used > 30 ? 9 : 1 })
    }
  }

  return {
    days: 30,
    clusters: [
      { id: 'c1', rows: 2, seatsPerRow: 3, cells },
      // Un clúster menos usado: no es el que se abre de entrada.
      {
        id: 'c2',
        rows: 1,
        seatsPerRow: 1,
        cells: [{ host: 'c2r1s1', row: 1, seat: 1, hours: 1, people: 1 }],
      },
    ],
    max: Math.max(0, ...Object.values(hours)),
  }
}

const HEAT = heatOf({ c1r1s1: 37, c1r2s3: 4 })

function show(heat: SeatHeat, look?: Partial<MapLook>): HTMLElement[] {
  if (look !== undefined) {
    localStorage.setItem('sanatorio_map_look', JSON.stringify({ ...DEFAULT_LOOK, ...look }))
  }

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
  it('de fábrica, como el mapa: la fila 1 abajo, el puesto 1 a la izquierda y desplazados', () => {
    const cells = show(HEAT)

    expect(hosts(cells)).toEqual(['c1r2s1', 'c1r2s2', 'c1r2s3', 'c1r1s1', 'c1r1s2', 'c1r1s3'])
    // Impar mira al norte (arriba); par, al sur.
    expect(cells[0]?.classList).toContain('screen-up')
    expect(cells[1]?.classList).toContain('screen-down')
    expect(document.querySelector('.heat-grid')?.classList).toContain('staggered')
    // El que nadie ha usado, vacío; el usado, con su color.
    expect(cells[1]?.classList).toContain('free')
    expect(cells[3]?.classList).toContain('used')
    expect(cells[3]?.style.getPropertyValue('--heat')).toBe('1')
    // Se abre el clúster más usado.
    expect(screen.getByRole('button', { name: /Clúster 1/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('sigue el plano guardado en el mapa: filas y puestos al revés, otro sentido y sin desplazar', () => {
    const cells = show(HEAT, { flipRows: true, flipSeats: true, flipFacing: true, flat: true })

    expect(hosts(cells)).toEqual(['c1r1s3', 'c1r1s2', 'c1r1s1', 'c1r2s3', 'c1r2s2', 'c1r2s1'])
    // c1r1s3: impar, que con «hacia dónde miran» al revés mira al sur, que con
    // las filas al revés queda arriba.
    expect(cells[0]?.classList).toContain('screen-up')
    expect(document.querySelector('.heat-grid')?.classList).not.toContain('staggered')
  })

  it('solo las filas al revés: la fila 1 arriba y los puestos en su orden', () => {
    expect(hosts(show(HEAT, { flipRows: true }))).toEqual([
      'c1r1s1',
      'c1r1s2',
      'c1r1s3',
      'c1r2s1',
      'c1r2s2',
      'c1r2s3',
    ])
  })

  it('cada puesto dice sus horas y su gente, al pasar o al enfocar y a quien no ve', () => {
    show(HEAT)

    const busiest = screen.getByRole('img', { name: 'c1r1s1 · 37 h · 9 personas' })

    expect(screen.getByRole('img', { name: 'c1r2s3 · 4 h · 1 persona' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'c1r1s2 · 0 h · 0 personas' })).toBeTruthy()
    fireEvent.focus(busiest)
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toContain(
      'c1r1s1 · 37 h · 9 personas',
    )
    fireEvent.blur(busiest)
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull()
    fireEvent.mouseEnter(busiest)
    expect(screen.getByRole('tooltip', { hidden: true })).toBeTruthy()
    fireEvent.mouseLeave(busiest)
    // La leyenda va de 0 al máximo.
    expect(screen.getByText(text('seats.heat.unused'))).toBeTruthy()
    expect(document.querySelector('.heat-legend')?.textContent).toContain('0 h')
    expect(document.querySelector('.heat-legend')?.textContent).toContain('37 h')
  })

  it('«Ver como tabla»: los puestos del clúster, del más al menos usado', () => {
    show(HEAT)
    fireEvent.click(screen.getByText(text('seats.heat.table')))

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)

    expect(rows).toHaveLength(6)
    expect(rows[0]?.textContent).toContain('c1r1s137')
    expect(rows[1]?.textContent).toContain('c1r2s34')
    expect(rows[5]?.textContent).toContain('0')
  })

  it('se cambia de clúster con sus pastillas', () => {
    show(HEAT)
    fireEvent.click(screen.getByRole('button', { name: /Clúster 2/ }))

    expect(hosts([...document.querySelectorAll<HTMLElement>('.heat-cell[data-host]')])).toEqual([
      'c2r1s1',
    ])
  })

  it('sin puestos conocidos lo dice, y sin horas todo sale vacío', () => {
    render(
      <I18nProvider>
        <SeatHeatMap heat={{ days: 7, clusters: [], max: 0 }} />
      </I18nProvider>,
    )
    expect(screen.getByText(text('seats.heat.empty'))).toBeTruthy()
    cleanup()

    // Sin horas en el clúster 1, se abre el 2, que tiene alguna.
    expect(hosts(show(heatOf({})))).toEqual(['c2r1s1'])
    fireEvent.click(screen.getByRole('button', { name: /Clúster 1/ }))

    const cells = [...document.querySelectorAll<HTMLElement>('.heat-cell[data-host]')]

    expect(cells).toHaveLength(6)
    expect(cells.every((cell) => cell.classList.contains('free'))).toBe(true)
  })
})
