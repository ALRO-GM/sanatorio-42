/**
 * El buzón del panel: qué mensaje va en cada pestaña.
 */

import { describe, expect, it } from 'vitest'

import type { ReportReason, Ticket, TicketStatus } from '@sanatorio/contracts'

import {
  CATEGORIES,
  kindOf,
  reportIsReady,
  reportableSections,
  sectionFor,
  ticketsIn,
} from '../src/features/admin/inbox'

const ticket = (id: number, status: TicketStatus): Ticket =>
  ({ id, status, login: 'ana', kind: 'issue', subject: 's', body: 'b' }) as Ticket

describe('buzón del panel', () => {
  const all = [ticket(1, 'open'), ticket(2, 'answered'), ticket(3, 'closed'), ticket(4, 'open')]

  it('pendiente es lo que nadie ha respondido, lo más nuevo primero', () => {
    expect(ticketsIn(all, 'pending').map((t) => t.id)).toEqual([4, 1])
  })

  it('lo respondido y lo cerrado van juntos en la otra pestaña', () => {
    expect(ticketsIn(all, 'done').map((t) => t.id)).toEqual([3, 2])
  })

  it('cada mensaje sale en una sola pestaña, y con nada no hay nada', () => {
    expect(ticketsIn(all, 'pending').length + ticketsIn(all, 'done').length).toBe(all.length)
    expect(ticketsIn([], 'pending')).toEqual([])
    expect(ticketsIn([], 'done')).toEqual([])
  })

  it('no cambia la lista que recibe', () => {
    const copy = [...all]

    ticketsIn(all, 'pending')
    expect(all).toEqual(copy)
  })
})

describe('escribir al buzón', () => {
  const sections = [
    { id: 'consulta', inNav: true },
    { id: 'red', inNav: true },
    { id: 'guardia', inNav: false },
    { id: 'expediente', inNav: false },
    { id: 'clicker', inNav: false },
    { id: 'gestion', inNav: false },
  ]

  it('los fallos y las traducciones son «algo no va»; lo demás, una mejora', () => {
    expect(CATEGORIES.map(kindOf)).toEqual(['issue', 'idea', 'idea', 'issue', 'idea'])
  })

  it('se puede escribir de las pestañas, la guardia y el expediente, no del panel ni del juego', () => {
    expect(reportableSections(sections)).toEqual(['consulta', 'red', 'guardia', 'expediente'])
  })

  it('sale elegida la sección abierta; si no se puede elegir, toda la web', () => {
    expect(sectionFor('red', sections)).toBe('red')
    expect(sectionFor('guardia', sections)).toBe('guardia')
    expect(sectionFor('gestion', sections)).toBeNull()
    expect(sectionFor('clicker', sections)).toBeNull()
    expect(sectionFor('', sections)).toBeNull()
    expect(sectionFor('no-existe', sections)).toBeNull()
  })
})

describe('denuncias', () => {
  const report = (id: number, reason: ReportReason | null): Ticket =>
    ({ id, status: 'open', kind: 'report', reason, login: 'ana', subject: 's', body: '' }) as Ticket

  it('con un motivo claro basta; con «otro» hay que explicarlo (cinco letras)', () => {
    expect(reportIsReady('spam', '')).toBe(true)
    expect(reportIsReady('insults', '  ')).toBe(true)
    expect(reportIsReady('other', '')).toBe(false)
    expect(reportIsReady('other', 'cuatr'.slice(0, 4))).toBe(false)
    expect(reportIsReady('other', 'cinco')).toBe(true)
    expect(reportIsReady('other', '    cinco    ')).toBe(true)
  })

  it('el filtro por motivo deja solo esas denuncias; «todo» lo deja todo', () => {
    const all = [report(1, 'spam'), report(2, 'insults'), report(3, null), ticket(4, 'open')]

    expect(ticketsIn(all, 'pending', 'spam').map((t) => t.id)).toEqual([1])
    expect(ticketsIn(all, 'pending', 'harassment')).toEqual([])
    expect(ticketsIn(all, 'pending', 'all').map((t) => t.id)).toEqual([4, 3, 2, 1])
  })
})
