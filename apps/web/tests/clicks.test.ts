// @vitest-environment jsdom
/**
 * Clics para el mapa de calor: de un elemento solo se guarda su etiqueta y la
 * clase que dice qué es, nunca su texto ni las clases de estado.
 */
import { describe, expect, it } from 'vitest'

import { elementKey } from '../src/shared/layout/clicks'

const make = (html: string): Element => {
  const holder = document.createElement('div')

  holder.innerHTML = html

  const element = holder.firstElementChild

  if (element === null) throw new Error('sin elemento')

  return element
}

describe('clave de un elemento pulsado', () => {
  it('etiqueta y primera clase con sentido, sin el texto', () => {
    expect(elementKey(make('<img class="avatar big" alt="ana">'))).toBe('img.avatar')
    expect(elementKey(make('<button class="active pill">Ana García</button>'))).toBe('button.pill')
    expect(elementKey(make('<h2>Tu expediente</h2>'))).toBe('h2')
  })

  it('sin clases útiles, solo la etiqueta; las raras no pasan', () => {
    expect(elementKey(make('<span class="on me">x</span>'))).toBe('span')
    expect(elementKey(make('<div class="a&b">x</div>'))).toBe('div')
  })
})
