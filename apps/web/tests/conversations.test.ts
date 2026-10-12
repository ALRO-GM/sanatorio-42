import { describe, expect, it } from 'vitest'

import type { Conversation } from '@sanatorio/contracts'

import {
  directChatId,
  kindsIn,
  matches,
  NO_FILTERS,
  projectsIn,
  remindTime,
} from '../src/features/notices/conversations'

const chat = (extra: Partial<Conversation> = {}): Conversation => ({
  id: 'dm:ana:eva',
  kind: 'direct',
  title: 'eva',
  peer: 'eva',
  image: null,
  online: false,
  last: null,
  unread: 0,
  pending: false,
  remindAt: null,
  project: null,
  ...extra,
})

describe('el id de una conversación directa', () => {
  it('es el mismo lo pida quien lo pida', () => {
    expect(directChatId('eva', 'ana')).toBe('dm:ana:eva')
    expect(directChatId('ana', 'eva')).toBe('dm:ana:eva')
    expect(directChatId('a', 'a')).toBe('dm:a:a')
    expect(directChatId('', 'x')).toBe('dm::x')
  })
})

describe('filtros de la bandeja', () => {
  it('sin filtros se ve todo', () => {
    expect(matches(chat(), NO_FILTERS)).toBe(true)
    expect(matches(chat({ unread: 5, pending: true, kind: 'board' }), NO_FILTERS)).toBe(true)
  })

  it('no leídas: con uno ya cuenta, con cero no', () => {
    const unread = { ...NO_FILTERS, state: 'unread' as const }

    expect(matches(chat({ unread: 1 }), unread)).toBe(true)
    expect(matches(chat({ unread: 9999 }), unread)).toBe(true)
    expect(matches(chat({ unread: 0 }), unread)).toBe(false)
    // Pendiente no es lo mismo que sin leer.
    expect(matches(chat({ unread: 0, pending: true }), unread)).toBe(false)
  })

  it('pendientes: solo las marcadas', () => {
    const pending = { ...NO_FILTERS, state: 'pending' as const }

    expect(matches(chat({ pending: true }), pending)).toBe(true)
    expect(matches(chat({ pending: false, unread: 3 }), pending)).toBe(false)
  })

  it('los filtros se suman: tiene que cumplirlos todos', () => {
    const filters = { state: 'unread' as const, kind: 'board' as const, projectId: 10 }
    const project = { id: 10, name: 'ft_printf' }

    expect(matches(chat({ unread: 1, kind: 'board', project }), filters)).toBe(true)
    expect(matches(chat({ unread: 0, kind: 'board', project }), filters)).toBe(false)
    expect(matches(chat({ unread: 1, kind: 'direct', project }), filters)).toBe(false)
    expect(matches(chat({ unread: 1, kind: 'board', project: null }), filters)).toBe(false)
    expect(
      matches(chat({ unread: 1, kind: 'board', project: { id: 11, name: 'x' } }), filters),
    ).toBe(false)
  })

  it('los tipos que hay, en su orden y sin repetir', () => {
    expect(kindsIn([])).toEqual([])
    expect(
      kindsIn([chat({ kind: 'event' }), chat({ kind: 'board' }), chat(), chat({ kind: 'board' })]),
    ).toEqual(['direct', 'board', 'event'])
  })

  it('los proyectos que hay, por nombre y sin repetir', () => {
    expect(projectsIn([chat()])).toEqual([])
    expect(
      projectsIn([
        chat({ project: { id: 2, name: 'libft' } }),
        chat({ project: { id: 1, name: 'ft_printf' } }),
        chat({ project: { id: 2, name: 'libft' } }),
        chat(),
      ]),
    ).toEqual([
      { id: 1, name: 'ft_printf' },
      { id: 2, name: 'libft' },
    ])
  })
})

describe('cuándo cae un recordatorio', () => {
  // 13 de octubre de 2026 es martes.
  const tuesday = new Date(2026, 9, 13, 16, 45, 30, 500)

  it('dentro de una hora, al milisegundo', () => {
    expect(remindTime('hour', tuesday).getTime() - tuesday.getTime()).toBe(3_600_000)
  })

  it('mañana, a las nueve en punto', () => {
    expect(remindTime('tomorrow', tuesday)).toEqual(new Date(2026, 9, 14, 9, 0, 0, 0))
    // También si hoy aún no han dado las nueve: mañana es mañana.
    expect(remindTime('tomorrow', new Date(2026, 9, 13, 0, 0, 1))).toEqual(
      new Date(2026, 9, 14, 9, 0, 0, 0),
    )
  })

  it('mañana cruza bien el fin de mes y el de año', () => {
    expect(remindTime('tomorrow', new Date(2026, 9, 31, 23, 59, 59))).toEqual(
      new Date(2026, 10, 1, 9, 0, 0, 0),
    )
    expect(remindTime('tomorrow', new Date(2026, 11, 31, 12))).toEqual(new Date(2027, 0, 1, 9))
    expect(remindTime('tomorrow', new Date(2028, 1, 28, 12))).toEqual(new Date(2028, 1, 29, 9))
  })

  it('el lunes es el próximo lunes, desde cualquier día de la semana', () => {
    const monday = new Date(2026, 9, 19, 9, 0, 0, 0)

    for (let day = 13; day <= 18; day += 1) {
      expect(remindTime('monday', new Date(2026, 9, day, 12)), String(day)).toEqual(monday)
    }
  })

  it('si hoy es lunes, es el de la semana que viene, nunca hoy', () => {
    expect(remindTime('monday', new Date(2026, 9, 19, 0, 0, 0))).toEqual(new Date(2026, 9, 26, 9))
    expect(remindTime('monday', new Date(2026, 9, 19, 23, 59, 59))).toEqual(
      new Date(2026, 9, 26, 9),
    )
  })

  it('siempre cae en el futuro', () => {
    for (const preset of ['hour', 'tomorrow', 'monday'] as const) {
      for (let hour = 0; hour < 24 * 14; hour += 5) {
        const now = new Date(2026, 9, 13, hour, 7)

        expect(remindTime(preset, now).getTime(), `${preset} ${hour}`).toBeGreaterThan(
          now.getTime(),
        )
      }
    }
  })
})
