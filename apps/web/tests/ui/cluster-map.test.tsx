/**
 * El plano de clústeres con un campus grande como el de París: las cuentas de
 * las pastillas, el ajuste al ancho (caras, iniciales o puntos) y que moverse
 * por el plano no vuelva a pintar cientos de caras.
 */

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ClusterMap, MapCluster, MapSeat } from '@sanatorio/contracts'

import { ClusterMapView } from '../../src/features/map/ClusterMapView'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'
import { openApp } from './render'

/** Cuántas veces se ha pintado una cara: la guarda de rendimiento. */
const faces = vi.hoisted(() => ({ renders: 0 }))

vi.mock('../../src/features/map/SeatFace', () => ({
  SeatFace: ({ login }: { login: string }) => {
    faces.renders += 1

    return <img className="seat-face" alt="" data-login={login} />
  },
}))

const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Un clúster de `rows` × `seats` con gente en los puestos de `seated` (fila:puesto). */
function cluster(id: string, rows: number, seats: number, seated: string[]): MapCluster {
  const all: MapSeat[] = []

  for (let row = 1; row <= rows; row += 1) {
    for (let seat = 1; seat <= seats; seat += 1) {
      const busy = seated.includes(`${String(row)}:${String(seat)}`)
      const login = `${id}-${String(row)}-${String(seat)}`

      all.push({
        host: `${id}r${String(row)}s${String(seat)}`,
        row,
        seat,
        taken: false,
        broken: null,
        reservation: null,
        occupant: busy
          ? {
              login,
              image: `https://ejemplo.test/${login}.jpg`,
              projects: [],
              duty: null,
              me: false,
              online: false,
              circle: null,
              outer: false,
              finishedMine: null,
              focusUntil: null,
            }
          : null,
      })
    }
  }

  return {
    id,
    rows,
    seatsPerRow: seats,
    seats: all,
    occupied: seated.length,
    onDuty: 0,
  }
}

/** Un París de mentira: f1 grande y lleno, f1b vacío, los demás con poca gente. */
function paris(): ClusterMap {
  return {
    clusters: [
      cluster('f0', 13, 23, []),
      cluster('f1', 20, 30, ['1:1', '1:2', '2:5', '7:30', '20:30', '13:13', '4:4', '9:9']),
      cluster('f1b', 10, 21, []),
      cluster('f2', 12, 23, ['2:19', '10:17', '10:21']),
      cluster('f4', 14, 16, ['1:5']),
      cluster('f6', 13, 16, ['13:16', '9:16']),
    ],
    unplaced: [{ login: 'pez', host: 'POISSON POISSON POISSON 🐟🐟🐟', duty: null }],
    me: { circle: null, projects: [] },
  }
}

/** El ancho de la caja del plano, como si el navegador lo hubiera medido. */
let boxWidth = 0

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('sanatorio_lang', 'es')
  faces.renders = 0
  boxWidth = 0
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('map-scroll') ? boxWidth : 0
    },
  })
})

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
})

function show(map: ClusterMap = paris()) {
  return render(
    <I18nProvider>
      <ClusterMapView map={map} />
    </I18nProvider>,
  )
}

