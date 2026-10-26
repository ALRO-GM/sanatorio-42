/**
 * La comprobación de plurales de `npm run textos`: un texto que cuenta algo en
 * plural («{n} días») sin sus formas `.one` y `.many` diría «1 días».
 */
import { describe, expect, it } from 'vitest'

import { readGroup } from '../tools/textos'
import { ALWAYS_MANY, needsPlural } from '../tools/textos-plural'

const row = (key: string, es: string) => ({
  key,
  text: { es, en: '', ca: '', eu: '', fr: '' },
})

describe('plurales que faltan', () => {
  it('avisa de una cantidad delante de un nombre en plural', () => {
    expect(needsPlural(row('x.days', '{n} días'))).toBe(true)
    expect(needsPlural(row('x.left', 'quedan {left} días'))).toBe(true)
    expect(needsPlural(row('x.of', '{taken} de {capacity} plazas'))).toBe(true)
    expect(needsPlural(row('x.rows', 'Borrar las {n} filas'))).toBe(true)
  })

  it('deja en paz lo que ya tiene sus formas, las abreviaturas y lo que no es un nombre contado', () => {
    expect(needsPlural(row('x.days.one', '{n} día'))).toBe(false)
    expect(needsPlural(row('x.days.many', '{n} días'))).toBe(false)
    expect(needsPlural(row('x.wait', 'Piénsalo: {n} s…'))).toBe(false)
    expect(needsPlural(row('x.more', '+{n} más'))).toBe(false)
    expect(needsPlural(row('x.label', 'Personas: {n}'))).toBe(false)
    // «díasx» no es «días»: la palabra tiene que acabar ahí.
    expect(needsPlural(row('x.word', '{n} díasx'))).toBe(false)
    // Code Clicker no pasa por `tn`.
    expect(needsPlural(row('game.ui.x', '{n} líneas'))).toBe(false)
    // Lo que nunca vale 1, con su porqué.
    expect(needsPlural(row('countdown.coming', '{n} días'))).toBe(false)
  })

  it('las tablas de la web están en orden y las excepciones existen todas', () => {
    const rows = readGroup('')
    const keys = new Set(rows.map((each) => each.key))

    expect(rows.filter(needsPlural).map((each) => each.key)).toEqual([])
    expect(Object.keys(ALWAYS_MANY).filter((key) => !keys.has(key))).toEqual([])
  })
})
