/**
 * Not-games en la base: salas, jugadores, preguntas montadas, respuestas y
 * estadísticas por concepto. Sin reglas: solo leer y escribir.
 */

import type { QuizSettings, QuizTeam } from '@sanatorio/contracts'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { Round } from './quiz.rules.js'

export type RoomRow = {
  id: number
  campusId: number
  host: string
  settings: QuizSettings
  status: 'lobby' | 'playing' | 'done'
  round: number
  phase: 'question' | 'reveal' | null
  phaseUntil: number | null
  createdAt: string
}

export type PlayerRow = {
  login: string
  team: QuizTeam | null
  score: number
  correct: number
  wrong: number
  lives: number | null
  ms: number
  out: boolean
}

export type RoundRow = Round & {
  index: number
  level: number
  startsAt: number | null
  endsAt: number | null
}

type AnswerRow = { login: string; option: number; correct: boolean; ms: number }

const roomOf = (row: Record<string, unknown>): RoomRow => ({
  id: toNumber(row.id),
  campusId: toNumber(row.campus_id),
  host: toText(row.host),
  settings: JSON.parse(toText(row.settings)) as QuizSettings,
  status: toText(row.status) as RoomRow['status'],
  round: toNumber(row.round),
  phase: row.phase === null ? null : (toText(row.phase) as RoomRow['phase']),
  phaseUntil: row.phase_until === null ? null : toNumber(row.phase_until),
  createdAt: toText(row.created_at),
})

