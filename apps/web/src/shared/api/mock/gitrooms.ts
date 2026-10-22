/**
 * API de mentira: las pruebas de grupo del curso de git y el jefe final. El
 * mismo motor y las mismas misiones que la API; las compañeras son de
 * mentira: entran solas en la sala y, al empezar, hacen sus tareas paso a
 * paso (cada paso, de una vez, para no pisarse a medias). Tú entras la última.
 */

import type { GitRoom, GitRoomPlayer } from '@sanatorio/contracts'
import { gateOf, groupStart, missionDone, missionOf, PREFIXES, run } from '@sanatorio/gitsim'
import type { GroupMission, GroupPlayer, Remote, Repo } from '@sanatorio/gitsim'

import { ME } from './data'
import { portrait } from './portrait'
import { delay, fail } from './state'
import type { Api } from '../types'

const MATES = ['mgarcia', 'lperez'] as const
const JOIN_MS = 1500
const STEP_MS = 2500

/**
 * Un paso del guion: unas líneas que se ejecutan seguidas. Dos especiales:
 * `#resolver f` deja `f` con todas las líneas de los dos lados (sin marcas) y
 * lo confirma; `#revert mensaje` deshace el commit con ese mensaje. Con
 * `wait`, el paso espera a que se cumpla; con `again`, se repite mientras se
 * cumpla (otra persona se adelantó y hay que volver a traer lo suyo).
 */
type Step = {
  lines: string[]
  wait?: (room: Room) => boolean
  again?: (room: Room, login: string) => boolean
}

const step = (...lines: string[]): Step => ({ lines })

/** Los pasos de cada compañera según la prueba, con su login y su número. */
const SCRIPTS: Record<string, (login: string, n: number) => Step[]> = {
  group1: (login) => [
    step(`git switch -c ${login}`, `echo hola > ${login}.txt`, `git add ${login}.txt`),
    step('git commit -m "Mi fichero"', `git push origin ${login}`),
    step('git switch main', 'git pull', `git merge --no-ff ${login}`),
    step('git pull', 'git push'),
  ],
  group2: (login) => [
    step(`git switch -c ${login}`, `echo "- ${login}" >> equipo.txt`, 'git add equipo.txt'),
    step('git commit -m "Me apunto"', `git push origin ${login}`),
    step(`gh pr merge ${login}`),
    {
      lines: [
        'git pull origin main',
        '#resolver equipo.txt',
        `git push origin ${login}`,
        `gh pr merge ${login}`,
      ],
      // Si otra se adelantó, su pull request vuelve a chocar: otra vuelta.
      again: (room) => !mainFile(room, 'equipo.txt').split('\n').includes(`- ${login}`),
    },
  ],
  group3: (login, n) => [
    step('git switch develop', `git switch -c feature/${login}`, `echo hecho > ${login}.txt`),
    step(`git add ${login}.txt`, 'git commit -m "Mi funcionalidad"'),
    step(
      'git switch develop',
      'git pull',
      `git merge --no-ff feature/${login}`,
      'git push origin develop',
    ),
    step('git switch main', 'git pull', `git switch -c hotfix/1.0.${n}`),
    step(
      `echo arreglado > arreglo-${login}.txt`,
      `git add arreglo-${login}.txt`,
      'git commit -m "Arreglo"',
    ),
    step(
      'git switch main',
      'git pull',
      `git merge --no-ff hotfix/1.0.${n}`,
      `git tag v1.0.${n}`,
      'git push origin main',
    ),
    step(
      'git switch develop',
      'git pull',
      `git merge --no-ff hotfix/1.0.${n}`,
      'git push origin develop',
    ),
    step(
      `git switch -c release/1.${n}`,
      `echo notas > notas-1.${n}.txt`,
      `git add notas-1.${n}.txt`,
    ),
    step(
      'git commit -m "Versión"',
      'git switch main',
      'git pull',
      `git merge --no-ff release/1.${n}`,
    ),
    step(`git tag v1.${n}`, 'git pull', 'git push origin main', 'git push --tags'),
    step(
      'git switch develop',
      'git pull',
      `git merge --no-ff release/1.${n}`,
      'git push origin develop',
    ),
  ],
  boss: (login, n) => [
    step(`git switch -c fix/${login}`, `#revert Rompe ${n}`, `git push origin fix/${login}`),
    step(`gh pr merge fix/${login}`),
    step('git switch develop', `git switch -c feature/${login}`, `echo uno > ${login}.txt`),
    step(`git add ${login}.txt`, 'git commit -m "Parte 1"', `echo dos >> ${login}.txt`),
    step(`git add ${login}.txt`, 'git commit -m "Parte 2"'),
    step('git reset --soft HEAD~2', `git commit -m "Funcionalidad de ${login}"`),
    step(
      'git fetch',
      'git rebase origin/develop',
      'git switch develop',
      'git reset --hard origin/develop',
      `git merge feature/${login}`,
      'git push origin develop',
    ),
    {
      // Publicar solo cuando todo esté en develop y main esté arreglada.
      lines: [
        'gh pr merge develop',
        'git switch main',
        'git pull',
        `git tag v2.${n}`,
        'git push --tags',
      ],
      wait: (room) => {
        const remote = room.remote

        if (remote === null) return false

        const files = (branch: string) => remote.commits[remote.branches[branch] ?? '']?.files ?? {}

        return (
          room.players.every((p) => files('develop')[`${p.login}.txt`] !== undefined) &&
          !Object.keys(files('main')).some((path) => path.startsWith('rompe-'))
        )
      },
    },
  ],
}

