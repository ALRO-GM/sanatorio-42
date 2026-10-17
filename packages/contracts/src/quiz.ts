/**
 * Not-games: partidas de preguntas de programación entre estudiantes.
 *
 * El servidor lleva el reloj y corrige: la web nunca recibe cuál es la buena
 * hasta que se cierra la pregunta.
 */

/**
 * - `duel`: dos personas, gana quien más acierta.
 * - `teams`: equipo A contra equipo B, gana el que más suma.
 * - `ffa`: todos contra todos (con una sola persona es una práctica).
 * - `survival`: todos contra todos con tres vidas; gana quien quede.
 */
export type QuizMode = 'duel' | 'teams' | 'ffa' | 'survival'

/** Qué preguntas: lo que saben todos los que juegan, o solo lo general. */
export type QuizPool = 'common' | 'general'

export type QuizKinds = 'quick' | 'long' | 'mixed'

/** `rising`: de lo fácil a lo difícil a lo largo de la partida. */
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'rising'

export type QuizTeam = 'a' | 'b'

export type QuizSettings = {
  mode: QuizMode
  /** Fallar resta un punto (no vale en supervivencia: ahí se pierden vidas). */
  competitive: boolean
  pool: QuizPool
  kinds: QuizKinds
  difficulty: QuizDifficulty
  /** Preguntas de la partida (en supervivencia, como mucho). */
  questions: number
  /** Círculo mínimo para entrar, o `null` si puede entrar cualquiera. */
  minCircle: number | null
}

/** Cuerpo de `POST /quiz/rooms`. */
export type QuizRoomInput = QuizSettings

export type QuizPlayer = {
  login: string
  /** Su foto de 42, si la hay. */
  image: string | null
  team: QuizTeam | null
  score: number
  correct: number
  wrong: number
  /** Vidas que le quedan, solo en supervivencia. */
  lives: number | null
  /** Eliminado (supervivencia). Quien se va, sale de la sala. */
  out: boolean
  /** Ya ha contestado la pregunta de ahora. */
  answered: boolean
}

export type QuizOption = { id: number; text: string }

/** La pregunta de ahora, tal como la ve quien pregunta. */
export type QuizQuestion = {
  index: number
  total: number
  kind: 'quick' | 'long'
  /** Dificultad de ahora, de 1 a 5. */
  level: number
  prompt: string
  code: string | null
  /** En el orden en que le salen a esta persona. */
  options: QuizOption[]
  /**
   * Cuándo se puede empezar a contestar (ISO-8601). Hasta entonces hay cuenta
   * atrás y la pregunta llega vacía: así sale a la vez para todos.
   */
  startsAt: string
  /** Cuándo se cierra (ISO-8601). */
  endsAt: string
  /** La que ha elegido, o `null`. */
  mine: number | null
  /** Solo al revelar: la buena, el porqué y quién acertó. */
  answer: number | null
  why: string | null
  results: { login: string; correct: boolean | null }[] | null
}

export type QuizRoom = {
  id: number
  host: string
  settings: QuizSettings
  status: 'lobby' | 'playing' | 'done'
  /** `question`: se puede contestar; `reveal`: se enseña la respuesta. */
  phase: 'question' | 'reveal' | null
  players: QuizPlayer[]
  question: QuizQuestion | null
  /** Hora del servidor, para que la cuenta atrás no dependa del reloj de cada cual. */
  now: string
  /** Al acabar: los logins (o los equipos, `a` y `b`) que han ganado. */
  winners: string[]
  /** Si quien pregunta puede entrar, y si no, por qué (en español). */
  joinable: boolean
  whyNot: string | null
}

/** Una sala en la lista de salas abiertas del campus. */
export type QuizLobby = {
  id: number
  host: string
  settings: QuizSettings
  status: 'lobby' | 'playing' | 'done'
  players: number
  /** Estás dentro. */
  joined: boolean
}

/** Cuerpo de `POST /quiz/rooms/:id/join`. */
export type QuizJoinInput = { team?: QuizTeam | null }

/** Cuerpo de `POST /quiz/rooms/:id/answer`. */
export type QuizAnswerInput = { question: number; option: number }
