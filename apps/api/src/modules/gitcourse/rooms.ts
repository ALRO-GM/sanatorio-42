/**
 * Las pruebas de grupo del curso de git: una sala por grupo, un origin común
 * y el repositorio de cada cual. Los comandos se ejecutan aquí, con el mismo
 * motor que la web (`@sanatorio/gitsim`), así que lo que se ve es lo que
 * cuenta. Cuando las misiones están hechas, la prueba queda superada para
 * todas las personas de la sala.
 *
 * Para entrar hace falta estar sentado en un puesto del clúster y haber pasado
 * el test previo de esa prueba; para jugar, seguir sentado.
 */

import type { GitRoom, GitRoomLobby, GitRoomPlayer, GitRunResult } from '@sanatorio/contracts'
import {
  gateOf,
  groupRemote,
  groupRepo,
  MAX_PLAYERS,
  missionDone,
  missionOf,
  PREFIXES,
  roleOf,
  run,
} from '@sanatorio/gitsim'
import type { GroupMission, GroupPlayer, Remote, Repo } from '@sanatorio/gitsim'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createLocks } from '../../core/lock.js'
import { parse } from '../../core/validation.js'

/** Tiempo para acabar la misión desde que empieza. */
const PLAY_MS = 60 * 60_000
/** Comandos por persona y partida: de sobra para jugar, no para llenar la base. */
const MAX_COMMANDS = 400
const LOBBY_TTL_MS = 2 * 3_600_000
const DONE_TTL_MS = 7 * 24 * 3_600_000

const createSchema = z.object({ gate: z.string().max(20) })
const runSchema = z.object({ line: z.string().max(200) })

type Status = GitRoom['status']

type State = {
  remote: Remote
  repos: Record<string, Repo>
  commands: Record<string, number>
  last: Record<string, string>
  /** Papel y prefijo de cada cual, fijados al empezar. */
  players: GroupPlayer[]
  deadline: string
  result: GitRoom['result']
}

type RoomRow = {
  id: number
  gate: string
  campusId: number
  host: string
  status: Status
  state: State | null
  createdAt: string
}

