/**
 * Quién terminó, quién sigue, a quién se tragó el black hole y de quién no se
 * sabe (`docs/blackhole.md`). Los casos salen de la muestra real de Madrid.
 */
import { describe, expect, it } from 'vitest'

import { SETTLE_DAYS, STALE_DAYS, coreStatusOf } from '../../src/modules/stats/blackhole.rules.js'
import type { CoreFacts } from '../../src/modules/stats/blackhole.rules.js'

const NOW = Date.parse('2026-10-25T12:00:00Z')
const DAY = 86_400_000
const ago = (days: number): number => NOW - days * DAY

const cadet = (facts: Partial<CoreFacts> = {}): CoreFacts => ({
  grade: 'Cadet',
  endAt: null,
  blackholedAt: null,
  active: true,
  alumni: false,
  lastActivity: ago(3),
  closedCore: false,
  ...facts,
})

describe('estado en el common core', () => {
  it('normal: Transcender, Alumni o Member terminaron; un Cadet sin fin sigue', () => {
    const closed = { closedCore: true }

    expect(coreStatusOf(cadet({ grade: 'Transcender', ...closed }), NOW)).toBe('finished')
    expect(coreStatusOf(cadet({ grade: 'Alumni', active: false, ...closed }), NOW)).toBe('finished')
    expect(coreStatusOf(cadet({ grade: 'Member', ...closed }), NOW)).toBe('finished')
    // Alumni sin grado (filas viejas): también terminó.
    expect(coreStatusOf(cadet({ grade: null, alumni: true, ...closed }), NOW)).toBe('finished')
    // Sin ft_transcendence y el examen 6 aprobados, el grado no basta: `Alumni` del
    // plan de antes de 2020, cuentas de pruebas con el grado a mano.
    expect(coreStatusOf(cadet({ grade: 'Transcender' }), NOW)).toBe('unknown')
    expect(coreStatusOf(cadet({ grade: null, alumni: true }), NOW)).toBe('unknown')
    expect(coreStatusOf(cadet({ blackholedAt: ago(-60) }), NOW)).toBe('active')
  })

  it('normal: con fin, cuenta cerrada y tiempo de sobra, se lo tragó el black hole', () => {
    const eaten = cadet({
      endAt: ago(200),
      blackholedAt: ago(201),
      active: false,
      lastActivity: ago(250),
    })

    expect(coreStatusOf(eaten, NOW)).toBe('blackholed')
    // Quien se fue antes de su fecha también se fue sin terminar.
    expect(coreStatusOf({ ...eaten, blackholedAt: ago(10) }, NOW)).toBe('blackholed')
    // 42 retoca en lote filas aprobadas: eso no cuenta como volver (no es actividad).
    expect(coreStatusOf({ ...eaten, lastActivity: null }, NOW)).toBe('blackholed')
  })

  it('límite: el fin tiene que llevar los días de margen; volver a apuntarse lo pone en duda', () => {
    const fresh = cadet({ endAt: ago(SETTLE_DAYS - 1), active: false, lastActivity: null })

    expect(coreStatusOf(fresh, NOW)).toBe('unknown')
    expect(coreStatusOf({ ...fresh, endAt: ago(SETTLE_DAYS) }, NOW)).toBe('blackholed')

    const back = cadet({ endAt: ago(400), active: false, lastActivity: ago(400 - SETTLE_DAYS - 1) })

    expect(coreStatusOf(back, NOW)).toBe('unknown')
    expect(coreStatusOf({ ...back, lastActivity: ago(400 - SETTLE_DAYS) }, NOW)).toBe('blackholed')
  })

  it('límite: con la fecha pasada sigue si se mueve; quieto más de lo que toca, no se sabe', () => {
    const late = cadet({ blackholedAt: ago(200) })

    expect(coreStatusOf({ ...late, lastActivity: ago(STALE_DAYS) }, NOW)).toBe('active')
    expect(coreStatusOf({ ...late, lastActivity: ago(STALE_DAYS + 1) }, NOW)).toBe('unknown')
    expect(coreStatusOf({ ...late, lastActivity: null }, NOW)).toBe('unknown')
  })

  it('vacío: sin copia del cursus no se sabe nada', () => {
    expect(coreStatusOf(null, NOW)).toBe('unknown')
  })

  it('imprevisible: con fin pero cuenta activa, o sin fin y cuenta cerrada, no se sabe', () => {
    expect(coreStatusOf(cadet({ endAt: ago(300), active: true }), NOW)).toBe('unknown')
    expect(coreStatusOf(cadet({ endAt: ago(300), active: null }), NOW)).toBe('unknown')
    expect(coreStatusOf(cadet({ active: false }), NOW)).toBe('unknown')
    expect(coreStatusOf(cadet({ active: null }), NOW)).toBe('unknown')
    // Un grado que no conocemos no se da por terminado.
    expect(coreStatusOf(cadet({ grade: 'Learner' }), NOW)).toBe('active')
  })
})
