/**
 * API de mentira: Not-games. Un motor pequeño que hace lo mismo que el de la
 * API (reloj, cierre de preguntas, revelado, puntos, vidas) con unas pocas
 * preguntas de ejemplo y compañeros de mentira que entran y contestan solos.
 */

import type {
  QuizLobby,
  QuizPlayer,
  QuizQuestion,
  QuizRoom,
  QuizSettings,
  QuizTeam,
} from '@sanatorio/contracts'

import { ME } from './data'
import { portrait } from './portrait'
import { delay, fail } from './state'
import type { Api } from '../types'

type Sample = {
  prompt: string
  code?: string
  options: string[]
  answer: number
  why: string
  seconds: number
}

const SAMPLES: Sample[] = [
  {
    prompt: '¿Cuántos bits tiene un byte?',
    options: ['8', '4', '16', '32'],
    answer: 0,
    why: 'Un byte son 8 bits.',
    seconds: 10,
  },
  {
    prompt: 'Una pila sigue el orden…',
    options: ['FIFO', 'LIFO', 'Por tamaño', 'Al azar'],
    answer: 1,
    why: 'El último en entrar sale primero.',
    seconds: 10,
  },
  {
    prompt: '¿Qué imprime este código?',
    code: 'int a[] = {10, 20, 30};\nint *p = a + 1;\nprintf("%d", *p);',
    options: ['10', '20', '30', 'Una dirección'],
    answer: 1,
    why: 'a + 1 apunta al segundo elemento.',
    seconds: 30,
  },
  {
    prompt: '¿Qué devuelve read al final del fichero?',
    options: ['-1', '0', 'EOF', '1'],
    answer: 1,
    why: '0 es fin de fichero; -1, error.',
    seconds: 10,
  },
  {
    prompt: '¿Qué hace `git push`?',
    options: ['Sube tus commits al remoto', 'Crea un commit', 'Descarga cambios', 'Borra una rama'],
    answer: 0,
    why: 'commit guarda en local; push lo manda al remoto.',
    seconds: 10,
  },
  {
    prompt: '¿Cuánto vale 0xFF en decimal?',
    options: ['256', '255', '15', '128'],
    answer: 1,
    why: '15 × 16 + 15 = 255.',
    seconds: 10,
  },
  {
    prompt: '¿Qué falla en esta copia de cadena?',
    code: 'char *d = malloc(strlen(s));\nstrcpy(d, s);',
    options: [
      "Falta un byte para el '\\0'",
      'strcpy no copia el final',
      'Hay que liberar s',
      'Nada',
    ],
    answer: 0,
    why: "strlen no cuenta el '\\0' y strcpy sí lo copia.",
    seconds: 30,
  },
  {
    prompt: '¿Qué complejidad tiene la búsqueda binaria?',
    options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
    answer: 1,
    why: 'Cada paso descarta la mitad.',
    seconds: 10,
  },
]

const BOTS = ['mgarcia', 'jdoe', 'lsoto']
const COUNTDOWN = 3000
const REVEAL = 4000

type Player = Omit<QuizPlayer, 'answered'> & { ms: number }
type Answer = { login: string; option: number; correct: boolean }
/** Cuándo contesta un compañero de mentira (ms tras empezar la pregunta) y si acierta. */
type Plan = { after: number; correct: boolean }
type MockRoom = {
  id: number
  host: string
  settings: QuizSettings
  status: QuizRoom['status']
  phase: QuizRoom['phase']
  players: Player[]
  rounds: (Sample & { startsAt: number; endsAt: number })[]
  round: number
  until: number
  answers: Answer[][]
  bots: Map<string, Plan>[]
  createdAt: number
}

const rooms = new Map<number, MockRoom>()
let nextId = 1

const fresh = (login: string, team: QuizTeam | null): Player => ({
  login,
  image: portrait(login),
  team,
  score: 0,
  correct: 0,
  wrong: 0,
  lives: null,
  out: false,
  ms: 0,
})

/** Los compañeros de mentira entran en cuanto se crea la sala. */
function botsFor(settings: QuizSettings): Player[] {
  if (settings.mode === 'duel') return [fresh(BOTS[0] ?? 'bot', null)]
  if (settings.mode === 'teams')
    return BOTS.map((login, index) => fresh(login, index === 0 ? 'a' : 'b'))

  return BOTS.slice(0, 2).map((login) => fresh(login, null))
}