/** Un fichero de la punta de main en origin. */
const mainFile = (room: Room, path: string): string =>
  room.remote?.commits[room.remote.branches.main ?? '']?.files[path] ?? ''

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
  /** Por qué paso va cada compañera. */
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

/** Los dos lados de cada conflicto, sin marcas y sin repetir líneas. */
function resolved(text: string): string[] {
  const lines = text.split('\n').filter((line) => !/^(<{7}|={7}|>{7})/.test(line))

  return [...new Set(lines)]
}

/** Las líneas de verdad de una línea de guion (las especiales se convierten aquí). */
function expand(repo: Repo, line: string): string[] {
  if (line.startsWith('#resolver ')) {
    const path = line.slice('#resolver '.length)
    const [first = '', ...rest] = resolved(repo.work[path] ?? '')

    return [
      `echo "${first}" > ${path}`,
      ...rest.map((each) => `echo "${each}" >> ${path}`),
      `git add ${path}`,
      'git commit -m "Resuelto"',
    ]
  }
  if (line.startsWith('#revert ')) {
    const message = line.slice('#revert '.length)
    const id = Object.values(repo.commits).find((commit) => commit.message === message)?.id

    return id === undefined ? [] : [`git revert ${id}`]
  }

  return [line]
}

/** Una línea de alguien, con el origin común. Al cumplirse la misión, la sala acaba. */
function play(room: Room, login: string, line: string): { ok: boolean; output: string[] } {
  const repo = room.repos[login]

  if (repo === undefined || room.remote === null) return { ok: false, output: [] }

  const result = run({ repo, remote: room.remote }, line)

  room.repos[login] = result.repo
  room.remote = result.remote ?? room.remote
  room.commands[login] = (room.commands[login] ?? 0) + 1
  room.last[login] = line
  if (missionDone(missionFor(room.gate).check(room.remote, room.players))) {
    room.status = 'done'
    room.result = 'passed'
  }

  return { ok: result.ok, output: result.output }
}

/** Lo que pasa con el tiempo: entran las compañeras y, jugando, hacen su parte. */
function advance(room: Room): void {
  const now = Date.now()
  const mates = MATES.slice(0, Math.max(1, (gateOf(room.gate)?.min ?? 2) - 1))

  if (room.status === 'lobby') {
    mates.forEach((mate, index) => {
      if (!room.logins.includes(mate) && now - room.createdAt > JOIN_MS * (index + 1)) {
        // Entran «antes» que tú: así eres la última.
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
  for (; now >= room.nextAt; room.nextAt += STEP_MS) {
    for (const p of room.players.filter((each) => each.login !== ME.login)) {
      const steps = SCRIPTS[room.gate]?.(p.login, p.n) ?? []
      const next = steps[room.cursor[p.login] ?? 0]

      if (next === undefined || (next.wait !== undefined && !next.wait(room))) continue
      for (const raw of next.lines) {
        // Cada línea especial se convierte con el repositorio de ese momento.
        const repo = room.repos[p.login]

        if (repo === undefined) break
        for (const line of expand(repo, raw)) play(room, p.login, line)
      }
      if (!next.again?.(room, p.login)) room.cursor[p.login] = (room.cursor[p.login] ?? 0) + 1
      if (room.result !== null) return
    }
  }
}

function viewOf(room: Room): GitRoom {
  const mission = missionFor(room.gate)
  const players: GitRoomPlayer[] = room.logins.map((login, index) => ({
    login,
    image: portrait(login),
    n: index + 1,
    seat: mission.apart ? `c${String(index + 1)}r2s3` : `c1r3s${String(index + 2)}`,
    commands: room.commands[login] ?? 0,
    last: mission.apart && login !== ME.login ? null : (room.last[login] ?? null),
  }))
  const repo = room.repos[ME.login]
  const n = players.find((p) => p.login === ME.login)?.n

  return {
    id: room.id,
    gate: room.gate,
    host: ME.login,
    status: room.status,
    players,
    missions: room.remote === null ? [] : mission.check(room.remote, room.players),
    mine: repo === undefined || n === undefined ? null : { n, repo },
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
    if (room.logins.length < min) throw fail(409, `Hacen falta ${String(min)} personas como poco`)

    room.players = room.logins.map((login, index) => ({
      login,
      prefix: PREFIXES[index] ?? 'z',
      n: index + 1,
    }))

    const started = groupStart(mission, room.players)

    room.remote = started.remote
    room.repos = started.repos
    room.status = 'playing'
    room.nextAt = Date.now() + STEP_MS
    room.deadline = Date.now() + mission.minutes * 60_000

    return viewOf(room)
  },
  async runGitRoom(id, line) {
    await delay(60)

    const room = mustRoom(id)

    advance(room)
    if (room.status !== 'playing') throw fail(409, 'La prueba no está en juego')

    return { ...play(room, ME.login, line), room: viewOf(room) }
  },
}
