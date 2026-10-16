/**
 * Tests de las reglas de los avisos de evento: qué hay que contestar.
 */

import { describe, expect, it } from 'vitest'

import { needsReply } from '../../src/modules/meet/meet.rules.js'

describe('needsReply', () => {
  it('piden respuesta las pizarras, las terapias y las sesiones de ayuda reservadas', () => {
    expect(needsReply({ id: 'board:1', kind: 'board' })).toBe(true)
    expect(needsReply({ id: 'therapy:2:3', kind: 'therapy' })).toBe(true)
    expect(needsReply({ id: 'help:booking:4', kind: 'help' })).toBe(true)
  })

  it('las correcciones de 42 no: la asistencia la sabe 42', () => {
    expect(needsReply({ id: 'evaluation:9874518', kind: 'evaluation' })).toBe(false)
    expect(needsReply({ id: 'evaluation:9874518', kind: 'evaluation', joined: true })).toBe(false)
  })

  it('lo que no es tuyo nunca, aunque sea de los que piden respuesta', () => {
    expect(needsReply({ id: 'board:1', kind: 'board', joined: false })).toBe(false)
    expect(needsReply({ id: 'help:booking:4', kind: 'help', joined: false })).toBe(false)
  })

  it('ni los exámenes ni los eventos de 42, ni un id que solo se parezca', () => {
    expect(needsReply({ id: 'exam:1', kind: 'exam' })).toBe(false)
    expect(needsReply({ id: 'event:1', kind: 'event_joined' })).toBe(false)
    expect(needsReply({ id: 'help:slot:4', kind: 'help' })).toBe(false)
    expect(needsReply({ id: '', kind: 'event_open' })).toBe(false)
  })
})