function score(room: MockRoom, login: string, correct: boolean | null): void {
  const player = room.players.find((p) => p.login === login)

  if (player === undefined || player.out) return
  if (correct === true) {
    player.score += 1
    player.correct += 1
  } else {
    if (correct === false) player.wrong += 1
    if (room.settings.competitive && correct === false) player.score -= 1
  }
  if (room.settings.mode === 'survival' && correct !== true) {
    player.lives = Math.max(0, (player.lives ?? 3) - 1)
    player.out = player.lives === 0
  }
}

/** Lo mismo que `advance` en la API: cierra, revela y pasa a la siguiente según la hora. */
function advance(room: MockRoom): void {
  for (let guard = 0; guard < 100 && room.status === 'playing'; guard++) {
    const t = Date.now()
    const round = room.rounds[room.round]
    const answers = room.answers[room.round] ?? []

    if (round === undefined) return

    if (room.phase === 'question') {
      // Los compañeros contestan cuando les toca.
      for (const [login, plan] of room.bots[room.round] ?? new Map<string, Plan>()) {
        if (t >= round.startsAt + plan.after && !answers.some((a) => a.login === login)) {
          const option = plan.correct ? round.answer : (round.answer + 1) % round.options.length

          answers.push({ login, option, correct: plan.correct })
          score(room, login, plan.correct)
        }
      }
      room.answers[room.round] = answers

      const active = room.players.filter((p) => !p.out)
      const everyone = active.every((p) => answers.some((a) => a.login === p.login))

      if (!everyone && t < round.endsAt + 1000) return
      for (const p of active)
        if (!answers.some((a) => a.login === p.login)) score(room, p.login, null)
      room.phase = 'reveal'
      room.until = Math.min(t, round.endsAt + 1000) + REVEAL
      continue
    }

    if (t < room.until) return

    const alive = room.players.filter((p) => !p.out)
    const over =
      room.round + 1 >= room.rounds.length ||
      alive.length === 0 ||
      (room.settings.mode === 'survival' && alive.length <= 1)

    if (over) {
      room.status = 'done'
      room.phase = null

      return
    }

    room.round += 1
    const next = room.rounds[room.round]

    if (next === undefined) return
    next.startsAt = room.until
    next.endsAt = next.startsAt + next.seconds * 1000
    room.phase = 'question'
  }
}

function winners(room: MockRoom): string[] {
  if (room.status !== 'done') return []
  if (room.settings.mode === 'teams') {
    const sum = (team: QuizTeam): number =>
      room.players.filter((p) => p.team === team).reduce((total, p) => total + p.score, 0)

    return sum('a') === sum('b') ? ['a', 'b'] : [sum('a') > sum('b') ? 'a' : 'b']
  }

  const value = (p: Player): number =>
    (room.settings.mode === 'survival' ? (p.lives ?? 0) * 100 : 0) + p.score
  const best = Math.max(...room.players.map(value))

  return room.players.filter((p) => value(p) === best).map((p) => p.login)
}

function view(room: MockRoom): QuizRoom {
  advance(room)

  const t = Date.now()
  const round = room.status === 'lobby' ? undefined : room.rounds[room.round]
  const answers = room.answers[room.round] ?? []
  const inside = room.players.some((p) => p.login === ME.login)
  const full = room.settings.mode === 'duel' && room.players.length >= 2
  const whyNot = inside
    ? null
    : room.status !== 'lobby'
      ? 'La partida ya ha empezado'
      : full
        ? 'La sala está llena'
        : null
  let question: QuizQuestion | null = null

  if (round !== undefined && room.status === 'playing') {
    const waiting = t < round.startsAt
    const reveal = room.phase === 'reveal'

    question = {
      index: room.round,
      total: room.rounds.length,
      kind: round.seconds > 10 ? 'long' : 'quick',
      level: 2,
      prompt: waiting ? '' : round.prompt,
      code: waiting ? null : (round.code ?? null),
      options: waiting ? [] : round.options.map((text, id) => ({ id, text })).reverse(),
      startsAt: new Date(round.startsAt).toISOString(),
      endsAt: new Date(round.endsAt).toISOString(),
      mine: answers.find((a) => a.login === ME.login)?.option ?? null,
      answer: reveal ? round.answer : null,
      why: reveal ? round.why : null,
      results: reveal
        ? room.players.map((p) => ({
            login: p.login,
            correct: answers.find((a) => a.login === p.login)?.correct ?? null,
          }))
        : null,
    }
  }

  return {
    id: room.id,
    host: room.host,
    settings: room.settings,
    status: room.status,
    phase: room.phase,
    players: room.players.map(({ ms: _, ...p }) => ({
      ...p,
      answered: room.phase === 'question' && answers.some((a) => a.login === p.login),
    })),
    question,
    now: new Date(t).toISOString(),
    winners: winners(room),
    joinable: whyNot === null,
    whyNot,
  }
}

