/**
 * API de mentira: pizarras.
 */

import { ME } from './data'
import type { StoredBoard } from './data'
import type { Api } from '../types'
import { state, delay, fail, emptyToNull, find, boardView, newId } from './state'

export const boardsMock: Pick<
  Api,
  'getBoards' | 'createBoard' | 'updateBoard' | 'joinBoard' | 'leaveBoard' | 'cancelBoard'
> = {
  // --- Pizarras ----------------------------------------------------------------

  async getBoards(from, to) {
    await delay()

    return state.boards
      .filter((board) => board.startsAt >= from && board.startsAt < to)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map(boardView)
  },

  async createBoard(board) {
    await delay()

    const created: StoredBoard = {
      id: newId(),
      host: ME.login,
      hostImage: ME.image,
      title: board.title,
      topic: emptyToNull(board.topic),
      description: emptyToNull(board.description),
      place: board.place,
      startsAt: board.startsAt,
      endsAt: board.endsAt,
      capacity: board.capacity ?? 20,
      attendees: [],
    }

    state.boards.push(created)

    return boardView(created)
  },

  async updateBoard(id, board) {
    await delay()
    const current = find(state.boards, id, 'Esa pizarra')

    if (current.host !== ME.login) {
      throw fail(403, 'Solo quien imparte la pizarra puede cambiarla')
    }

    Object.assign(current, {
      title: board.title,
      topic: emptyToNull(board.topic),
      description: emptyToNull(board.description),
      place: board.place,
      startsAt: board.startsAt,
      endsAt: board.endsAt,
      capacity: board.capacity ?? current.capacity,
    })

    return boardView(current)
  },

  async joinBoard(id) {
    await delay()
    const board = find(state.boards, id, 'Esa pizarra')

    if (board.attendees.length >= board.capacity) {
      throw fail(409, 'No quedan plazas')
    }

    if (!board.attendees.includes(ME.login)) board.attendees.push(ME.login)
  },

  async leaveBoard(id) {
    await delay()
    const board = find(state.boards, id, 'Esa pizarra')

    board.attendees = board.attendees.filter((login) => login !== ME.login)
  },

  async cancelBoard(id) {
    await delay()
    state.boards = state.boards.filter((board) => board.id !== id)
  },
}
