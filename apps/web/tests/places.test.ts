/**
 * Puestos del cluster y franjas de la guardia: lectura y escritura de textos.
 */

import { describe, expect, it } from 'vitest'

import { duration, slotsOf, toMinutes, toTime, windowsOf } from '../src/features/help/time'
import { clusterName, parseSeat, seatName } from '../src/shared/seats'

const t = (key: string, vars: Record<string, string | number> = {}): string =>
  key === 'map.cluster'
    ? `Cluster ${vars.n ?? ''}`
    : `${vars.cluster ?? ''} · Fila ${vars.row ?? ''} · PC ${vars.seat ?? ''}`

describe('puestos', () => {
  it('lee el cluster, la fila y el puesto de un nombre de 42', () => {
    expect(parseSeat('c2r10s1')).toEqual({ cluster: 'c2', row: 10, seat: 1 })
    expect(parseSeat(' C1R2S4 ')).toEqual({ cluster: 'c1', row: 2, seat: 4 })
    expect(parseSeat('sala-de-juntas')).toBeNull()
  })

  it('lo dice con palabras, y deja como viene lo que no entiende', () => {
    expect(seatName('c2r10s1', t)).toBe('Cluster 2 · Fila 10 · PC 1')
    expect(seatName('made-f0Ar4s2', t)).toBe('made-f0a · Fila 4 · PC 2')
    expect(seatName('biblioteca', t)).toBe('biblioteca')
    expect(clusterName('c3', t)).toBe('Cluster 3')
    expect(clusterName('bocal', t)).toBe('bocal')
  })
})

describe('franjas de la guardia', () => {
  it('pasa de horas a minutos y vuelta', () => {
    expect(toMinutes('17:30')).toBe(1050)
    expect(toTime(1050)).toBe('17:30')
    expect(toTime(480)).toBe('08:00')
    expect(duration(90)).toBe('1 h 30 min')
    expect(duration(120)).toBe('2 h')
    expect(duration(45)).toBe('45 min')
  })

  it('parte las franjas en medias horas y junta las contiguas al volver', () => {
    const slots = slotsOf([
      { start: '17:00', end: '18:00' },
      { start: '19:30', end: '20:00' },
    ])

    expect([...slots]).toEqual([1020, 1050, 1170])
    slots.add(1080)
    expect(windowsOf(slots)).toEqual([
      { start: '17:00', end: '18:30' },
      { start: '19:30', end: '20:00' },
    ])
    expect(windowsOf(new Set())).toEqual([])
  })
})