export function createRoomRepository(db: Db) {
  const roomOf = (row: Record<string, unknown>): RoomRow => ({
    id: toNumber(row.id),
    gate: toText(row.gate),
    campusId: toNumber(row.campus_id),
    host: toText(row.host),
    status: toText(row.status) as Status,
    state: typeof row.state === 'string' ? (JSON.parse(row.state) as State) : null,
    createdAt: toText(row.created_at),
  })

  return {
    async create(gate: string, campusId: number, host: string, at: string): Promise<number> {
      const result = await db.execute({
        sql: `INSERT INTO git_rooms (gate, campus_id, host, created_at) VALUES (?, ?, ?, ?)
              RETURNING id`,
        args: [gate, campusId, host, at],
      })

      return toNumber(result.rows[0]?.id)
    },

    async room(id: number): Promise<RoomRow | null> {
      const result = await db.execute({ sql: 'SELECT * FROM git_rooms WHERE id = ?', args: [id] })
      const row = result.rows[0]

      return row === undefined ? null : roomOf(row)
    },

    /** Las salas sin empezar de esa prueba en el campus, y las de `login` desde `since`. */
    async rooms(
      gate: string,
      campusId: number,
      login: string,
      since: string,
    ): Promise<(RoomRow & { players: number; joined: boolean })[]> {
      const result = await db.execute({
        sql: `SELECT r.*, (SELECT COUNT(*) FROM git_room_players p WHERE p.room_id = r.id) AS players,
                     EXISTS (SELECT 1 FROM git_room_players p WHERE p.room_id = r.id AND p.login = ?) AS joined
              FROM git_rooms r
              WHERE r.gate = ? AND ((r.campus_id = ? AND r.status = 'lobby')
                 OR (r.created_at >= ? AND EXISTS (SELECT 1 FROM git_room_players p WHERE p.room_id = r.id AND p.login = ?)))
              ORDER BY r.id DESC LIMIT 30`,
        args: [login, gate, campusId, since, login],
      })

      return result.rows.map((row) => ({
        ...roomOf(row),
        players: toNumber(row.players),
        joined: toNumber(row.joined) === 1,
      }))
    },

    async openRoomsOf(login: string): Promise<number[]> {
      const result = await db.execute({
        sql: `SELECT r.id FROM git_rooms r JOIN git_room_players p ON p.room_id = r.id
              WHERE p.login = ? AND r.status != 'done'`,
        args: [login],
      })

      return result.rows.map((row) => toNumber(row.id))
    },

    /** Quién hay, por orden de llegada (el orden da el papel). */
    async players(roomId: number): Promise<string[]> {
      const result = await db.execute({
        sql: 'SELECT login FROM git_room_players WHERE room_id = ? ORDER BY joined_at, login',
        args: [roomId],
      })

      return result.rows.map((row) => toText(row.login))
    },

    async join(roomId: number, login: string, at: string): Promise<void> {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO git_room_players (room_id, login, joined_at) VALUES (?, ?, ?)',
        args: [roomId, login, at],
      })
    },

    async remove(roomId: number, login: string): Promise<void> {
      await db.execute({
        sql: 'DELETE FROM git_room_players WHERE room_id = ? AND login = ?',
        args: [roomId, login],
      })
    },

    async setHost(roomId: number, login: string): Promise<void> {
      await db.execute({ sql: 'UPDATE git_rooms SET host = ? WHERE id = ?', args: [login, roomId] })
    },

    async save(roomId: number, status: Status, state: State, at: string | null): Promise<void> {
      await db.execute({
        sql: `UPDATE git_rooms SET status = ?, state = ?, finished_at = COALESCE(?, finished_at)
              WHERE id = ?`,
        args: [status, JSON.stringify(state), at, roomId],
      })
    },

    async drop(roomId: number): Promise<void> {
      await db.batch(
        [
          { sql: 'DELETE FROM git_room_players WHERE room_id = ?', args: [roomId] },
          { sql: 'DELETE FROM git_rooms WHERE id = ?', args: [roomId] },
        ],
        'write',
      )
    },

    async prune(lobbyBefore: string, doneBefore: string): Promise<number> {
      const old = await db.execute({
        sql: `SELECT id FROM git_rooms
              WHERE (status = 'lobby' AND created_at < ?) OR (status != 'lobby' AND created_at < ?)`,
        args: [lobbyBefore, doneBefore],
      })

      for (const row of old.rows) await this.drop(toNumber(row.id))

      return old.rows.length
    },
  }
}

type RoomRepository = ReturnType<typeof createRoomRepository>

