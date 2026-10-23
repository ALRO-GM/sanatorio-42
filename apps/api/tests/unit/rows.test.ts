/**
 * Las columnas de libSQL llegan sin tipo (número, bigint, texto, nulo): el
 * criterio para leerlas está en un sitio y se prueba con lo que manda cada
 * motor (SQLite local y Turso).
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  fromBoolOrNull,
  toBool,
  toBoolOrNull,
  toJson,
  toNumber,
  toNumberOrNull,
  toText,
  toTextOrNull,
} from '../../src/core/db/rows.js'
import { inList, listArg } from '../../src/core/db/sql.js'
import { openDatabase } from '../../src/core/db/database.js'

describe('lectura de columnas', () => {
  it('texto: lo que haya, y nunca "null"', () => {
    expect(toText('hola')).toBe('hola')
    expect(toText(42)).toBe('42')
    expect(toText(42n)).toBe('42')
    expect(toText(null)).toBe('')
    expect(toTextOrNull('hola')).toBe('hola')
    expect(toTextOrNull(null)).toBeNull()
    expect(toTextOrNull(42)).toBeNull()
  })

  it('números: como número, bigint o texto; vacío es 0 o null según se pida', () => {
    expect(toNumber(7)).toBe(7)
    expect(toNumber(7n)).toBe(7)
    expect(toNumber('7')).toBe(7)
    expect(toNumber(null)).toBe(0)
    expect(toNumberOrNull(null)).toBeNull()
    expect(toNumberOrNull(undefined)).toBeNull()
    expect(toNumberOrNull('0')).toBe(0)
  })

  it('booleanos guardados como 0/1, con el "aún no se sabe" aparte', () => {
    expect(toBool(1)).toBe(true)
    expect(toBool(1n)).toBe(true)
    expect(toBool(0)).toBe(false)
    expect(toBool(null)).toBe(false)
    expect(toBoolOrNull(null)).toBeNull()
    expect(toBoolOrNull(1)).toBe(true)
    expect(toBoolOrNull(0)).toBe(false)
    expect(fromBoolOrNull(true)).toBe(1)
    expect(fromBoolOrNull(false)).toBe(0)
    expect(fromBoolOrNull(null)).toBeNull()
    expect(fromBoolOrNull(undefined)).toBeNull()
  })

  it('JSON: con su forma, o null si no hay, no es JSON o es de otra forma', () => {
    const shape = z.object({ at: z.number(), logins: z.array(z.string()) })

    expect(toJson('{"at":1,"logins":["ana"]}', shape)).toEqual({ at: 1, logins: ['ana'] })
    expect(toJson('{"at":"x"}', shape)).toBeNull()
    expect(toJson('no es json', shape)).toBeNull()
    expect(toJson('', shape)).toBeNull()
    expect(toJson(null, shape)).toBeNull()
    expect(toJson(12, shape)).toBeNull()
  })
})

describe('listas en SQL', () => {
  it('una lista es un solo parámetro, y vacía no casa con nada', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    await db.execute('CREATE TABLE t (id INTEGER, name TEXT)')
    await db.execute("INSERT INTO t VALUES (1, 'ana'), (2, 'leo'), (3, 'eva')")

    const byId = await db.execute({
      sql: `SELECT name FROM t WHERE ${inList('id')} ORDER BY id`,
      args: [listArg([3, 1])],
    })

    expect(byId.rows.map((row) => row.name)).toEqual(['ana', 'eva'])

    const byName = await db.execute({
      sql: `SELECT id FROM t WHERE ${inList('name')}`,
      args: [listArg(['leo'])],
    })

    expect(byName.rows.map((row) => row.id)).toEqual([2])
    expect(
      (await db.execute({ sql: `SELECT id FROM t WHERE ${inList('id')}`, args: [listArg([])] }))
        .rows,
    ).toEqual([])

    // Más de 999 valores: lo que un IN (?, ?, …) a mano no aguanta.
    const many = Array.from({ length: 2000 }, (_, index) => index)
    const big = await db.execute({
      sql: `SELECT COUNT(*) AS n FROM t WHERE ${inList('id')}`,
      args: [listArg(many)],
    })

    expect(toNumber(big.rows[0]?.n)).toBe(3)
    db.close()
  })
})
