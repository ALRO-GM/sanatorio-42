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

/** Sin empezar, jugando o acabada. */
export type QuizRoomStatus = 'lobby' | 'playing' | 'done'

export type QuizRoom = {
  id: number
  host: string
  settings: QuizSettings
  status: QuizRoomStatus
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

// --- Juegos por turnos con pregunta (ajedrez y los que vengan)

/** Los juegos por turnos que hay. */
export type TurnGameKind = 'chess'

/** Los dos bandos. En ajedrez, `a` son las blancas. */
export type TurnSide = 'a' | 'b'

export type TurnSettings = {
  game: TurnGameKind
  /** Minutos de reloj de cada bando. */
  minutes: number
  /** Qué preguntas salen entre jugada y jugada, como en las salas de preguntas. */
  pool: QuizPool
  kinds: QuizKinds
  minCircle: number | null
}

export type TurnPlayer = {
  login: string
  image: string | null
  side: TurnSide
  /** Lo que le queda de reloj, en ms, a la hora de `now`. */
  clockMs: number
  correct: number
  wrong: number
}

/** La pregunta entre jugada y jugada. El primero que contesta decide quién mueve. */
export type TurnQuestionView = {
  index: number
  kind: 'quick' | 'long'
  prompt: string
  code: string | null
  options: QuizOption[]
  startsAt: string
  endsAt: string
  /** Lo que has contestado tú, o `null`. */
  mine: number | null
}

/** Cómo fue la pregunta anterior: quién contestó primero, si acertó y quién movió. */
export type TurnLastQuestion = {
  index: number
  prompt: string
  options: QuizOption[]
  answer: number
  why: string
  /** Quién contestó primero (o `null`: nadie contestó y movió a quien le tocaba). */
  first: { login: string; correct: boolean } | null
  /** Quién ganó el turno. */
  winner: TurnSide
  /** Quién perdió el 10 % de su tiempo por fallar. */
  penalized: TurnSide | null
}

export type ChessBoardView = {
  fen: string
  /** La última jugada, para resaltarla. */
  lastMove: { from: string; to: string; captured: boolean; check: boolean } | null
  /** Las jugadas en notación algebraica, en orden. */
  history: string[]
}

export type TurnEnd = {
  /** `null`: tablas. */
  winner: TurnSide | null
  reason: 'checkmate' | 'stalemate' | 'draw' | 'time' | 'resign' | 'left'
}

export type TurnRoom = {
  id: number
  host: string
  settings: TurnSettings
  status: QuizRoomStatus
  players: TurnPlayer[]
  /** El bando que tiene que mover, o `null` mientras hay pregunta (o sin empezar). */
  mover: TurnSide | null
  question: TurnQuestionView | null
  last: TurnLastQuestion | null
  board: ChessBoardView | null
  end: TurnEnd | null
  /** Hora del servidor: los relojes y la cuenta atrás van con ella. */
  now: string
  joinable: boolean
  whyNot: string | null
}

/** Una sala por turnos en la lista. */
export type TurnLobby = {
  id: number
  host: string
  settings: TurnSettings
  status: QuizRoomStatus
  players: number
  joined: boolean
}

export type TurnMoveInput = { from: string; to: string; promotion?: 'q' | 'r' | 'b' | 'n' }
export type TurnAnswerInput = { question: number; option: number }
