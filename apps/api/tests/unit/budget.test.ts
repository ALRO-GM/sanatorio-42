/**
 * El ritmo de la copia según la hora (`modules/replica/budget.ts`): la franja
 * de la noche en su zona horaria (con el cambio de hora), el gasto de lo que
 * sobra al final de cada hora y que con alguien en la web no hay noche.
 *
 * Funciones puras: el reloj es el instante que se les pasa.
 */

import { describe, expect, it } from 'vitest'

import {
  formatWindow,
  inWindow,
  isTimeZone,
  minutesOfDay,
  parseNightWindow,
} from '../../src/core/night-window.js'
import {
  CRITICAL_FLOOR,
  UPKEEP_PER_MINUTE,
  budgetAt,
  dayOnly,
  windowStart,
} from '../../src/modules/replica/budget.js'
import type { BudgetConfig } from '../../src/modules/replica/budget.js'

const CONFIG: BudgetConfig = {
  dayReserve: 300,
  nightReserve: 50,
  nightWindow: { from: 2 * 60, to: 6 * 60 },
  timeZone: 'Europe/Madrid',
  spendMinutes: 10,
  spendMargin: 30,
}

/** Un instante en UTC. */
const at = (iso: string): number => Date.parse(iso)

describe('franja de la noche', () => {
  it('lee HH:MM-HH:MM, también cruzando la medianoche, y la vuelve a escribir igual', () => {
    expect(parseNightWindow('02:00-06:00')).toEqual({ from: 120, to: 360 })
    expect(parseNightWindow(' 23:30 - 6:15 ')).toEqual({ from: 1410, to: 375 })
    expect(formatWindow(parseNightWindow('23:30-06:15'))).toBe('23:30-06:15')
    expect(formatWindow(null)).toBeNull()
  })

  it('vacía u «off» es que no hay noche', () => {
    expect(parseNightWindow('')).toBeNull()
    expect(parseNightWindow('OFF')).toBeNull()
  })

  it('rechaza lo que no es una franja', () => {
    for (const raw of ['2-6', '24:00-06:00', '02:60-06:00', '02:00-02:00', 'noche', '02:00']) {
      expect(() => parseNightWindow(raw)).toThrow(/Franja no válida/)
    }
  })

  it('sigue la hora de Madrid, con el cambio de hora de octubre', () => {
    const night = { from: 120, to: 360 }

    // Verano (UTC+2): las 02:00 de Madrid son las 00:00 UTC.
    expect(minutesOfDay(at('2026-07-10T00:00:00Z'), 'Europe/Madrid')).toBe(120)
    expect(inWindow(at('2026-07-10T00:00:00Z'), night, 'Europe/Madrid')).toBe(true)
    expect(inWindow(at('2026-07-10T03:59:00Z'), night, 'Europe/Madrid')).toBe(true)
    expect(inWindow(at('2026-07-10T04:00:00Z'), night, 'Europe/Madrid')).toBe(false)
    // Invierno (UTC+1), desde el 25 de octubre: una hora más tarde en UTC.
    expect(inWindow(at('2026-10-26T00:30:00Z'), night, 'Europe/Madrid')).toBe(false)
    expect(inWindow(at('2026-10-26T01:00:00Z'), night, 'Europe/Madrid')).toBe(true)
    expect(inWindow(at('2026-10-26T04:59:00Z'), night, 'Europe/Madrid')).toBe(true)
    expect(inWindow(at('2026-10-26T05:00:00Z'), night, 'Europe/Madrid')).toBe(false)
  })

  it('una franja que cruza la medianoche', () => {
    const late = { from: 23 * 60, to: 60 }

    expect(inWindow(at('2026-10-26T23:30:00Z'), late, 'UTC')).toBe(true)
    expect(inWindow(at('2026-10-26T00:59:00Z'), late, 'UTC')).toBe(true)
    expect(inWindow(at('2026-10-26T01:00:00Z'), late, 'UTC')).toBe(false)
    expect(inWindow(at('2026-10-26T22:59:00Z'), late, 'UTC')).toBe(false)
  })

  it('sabe qué zonas horarias existen', () => {
    expect(isTimeZone('Europe/Madrid')).toBe(true)
    expect(isTimeZone('Marte/Olympus')).toBe(false)
  })
})

