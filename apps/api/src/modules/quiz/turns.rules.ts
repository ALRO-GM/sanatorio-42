/**
 * Juegos por turnos con pregunta: la mecánica común, sin nada de ningún juego.
 *
 * Dos bandos (`a` y `b`), cada uno con su reloj. Se juega así:
 *
 * 1. Quien tiene el turno mueve; mientras piensa, corre su reloj.
 * 2. Al mover, los dos relojes se paran y sale una pregunta a los dos.
 * 3. El primero que contesta decide quién mueve ahora:
 *    - si acierta, mueve él (y empieza a correr su reloj);
 *    - si falla, mueve el rival, y él pierde el 10 % del tiempo que le queda.
 * 4. Si nadie contesta a tiempo, sale otra pregunta; si tampoco se contestan
 *    las siguientes (`MAX_REASKS`: nadie está mirando), mueve a quien le
 *    tocaba por orden, para que la partida no se quede parada.
 * 5. Si al que gana la pregunta el juego no le deja mover (en ajedrez, mover
 *    dos veces seguidas puede dar una posición imposible), mueve el otro.
 * 6. Si el juego obliga a un bando a mover ya (en ajedrez, quien está en
 *    jaque), mueve sin pregunta (`passTurn`).
 *
 * Pierde quien se queda sin tiempo. El juego (ajedrez y los que vengan) solo
 * dice quién tiene el turno por orden, si un bando puede mover y cuándo se
 * acaba: lo demás está aquí.
 */

export type Side = 'a' | 'b'

export const other = (side: Side): Side => (side === 'a' ? 'b' : 'a')

/** Lo que se pierde del tiempo que queda al fallar la pregunta. */
export const MISS_PENALTY = 0.1

/** Preguntas nuevas que salen seguidas si nadie contesta, antes de mover por orden. */
export const MAX_REASKS = 2

type TurnAnswer = { side: Side; option: number; correct: boolean; at: number }

export type TurnQuestion = {
  conceptId: string
  /** Quién movía por orden: mueve si nadie contesta. */
  natural: Side
  startsAt: number
  endsAt: number
  answer: number
  answers: TurnAnswer[]
  /** Cuántas veces se ha cambiado ya de pregunta porque nadie contestaba. */
  reasks?: number
}

export type TurnState = {
  /** Lo que le queda a cada bando, en ms, contado hasta `since`. */
  clocks: Record<Side, number>
  /** El bando que tiene que mover ahora, o `null` mientras hay pregunta. */
  mover: Side | null
  /** Desde cuándo corre el reloj de `mover`. */
  since: number | null
  question: TurnQuestion | null
  /** La pregunta anterior, ya cerrada, para enseñar cómo fue. */
  last: (TurnQuestion & { winner: Side; penalized: Side | null }) | null
  /** Quién se ha quedado sin tiempo. */
  flagged: Side | null
}

export function startTurns(clockMs: number, first: Side, t: number): TurnState {
  return {
    clocks: { a: clockMs, b: clockMs },
    mover: first,
    since: t,
    question: null,
    last: null,
    flagged: null,
  }
}

/** Lo que le queda a cada bando ahora mismo (el reloj que corre, descontado). */
export function clocksAt(state: TurnState, t: number): Record<Side, number> {
  if (state.mover === null || state.since === null) return state.clocks

  return {
    ...state.clocks,
    [state.mover]: Math.max(0, state.clocks[state.mover] - (t - state.since)),
  }
}

/** Si al que mueve se le ha acabado el tiempo, queda marcado. */
export function checkFlag(state: TurnState, t: number): TurnState {
  if (state.mover === null || state.flagged !== null) return state

  const clocks = clocksAt(state, t)

  return clocks[state.mover] <= 0 ? { ...state, clocks, since: t, flagged: state.mover } : state
}