export function createRoomService(deps: {
  rooms: RoomRepository
  seatOf: (login: string) => Promise<string | null>
  imagesOf: (logins: readonly string[]) => Promise<Map<string, string | null>>
  /** Si `login` pasó el test previo de `gate`. */
  passedQuiz: (login: string, gate: string) => Promise<boolean>
  /** Da la prueba por superada (en el camino, como un punto más). */
  award: (login: string, gate: string, commands: number, at: string) => Promise<void>
  now: () => number
}) {
  const { rooms } = deps
  const iso = (ms: number) => new Date(ms).toISOString()
  const locked = createLocks()

  function missionFor(gate: string): GroupMission {
    const mission = missionOf(gate)

    if (mission === undefined) throw domainError('not_found', 'Esa prueba de grupo no existe')

    return mission
  }

  async function mustRoom(id: number): Promise<RoomRow> {
    const room = await rooms.room(id)

    if (room === null) throw domainError('not_found', 'Esa sala ya no existe')

    return room
  }

  async function mustSeat(login: string): Promise<string> {
    const seat = await deps.seatOf(login)

    if (seat === null) {
      throw domainError(
        'forbidden',
        'Las pruebas de grupo se juegan desde un ordenador del clúster',
      )
    }

    return seat
  }

  /** Por qué `actor` no puede entrar (o `null` si puede, o si ya está). */
  async function whyNot(actor: Actor, room: RoomRow, players: string[]): Promise<string | null> {
    if (players.includes(actor.login)) return null
    if (room.status !== 'lobby') return 'La prueba ya ha empezado'
    if (room.campusId !== actor.campusId) return 'Esa sala es de otro campus'
    if (players.length >= MAX_PLAYERS) return 'La sala está llena'
    if (!(await deps.passedQuiz(actor.login, room.gate)))
      return 'Antes tienes que pasar el test de esta prueba'

    return null
  }

  async function mustBeFree(login: string, except: number | null = null): Promise<void> {
    if ((await rooms.openRoomsOf(login)).some((id) => id !== except)) {
      throw domainError('conflict', 'Ya estás en otra sala del curso: sal de ella antes')
    }
  }

  /** Se acabó el tiempo sin la misión: la sala se cierra sin superar la prueba. */
  async function expire(room: RoomRow): Promise<RoomRow> {
    const state = room.state

    if (room.status !== 'playing' || state === null || Date.parse(state.deadline) > deps.now())
      return room

    const done: State = { ...state, result: 'expired' }

    await rooms.save(room.id, 'done', done, iso(deps.now()))

    return { ...room, status: 'done', state: done }
  }

  async function viewOf(actor: Actor, room: RoomRow): Promise<GitRoom> {
    const logins = await rooms.players(room.id)
    const mission = missionFor(room.gate)
    const state = room.state
    const [images, seats] = await Promise.all([
      deps.imagesOf(logins),
      Promise.all(logins.map(async (login) => [login, await deps.seatOf(login)] as const)),
    ])
    const seatOf = new Map(seats)
    const placed = state?.players ?? logins.map((login, index) => player(mission, login, index))
    const players: GitRoomPlayer[] = logins.map((login) => ({
      login,
      image: images.get(login) ?? null,
      role: placed.find((p) => p.login === login)?.role ?? 'all',
      seat: seatOf.get(login) ?? null,
      commands: state?.commands[login] ?? 0,
      last: state?.last[login] ?? null,
    }))
    const repo = state?.repos[actor.login]
    const role = players.find((p) => p.login === actor.login)?.role
    const reason = await whyNot(actor, room, logins)

    return {
      id: room.id,
      gate: room.gate,
      host: room.host,
      status: room.status,
      players,
      missions:
        state === null
          ? []
          : mission.check(
              state.remote,
              state.players.filter((p) => logins.includes(p.login)),
            ),
      mine: repo === undefined || role === undefined ? null : { role, repo },
      remote: state?.remote ?? null,
      deadline: state?.deadline ?? null,
      result: state?.result ?? null,
      now: iso(deps.now()),
      joinable: reason === null && !logins.includes(actor.login),
      whyNot: reason,
    }
  }

  function player(mission: GroupMission, login: string, index: number): GroupPlayer {
    return { login, prefix: PREFIXES[index] ?? 'z', role: roleOf(mission, index).id }
  }

  return {
    async list(actor: Actor, gate: string): Promise<GitRoomLobby[]> {
      missionFor(gate)

      const rows = await rooms.rooms(
        gate,
        actor.campusId,
        actor.login,
        iso(deps.now() - 6 * 3_600_000),
      )

      return rows.map((room) => ({
        id: room.id,
        gate: room.gate,
        host: room.host,
        status: room.status,
        players: room.players,
        joined: room.joined,
      }))
    },

    async create(actor: Actor, input: unknown): Promise<GitRoom> {
      const { gate } = parse(createSchema, input)

      missionFor(gate)
      await mustSeat(actor.login)
      if (!(await deps.passedQuiz(actor.login, gate)))
        throw domainError('conflict', 'Antes tienes que pasar el test de esta prueba')
      await mustBeFree(actor.login)

      const id = await rooms.create(gate, actor.campusId, actor.login, iso(deps.now()))

      await rooms.join(id, actor.login, iso(deps.now()))

      return viewOf(actor, await mustRoom(id))
    },

    async view(actor: Actor, id: number): Promise<GitRoom> {
      return locked(id, async () => viewOf(actor, await expire(await mustRoom(id))))
    },

    async join(actor: Actor, id: number): Promise<GitRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)
        const players = await rooms.players(id)

        if (players.includes(actor.login)) return viewOf(actor, room)

        const reason = await whyNot(actor, room, players)

        if (reason !== null) throw domainError('conflict', reason)
        await mustSeat(actor.login)
        await mustBeFree(actor.login, id)
        await rooms.join(id, actor.login, iso(deps.now()))

        return viewOf(actor, room)
      })
    },

    /** Se va: la sala pasa a otra persona y se borra si queda vacía. Su repositorio se pierde. */
    async leave(actor: Actor, id: number): Promise<void> {
      await locked(id, async () => {
        const room = await mustRoom(id)
        const players = await rooms.players(id)

        if (!players.includes(actor.login)) return
        await rooms.remove(id, actor.login)

        const rest = players.filter((login) => login !== actor.login)

        if (rest.length === 0) await rooms.drop(id)
        else if (room.host === actor.login && rest[0] !== undefined)
          await rooms.setHost(id, rest[0])
      })
    },

    /** Empieza quien creó la sala, con el mínimo de personas y todas sentadas. */
    async start(actor: Actor, id: number): Promise<GitRoom> {
      return locked(id, async () => {
        const room = await mustRoom(id)
        const gate = gateOf(room.gate)
        const mission = missionFor(room.gate)

        if (room.host !== actor.login)
          throw domainError('forbidden', 'Solo quien creó la sala puede empezar')
        if (room.status !== 'lobby' || gate === undefined)
          throw domainError('conflict', 'La prueba ya ha empezado')

        const logins = await rooms.players(id)

        if (logins.length < gate.min)
          throw domainError('conflict', `Hacen falta ${gate.min} personas como poco`)

        const standing = (
          await Promise.all(
            logins.map(async (login) => ((await deps.seatOf(login)) === null ? login : null)),
          )
        ).filter((login) => login !== null)

        if (standing.length > 0) {
          throw domainError('conflict', `Falta sentarse en un puesto: ${standing.join(', ')}`)
        }

        const remote = groupRemote(mission)
        const players = logins.map((login, index) => player(mission, login, index))
        const state: State = {
          remote,
          repos: Object.fromEntries(players.map((p) => [p.login, groupRepo(remote, p.prefix)])),
          commands: {},
          last: {},
          players,
          deadline: iso(deps.now() + PLAY_MS),
          result: null,
        }

        await rooms.save(id, 'playing', state, null)

        return viewOf(actor, { ...room, status: 'playing', state })
      })
    },

    /** Una línea de la terminal, en tu repositorio y con el origin común. */
    async run(actor: Actor, id: number, input: unknown): Promise<GitRunResult> {
      const { line } = parse(runSchema, input)

      return locked(id, async () => {
        const room = await expire(await mustRoom(id))
        const state = room.state
        const repo = state?.repos[actor.login]

        if (room.status !== 'playing' || state === null)
          throw domainError('conflict', 'La prueba no está en juego')
        if (repo === undefined || !(await rooms.players(id)).includes(actor.login))
          throw domainError('forbidden', 'No juegas en esta sala')
        await mustSeat(actor.login)

        const used = state.commands[actor.login] ?? 0

        if (used >= MAX_COMMANDS)
          throw domainError('rate_limited', 'Has llegado al máximo de comandos de esta prueba')

        const result = run({ repo, remote: state.remote }, line)
        const next: State = {
          ...state,
          remote: result.remote ?? state.remote,
          repos: { ...state.repos, [actor.login]: result.repo },
          commands: { ...state.commands, [actor.login]: used + 1 },
          last: { ...state.last, [actor.login]: line },
        }
        const logins = await rooms.players(id)
        const present = next.players.filter((p) => logins.includes(p.login))
        const finished = missionDone(missionFor(room.gate).check(next.remote, present))
        const at = iso(deps.now())

        if (finished) {
          next.result = 'passed'
          for (const p of present)
            await deps.award(p.login, room.gate, next.commands[p.login] ?? 0, at)
        }
        await rooms.save(id, finished ? 'done' : 'playing', next, finished ? at : null)

        return {
          ok: result.ok,
          output: result.output,
          room: await viewOf(actor, {
            ...room,
            status: finished ? 'done' : 'playing',
            state: next,
          }),
        }
      })
    },

    async prune(): Promise<number> {
      const t = deps.now()

      return rooms.prune(iso(t - LOBBY_TTL_MS), iso(t - DONE_TTL_MS))
    },
  }
}

export type RoomService = ReturnType<typeof createRoomService>