const grid = (): HTMLElement => must(document.querySelector<HTMLElement>('.seat-grid'), 'el plano')
const pill = (name: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${name}\\s*\\d+$`) })

describe('Clústeres grandes (París)', () => {
  it('cada pastilla F* lleva su número de gente sentada, también con 0', () => {
    show()

    const pills = within(screen.getByRole('group', { name: text('map.clusters') }))

    expect(pills.getByRole('button', { name: 'F0 0' })).toBeTruthy()
    expect(pills.getByRole('button', { name: 'F1 8' })).toBeTruthy()
    expect(pills.getByRole('button', { name: 'F1B 0' })).toBeTruthy()
    expect(pills.getByRole('button', { name: 'F2 3' })).toBeTruthy()
    expect(pills.getByRole('button', { name: 'F4 1' })).toBeTruthy()
    expect(pills.getByRole('button', { name: 'F6 2' })).toBeTruthy()
    // De entrada, el que más gente tiene.
    expect(pill('F1').getAttribute('aria-pressed')).toBe('true')
    // Las cuentas de broma del staff no hacen clúster: salen sin sitio.
    expect(screen.getByText(/POISSON/)).toBeTruthy()
  })

  it('sin medida (o si cabe) va a tamaño real, con caras y sin botones de tamaño', () => {
    show()

    expect(grid().classList.contains('density-faces')).toBe(true)
    expect(grid().style.getPropertyValue('--seat')).toBe('48px')
    expect(document.querySelectorAll('.seat-grid img')).toHaveLength(8)
    expect(screen.queryByRole('group', { name: text('map.zoomLabel') })).toBeNull()
  })

  it.each([
    [1300, 'density-faces', 8, 0],
    [800, 'density-initials', 0, 8],
    [330, 'density-dots', 0, 0],
  ])('en una caja de %i px: %s', (width, density, images, initials) => {
    boxWidth = width
    show()

    expect(grid().classList.contains(density)).toBe(true)
    expect(document.querySelectorAll('.seat-grid img')).toHaveLength(images)
    expect(document.querySelectorAll('.seat-grid .seat-initial')).toHaveLength(initials)
    // Los puestos siguen siendo botones con su nombre, aunque sean puntos.
    expect(screen.getByRole('button', { name: /^F1 · .* · f1-1-1$/ })).toBeTruthy()
  })

  it('«100 %» vuelve al tamaño real con caras, y se recuerda', async () => {
    const user = userEvent.setup()

    boxWidth = 330
    show()
    const zoom = within(screen.getByRole('group', { name: text('map.zoomLabel') }))

    await user.click(zoom.getByRole('button', { name: text('map.zoomFull') }))

    expect(grid().classList.contains('density-faces')).toBe(true)
    expect(grid().style.getPropertyValue('--seat')).toBe('40px')
    expect(JSON.parse(localStorage.getItem('sanatorio_map_look') ?? '{}')).toMatchObject({
      fit: false,
    })

    await user.click(zoom.getByRole('button', { name: text('map.zoomFit') }))

    expect(grid().classList.contains('density-dots')).toBe(true)
  })

  it('pasar el ratón o refrescar con lo mismo no vuelve a pintar las caras', () => {
    boxWidth = 1300
    const { rerender } = show()
    const first = faces.renders

    expect(first).toBe(8)

    const seat = screen.getByRole('button', { name: /f1-1-1$/ })

    fireEvent.mouseOver(seat)
    expect(document.querySelector('.seat-hover')).not.toBeNull()
    fireEvent.mouseOver(screen.getByRole('button', { name: /f1-2-5$/ }))
    fireEvent.mouseLeave(grid())
    expect(document.querySelector('.seat-hover')).toBeNull()

    // El sondeo trae un mapa nuevo con lo mismo dentro.
    rerender(
      <I18nProvider>
        <ClusterMapView map={paris()} />
      </I18nProvider>,
    )

    expect(faces.renders).toBe(first)
  })

  it('cambiar de clúster pinta solo las caras del nuevo', async () => {
    const user = userEvent.setup()

    boxWidth = 1300
    show()
    faces.renders = 0

    await user.click(pill('F2'))

    expect(faces.renders).toBe(3)
    expect(document.querySelectorAll('.seat-grid img')).toHaveLength(3)
    expect(grid().getAttribute('aria-label')).toBe('F2')
  })
})

describe('Clústeres en la web (API de mentira con París)', () => {
  it('al elegir París en el pie, las pastillas F* llevan su cuenta', async () => {
    await api.updateSettings({ campusId: 1 })
    await openApp('#/clusters')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })

    const pills = within(screen.getByRole('group', { name: text('map.clusters') }))
    const names = pills.getAllByRole('button').map((button) => button.textContent)

    expect(names).toEqual(['F041', 'F1267', 'F1B0', 'F279', 'F451', 'F674'])
    await api.updateSettings({ campusId: 22 })
  })
})