function mustRoom(id: number): MockRoom {
  const room = rooms.get(id)

  if (room === undefined) throw fail(404, 'Esa sala ya no existe')

  return room
}

export const quizMock: Pick<
  Api,
  | 'getQuizRooms'
  | 'createQuizRoom'
  | 'getQuizRoom'
  | 'joinQuizRoom'
  | 'leaveQuizRoom'
  | 'startQuizRoom'
  | 'answerQuiz'
> = {
  async getQuizRooms() {
    await delay(150)

    const list: QuizLobby[] = [...rooms.values()]
      .filter((room) => room.status !== 'done' || room.players.some((p) => p.login === ME.login))
      .map((room) => ({
        id: room.id,
        host: room.host,
        settings: room.settings,
        status: room.status,
        players: room.players.length,
        joined: room.players.some((p) => p.login === ME.login),
      }))

    return list.reverse()
  },

  async createQuizRoom(settings) {
    await delay(150)

    const room: MockRoom = {
      id: nextId++,
      host: ME.login,
      settings: {
        ...settings,
        competitive: settings.mode === 'survival' ? false : settings.competitive,
      },
      status: 'lobby',
      phase: null,
      players: [fresh(ME.login, settings.mode === 'teams' ? 'a' : null), ...botsFor(settings)],
      rounds: [],
      round: -1,
      until: 0,
      answers: [],
      bots: [],
      createdAt: Date.now(),
    }

    rooms.set(room.id, room)

    return view(room)
  },

  async getQuizRoom(id) {
    await delay(60)

    return view(mustRoom(id))
  },

  async joinQuizRoom(id, team = null) {
    await delay(100)

    const room = mustRoom(id)
    const me = room.players.find((p) => p.login === ME.login)

    if (me !== undefined) me.team = room.settings.mode === 'teams' ? (team ?? me.team) : null
    else room.players.push(fresh(ME.login, room.settings.mode === 'teams' ? (team ?? 'a') : null))

    return view(room)
  },

  async leaveQuizRoom(id) {
    await delay(100)

    const room = mustRoom(id)

    // Como en la API: quien sale se va de la sala; la sala pasa a otra
    // persona, y vacía (los compañeros de mentira no cuentan), se borra.
    room.players = room.players.filter((p) => p.login !== ME.login)
    if (room.players.length === 0 || room.players.every((p) => BOTS.includes(p.login))) {
      rooms.delete(id)
    } else if (room.host === ME.login) {
      room.host = room.players[0]?.login ?? room.host
    }
  },

  async startQuizRoom(id) {
    await delay(150)

    const room = mustRoom(id)
    const t = Date.now()
    const count = Math.min(room.settings.questions, SAMPLES.length)

    if (room.host !== ME.login) throw fail(403, 'Solo quien creó la sala puede empezar')

    room.rounds = SAMPLES.slice(0, count).map((sample, index) => ({
      ...sample,
      startsAt: index === 0 ? t + COUNTDOWN : 0,
      endsAt: index === 0 ? t + COUNTDOWN + sample.seconds * 1000 : 0,
    }))
    room.answers = room.rounds.map(() => [])
    // Cada compañero contesta entre 2 y 7 segundos después, y acierta dos de cada tres.
    room.bots = room.rounds.map(
      () =>
        new Map(
          room.players
            .filter((p) => p.login !== ME.login)
            .map((p) => [
              p.login,
              { after: 2000 + Math.random() * 5000, correct: Math.random() < 0.67 },
            ]),
        ),
    )
    room.players = room.players.map((p) => ({
      ...p,
      lives: room.settings.mode === 'survival' ? 3 : null,
    }))
    room.status = 'playing'
    room.phase = 'question'
    room.round = 0

    return view(room)
  },

  async answerQuiz(id, question, option) {
    await delay(80)

    const room = mustRoom(id)

    advance(room)

    const round = room.rounds[question]
    const answers = room.answers[question] ?? []

    if (room.phase !== 'question' || room.round !== question || round === undefined) {
      throw fail(409, 'Esa pregunta ya se ha cerrado')
    }
    if (!answers.some((a) => a.login === ME.login)) {
      const correct = option === round.answer

      answers.push({ login: ME.login, option, correct })
      score(room, ME.login, correct)
    }

    return view(room)
  },
}
