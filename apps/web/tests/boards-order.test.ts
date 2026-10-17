/**
 * Pizarras: primero las que vienen (de la más cercana a la más lejana) y
 * después las pasadas (de la más reciente hacia atrás).
 */
import { describe, expect, it } from 'vitest'

import type { BoardView as Board } from '@sanatorio/contracts'

import { orderBoards } from '../src/features/boards/order'

const NOW = Date.parse('2026-10-18T12:00:00Z')
const board = (id: number, startsAt: string, endsAt: string) => ({ id, startsAt, endsAt }) as Board

describe('orden de las pizarras', () => {
  it('cercanas primero, luego lejanas, y las pasadas al final de la más reciente a la más antigua', () => {
    const boards = [
      board(1, '2026-10-25T10:00:00Z', '2026-10-25T11:00:00Z'),
      board(2, '2026-10-10T10:00:00Z', '2026-10-10T11:00:00Z'),
      board(3, '2026-10-19T10:00:00Z', '2026-10-19T11:00:00Z'),
      board(4, '2026-10-17T10:00:00Z', '2026-10-17T11:00:00Z'),
      // Empezó pero aún no ha terminado: cuenta como de las que vienen, la primera.
      board(5, '2026-10-18T11:30:00Z', '2026-10-18T12:30:00Z'),
    ]
    const { coming, past } = orderBoards(boards, NOW)

    expect(coming.map((b) => b.id)).toEqual([5, 3, 1])
    expect(past.map((b) => b.id)).toEqual([4, 2])
    expect(orderBoards([], NOW)).toEqual({ coming: [], past: [] })
  })
})
