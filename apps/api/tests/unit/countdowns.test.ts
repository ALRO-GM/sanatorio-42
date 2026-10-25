/**
 * Avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`): los de quien
 * administra, a qué grupo llegan y cómo se cierran; y lo que se fija cada cual
 * de su calendario.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { GRACE_MS, MAX_PINS } from '../../src/modules/countdowns/countdowns.service.js'
import {
  actor,
  expectCode,
  HOUR,
  MINUTE,
  TUESDAY_AFTERNOON,
  useCommunity,
} from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const DAY = 24 * HOUR
const at = (ms: number): string => new Date(ms).toISOString()
const admin = actor('albrodri', { admin: true })

describe('avisos con cuenta atrás', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']

  beforeEach(() => {
    ;({ services, clock } = community)
  })

  describe('de quien administra', () => {
    it('la limpieza de taquillas: basta con la hora, llega a todo el mundo y cada cual la cierra', async () => {
      const { countdowns } = services
      const sent = await countdowns.send(admin, {
        preset: 'lockers',
        at: at(TUESDAY_AFTERNOON + 5 * DAY),
        group: 'all',
      })

      expect(sent).toMatchObject({
        kind: 'notice',
        preset: 'lockers',
        title: null,
        body: null,
        from: 'albrodri',
        group: 'all',
        campusId: null,
        dismissed: 0,
      })

      for (const who of [actor('ana'), actor('leo'), actor('pisci', { pool: true })]) {
        expect((await countdowns.list(who)).map((entry) => entry.id)).toEqual([sent.id])
      }

      // Cerrado no vuelve a salir, ni cuenta en la huella del pulso.
      const before = await countdowns.stamp(actor('ana'))

      expect(await countdowns.dismiss(actor('ana'), sent.id)).toEqual([])
      expect(await countdowns.stamp(actor('ana'))).not.toBe(before)
      expect(await countdowns.list(actor('ana'))).toEqual([])
      expect(await countdowns.list(actor('leo'))).toHaveLength(1)
      await expectCode(countdowns.dismiss(actor('ana'), sent.id), 'not_found')
      expect((await countdowns.reports(admin))[0]?.dismissed).toBe(1)
    })

    it('a un grupo o a un campus: los mundos no se cruzan', async () => {
      const { countdowns } = services
      const soon = at(TUESDAY_AFTERNOON + DAY)
      const students = await countdowns.send(admin, {
        title: 'Solo estudiantes',
        at: soon,
        group: 'students',
      })
      const pool = await countdowns.send(admin, { title: 'Solo piscina', at: soon, group: 'pool' })
      const barcelona = await countdowns.send(admin, {
        title: 'Barcelona',
        at: soon,
        group: 'all',
        campusId: 58,
      })
      const ids = async (who: Parameters<typeof countdowns.list>[0]) =>
        (await countdowns.list(who)).map((entry) => entry.id)

      expect(await ids(actor('ana'))).toEqual([students.id])
      expect(await ids(actor('pisci', { pool: true }))).toEqual([pool.id])
      expect(await ids(actor('bcn', { campusId: 58 }))).toEqual([students.id, barcelona.id])
      // Cerrar uno que no es para ti es como si no existiera.
      await expectCode(countdowns.dismiss(actor('ana'), pool.id), 'not_found')
    })

    it('valida lo que llega y solo lo hace quien administra', async () => {
      const { countdowns } = services
      const later = at(TUESDAY_AFTERNOON + DAY)

      await expectCode(
        countdowns.send(actor('ana'), { title: 'x', at: later, group: 'all' }),
        'forbidden',
      )
      await expectCode(countdowns.reports(actor('ana')), 'forbidden')
      await expectCode(countdowns.remove(actor('ana'), 1), 'forbidden')

      for (const wrong of [
        {},
        null,
        { at: later, group: 'all' },
        { title: '   ', at: later, group: 'all' },
        { title: 'x', at: 'mañana', group: 'all' },
        { title: 'x', at: later, group: 'todos' },
        { title: 'x'.repeat(121), at: later, group: 'all' },
        { title: 'x', body: 'y'.repeat(1001), at: later, group: 'all' },
        { title: 'x', at: at(TUESDAY_AFTERNOON - MINUTE), group: 'all' },
        { title: 'x', at: at(TUESDAY_AFTERNOON + 400 * DAY), group: 'all' },
        { preset: 'basura', at: later, group: 'all' },
        { title: 'x', at: later, group: 'all', campusId: -1 },
      ]) {
        await expectCode(countdowns.send(admin, wrong), 'invalid_input')
      }
    })

    it('al pasar la hora se ve un rato («ya ha pasado») y luego se va; retirado, para todo el mundo', async () => {
      const { countdowns } = services
      const sent = await countdowns.send(admin, {
        title: 'Corte de luz',
        body: 'Guarda lo que tengas abierto',
        at: at(TUESDAY_AFTERNOON + HOUR),
        group: 'all',
      })
      const other = await countdowns.send(admin, {
        title: 'Otro',
        at: at(TUESDAY_AFTERNOON + DAY),
        group: 'all',
      })

      clock.advance(HOUR + GRACE_MS / 2)
      expect((await countdowns.list(actor('ana'))).map((entry) => entry.id)).toEqual([
        sent.id,
        other.id,
      ])
      clock.advance(GRACE_MS)
      expect((await countdowns.list(actor('ana'))).map((entry) => entry.id)).toEqual([other.id])

      await countdowns.remove(admin, other.id)
      expect(await countdowns.list(actor('ana'))).toEqual([])
      expect((await countdowns.reports(admin)).map((entry) => entry.id)).toEqual([sent.id])
    })
  })

  describe('lo que se fija cada cual', () => {
    const board = (startsInHours: number, title = 'malloc: dónde vive tu memoria') => ({
      title,
      topic: 'malloc',
      place: 'Cluster 1',
      startsAt: at(TUESDAY_AFTERNOON + startsInHours * HOUR),
      endsAt: at(TUESDAY_AFTERNOON + (startsInHours + 1) * HOUR),
      capacity: 5,
    })

    it('un evento de tu calendario: con su título y su hora, y sin repetirlo', async () => {
      const { countdowns, boards } = services
      const created = await boards.create(actor('eva'), board(30))

      await boards.join(actor('ana'), created.id)

      const list = await countdowns.pin(actor('ana'), {
        kind: 'event',
        eventId: `board:${created.id}`,
      })

      expect(list).toEqual([
        {
          id: expect.any(Number) as number,
          kind: 'event',
          title: 'malloc: dónde vive tu memoria',
          body: null,
          preset: null,
          at: at(TUESDAY_AFTERNOON + 30 * HOUR),
          eventId: `board:${created.id}`,
          // Una pizarra tiene su propio título: no se traduce.
          label: null,
          from: null,
        },
      ])
      expect(
        await countdowns.pin(actor('ana'), { kind: 'event', eventId: `board:${created.id}` }),
      ).toHaveLength(1)
      // Lo tuyo no se le ve a nadie más, y nadie más lo quita.
      expect(await countdowns.list(actor('leo'))).toEqual([])
      expect(await countdowns.unpin(actor('leo'), list[0]?.id ?? 0)).toEqual([])
      expect(await countdowns.list(actor('ana'))).toHaveLength(1)
      expect(await countdowns.unpin(actor('ana'), list[0]?.id ?? 0)).toEqual([])
      await expectCode(
        countdowns.pin(actor('ana'), { kind: 'event', eventId: 'board:999' }),
        'not_found',
      )
    })

    it('el próximo compromiso: cambia solo cuando pasa, y sin nada a la vista se queda sin hora', async () => {
      const { countdowns, boards } = services
      // La tercera no es tuya: no cuenta aunque sea antes.
      const [first, second] = await Promise.all([
        boards.create(actor('eva'), board(2, 'Primera')),
        boards.create(actor('eva'), board(26, 'Segunda')),
        boards.create(actor('eva'), board(1, 'A la que no vas')),
      ])

      await boards.join(actor('ana'), first.id)
      await boards.join(actor('ana'), second.id)

      const [next] = await countdowns.pin(actor('ana'), { kind: 'next' })

      expect(next).toMatchObject({ kind: 'next', title: 'Primera', eventId: `board:${first.id}` })

      clock.advance(3 * HOUR)
      expect((await countdowns.list(actor('ana')))[0]).toMatchObject({ title: 'Segunda' })

      clock.advance(DAY)
      expect((await countdowns.list(actor('ana')))[0]).toMatchObject({
        kind: 'next',
        title: null,
        at: null,
        eventId: null,
      })
      // Una sola vez.
      expect(await countdowns.pin(actor('ana'), { kind: 'next' })).toHaveLength(1)
    })

    it('uno propio, con su tope; lo que no vale no entra', async () => {
      const { countdowns } = services
      const custom = (hours: number, title = 'Entrega de minishell') => ({
        kind: 'custom',
        title,
        at: at(TUESDAY_AFTERNOON + hours * HOUR),
      })

      for (let index = 0; index < MAX_PINS; index++) {
        await countdowns.pin(actor('ana'), custom(index + 1, `Cosa ${index}`))
      }
      await expectCode(countdowns.pin(actor('ana'), custom(50)), 'conflict')

      for (const wrong of [
        {},
        null,
        { kind: 'otra' },
        { kind: 'custom', title: '', at: at(TUESDAY_AFTERNOON + HOUR) },
        { kind: 'custom', title: 'x', at: 'pronto' },
        custom(-1),
        custom(24 * 400),
        { kind: 'event', eventId: '' },
        { kind: 'event', eventId: 'x'.repeat(81) },
      ]) {
        await expectCode(countdowns.pin(actor('leo'), wrong), 'invalid_input')
      }

      // Lo pasado deja sitio: se borra al fijar algo nuevo.
      clock.advance(3 * HOUR + GRACE_MS)
      expect(await countdowns.pin(actor('ana'), custom(50))).toHaveLength(MAX_PINS - 2)
    })
  })
})
