/**
 * Tests de las conversaciones: la bandeja que junta todos los chats de alguien
 * con lo que ha apuntado de cada uno (leída, pendiente, recordatorio, proyecto).
 *
 * El montaje (servicios de verdad, SQLite en memoria, reloj manual) está en
 * `tests/helpers/community.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { kindOf, peerOf, REMIND_MAX_DAYS } from '../../src/modules/meet/conversations.js'
import {
  HOUR,
  MINUTE,
  TUESDAY_AFTERNOON,
  actor,
  expectCode,
  useCommunity,
} from '../helpers/community.js'
import type { Community } from '../helpers/community.js'

const DAY = 24 * HOUR

describe('de qué es un chat', () => {
  it('lo dice cómo empieza su id', () => {
    expect(kindOf('dm:ana:eva')).toBe('direct')
    expect(kindOf('group:3')).toBe('group')
    expect(kindOf('therapy:3:2026-10-07')).toBe('group')
    expect(kindOf('board:12')).toBe('board')
    expect(kindOf('help:booking:4')).toBe('help')
    expect(kindOf('event:99')).toBe('event')
  })

  it('lo que no se reconoce es un evento, no un fallo', () => {
    for (const id of ['', ':', 'dm', 'DM:ana:eva', 'x'.repeat(5000), 'grupo:1']) {
      expect(kindOf(id), id.slice(0, 12)).toBe(id === 'dm' ? 'direct' : 'event')
    }
  })

  it('con quién es una directa, visto por cada lado', () => {
    expect(peerOf('dm:ana:eva', 'ana')).toBe('eva')
    expect(peerOf('dm:ana:eva', 'eva')).toBe('ana')
    expect(peerOf('board:12', 'ana')).toBeNull()
    expect(peerOf('dm:ana', 'ana')).toBeNull()
    expect(peerOf('dm', 'ana')).toBeNull()
    expect(peerOf('', 'ana')).toBeNull()
  })
})

describe('conversaciones', () => {
  const community = useCommunity()
  let services: Community['services']
  let clock: Community['clock']

  beforeEach(() => {
    ;({ services, clock } = community)
  })

  const DM = 'dm:ana:eva'
  const say = (who: string, id: string, body: string) =>
    services.meet.send(actor(who), null, { id, kind: 'text', body })
  const list = async (who: string) => (await services.meet.conversations(actor(who))).items
  const one = async (who: string, id: string) => {
    const found = (await list(who)).find((entry) => entry.id === id)

    if (found === undefined) throw new Error(`${who} no tiene la conversación ${id}`)

    return found
  }
  const mark = (who: string, change: unknown) =>
    services.meet.markConversation(actor(who), null, change)
  const open = (who: string, id: string) => services.meet.thread(actor(who), null, id)
  const at = (offset: number): string => new Date(clock.now() + offset).toISOString()

  const malloc = {
    title: 'malloc: dónde vive tu memoria',
    place: 'Cluster 1',
    startsAt: new Date(TUESDAY_AFTERNOON + 24 * HOUR).toISOString(),
    endsAt: new Date(TUESDAY_AFTERNOON + 25 * HOUR).toISOString(),
    capacity: 5,
  }

  describe('la lista', () => {
    it('quien no ha hablado con nadie no tiene ninguna', async () => {
      expect(await list('ana')).toEqual([])
    })

    it('una directa sale a los dos, cada cual con la otra persona', async () => {
      await say('eva', DM, 'Hola, Ana')

      expect(await list('eva')).toMatchObject([
        {
          id: DM,
          kind: 'direct',
          title: 'ana',
          peer: 'ana',
          last: { from: 'eva', body: 'Hola, Ana', kind: 'text' },
          unread: 0,
          pending: false,
          remindAt: null,
          project: null,
        },
      ])
      expect(await list('ana')).toMatchObject([{ id: DM, title: 'eva', peer: 'eva', unread: 1 }])
      // Y a nadie más.
      expect(await list('leo')).toEqual([])
    })

    it('la de actividad más reciente va primero, y dice quién sigue conectado', async () => {
      await say('eva', DM, 'Hola, Ana')
      clock.advance(MINUTE)
      await say('eva', 'dm:eva:leo', 'Hola, Leo')
      await services.repositories.profiles.touch('leo', new Date(clock.now()).toISOString())

      expect((await list('eva')).map((entry) => [entry.peer, entry.online])).toEqual([
        ['leo', true],
        ['ana', false],
      ])

      // Pasados unos minutos sin señales, `leo` ya no cuenta como conectado.
      clock.advance(10 * MINUTE)
      expect((await list('eva'))[0]).toMatchObject({ peer: 'leo', online: false })
    })

    it('el chat de una pizarra sale con su título, a quien escribe y a quien le llega', async () => {
      const board = await services.boards.create(actor('eva'), malloc)
      const id = `board:${board.id}`

      await services.boards.join(actor('ana'), board.id)
      await say('eva', id, '¿Traéis portátil?')

      expect(await one('eva', id)).toMatchObject({ kind: 'board', title: malloc.title, peer: null })
      // `ana` no ha escrito: la tiene porque le llegó el aviso.
      expect(await one('ana', id)).toMatchObject({ kind: 'board', title: malloc.title, unread: 1 })
      expect(await list('leo')).toEqual([])
    })

    it('el último mensaje se recorta, y uno vacío no rompe nada', async () => {
      await say('eva', DM, 'x'.repeat(500))

      expect((await one('eva', DM)).last?.body).toHaveLength(80)

      await services.meet.send(actor('ana'), null, { id: DM, kind: 'seen' })

      expect((await one('eva', DM)).last).toMatchObject({ from: 'ana', kind: 'seen', body: null })
    })
  })

  describe('leída y no leída', () => {
    it('cuenta lo que han escrito otras personas desde la última vez que la abriste', async () => {
      await say('eva', DM, 'uno')
      expect((await one('ana', DM)).unread).toBe(1)

      await open('ana', DM)
      expect((await one('ana', DM)).unread).toBe(0)

      await say('eva', DM, 'dos')
      await say('eva', DM, 'tres')
      await say('eva', DM, 'cuatro')
      expect((await one('ana', DM)).unread).toBe(3)
      // Responder es haberla leído, y lo que escribe una misma nunca le cuenta.
      await say('ana', DM, 'vale')
      expect((await one('ana', DM)).unread).toBe(0)
      expect((await one('eva', DM)).unread).toBe(1)
    })

    it('marcarla como no leída deja sin ver el último mensaje ajeno, y solo ese', async () => {
      await say('eva', DM, 'uno')
      await say('eva', DM, 'dos')
      await say('ana', DM, 'respondo')
      await open('ana', DM)

      await mark('ana', { id: DM, read: false })
      expect((await one('ana', DM)).unread).toBe(1)

      // Dos veces seguidas no la deja "más" sin leer.
      await mark('ana', { id: DM, read: false })
      expect((await one('ana', DM)).unread).toBe(1)

      await mark('ana', { id: DM, read: true })
      expect((await one('ana', DM)).unread).toBe(0)
    })

    it('si nadie más ha escrito, no hay nada que dejar sin leer', async () => {
      await say('eva', DM, 'solo yo')
      await mark('eva', { id: DM, read: false })

      expect((await one('eva', DM)).unread).toBe(0)
    })

    it('darla por leída sin haberla abierto nunca también vale', async () => {
      await say('eva', DM, 'uno')
      await say('eva', DM, 'dos')
      expect((await one('ana', DM)).unread).toBe(2)

      await mark('ana', { id: DM, read: true })
      expect((await one('ana', DM)).unread).toBe(0)
    })
  })

  describe('pendiente y recordatorio', () => {
    beforeEach(async () => {
      await say('eva', DM, '¿Me ayudas con ft_printf?')
    })

    it('se marca y se desmarca, y es de quien la marca', async () => {
      await mark('ana', { id: DM, pending: true })
      expect((await one('ana', DM)).pending).toBe(true)
      expect((await one('eva', DM)).pending).toBe(false)

      await mark('ana', { id: DM, pending: false })
      expect((await one('ana', DM)).pending).toBe(false)
    })

    it('pedir un recordatorio la deja pendiente, salvo que se diga lo contrario', async () => {
      await mark('ana', { id: DM, remindAt: at(HOUR) })
      expect(await one('ana', DM)).toMatchObject({ pending: true, remindAt: at(HOUR) })

      await mark('ana', { id: DM, remindAt: at(2 * HOUR), pending: false })
      expect(await one('ana', DM)).toMatchObject({ pending: false, remindAt: at(2 * HOUR) })

      await mark('ana', { id: DM, remindAt: null })
      expect((await one('ana', DM)).remindAt).toBeNull()
    })

    it('la hora: en el futuro y a no más de treinta días, justo en los bordes', async () => {
      await expectCode(mark('ana', { id: DM, remindAt: at(0) }), 'invalid_input')
      await expectCode(mark('ana', { id: DM, remindAt: at(-1) }), 'invalid_input')
      await expectCode(mark('ana', { id: DM, remindAt: at(-365 * DAY) }), 'invalid_input')
      await mark('ana', { id: DM, remindAt: at(1) })

      await mark('ana', { id: DM, remindAt: at(REMIND_MAX_DAYS * DAY) })
      await expectCode(
        mark('ana', { id: DM, remindAt: at(REMIND_MAX_DAYS * DAY + 1) }),
        'invalid_input',
      )
      await expectCode(
        mark('ana', { id: DM, remindAt: '9999-12-31T23:59:59.999Z' }),
        'invalid_input',
      )
    })

    it('una hora que no es una hora se rechaza', async () => {
      for (const remindAt of ['mañana', '', '2026-10-07', '2026-13-45T10:00:00Z', 12345, {}, []]) {
        await expectCode(mark('ana', { id: DM, remindAt }), 'invalid_input')
      }
    })

    it('al llegar la hora deja un aviso en el buzón, una sola vez', async () => {
      await open('ana', DM)
      await mark('ana', { id: DM, remindAt: at(HOUR), pending: false })

      clock.advance(HOUR - 1)
      expect(await services.meet.remind()).toBe(0)

      clock.advance(1)
      expect(await services.meet.remind()).toBe(1)
      expect(await one('ana', DM)).toMatchObject({ pending: true, remindAt: null })
      expect(
        (await services.notices.list(actor('ana'))).items.filter((notice) => !notice.read),
      ).toMatchObject([{ kind: 'chat_reminder', ref: DM, from: 'eva' }])
      // A `eva` no le llega nada: el recordatorio es de quien lo pidió.
      expect((await services.notices.list(actor('eva'))).items).toEqual([])

      expect(await services.meet.remind()).toBe(0)
      clock.advance(DAY)
      expect(await services.meet.remind()).toBe(0)
    })

    it('quitar el recordatorio antes de tiempo lo cancela', async () => {
      await mark('ana', { id: DM, remindAt: at(HOUR) })
      await mark('ana', { id: DM, remindAt: null })
      clock.advance(2 * HOUR)

      expect(await services.meet.remind()).toBe(0)
    })

    it('varios a la vez se reparten todos, cada uno a quien lo pidió', async () => {
      await say('eva', 'dm:eva:leo', 'Hola, Leo')
      await mark('ana', { id: DM, remindAt: at(HOUR) })
      await mark('leo', { id: 'dm:eva:leo', remindAt: at(HOUR) })
      await mark('eva', { id: DM, remindAt: at(2 * HOUR) })
      clock.advance(HOUR)

      expect(await services.meet.remind()).toBe(2)
      expect((await one('eva', DM)).remindAt).not.toBeNull()
    })
  })

  describe('de qué proyecto va', () => {
    beforeEach(async () => {
      await say('eva', DM, 'hola')
    })

    it('se pone, se cambia y se quita, y es de quien lo pone', async () => {
      await mark('ana', { id: DM, projectId: 10 })
      expect((await one('ana', DM)).project).toEqual({ id: 10, name: 'ft_printf' })
      expect((await one('eva', DM)).project).toBeNull()

      await mark('ana', { id: DM, projectId: null })
      expect((await one('ana', DM)).project).toBeNull()
    })

    it('un proyecto que no existe, o que no es un id, se rechaza', async () => {
      for (const projectId of [999_999, 0, -1, 1.5, 'abc', Number.MAX_SAFE_INTEGER, {}, []]) {
        await expectCode(mark('ana', { id: DM, projectId }), 'invalid_input')
      }

      expect((await one('ana', DM)).project).toBeNull()
    })
  })

  describe('quién puede', () => {
    it('no se apunta nada de una conversación que no es tuya', async () => {
      await say('eva', DM, 'hola')

      for (const change of [
        { read: true },
        { pending: true },
        { remindAt: at(HOUR) },
        { projectId: 10 },
      ]) {
        await expectCode(mark('leo', { id: DM, ...change }), 'forbidden')
      }

      expect(await list('leo')).toEqual([])
    })

    it('ni de una que no puede existir', async () => {
      await expectCode(mark('ana', { id: 'dm:eva:ana', pending: true }), 'forbidden')
      await expectCode(mark('ana', { id: 'dm:ana:ana', pending: true }), 'forbidden')
      await expectCode(mark('ana', { id: 'dm:ana:nadie', pending: true }), 'forbidden')
      await expectCode(mark('ana', { id: 'board:999999', pending: true }), 'forbidden')
    })

    it('un id mal formado, o un cambio que no es un cambio, es invalid_input', async () => {
      for (const id of [
        '',
        'dm',
        "dm:ana:eva'; DROP TABLE x",
        'DM:ANA:EVA',
        'x'.repeat(5000),
        42,
        null,
      ]) {
        await expectCode(mark('ana', { id, pending: true }), 'invalid_input')
      }
      for (const change of [{ read: 'sí' }, { pending: 1 }, { pending: null }]) {
        await expectCode(mark('ana', { id: DM, ...change }), 'invalid_input')
      }

      await expectCode(mark('ana', null), 'invalid_input')
      await expectCode(mark('ana', []), 'invalid_input')
      await expectCode(mark('ana', {}), 'invalid_input')
    })

    it('un cambio vacío sobre una conversación tuya no apunta nada ni rompe', async () => {
      await say('eva', DM, 'hola')

      expect((await mark('ana', { id: DM })).items).toHaveLength(1)
      expect(await one('ana', DM)).toMatchObject({ unread: 1, pending: false })
    })
  })
})
