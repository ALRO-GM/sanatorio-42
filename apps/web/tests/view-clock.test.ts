/**
 * El reloj del tiempo de uso: a qué cuenta va cada tramo según cómo estaba la
 * ventana.
 */

import { describe, expect, it } from 'vitest'

import { byLocalHour } from '../src/features/admin/StatsPanel'
import { durationText } from '../src/shared/time'
import { createViewClock } from '../src/shared/layout/view-clock'

const SECOND = 1000
const MINUTE = 60 * SECOND

describe('reloj de uso', () => {
  it('reparte el tiempo de una sección entre vista, segundo plano y oculta', () => {
    const clock = createViewClock(MINUTE)

    clock.open('nav.tablon', 0, 'seen')
    // 40 s mirándola, 15 s con otra ventana delante, 20 s con la pestaña oculta.
    clock.settle(40 * SECOND, 'back')
    clock.settle(55 * SECOND, 'hidden')
    clock.settle(75 * SECOND, 'seen')

    expect(clock.take()).toEqual({ 'nav.tablon': [40, 15, 20] })
    // Lo que ya se ha llevado no se vuelve a contar.
    expect(clock.take()).toEqual({})
  })

  it('al cambiar de sección, cada una se lleva su rato', () => {
    const clock = createViewClock(MINUTE)

    clock.open('nav.tablon', 0, 'seen')
    clock.open('nav.red', 30 * SECOND, 'seen')
    clock.settle(50 * SECOND, 'seen')

    expect(clock.take()).toEqual({ 'nav.tablon': [30, 0, 0], 'nav.red': [20, 0, 0] })
  })

  it('un tramo enorme es el portátil dormido: solo cuenta un latido', () => {
    const clock = createViewClock(MINUTE)

    clock.open('nav.tablon', 0, 'hidden')
    // Ocho horas sin que el reloj se moviera.
    clock.settle(8 * 60 * MINUTE, 'seen')

    expect(clock.take()).toEqual({ 'nav.tablon': [0, 0, 60] })
  })

  it('las fracciones de segundo se guardan para el siguiente envío', () => {
    const clock = createViewClock(MINUTE)

    clock.open('nav.tablon', 0, 'seen')
    clock.settle(1500, 'seen')
    expect(clock.take()).toEqual({ 'nav.tablon': [1, 0, 0] })
    clock.settle(2100, 'seen')
    // 500 ms que sobraron más 600 ms nuevos: otro segundo entero.
    expect(clock.take()).toEqual({ 'nav.tablon': [1, 0, 0] })
  })

  it('si el envío falla, lo que se llevó vuelve a la cuenta', () => {
    const clock = createViewClock(MINUTE)

    clock.open('nav.tablon', 0, 'seen')
    clock.settle(10 * SECOND, 'seen')

    const taken = clock.take()

    clock.giveBack(taken)
    clock.settle(15 * SECOND, 'seen')
    expect(clock.take()).toEqual({ 'nav.tablon': [15, 0, 0] })
  })

  it('antes de abrir ninguna sección no se cuenta nada', () => {
    const clock = createViewClock(MINUTE)

    clock.settle(30 * SECOND, 'seen')
    expect(clock.take()).toEqual({})
  })
})

describe('estadísticas', () => {
  it('junta las horas de varios días en las 24 del día', () => {
    const row = { clicks: 1, seen: 60, back: 0, hidden: 30, requests: 5, bytes: 1000, people: 1 }
    const day = byLocalHour([
      { day: '2026-10-05', hour: 10, ...row },
      { day: '2026-10-06', hour: 10, ...row },
      { day: '2026-10-06', hour: 18, ...row },
    ])

    expect(day).toHaveLength(24)
    expect(day.reduce((total, hour) => total + hour.seen, 0)).toBe(180)
    // Las dos de la misma hora caen en la misma barra.
    expect(Math.max(...day.map((hour) => hour.seen))).toBe(120)
  })

  it('escribe las duraciones de forma que se lean', () => {
    expect(durationText(40)).toBe('40 s')
    expect(durationText(7 * 60)).toBe('7 min')
    expect(durationText(2 * 3600 + 5 * 60)).toBe('2 h 05 min')
  })
})
