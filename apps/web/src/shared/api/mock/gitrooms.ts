/**
 * API de mentira: las pruebas de grupo del curso de git. El mismo motor y las
 * mismas misiones que la API; las compañeras son de mentira: entran solas en
 * la sala y, al empezar, van escribiendo su parte de la misión, una línea cada
 * poco. Tú entras la última, así que te toca el último papel (en Gitflow, una
 * funcionalidad).
 */

import type { GitRoom, GitRoomPlayer } from '@sanatorio/contracts'
import {
  gateOf,
  groupRemote,
  groupRepo,
  missionDone,
  missionOf,
  PREFIXES,
  roleOf,
  run,
} from '@sanatorio/gitsim'
import type { GroupMission, GroupPlayer, Remote, Repo } from '@sanatorio/gitsim'

import { ME } from './data'
import { portrait } from './portrait'
import { delay, fail } from './state'
import type { Api } from '../types'

const MATES = ['mgarcia', 'lperez'] as const
const JOIN_MS = 1500
const LINE_MS = 2500
const PLAY_MS = 60 * 60_000

/** Lo que escribe cada compañera, por prueba y por orden de llegada. */
const SCRIPTS: Record<string, string[][]> = {
  group1: [
    [
      'git switch -c mgarcia',
      'echo hola > mgarcia.txt',
      'git add mgarcia.txt',
      'git commit -m "Mi fichero"',
      'git push origin mgarcia',
    ],
  ],
  group2: [
    [
      'git switch -c mgarcia',
      'echo "- mgarcia" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Me apunto"',
      'git push origin mgarcia',
      'gh pr merge mgarcia',
    ],
    [
      'git switch -c lperez',
      'echo "- lperez" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Me apunto"',
      'git push origin lperez',
      'gh pr merge lperez',
      'git pull origin main',
      'echo "# Equipo" > equipo.txt',
      'echo "- mgarcia" >> equipo.txt',
      'echo "- lperez" >> equipo.txt',
      'git add equipo.txt',
      'git commit -m "Resuelto"',
      'git push origin lperez',
      'gh pr merge lperez',
    ],
  ],
  group3: [
    [
      'git switch develop',
      'git switch -c release/1.1',
      'echo "1.1" > version.txt',
      'git add version.txt',
      'git commit -m "Versión 1.1"',
      'git switch main',
      'git merge release/1.1',
      'git tag v1.1',
      'git switch develop',
      'git merge release/1.1',
      'git push origin develop',
      'git switch main',
      'git pull',
      'git push origin main',
      'git push --tags',
    ],
    [
      'git switch -c hotfix/1.0.1',
      'echo arreglado > arreglo.txt',
      'git add arreglo.txt',
      'git commit -m "Arreglo urgente"',
      'git switch main',
      'git merge hotfix/1.0.1',
      'git tag v1.0.1',
      'git push origin main',
      'git push --tags',
      'git switch develop',
      'git merge hotfix/1.0.1',
      'git pull',
      'git push origin develop',
    ],
  ],
}

type Room = {
  id: number
  gate: string
  logins: string[]
  status: GitRoom['status']
  createdAt: number
  remote: Remote | null
  repos: Record<string, Repo>
  commands: Record<string, number>
  last: Record<string, string>
  players: GroupPlayer[]
  /** Por qué línea va cada compañera. */
  cursor: Record<string, number>
  nextAt: number
  deadline: number
  result: GitRoom['result']
}

let rooms: Room[] = []
let nextId = 1

const missionFor = (gate: string): GroupMission => {
  const mission = missionOf(gate)

  if (mission === undefined) throw fail(404, 'Esa prueba de grupo no existe')

  return mission
}

function mustRoom(id: number): Room {
  const room = rooms.find((each) => each.id === id)

  if (room === undefined) throw fail(404, 'Esa sala ya no existe')

  return room
}

/** Una línea de alguien, con el origin común. */
function play(
  room: Room,
  login: string,
  line: string,
): { ok: boolean; output: string[]; done: boolean } {
  const repo = room.repos[login]

  if (repo === undefined || room.remote === null) return { ok: false, output: [], done: false }

  const result = run({ repo, remote: room.remote }, line)

  room.repos[login] = result.repo
  room.remote = result.remote ?? room.remote
  room.commands[login] = (room.commands[login] ?? 0) + 1
  room.last[login] = line
  const done = missionDone(missionFor(room.gate).check(room.remote, room.players))

  if (done) {
    room.status = 'done'
    room.result = 'passed'
  }

  return { ok: result.ok, output: result.output, done }
}

