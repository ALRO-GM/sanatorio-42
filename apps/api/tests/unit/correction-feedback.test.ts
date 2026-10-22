/**
 * Valoración de las correcciones de 42 (#91 del buzón): qué se pregunta y
 * cuándo, que se conteste una sola vez, lo que suma a los expedientes y que
 * quien corrigió solo vea cuentas, nunca quién contestó.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import type { Db } from '../../src/core/db/database.js'
import { HOUR, MADRID, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const DAY = 24 * HOUR

describe('valoración de las correcciones', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  let db: Db

  beforeEach(() => {
    ;({ services, clock, db } = community)
  })

  /** Hace `ago` milisegundos, en ISO. */
  const ago = (ms: number): string => new Date(clock.now() - ms).toISOString()

  /** Una corrección ya hecha, como la deja la copia de 42: una fila por persona corregida. */
  async function correction(
    id: number,
    corrector: string,
    corrected: string | string[],
    beginAt = ago(2 * HOUR),
    projectId: number | null = 10,
  ): Promise<void> {
    for (const login of [corrected].flat()) {
      await db.execute({
        sql: `INSERT INTO corrections
                (id, campus_id, corrector, corrected, project_id, begin_at, final_mark, positive)
              VALUES (?, ?, ?, ?, ?, ?, 100, 1)`,
        args: [id, MADRID, corrector, login, projectId, beginAt],
      })
    }
  }

  const feedback = () => services.correctionFeedback

  it('pregunta a las dos partes: a quien corrigieron por quien corrigió, y al revés', async () => {
    // `eva` corrige a `ana` y `leo` juntas (un proyecto de grupo).
    await correction(1, 'eva', ['ana', 'leo'])

    expect(await feedback().pending(actor('ana'))).toEqual([
      {
        id: 1,
        role: 'corrected',
        peers: [{ login: 'eva', image: expect.any(String) as string }],
        projectId: 10,
        projectName: 'ft_printf',
        beginAt: ago(2 * HOUR),
      },
    ])
    expect(await feedback().pending(actor('eva'))).toMatchObject([
      { id: 1, role: 'corrector', peers: [{ login: 'ana' }, { login: 'leo' }] },
    ])
    expect(await feedback().pendingCount(actor('leo'))).toBe(1)
    // Quien no estuvo, nada.
    expect(await feedback().pending(actor('uma'))).toEqual([])
  })

  it('solo las recientes: de la última semana y ya empezadas, la última primero', async () => {
    await correction(1, 'eva', 'ana', ago(8 * DAY))
    await correction(2, 'eva', 'ana', ago(6 * DAY))
    await correction(3, 'leo', 'ana', ago(HOUR))
    // Una cita que aún no ha llegado (con nota, por lo que sea): todavía no.
    await correction(4, 'leo', 'ana', ago(-HOUR))

    expect((await feedback().pending(actor('ana'))).map((item) => item.id)).toEqual([3, 2])
    await expectCode(feedback().rate(actor('ana'), 1, { understanding: 'perfect' }), 'conflict')

    // Pasados dos días, la de hace seis ya es vieja: no se pregunta ni se puede valorar.
    clock.advance(2 * DAY)

    expect((await feedback().pending(actor('ana'))).map((item) => item.id)).toEqual([4, 3])
    await expectCode(feedback().rate(actor('ana'), 2, { understanding: 'perfect' }), 'conflict')
  })

  it('una sola valoración por corrección y lado; lo que no encaja con el lado no vale', async () => {
    await correction(1, 'eva', 'ana')

    // Quien fue corregido no elige etiqueta de llegada; quien corrigió, no cómo lo entiende.
    await expectCode(feedback().rate(actor('ana'), 1, { tag: 'curious' }), 'invalid_input')
    await expectCode(
      feedback().rate(actor('ana'), 1, { understanding: 'perfect', reaction: 'curious' }),
      'invalid_input',
    )
    await expectCode(feedback().rate(actor('eva'), 1, { understanding: 'same' }), 'invalid_input')
    await expectCode(
      feedback().rate(actor('ana'), 1, { understanding: 'x'.repeat(5000) }),
      'invalid_input',
    )
    await expectCode(feedback().rate(actor('ana'), 1, null), 'invalid_input')

    await feedback().rate(actor('ana'), 1, { understanding: 'better', reaction: 'patient' })
    await feedback().rate(actor('eva'), 1, { tag: 'prepared' })

    await expectCode(feedback().rate(actor('ana'), 1, { understanding: 'perfect' }), 'conflict')
    await expectCode(feedback().rate(actor('eva'), 1, { tag: 'basics' }), 'conflict')
    await expectCode(feedback().skip(actor('ana'), 1, { forever: true }), 'conflict')
    expect(await feedback().pending(actor('ana'))).toEqual([])
    expect(await feedback().pending(actor('eva'))).toEqual([])
  })

  it('no se puede valorar una corrección en la que no estuviste, ni una que no existe', async () => {
    await correction(1, 'eva', 'ana')

    await expectCode(feedback().rate(actor('leo'), 1, { understanding: 'perfect' }), 'not_found')
    await expectCode(feedback().rate(actor('ana'), 999, { understanding: 'perfect' }), 'not_found')
    await expectCode(feedback().skip(actor('leo'), 1, { forever: false }), 'not_found')
    await expectCode(feedback().skip(actor('ana'), 1, {}), 'invalid_input')
  })

  it('«Ahora no» vuelve a preguntar más tarde, como mucho dos veces; «No volver a preguntar», nunca', async () => {
    await correction(1, 'eva', 'ana')
    await correction(2, 'leo', 'ana', ago(3 * HOUR))

    await feedback().skip(actor('ana'), 2, { forever: true })
    await feedback().skip(actor('ana'), 1, { forever: false })
    expect(await feedback().pendingCount(actor('ana'))).toBe(0)

    for (let again = 1; again <= 2; again++) {
      clock.advance(6 * HOUR)
      expect((await feedback().pending(actor('ana'))).map((item) => item.id)).toEqual([1])
      await feedback().skip(actor('ana'), 1, { forever: false })
    }

    clock.advance(DAY)
    expect(await feedback().pending(actor('ana'))).toEqual([])
    // Lo aplazado aún se puede contestar si se quiere.
    await feedback().rate(actor('ana'), 1, { understanding: 'enough' })
  })

  it('la reacción suma a las «Reacciones recibidas» de quien corrigió, junto a las de la ayuda', async () => {
    // Una sesión de ayuda: `ana` dice que `eva` explica genial (`concept`).
    await community.helpSession('ana')
    await correction(1, 'eva', 'ana')
    await correction(2, 'eva', 'leo')
    await feedback().rate(actor('ana'), 1, { understanding: 'perfect', reaction: 'concept' })
    await feedback().rate(actor('leo'), 2, { understanding: 'same', reaction: 'patient' })

    expect((await services.xp.expediente(actor('eva'))).reactions).toEqual({
      bug: 0,
      code: 0,
      concept: 2,
      patient: 1,
    })
    // Sin reacción solo cuenta lo que entiende.
    await correction(3, 'eva', 'uma')
    await feedback().rate(actor('uma'), 3, { understanding: 'better', reaction: null })
    expect((await services.xp.expediente(actor('eva'))).reactions.patient).toBe(1)
    // A quien valora no le suma nada.
    expect((await services.xp.expediente(actor('ana'))).reactions.concept).toBe(0)
  })

  it('cómo llegó suma a «Cómo llegas cuando pides ayuda» de cada persona corregida', async () => {
    // La sesión de ayuda: `eva` dice que `ana` traía la duda trabajada.
    await community.helpSession('ana')
    await correction(1, 'eva', ['ana', 'leo'])
    await feedback().rate(actor('eva'), 1, { tag: 'prepared' })

    expect((await services.help.reputation(actor('ana'))).asked).toEqual({
      prepared: 2,
      curious: 0,
      autonomous: 0,
      basics: 0,
    })
    expect((await services.help.reputation(actor('leo'))).asked.prepared).toBe(1)
    expect((await services.help.reputation(actor('eva'))).asked.prepared).toBe(0)
  })

  it('quien corrigió solo ve cuentas, y solo cuando hay respuestas de sobra para no saber de quién son', async () => {
    const people = ['ana', 'leo', 'uma', 'max']

    for (const [index, login] of people.entries()) {
      await correction(index + 1, 'eva', login)
    }

    await feedback().rate(actor('ana'), 1, { understanding: 'perfect' })
    await feedback().rate(actor('leo'), 2, { understanding: 'better' })

    // Con dos respuestas se adivinaría quién ha dicho qué.
    expect(await feedback().understood(actor('eva'))).toEqual({ total: 2, answers: null })

    await feedback().rate(actor('uma'), 3, { understanding: 'perfect' })
    // Lo que dice quien corrigió de sí no cuenta como respuesta de nadie.
    await feedback().rate(actor('eva'), 4, { tag: 'basics' })

    const understood = await feedback().understood(actor('eva'))

    expect(understood).toEqual({
      total: 3,
      answers: { perfect: 2, enough: 0, better: 1, same: 0 },
    })
    // Ni un login: ni de quién contestó ni de a quién se corrigió.
    for (const login of people) expect(JSON.stringify(understood)).not.toContain(login)
    // Las de `eva` son suyas: a quienes valoraron no les sale nada.
    expect(await feedback().understood(actor('ana'))).toEqual({ total: 0, answers: null })
  })

  it('no pregunta por una cuenta que 42 ha anonimizado', async () => {
    await correction(1, '3b3-1234', 'ana')
    await correction(2, 'eva', ['3b3-99', 'leo'])

    expect(await feedback().pending(actor('ana'))).toEqual([])
    expect(await feedback().pending(actor('eva'))).toMatchObject([
      { id: 2, peers: [{ login: 'leo' }] },
    ])
  })

  it('si 42 borra la corrección, lo que se dijo de ella deja de contar', async () => {
    await correction(1, 'eva', 'ana')
    await feedback().rate(actor('ana'), 1, { understanding: 'perfect', reaction: 'bug' })
    await db.execute('DELETE FROM corrections WHERE id = 1')

    expect((await services.xp.expediente(actor('eva'))).reactions.bug).toBe(0)
  })
})
