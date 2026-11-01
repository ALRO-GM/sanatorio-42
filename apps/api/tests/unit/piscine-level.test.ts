/**
 * El «círculo» de un piscinero: el último módulo de C que tiene aprobado, o 0
 * con el Shell (pedido por Alberto, 2026-11-01). Tiene que estar aprobado: en
 * curso o suspendido no cuenta.
 */

import { describe, expect, it } from 'vitest'

import { migrate, openDatabase } from '../../src/core/db/database.js'
import type { FortyTwoClient } from '../../src/integrations/forty-two/client.js'
import { createCurriculum } from '../../src/modules/replica/curriculum.js'

describe('nivel de un piscinero', () => {
  it('es el módulo de C aprobado más alto; con solo el Shell, 0', async () => {
    const db = await openDatabase({ url: 'file::memory:' })

    await migrate(db)
    await db.execute(
      `INSERT INTO projects (id, name, slug) VALUES
        (1, 'C Piscine Shell 00', 'c-piscine-shell-00'),
        (2, 'C Piscine C 00', 'c-piscine-c-00'),
        (3, 'C Piscine C 02', 'c-piscine-c-02'),
        (4, 'C Piscine C 06', 'c-piscine-c-06'),
        (5, 'C Piscine Exam 01', 'c-piscine-exam-01')`,
    )
    await db.execute(
      `INSERT INTO users (id, login, synced_at) VALUES
        (1, 'ana', '2026-11-01'), (2, 'leo', '2026-11-01'), (3, 'sol', '2026-11-01')`,
    )

    const row = (id: number, user: number, project: number, validated: number | null) =>
      `(${id}, ${user}, ${project}, 'finished', ${validated ?? 'NULL'}, '2026-11-01')`

    await db.execute(
      `INSERT INTO project_users (id, user_id, project_id, status, validated, synced_at) VALUES
        ${[
          // `ana`: C 02 aprobado y C 06 suspendido: un 2.
          row(1, 1, 2, 1),
          row(2, 1, 3, 1),
          row(3, 1, 4, 0),
          // `leo`: el Shell y un examen aprobados, nada de C: un 0.
          row(4, 2, 1, 1),
          row(5, 2, 5, 1),
          // `sol`: C 06 aprobado.
          row(6, 3, 4, 1),
        ].join(', ')}`,
    )

    const curriculum = createCurriculum({ db, client: {} as FortyTwoClient, hourlyReserve: 0 })

    expect(await curriculum.piscineLevelsOf(['ana', 'leo', 'sol', 'nadie'])).toEqual(
      new Map([
        ['ana', 2],
        ['leo', 0],
        ['sol', 6],
        ['nadie', 0],
      ]),
    )
  })
})