export function createQuizRepository(db: Db) {
  return {
    async createRoom(
      campusId: number,
      host: string,
      settings: QuizSettings,
      at: string,
    ): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO quiz_rooms (campus_id, host, settings, created_at) VALUES (?, ?, ?, ?)`,
        args: [campusId, host, JSON.stringify(settings), at],
      })

      return Number(result.lastInsertRowid)
    },

    async room(id: number): Promise<RoomRow | null> {
      const result = await db.execute({ sql: 'SELECT * FROM quiz_rooms WHERE id = ?', args: [id] })
      const row = result.rows[0]

      return row === undefined ? null : roomOf(row)
    },

    /** Salas abiertas del campus y las que tiene alguien entre manos. */
    async rooms(
      campusId: number,
      login: string,
      since: string,
    ): Promise<(RoomRow & { players: number; joined: boolean })[]> {
      const result = await db.execute({
        sql: `SELECT r.*, (SELECT COUNT(*) FROM quiz_players p WHERE p.room_id = r.id AND p.out = 0) AS players,
                     EXISTS (SELECT 1 FROM quiz_players p WHERE p.room_id = r.id AND p.login = ?) AS joined
              FROM quiz_rooms r
              WHERE (r.campus_id = ? AND r.status = 'lobby')
                 OR (r.created_at >= ? AND EXISTS
                       (SELECT 1 FROM quiz_players p WHERE p.room_id = r.id AND p.login = ?))
              ORDER BY r.id DESC LIMIT 50`,
        args: [login, campusId, since, login],
      })

      return result.rows.map((row) => ({
        ...roomOf(row),
        players: toNumber(row.players),
        joined: toNumber(row.joined) === 1,
      }))
    },

    /** Las salas sin terminar en las que está alguien. */
    async openRoomsOf(login: string): Promise<number[]> {
      const result = await db.execute({
        sql: `SELECT r.id FROM quiz_rooms r JOIN quiz_players p ON p.room_id = r.id
              WHERE p.login = ? AND p.out = 0 AND r.status != 'done'`,
        args: [login],
      })

      return result.rows.map((row) => toNumber(row.id))
    },

    async players(roomId: number): Promise<PlayerRow[]> {
      const result = await db.execute({
        sql: 'SELECT * FROM quiz_players WHERE room_id = ? ORDER BY joined_at, login',
        args: [roomId],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        team: row.team === null ? null : (toText(row.team) as QuizTeam),
        score: toNumber(row.score),
        correct: toNumber(row.correct),
        wrong: toNumber(row.wrong),
        lives: row.lives === null ? null : toNumber(row.lives),
        ms: toNumber(row.ms),
        out: toNumber(row.out) === 1,
      }))
    },

    async join(roomId: number, login: string, team: QuizTeam | null, at: string): Promise<void> {
      await db.execute({
        sql: `INSERT INTO quiz_players (room_id, login, team, joined_at) VALUES (?, ?, ?, ?)
              ON CONFLICT (room_id, login) DO UPDATE SET team = excluded.team, out = 0`,
        args: [roomId, login, team, at],
      })
    },

    async remove(roomId: number, login: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM quiz_players WHERE room_id = ? AND login = ?',
        args: [roomId, login],
      })
    },

    /** Guarda cómo le fue a cada cual en una partida terminada. */
    async record(
      game: string,
      mode: string,
      roomId: number,
      campusId: number,
      results: readonly {
        login: string
        won: boolean
        correct: number
        wrong: number
        score: number
      }[],
      at: string,
    ): Promise<void> {
      if (results.length === 0) return

      await db.batch(
        results.map((r) => ({
          sql: `INSERT INTO game_results (game, mode, room_id, campus_id, login, won, correct, wrong, score, at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            game,
            mode,
            roomId,
            campusId,
            r.login,
            r.won ? 1 : 0,
            r.correct,
            r.wrong,
            r.score,
            at,
          ],
        })),
        'write',
      )
    },

    /** Pasa la sala a otra persona (cuando se va quien la creó). */
    async setHost(roomId: number, login: string): Promise<void> {
      await db.execute({
        sql: 'UPDATE quiz_rooms SET host = ? WHERE id = ?',
        args: [login, roomId],
      })
    },

    async drop(roomId: number): Promise<void> {
      await db.batch(
        ['quiz_answers', 'quiz_rounds', 'quiz_players', 'quiz_rooms'].map((table) => ({
          sql: `DELETE FROM ${table} WHERE ${table === 'quiz_rooms' ? 'id' : 'room_id'} = ?`,
          args: [roomId],
        })),
        'write',
      )
    },

    /** Empieza la partida: guarda sus preguntas y pone vidas y marcadores a cero. */
    async start(
      roomId: number,
      rounds: readonly RoundRow[],
      lives: number | null,
      firstEnds: number,
      at: string,
    ): Promise<void> {
      await db.batch(
        [
          ...rounds.map((round) => ({
            sql: `INSERT INTO quiz_rounds
                    (room_id, idx, concept_id, kind, seconds, level, prompt, code, options, answer, why,
                     starts_at, ends_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              roomId,
              round.index,
              round.conceptId,
              round.kind,
              round.seconds,
              round.level,
              round.prompt,
              round.code,
              JSON.stringify(round.options),
              round.answer,
              round.why,
              round.startsAt,
              round.endsAt,
            ],
          })),
          {
            sql: `UPDATE quiz_players SET score = 0, correct = 0, wrong = 0, ms = 0, lives = ?
                  WHERE room_id = ?`,
            args: [lives, roomId],
          },
          {
            sql: `UPDATE quiz_rooms SET status = 'playing', round = 0, phase = 'question',
                    phase_until = ?, started_at = ? WHERE id = ?`,
            args: [firstEnds, at, roomId],
          },
        ],
        'write',
      )
    },

    async round(roomId: number, index: number): Promise<RoundRow | null> {
      const result = await db.execute({
        sql: 'SELECT * FROM quiz_rounds WHERE room_id = ? AND idx = ?',
        args: [roomId, index],
      })
      const row = result.rows[0]

      if (row === undefined) return null

      return {
        index: toNumber(row.idx),
        conceptId: toText(row.concept_id),
        kind: toText(row.kind) as RoundRow['kind'],
        seconds: toNumber(row.seconds),
        level: toNumber(row.level),
        prompt: toText(row.prompt),
        code: row.code === null ? null : toText(row.code),
        options: JSON.parse(toText(row.options)) as string[],
        answer: toNumber(row.answer),
        why: toText(row.why),
        startsAt: row.starts_at === null ? null : toNumber(row.starts_at),
        endsAt: row.ends_at === null ? null : toNumber(row.ends_at),
      }
    },

    async rounds(roomId: number): Promise<number> {
      const result = await db.execute({
        sql: 'SELECT COUNT(*) AS n FROM quiz_rounds WHERE room_id = ?',
        args: [roomId],
      })

      return toNumber(result.rows[0]?.n ?? 0)
    },

    async answers(roomId: number, index: number): Promise<AnswerRow[]> {
      const result = await db.execute({
        sql: 'SELECT login, option, correct, ms FROM quiz_answers WHERE room_id = ? AND idx = ?',
        args: [roomId, index],
      })

      return result.rows.map((row) => ({
        login: toText(row.login),
        option: toNumber(row.option),
        correct: toNumber(row.correct) === 1,
        ms: toNumber(row.ms),
      }))
    },

    /**
     * Guarda una respuesta y lo que cambia en el marcador. `false` si ya había
     * contestado (no se cuenta dos veces).
     */
    async answer(
      roomId: number,
      index: number,
      login: string,
      answer: AnswerRow,
      change: { points: number; lives: number | null; out: boolean },
    ): Promise<boolean> {
      const inserted = await db.execute({
        sql: `INSERT OR IGNORE INTO quiz_answers (room_id, idx, login, option, correct, ms)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [roomId, index, login, answer.option, answer.correct ? 1 : 0, answer.ms],
      })

      if (inserted.rowsAffected === 0) return false

      await db.execute({
        sql: `UPDATE quiz_players SET score = score + ?, correct = correct + ?, wrong = wrong + ?,
                ms = ms + ?, lives = ?, out = ? WHERE room_id = ? AND login = ?`,
        args: [
          change.points,
          answer.correct ? 1 : 0,
          answer.correct ? 0 : 1,
          answer.ms,
          change.lives,
          change.out ? 1 : 0,
          roomId,
          login,
        ],
      })

      return true
    },

    /** Apunta para el Repaso que `login` ha fallado (o acertado) ese concepto. */
    async remember(login: string, conceptId: string, correct: boolean, at: string): Promise<void> {
      await db.execute({
        sql: correct
          ? `UPDATE quiz_misses SET last_right_at = ? WHERE login = ? AND concept_id = ?`
          : `INSERT INTO quiz_misses (login, concept_id, misses, last_missed_at) VALUES (?, ?, 1, ?)
             ON CONFLICT (login, concept_id) DO UPDATE SET misses = misses + 1, last_missed_at = excluded.last_missed_at`,
        args: correct ? [at, login, conceptId] : [login, conceptId, at],
      })
    },

    /** Lo que ha fallado `login`, de lo último a lo primero. */
    async misses(
      login: string,
    ): Promise<
      { conceptId: string; misses: number; lastMissedAt: string; lastRightAt: string | null }[]
    > {
      const result = await db.execute({
        sql: `SELECT concept_id, misses, last_missed_at, last_right_at FROM quiz_misses
              WHERE login = ? ORDER BY last_missed_at DESC`,
        args: [login],
      })

      return result.rows.map((row) => ({
        conceptId: toText(row.concept_id),
        misses: toNumber(row.misses),
        lastMissedAt: toText(row.last_missed_at),
        lastRightAt: typeof row.last_right_at === 'string' ? row.last_right_at : null,
      }))
    },

    /** Quita una vida (o deja fuera) a quien no contestó a tiempo. */
    async penalize(
      roomId: number,
      login: string,
      lives: number | null,
      out: boolean,
    ): Promise<void> {
      await db.execute({
        sql: 'UPDATE quiz_players SET lives = ?, out = ? WHERE room_id = ? AND login = ?',
        args: [lives, out ? 1 : 0, roomId, login],
      })
    },

    async setPhase(
      roomId: number,
      change: {
        round?: number
        phase: RoomRow['phase']
        until: number | null
        status?: RoomRow['status']
        finishedAt?: string
      },
    ): Promise<void> {
      await db.execute({
        sql: `UPDATE quiz_rooms SET round = COALESCE(?, round), phase = ?, phase_until = ?,
                status = COALESCE(?, status), finished_at = COALESCE(?, finished_at) WHERE id = ?`,
        args: [
          change.round ?? null,
          change.phase,
          change.until,
          change.status ?? null,
          change.finishedAt ?? null,
          roomId,
        ],
      })
    },

    async setRoundTimes(
      roomId: number,
      index: number,
      startsAt: number,
      endsAt: number,
    ): Promise<void> {
      await db.execute({
        sql: 'UPDATE quiz_rounds SET starts_at = ?, ends_at = ? WHERE room_id = ? AND idx = ?',
        args: [startsAt, endsAt, roomId, index],
      })
    },

    /** Lo que se sabe de cada concepto: veces que salió y que se falló. */
    async stats(): Promise<Map<string, { shown: number; wrong: number }>> {
      const result = await db.execute('SELECT concept_id, shown, wrong FROM quiz_stats')

      return new Map(
        result.rows.map((row) => [
          toText(row.concept_id),
          { shown: toNumber(row.shown), wrong: toNumber(row.wrong) },
        ]),
      )
    },

    async count(conceptId: string, shown: number, wrong: number): Promise<void> {
      await db.execute({
        sql: `INSERT INTO quiz_stats (concept_id, shown, wrong) VALUES (?, ?, ?)
              ON CONFLICT (concept_id) DO UPDATE SET shown = shown + excluded.shown,
                wrong = wrong + excluded.wrong`,
        args: [conceptId, shown, wrong],
      })
    },

    /** Los slugs de lo que ha aprobado o está haciendo cada una de esas personas. */
    async slugsOf(logins: readonly string[]): Promise<Map<string, Set<string>>> {
      const found = new Map<string, Set<string>>(logins.map((login) => [login, new Set<string>()]))

      if (logins.length === 0) return found

      const result = await db.execute({
        sql: `SELECT u.login, p.slug FROM project_users pu
              JOIN users u ON u.id = pu.user_id JOIN projects p ON p.id = pu.project_id
              WHERE u.login IN (${logins.map(() => '?').join(', ')})
                AND (pu.status = 'in_progress' OR (pu.status = 'finished' AND pu.validated = 1))`,
        args: [...logins],
      })

      for (const row of result.rows) found.get(toText(row.login))?.add(toText(row.slug))

      return found
    },

    /** Borra las salas que se quedaron sin empezar y las terminadas hace tiempo. */
    async prune(lobbyBefore: string, doneBefore: string): Promise<number> {
      const old = await db.execute({
        sql: `SELECT id FROM quiz_rooms WHERE (status = 'lobby' AND created_at < ?)
                OR (status != 'lobby' AND created_at < ?)`,
        args: [lobbyBefore, doneBefore],
      })

      for (const row of old.rows) await this.drop(toNumber(row.id))

      return old.rows.length
    },
  }
}

export type QuizRepository = ReturnType<typeof createQuizRepository>