/**
 * Ha movido `state.mover`: se paran los relojes y sale la pregunta. `natural`
 * es a quién le toca ahora por orden (normalmente, el otro).
 */
export function afterMove(
  state: TurnState,
  t: number,
  question: { conceptId: string; answer: number; seconds: number },
  natural: Side,
  delayMs = 0,
): TurnState {
  const startsAt = t + delayMs

  return {
    ...state,
    clocks: clocksAt(state, t),
    mover: null,
    since: null,
    question: {
      conceptId: question.conceptId,
      natural,
      startsAt,
      endsAt: startsAt + question.seconds * 1000,
      answer: question.answer,
      answers: [],
    },
  }
}

/** Un bando contesta. Solo vale la primera de cada bando y dentro de tiempo. */
export function answerTurn(
  state: TurnState,
  side: Side,
  option: number,
  t: number,
  graceMs = 0,
): TurnState | null {
  const q = state.question

  if (q === null || t < q.startsAt || t > q.endsAt + graceMs) return null
  if (q.answers.some((a) => a.side === side)) return null

  return {
    ...state,
    question: {
      ...q,
      answers: [...q.answers, { side, option, correct: option === q.answer, at: t }],
    },
  }
}

/**
 * Cierra la pregunta si ya se puede (alguien ha contestado, o se acabó el
 * tiempo) y decide quién mueve. `canMove` es la regla del juego: si un bando
 * puede mover ahora. Devuelve el mismo estado si aún no toca cerrarla.
 */
export function settleQuestion(
  state: TurnState,
  t: number,
  canMove: (side: Side) => boolean,
  graceMs = 0,
): TurnState {
  const q = state.question

  if (q === null) return state

  const first = [...q.answers].sort((x, y) => x.at - y.at)[0]

  if (first === undefined && t <= q.endsAt + graceMs) return state

  let winner: Side = q.natural
  let penalized: Side | null = null

  if (first !== undefined) {
    winner = first.correct ? first.side : other(first.side)
    if (!first.correct) penalized = first.side
  }
  // Si quien gana no puede mover, mueve el otro.
  if (!canMove(winner)) winner = other(winner)

  const clocks = { ...state.clocks }

  if (penalized !== null) clocks[penalized] = Math.floor(clocks[penalized] * (1 - MISS_PENALTY))

  // El reloj de quien mueve empieza a correr al cerrarse la pregunta: si el
  // primero en contestar lo hizo antes de tiempo, desde que contestó.
  const since = first === undefined ? Math.min(t, q.endsAt + graceMs) : Math.min(t, first.at)

  return {
    ...state,
    clocks,
    mover: winner,
    since,
    question: null,
    last: { ...q, winner, penalized },
  }
}

/** Si la pregunta se cerró sin que nadie contestara y aún toca cambiarla por otra. */
export function unanswered(state: TurnState, t: number, graceMs = 0): boolean {
  const q = state.question

  return (
    q !== null && q.answers.length === 0 && t > q.endsAt + graceMs && (q.reasks ?? 0) < MAX_REASKS
  )
}

/** Nadie contestó: otra pregunta, justo al acabarse la anterior, para los mismos bandos. */
export function reask(
  state: TurnState,
  question: { conceptId: string; answer: number; seconds: number },
  graceMs = 0,
): TurnState {
  const q = state.question

  if (q === null) return state

  const startsAt = q.endsAt + graceMs

  return {
    ...state,
    question: {
      conceptId: question.conceptId,
      natural: q.natural,
      startsAt,
      endsAt: startsAt + question.seconds * 1000,
      answer: question.answer,
      answers: [],
      reasks: (q.reasks ?? 0) + 1,
    },
  }
}

/** Ha movido `state.mover` y el juego obliga a `side` a mover ya: sin pregunta. */
export function passTurn(state: TurnState, t: number, side: Side): TurnState {
  return { ...state, clocks: clocksAt(state, t), mover: side, since: t, question: null }
}
