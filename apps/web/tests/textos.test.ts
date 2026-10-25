/**
 * Las tablas de textos: el lector de CSV, los errores que dicen tabla y línea y
 * el diccionario de cada idioma (lo vacío cae al español).
 */
import { describe, expect, it } from 'vitest'

import { dictionaryOf, parseCsv, readTable, readTables } from '../tools/textos'

const HEAD = 'clave,contexto,es,en,ca,eu,fr'

describe('lector de CSV', () => {
  it('separa por comas y por líneas', () => {
    expect(parseCsv('a,b\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('entiende comillas con comas, saltos de línea y comillas dentro', () => {
    expect(parseCsv('"uno, dos","línea\nnueva","dice ""hola"""\n')).toEqual([
      ['uno, dos', 'línea\nnueva', 'dice "hola"'],
    ])
  })

  it('acepta finales de línea de Windows y la última línea sin salto', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('respeta los campos vacíos, también al final', () => {
    expect(parseCsv(',,\n')).toEqual([['', '', '']])
    expect(parseCsv('a,\n')).toEqual([['a', '']])
    expect(parseCsv('')).toEqual([])
  })
})

describe('tablas', () => {
  it('lee cada fila con su tema y su línea, y se salta las vacías', () => {
    const rows = readTable(
      'prueba',
      `${HEAD}\nx.uno,Botón,Uno,One,U,Bat,Un\n,,,,,,\nx.dos,Título,Dos,,,,\n`,
    )

    expect(rows.map((row) => [row.key, row.line, row.theme])).toEqual([
      ['x.uno', 2, 'prueba'],
      ['x.dos', 4, 'prueba'],
    ])
    expect(rows[0]?.text).toEqual({ es: 'Uno', en: 'One', ca: 'U', eu: 'Bat', fr: 'Un' })
  })

  it('una cabecera distinta o una fila sin todas sus columnas es un error con su sitio', () => {
    expect(() => readTable('mala', 'clave,es\n')).toThrow(/mala\.csv: la cabecera/)
    expect(() => readTable('corta', `${HEAD}\nx.uno,Botón,Uno\n`)).toThrow(/corta\.csv:2/)
  })

  it('el diccionario de un idioma no lleva lo que está vacío', () => {
    const rows = readTable('prueba', `${HEAD}\nx.uno,C,Uno,One,,,\nx.dos,C,Dos,,,,\n`)

    expect(dictionaryOf(rows, 'en')).toEqual({ 'x.uno': 'One' })
    expect(dictionaryOf(rows, 'ca')).toEqual({})
    expect(dictionaryOf(rows, 'fr')).toEqual({})
    expect(dictionaryOf(rows, 'es')).toEqual({ 'x.uno': 'Uno', 'x.dos': 'Dos' })
  })

  it('las tablas de verdad se leen enteras y sin claves repetidas', () => {
    const rows = readTables()
    const keys = rows.map((row) => row.key)

    expect(rows.length).toBeGreaterThan(1000)
    expect(new Set(keys).size).toBe(keys.length)
    expect(rows.every((row) => row.text.es !== '' && row.context !== '')).toBe(true)
  })
})