describe('ritmo de la copia', () => {
  it('de día, lo de siempre: la reserva entera y con pausa', () => {
    const budget = budgetAt(CONFIG, at('2026-10-26T10:20:00Z'), false)

    expect(budget).toEqual({
      mode: 'day',
      bulkReserve: 300,
      floor: 300,
      paced: true,
      resetAt: at('2026-10-26T11:00:00Z'),
    })
  })

  it('de noche y sin nadie, baja hasta el suelo con una rampa para el mantenimiento', () => {
    // 03:00 en Madrid = 02:00 UTC, con la hora entera por delante.
    const start = budgetAt(CONFIG, at('2026-10-26T02:00:00Z'), false)

    expect(start.mode).toBe('night')
    expect(start.paced).toBe(false)
    expect(start.floor).toBe(50)
    // 50 + 3 × 60 = 230: no llega a la reserva de día.
    expect(start.bulkReserve).toBe(50 + UPKEEP_PER_MINUTE * 60)

    // A medida que se acerca la hora en punto, la copia puede bajar más.
    expect(budgetAt(CONFIG, at('2026-10-26T02:50:00Z'), false).bulkReserve).toBe(80)
    expect(budgetAt(CONFIG, at('2026-10-26T02:59:59Z'), false).bulkReserve).toBe(51)
  })

  it('con alguien en la web no hay noche: vuelve la reserva de día al instante', () => {
    const now = at('2026-10-26T02:20:00Z')

    expect(budgetAt(CONFIG, now, false).mode).toBe('night')
    expect(budgetAt(CONFIG, now, true)).toMatchObject({
      mode: 'day',
      bulkReserve: 300,
      paced: true,
    })
  })

  it('en los últimos minutos de la hora gasta lo que sobra, con margen para logins y visitas', () => {
    // 11:49:59 todavía es de día; 11:50, a diez minutos de renovarse, ya no.
    expect(budgetAt(CONFIG, at('2026-10-26T10:49:59Z'), false).mode).toBe('day')

    const spend = budgetAt(CONFIG, at('2026-10-26T10:50:00Z'), true)

    expect(spend).toMatchObject({ mode: 'spend', paced: false, floor: CRITICAL_FLOOR + 30 })
    expect(spend.bulkReserve).toBe(CRITICAL_FLOOR + 30 + UPKEEP_PER_MINUTE * 10)
    expect(budgetAt(CONFIG, at('2026-10-26T10:59:30Z'), true).bulkReserve).toBe(72)
  })

  it('de noche el final de la hora deja menos margen que de día', () => {
    const night = budgetAt(CONFIG, at('2026-10-26T02:59:00Z'), false)
    const day = budgetAt(CONFIG, at('2026-10-26T10:59:00Z'), false)

    expect(night.mode).toBe('night')
    expect(night.bulkReserve).toBeLessThan(day.bulkReserve)
  })

  it('el suelo de la noche nunca baja del de lo crítico, ni la rampa pasa de la reserva de día', () => {
    const reckless = { ...CONFIG, nightReserve: 0 }

    expect(budgetAt(reckless, at('2026-10-26T02:59:59Z'), false).floor).toBe(CRITICAL_FLOOR)

    const small = { ...CONFIG, dayReserve: 100 }

    expect(budgetAt(small, at('2026-10-26T02:00:00Z'), false).bulkReserve).toBe(100)
  })

  it('sin franja ni gasto final (lo de los tests de antes) siempre es de día', () => {
    for (const iso of ['2026-10-26T02:00:00Z', '2026-10-26T10:59:00Z']) {
      expect(budgetAt(dayOnly(300), at(iso), false).mode).toBe('day')
    }
  })

  it('la cuota de la hora empieza en punto', () => {
    expect(windowStart(at('2026-10-26T10:59:59.999Z'))).toBe(at('2026-10-26T10:00:00Z'))
    expect(windowStart(at('2026-10-26T11:00:00Z'))).toBe(at('2026-10-26T11:00:00Z'))
  })
})
