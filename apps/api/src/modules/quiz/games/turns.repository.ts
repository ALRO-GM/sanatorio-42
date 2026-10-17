/**
 * Las salas de juegos por turnos (`turn_rooms`, `turn_players`). El estado de
 * la partida va entero en JSON: solo lo toca el motor, siempre de una vez.
 */

import type { TurnSettings, TurnSide } from '@sanatorio/contracts'

import type { Db } from '../../../core/db/database.js'
import { toNumber, toText } from '../../../core/db/rows.js'

export type TurnRoomRow<State> = {
  id: number
  game: string
  campusId: number
  host: string
  settings: TurnSettings
  status: 'lobby' | 'playing' | 'done'
  state: State | null
  createdAt: string
}

export type TurnPlayerRow = { login: string; side: TurnSide; joinedAt: string }

export function createTurnsRepository<State>(db: Db) {
  const roomOf = (row: Record<string, unknown>): TurnRoomRow<State> => ({
    id: toNumber(row.id),
    game: toText(row.game),
    campusId: toNumber(row.campus_id),
    host: toText(row.host),
    settings: JSON.parse(toText(row.settings)) as TurnSettings,
    status: toText(row.status) as TurnRoomRow<State>['status'],
    state: typeof row.state === 'string' ? (JSON.parse(row.state) as State) : null,
    createdAt: toText(row.created_at),
  })

  return {
    async create(
      campusId: number,
      host: string,
      settings: TurnSettings,
      at: string,
    ): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO turn_rooms (game, campus_id, host, settings, created_at)
              VALUES (?, ?, ?, ?, ?) RETURNING id`,
        args: [settings.game, campusId, host, JSON.stringify(settings), at],
      })

      return toNumber(result.rows[0]?.id)
    },

    async room(id: number): Promise<TurnRoomRow<State> | null> {
      const result = await db.execute({ sql: 'SELECT * FROM turn_rooms WHERE id = ?', args: [id] })
      const row = result.rows[0]

      return row === undefined ? null : roomOf(row)
    },

    /** Las salas sin empezar del campus y las de `login` desde `since`, con cuántos hay. */
    async rooms(
      campusId: number,
      login: string,
      since: string,
    ): Promise<(TurnRoomRow<State> & { players: number; joined: boolean })[]> {
      const result = await db.execute({
        sql: `SELECT r.*, (SELECT COUNT(*) FROM turn_players p WHERE p.room_id = r.id) AS players,
                     EXISTS (SELECT 1 FROM turn_players p WHERE p.room_id = r.id AND p.login = ?) AS joined
              FROM turn_rooms r
              WHERE (r.campus_id = ? AND r.status = 'lobby')
                 OR (r.created_at >= ? AND EXISTS (SELECT 1 FROM turn_players p WHERE p.room_id = r.id AND p.login = ?))
              ORDER BY r.id DESC LIMIT 50`,
        args: [login, campusId, since, login],
      })

      return result.rows.map((row) => ({
        ...roomOf(row),
        players: toNumber(row.players),
        joined: toNumber(row.joined) === 1,
      }))
    },

    /** Las salas sin acabar en las que está. */
    async openRoomsOf(login: string): Promise<number[]> {
      const result = await db.execute({
        sql: `SELECT r.id FROM turn_rooms r JOIN turn_players p ON p.room_id = r.id
              WHERE p.login = ? AND r.status != 'done'`,
        args: [login],
      })

      return result.rows.map((row) => toNumber(row.id))
    },

    async players(roomId: number): Promise<TurnPlayerRow[]> {
      const result = await db.execute({
        sql: 'SELECT login, side, joined_at FROM turn_players WHERE room_id = ? ORDER BY joined_at, login',
        args: [roomId],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        side: toText(row.side) as TurnSide,
        joinedAt: toText(row.joined_at),
      }))
    },

    async join(roomId: number, login: string, side: TurnSide, at: string): Promise<void> {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO turn_players (room_id, login, side, joined_at) VALUES (?, ?, ?, ?)',
        args: [roomId, login, side, at],
      })
    },

    async remove(roomId: number, login: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM turn_players WHERE room_id = ? AND login = ?',
        args: [roomId, login],
      })
    },

    async setHost(roomId: number, login: string): Promise<void> {
      await db.execute({
        sql: 'UPDATE turn_rooms SET host = ? WHERE id = ?',
        args: [login, roomId],
      })
    },

    async save(
      roomId: number,
      status: TurnRoomRow<State>['status'],
      state: State,
      finishedAt: string | null = null,
    ): Promise<void> {
      await db.execute({
        sql: `UPDATE turn_rooms SET status = ?, state = ?, finished_at = COALESCE(?, finished_at)
              WHERE id = ?`,
        args: [status, JSON.stringify(state), finishedAt, roomId],
      })
    },

    async drop(roomId: number): Promise<void> {
      await db.batch(
        [
          { sql: 'DELETE FROM turn_players WHERE room_id = ?', args: [roomId] },
          { sql: 'DELETE FROM turn_rooms WHERE id = ?', args: [roomId] },
        ],
        'write',
      )
    },

    /** Borra las salas sin empezar de antes de `lobbyBefore` y las acabadas de antes de `doneBefore`. */
    async prune(lobbyBefore: string, doneBefore: string): Promise<number> {
      const old = await db.execute({
        sql: `SELECT id FROM turn_rooms
              WHERE (status = 'lobby' AND created_at < ?)
                 OR (status != 'lobby' AND created_at < ?)`,
        args: [lobbyBefore, doneBefore],
      })

      for (const row of old.rows) await this.drop(toNumber(row.id))

      return old.rows.length
    },
  }
}

export type TurnsRepository<State> = ReturnType<typeof createTurnsRepository<State>>
