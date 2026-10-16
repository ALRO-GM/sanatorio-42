/**
 * El círculo de un proyecto según lo que vota cada persona.
 */

import { describe, expect, it } from 'vitest'

import { agreement, learnedCircle } from '../../src/modules/replica/curriculum.rules.js'

const votes = (entries: Record<number, number>): Map<number, number> =>
  new Map(Object.entries(entries).map(([circle, count]) => [Number(circle), count]))

describe('círculo aprendido', () => {
  it('hacen falta dos personas, o el 5 % si son muchas', () => {
    expect(agreement(1)).toBe(2)
    expect(agreement(40)).toBe(2)
    expect(agreement(41)).toBe(3)
    expect(agreement(1000)).toBe(50)
    expect(agreement(0)).toBe(2)
  })

  it('un caso raro suelto no baja el proyecto de círculo', () => {
    // El Python Module 06 bis de producción: uno votaba 0 y el resto, 2.
    expect(learnedCircle(votes({ 0: 1, 2: 22 }))).toBe(2)
  })

  it('con acuerdo gana el más bajo: los retrasos solo suben', () => {
    expect(learnedCircle(votes({ 2: 5, 3: 30 }))).toBe(2)
    expect(learnedCircle(votes({ 1: 2, 2: 2 }))).toBe(1)
  })

  it('con mucha gente, dos que coinciden en algo raro no bastan', () => {
    expect(learnedCircle(votes({ 0: 2, 4: 100 }))).toBe(4)
    expect(learnedCircle(votes({ 0: 6, 4: 100 }))).toBe(0)
  })

  it('sin acuerdo en ninguno, la mediana', () => {
    expect(learnedCircle(votes({ 3: 1 }))).toBe(3)
    expect(learnedCircle(votes({ 0: 1, 1: 1, 2: 1 }))).toBe(1)
    expect(learnedCircle(votes({ 1: 1, 5: 1 }))).toBe(1)
  })

  it('sin votos, o con votos que no valen, no se sabe', () => {
    expect(learnedCircle(new Map())).toBeNull()
    expect(learnedCircle(votes({ 2: 0 }))).toBeNull()
    expect(learnedCircle(new Map([[-1, 5]]))).toBeNull()
    expect(learnedCircle(new Map([[1.5, 5]]))).toBeNull()
  })
})
