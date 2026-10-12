/**
 * Tests de los comunicados: a quién llegan, qué se puede contestar y qué ve
 * quien administra.
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { HOUR, MADRID, actor, expectCode, useCommunity } from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

describe('comunicados', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']
  const boss = actor('eva', { admin: true })

  beforeEach(() => {
    ;({ services, clock } = community)
  })

  it('llega a quien toca: a todos, a un campus o a unas personas', async () => {
    const { broadcasts } = services

    await broadcasts.send(boss, { title: 'Para todos', body: 'Hola', audience: { kind: 'all' } })
    await broadcasts.send(boss, {
      title: 'Solo Barcelona',
      body: 'Hola',
      audience: { kind: 'campus', campusId: 58 },
    })
    await broadcasts.send(boss, {
      title: 'Solo Ana',
      body: 'Hola',
      // Los logins se guardan en minúsculas, se escriban como se escriban.
      audience: { kind: 'logins', logins: [' ANA '] },
    })

    const titles = async (who: ReturnType<typeof actor>): Promise<string[]> =>
      (await broadcasts.pending(who)).map((entry) => entry.title)

    // El más antiguo primero.
    expect(await titles(actor('ana'))).toEqual(['Para todos', 'Solo Ana'])
    expect(await titles(actor('leo'))).toEqual(['Para todos'])
    expect(await titles(actor('leo', { campusId: 58 }))).toEqual(['Para todos', 'Solo Barcelona'])
    expect(await broadcasts.count(actor('ana', { campusId: MADRID }))).toBe(2)
    // A quien lo lee no se le dice a quién más iba.
    expect((await broadcasts.pending(actor('ana')))[0]).not.toHaveProperty('audience')
  })

  it('con opciones obligatorias no se cierra sin elegir', async () => {
    const { broadcasts } = services
    const sent = await broadcasts.send(boss, {
      title: '¿Vienes a la charla?',
      body: 'El jueves a las 17:00',
      options: ['Sí', 'No', 'Aún no lo sé'],
      required: true,
      audience: { kind: 'all' },
    })

    await expectCode(broadcasts.answer(actor('ana'), sent.id, { option: null }), 'invalid_input')
    await expectCode(broadcasts.answer(actor('ana'), sent.id, { option: 3 }), 'invalid_input')

    // Al contestar deja de salir, y no se puede contestar dos veces.
    expect(await broadcasts.answer(actor('ana'), sent.id, { option: 0 })).toEqual([])
    await expectCode(broadcasts.answer(actor('ana'), sent.id, { option: 1 }), 'not_found')

    await broadcasts.answer(actor('leo'), sent.id, { option: 2 })

    expect((await broadcasts.reports(boss))[0]).toMatchObject({
      id: sent.id,
      counts: [1, 0, 1],
      seen: 0,
      answers: [
        { login: 'ana', option: 0 },
        { login: 'leo', option: 2 },
      ],
    })
  })

  it('sin obligación se puede cerrar sin elegir, y queda como visto', async () => {
    const { broadcasts } = services
    const poll = await broadcasts.send(boss, {
      title: '¿Qué te parece el estilo nuevo?',
      body: 'Cuéntanos',
      options: ['Me gusta', 'Prefiero el de antes'],
      audience: { kind: 'all' },
    })
    const notice = await broadcasts.send(boss, {
      title: 'Mantenimiento el sábado',
      body: 'La web estará parada de 9 a 10',
      // Aunque sea obligatorio, sin opciones basta con darse por enterado.
      required: true,
      audience: { kind: 'all' },
    })

    await broadcasts.answer(actor('ana'), poll.id, { option: null })
    await broadcasts.answer(actor('ana'), notice.id, { option: null })

    const [last, first] = await broadcasts.reports(boss)

    expect(first).toMatchObject({ id: poll.id, counts: [0, 0], seen: 1 })
    expect(last).toMatchObject({ id: notice.id, counts: [], seen: 1 })
  })

  it('solo lo manda, lo consulta y lo retira quien administra', async () => {
    const { broadcasts } = services
    const message = { title: 'Hola', body: 'Hola', audience: { kind: 'all' } }

    await expectCode(broadcasts.send(actor('ana'), message), 'forbidden')
    await expectCode(broadcasts.reports(actor('ana')), 'forbidden')
    await expectCode(broadcasts.remove(actor('ana'), 1), 'forbidden')
    // Ni títulos vacíos, ni demasiadas opciones, ni una audiencia sin nadie.
    await expectCode(broadcasts.send(boss, { ...message, title: '  ' }), 'invalid_input')
    await expectCode(
      broadcasts.send(boss, { ...message, options: ['1', '2', '3', '4', '5', '6', '7'] }),
      'invalid_input',
    )
    await expectCode(
      broadcasts.send(boss, { ...message, audience: { kind: 'logins', logins: [] } }),
      'invalid_input',
    )

    const sent = await broadcasts.send(boss, message)

    await broadcasts.remove(boss, sent.id)
    expect(await broadcasts.pending(actor('ana'))).toEqual([])
    expect(await broadcasts.reports(boss)).toEqual([])
  })

  it('pasado un mes deja de salir, pero no se borra hasta que lo quita quien administra', async () => {
    const { broadcasts, admin } = services

    await broadcasts.send(boss, { title: 'Viejo', body: 'Hola', audience: { kind: 'all' } })
    clock.advance(31 * 24 * HOUR)
    expect(await broadcasts.count(actor('ana'))).toBe(0)
    // Sigue en el panel, por mucho que pase.
    clock.advance(400 * 24 * HOUR)
    expect(await broadcasts.reports(boss)).toHaveLength(1)

    await expectCode(admin.wipe(actor('ana'), { kind: 'broadcasts' }, true), 'forbidden')
    expect(await admin.wipe(boss, { kind: 'broadcasts' }, true)).toEqual({ rows: 1 })
    expect(await broadcasts.reports(boss)).toEqual([])
  })
})
