/**
 * Clústeres grandes (`docs/asientos.md`): cuánto mide cada puesto para caber a
 * lo ancho, y cómo se llaman los clústeres de París.
 */

import { describe, expect, it } from 'vitest'

import { fitSeats, FULL_SEAT, FULL_SEAT_NARROW, MIN_SEAT, ROW_LABEL } from '../src/features/map/fit'
import { clusterName, parseSeat, seatName } from '../src/shared/seats'

/** Lo que ocupa una fila de `columns` puestos con ese ajuste. */
const rowWidth = (columns: number, fit: { size: number; gap: number }): number =>
  ROW_LABEL + columns * fit.size + (columns - 1) * fit.gap

const t = (key: string, vars: Record<string, string | number> = {}): string =>
  key === 'map.cluster'
    ? `Clúster ${String(vars.n ?? '')}`
    : `${String(vars.cluster ?? '')} · Fila ${String(vars.row ?? '')} · Puesto ${String(vars.seat ?? '')}`

describe('fitSeats', () => {
  it('lo que cabe va a tamaño real, con caras y sin botón de tamaño', () => {
    // Madrid: 8 puestos por fila en una caja de escritorio.
    expect(fitSeats(900, 8)).toEqual({
      size: FULL_SEAT,
      gap: 9,
      density: 'faces',
      overflows: false,
    })
  })

  it('un clúster de París se encoge hasta caber, y aún se ven las caras', () => {
    const fit = fitSeats(1000, 23)

    expect(fit.overflows).toBe(true)
    expect(fit.density).toBe('faces')
    expect(fit.size).toBeLessThan(FULL_SEAT)
    expect(rowWidth(23, fit)).toBeLessThanOrEqual(1000)
  })

  it('con menos sitio pasa a iniciales y luego a puntos', () => {
    const initials = fitSeats(800, 30)
    const dots = fitSeats(330, 30)

    expect(initials.density).toBe('initials')
    expect(rowWidth(30, initials)).toBeLessThanOrEqual(800)
    expect(dots.density).toBe('dots')
    expect(rowWidth(30, dots)).toBeLessThanOrEqual(330)
  })

  it('por debajo del mínimo no encoge más: el plano se desliza', () => {
    const fit = fitSeats(120, 30)

    expect(fit).toMatchObject({ size: MIN_SEAT, density: 'dots', overflows: true })
    expect(rowWidth(30, fit)).toBeGreaterThan(120)
  })

  it('al 100 % va a tamaño real aunque no quepa', () => {
    expect(fitSeats(600, 30, false)).toEqual({
      size: FULL_SEAT,
      gap: 9,
      density: 'faces',
      overflows: true,
    })
  })

  it('en el móvil el tamaño real es algo menor, y sin medida todavía, tamaño real', () => {
    expect(fitSeats(360, 6).size).toBe(FULL_SEAT_NARROW)
    expect(fitSeats(null, 30)).toMatchObject({ size: FULL_SEAT, overflows: false })
    expect(fitSeats(0, 30)).toMatchObject({ size: FULL_SEAT, overflows: false })
  })

  it('un clúster vacío o de una columna no rompe la cuenta', () => {
    expect(fitSeats(300, 0).density).toBe('faces')
    expect(fitSeats(300, 1).size).toBe(FULL_SEAT_NARROW)
  })
})

describe('clústeres de París', () => {
  it('lee los puestos f*, también los de la entreplanta (f1b)', () => {
    expect(parseSeat('f1r11s15')).toEqual({ cluster: 'f1', row: 11, seat: 15 })
    expect(parseSeat('f1br2s8')).toEqual({ cluster: 'f1b', row: 2, seat: 8 })
    expect(parseSeat('POISSON POISSON POISSON 🐟🐟🐟')).toBeNull()
  })

  it('los nombra como allí, en mayúsculas, y deja los raros como vienen', () => {
    expect(clusterName('f1b', t)).toBe('F1B')
    expect(clusterName('f0', t)).toBe('F0')
    expect(clusterName('e2', t)).toBe('E2')
    expect(clusterName('c3', t)).toBe('Clúster 3')
    expect(clusterName('bess-f1', t)).toBe('bess-f1')
    expect(seatName('f1br2s8', t)).toBe('F1B · Fila 2 · Puesto 8')
  })
})