/** Lo que pasa con el tiempo: entran las compañeras y, jugando, escriben su parte. */
function advance(room: Room): void {
  const now = Date.now()
  const mates = MATES.slice(0, SCRIPTS[room.gate]?.length ?? 1)

  if (room.status === 'lobby') {
    mates.forEach((mate, index) => {
      if (!room.logins.includes(mate) && now - room.createdAt > JOIN_MS * (index + 1)) {
        // Entran «antes» que tú: así te queda el último papel.
        room.logins = [...room.logins.filter((login) => login !== ME.login), mate, ME.login]
      }
    })

    return
  }
  if (room.status !== 'playing') return
  if (now > room.deadline) {
    room.status = 'done'
    room.result = 'expired'

    return
  }
  while (now >= room.nextAt) {
    room.nextAt += LINE_MS
    for (const [index, mate] of room.logins.filter((login) => login !== ME.login).entries()) {
      const line = SCRIPTS[room.gate]?.[index]?.[room.cursor[mate] ?? 0]

      if (line === undefined) continue
      room.cursor[mate] = (room.cursor[mate] ?? 0) + 1
      // Si la misión ya está, `play` cierra la sala: no se sigue.
      if (play(room, mate, line).done) return
    }
  }
}

function viewOf(room: Room): GitRoom {
  const mission = missionFor(room.gate)
  const players: GitRoomPlayer[] = room.logins.map((login, index) => ({
    login,
    image: portrait(login),
    role: room.players.find((p) => p.login === login)?.role ?? roleOf(mission, index).id,
    seat: `c1r3s${index + 2}`,
    commands: room.commands[login] ?? 0,
    last: room.last[login] ?? null,
  }))
  const repo = room.repos[ME.login]
  const role = players.find((p) => p.login === ME.login)?.role

  return {
    id: room.id,
    gate: room.gate,
    host: ME.login,
    status: room.status,
    players,
    missions: room.remote === null ? [] : mission.check(room.remote, room.players),
    mine: repo === undefined || role === undefined ? null : { role, repo },
    remote: room.remote,
    deadline: room.status === 'lobby' ? null : new Date(room.deadline).toISOString(),
    result: room.result,
    now: new Date().toISOString(),
    joinable: false,
    whyNot: null,
  }
}

export const gitRoomsMock: Pick<
  Api,
  | 'getGitRooms'
  | 'createGitRoom'
  | 'getGitRoom'
  | 'joinGitRoom'
  | 'leaveGitRoom'
  | 'startGitRoom'
  | 'runGitRoom'
> = {
  async getGitRooms(gate) {
    await delay(80)
    missionFor(gate)

    return rooms
      .filter((room) => room.gate === gate)
      .map((room) => ({
        id: room.id,
        gate: room.gate,
        host: ME.login,
        status: room.status,
        players: room.logins.length,
        joined: true,
      }))
  },
  async createGitRoom(gate) {
    await delay(120)
    missionFor(gate)
    if (rooms.some((room) => room.status !== 'done'))
      throw fail(409, 'Ya estás en otra sala del curso: sal de ella antes')

    const room: Room = {
      id: nextId++,
      gate,
      logins: [ME.login],
      status: 'lobby',
      createdAt: Date.now(),
      remote: null,
      repos: {},
      commands: {},
      last: {},
      players: [],
      cursor: {},
      nextAt: 0,
      deadline: 0,
      result: null,
    }

    rooms = [room, ...rooms]

    return viewOf(room)
  },
  async getGitRoom(id) {
    await delay(60)

    const room = mustRoom(id)

    advance(room)

    return viewOf(room)
  },
  async joinGitRoom(id) {
    await delay(80)

    return viewOf(mustRoom(id))
  },
  async leaveGitRoom(id) {
    await delay(80)
    rooms = rooms.filter((room) => room.id !== id)
  },
  async startGitRoom(id) {
    await delay(120)

    const room = mustRoom(id)
    const mission = missionFor(room.gate)
    const min = gateOf(room.gate)?.min ?? 2

    advance(room)
    if (room.logins.length < min) throw fail(409, `Hacen falta ${min} personas como poco`)

    const remote = groupRemote(mission)

    room.remote = remote
    room.players = room.logins.map((login, index) => ({
      login,
      prefix: PREFIXES[index] ?? 'z',
      role: roleOf(mission, index).id,
    }))
    room.repos = Object.fromEntries(room.players.map((p) => [p.login, groupRepo(remote, p.prefix)]))
    room.status = 'playing'
    room.nextAt = Date.now() + LINE_MS
    room.deadline = Date.now() + PLAY_MS

    return viewOf(room)
  },
  async runGitRoom(id, line) {
    await delay(60)

    const room = mustRoom(id)

    advance(room)
    if (room.status !== 'playing') throw fail(409, 'La prueba no está en juego')

    const { ok, output } = play(room, ME.login, line)

    return { ok, output, room: viewOf(room) }
  },
}
