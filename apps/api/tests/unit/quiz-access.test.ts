/**
 * Qué salas de Not-games ve cada cual (pedido por Alberto, 2026-11-01): cada
 * grupo las suyas (estudiantes con estudiantes, piscineros con piscineros) y,
 * de momento, cada campus las suyas. Quien administra puede abrirlas a todos
 * los campus para los concursos entre campus.
 */
import { describe, expect, it } from 'vitest'

import { createAudience } from '../../src/core/audience.js'
import { migrate, openDatabase } from '../../src/core/db/database.js'
import { createQuizRepository } from '../../src/modules/quiz/quiz.repository.js'
import { createQuizService } from '../../src/modules/quiz/quiz.service.js'
import { createQuizScope, roomAccess } from '../../src/modules/quiz/room-access.js'
import { actor, expectCode, MADRID } from '../helpers/community.js'

async function setup() {
  const db = await openDatabase({ url: 'file::memory:' })

  await migrate(db)

  // `pia` y `pol` están en la piscina de Madrid; los demás son estudiantes.
  const audience = createAudience(
    (campusId) => Promise.resolve(campusId === MADRID ? ['pia', 'pol'] : []),
    Date.now,
    () => Promise.resolve([]),
    () => Promise.resolve(['pia', 'pol']),
  )
  const scope = createQuizScope({ db })
  const quiz = createQuizService({
    quiz: createQuizRepository(db),
    bank: [],
    circlesOf: () => Promise.resolve(new Map()),
    access: roomAccess(audience, scope.crossCampus),
  })

  return { quiz, scope }
}

const pool = (login: string) => actor(login, { pool: true })

describe('salas de Not-games', () => {
  it('cada grupo ve y entra solo en las salas de su grupo', async () => {
    const { quiz } = await setup()
    const students = await quiz.create(actor('ana'), { mode: 'duel', pool: 'general' })
    const swimmers = await quiz.create(pool('pia'), { mode: 'duel', pool: 'general' })

    // La sala de piscineros no existe para un estudiante, ni al revés.
    await expectCode(quiz.view(actor('leo'), swimmers.id), 'not_found')
    await expectCode(quiz.join(actor('leo'), swimmers.id, {}), 'conflict')
    await expectCode(quiz.view(pool('pol'), students.id), 'not_found')
    await expectCode(quiz.join(pool('pol'), students.id, {}), 'conflict')

    // En la de su grupo, sí.
    expect((await quiz.join(pool('pol'), swimmers.id, {})).id).toBe(swimmers.id)
    expect((await quiz.join(actor('leo'), students.id, {})).id).toBe(students.id)
  })

  it('cada campus, las suyas, hasta que quien administra las abre a todos', async () => {
    const { quiz, scope } = await setup()
    const room = await quiz.create(actor('ana'), { mode: 'duel', pool: 'general' })
    const zoe = actor('zoe', { campusId: 46 })

    expect(await quiz.list(zoe)).toEqual([])
    await expectCode(quiz.view(zoe, room.id), 'not_found')

    // Solo quien administra lo cambia.
    await expectCode(scope.set(zoe, { crossCampus: true }), 'forbidden')
    expect(await scope.get(actor('boss', { admin: true }))).toMatchObject({ crossCampus: false })
    expect(await scope.set(actor('boss', { admin: true }), { crossCampus: true })).toMatchObject({
      crossCampus: true,
      updatedBy: 'boss',
    })

    expect(await quiz.list(zoe)).toMatchObject([{ id: room.id, host: 'ana' }])
    expect((await quiz.join(zoe, room.id, {})).id).toBe(room.id)
  })
})
