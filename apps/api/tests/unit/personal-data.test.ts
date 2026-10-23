/**
 * El recorte de la descarga de datos personales, tabla a tabla: el tope de
 * filas y su aviso, la persona sin nada, y las listas de logins con entradas
 * raras (un login que es trozo de otro, comas, JSON que no es una lista).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, openDatabase } from '../../src/core/db/database.js'
import type { Db } from '../../src/core/db/database.js'
import { personalData } from '../../src/core/db/personal-data.js'
import type { PersonalTable } from '../../src/core/db/personal-data.js'

const ANA = { login: 'ana', userId: null }
const ACCEPTANCES: PersonalTable = { table: 'legal_acceptances', logins: ['login'] }
const CHECKS: PersonalTable = {
  table: 'therapy_checks',
  lists: [{ column: 'present', format: 'csv' }],
}
const BROADCASTS: PersonalTable = {
  table: 'broadcasts',
  logins: ['from_login'],
  lists: [{ column: 'audience', format: 'json', path: '$.logins' }],
}

describe('descarga de datos personales', () => {
  let db: Db

  beforeEach(async () => {
    db = await openDatabase({ url: 'file::memory:' })
  })

  afterEach(() => {
    closeDatabase(db)
  })

  /** `n` aceptaciones de `ana`, de una vez. */
  const accept = (n: number) =>
    db.execute({
      sql: `WITH RECURSIVE seq(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM seq WHERE i < ?)
            INSERT INTO legal_acceptances (login, version, accepted_at) SELECT 'ana', 'v' || i, 'x' FROM seq`,
      args: [n],
    })

  it('el tope corta justo en el límite y lo dice', async () => {
    await accept(3)
    const justo = await personalData(db, [ACCEPTANCES], ANA, 3)

    expect(justo.legal_acceptances).toMatchObject({ truncated: false, source: 'sanatorio' })
    expect(justo.legal_acceptances?.rows).toHaveLength(3)

    // Una más que el tope: siguen saliendo tres, pero avisando.
    await db.execute(
      `INSERT INTO legal_acceptances (login, version, accepted_at) VALUES ('ana', 'otra', 'x')`,
    )
    const pasado = await personalData(db, [ACCEPTANCES], ANA, 3)

    expect(pasado.legal_acceptances?.truncated).toBe(true)
    expect(pasado.legal_acceptances?.rows).toHaveLength(3)
  })

  it('quien no tiene nada recibe cada tabla vacía, y una tabla sin columnas de persona no sale', async () => {
    const data = await personalData(db, [ACCEPTANCES, CHECKS, { table: 'campuses' }], ANA)

    expect(data).toEqual({
      legal_acceptances: { source: 'sanatorio', truncated: false, rows: [] },
      therapy_checks: { source: 'sanatorio', truncated: false, rows: [] },
    })
    // Sin id de 42, lo que va por id ni se consulta.
    expect(await personalData(db, [{ table: 'presence', userIds: ['user_id'] }], ANA)).toEqual({})
  })

  it('en una lista, «an» no es «ana» y una coma suelta no cuela a nadie', async () => {
    await db.execute(
      `INSERT INTO therapy_checks (group_id, day, slot, present, checked_at) VALUES
         (1, 'd1', 0, 'an,leo', 'x'), (1, 'd2', 0, 'anab', 'x'), (1, 'd3', 0, ',ana,', 'x'),
         (1, 'd4', 0, 'leo,ana', 'x'), (1, 'd5', 0, '', 'x'), (1, 'd6', 0, 'ANA', 'x')`,
    )

    const data = await personalData(db, [CHECKS], ANA)

    expect(data.therapy_checks?.rows.map((row) => row.day)).toEqual(['d3', 'd4'])
    expect(data.therapy_checks?.rows.every((row) => row.present === 'ana')).toBe(true)
  })

  it('un JSON sin lista, con otro tipo o roto no da nada a nadie', async () => {
    await db.execute(
      `INSERT INTO broadcasts (from_login, title, body, audience, created_at) VALUES
         ('eva', 'campus', 'b', '{"kind":"campus","campusId":22}', 'x'),
         ('eva', 'numero', 'b', '{"kind":"logins","logins":[1,"ana "]}', 'x'),
         ('eva', 'texto', 'b', '{"kind":"logins","logins":"ana"}', 'x'),
         ('eva', 'bien', 'b', '{"kind":"logins","logins":["leo","ana"]}', 'x')`,
    )

    const data = await personalData(db, [BROADCASTS], ANA)

    expect(data.broadcasts?.rows.map((row) => row.title)).toEqual(['bien'])
    expect(data.broadcasts?.rows[0]?.audience).toBe('ana')
    expect(JSON.stringify(data)).not.toContain('leo')
  })

  it('`give` por varias columnas junta lo de todas; sin `give`, la fila entera', async () => {
    await db.execute(
      `INSERT INTO broadcasts (from_login, title, body, audience, created_at)
       VALUES ('ana', 'a mí misma', 'cuerpo', '{"kind":"logins","logins":["ana"]}', 'x')`,
    )

    const spec: PersonalTable = {
      ...BROADCASTS,
      give: { from_login: ['id', 'title'], audience: ['id', 'audience'] },
    }
    const [row] = (await personalData(db, [spec], ANA)).broadcasts?.rows ?? []

    expect(row).toEqual({ id: 1, title: 'a mí misma', audience: 'ana' })

    const [whole] = (await personalData(db, [BROADCASTS], ANA)).broadcasts?.rows ?? []

    expect(whole).toMatchObject({ from_login: 'ana', body: 'cuerpo', audience: 'ana' })
  })
})
