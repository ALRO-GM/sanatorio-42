/**
 * Curso de git (#42 del buzón): el camino de puntos y lo que llevas hecho. Los
 * niveles (teoría, reto, solución) viven en `@sanatorio/gitsim`; aquí solo va
 * lo que guarda la API.
 */

/** Lo que llevas: por cada punto superado, sus estrellas (la mejor vez). */
export type GitCourse = {
  /** El puesto del clúster desde el que juegas; sin puesto no se puede jugar. */
  seat: string | null
  stars: Record<string, 1 | 2 | 3>
  /** El test previo de cada prueba de grupo (`group1`…, `boss`) que se ha intentado. */
  gates: Record<string, GitGateState>
}

export type GitGateState = {
  passed: boolean
  /** Si se falló: desde cuándo se puede repetir (una hora después). */
  retryAt: string | null
}

/** `POST /gitcourse/gates/:gate/start`: las preguntas, sin la buena. */
export type GitGateQuiz = {
  gate: string
  questions: { prompt: string; code: string | null; options: string[] }[]
  /** Hasta cuándo se aceptan las respuestas. */
  deadline: string
}

/** `POST /gitcourse/gates/:gate/answer`: la posición elegida en cada pregunta (`null`, sin contestar). */
export type GitGateAnswerInput = { answers: (number | null)[] }

export type GitGateResult = {
  passed: boolean
  right: number
  total: number
  /** Cada pregunta con la buena, la elegida y el porqué. */
  review: {
    prompt: string
    code: string | null
    options: string[]
    answer: number
    chosen: number | null
    why: string
  }[]
  course: GitCourse
}

/** `POST /gitcourse/levels/:id`: los comandos que escribiste, en orden. */
export type GitAttemptInput = { lines: string[] }

export type GitAttemptResult = {
  done: boolean
  stars: 0 | 1 | 2 | 3
  /** Qué no está como se pide: `main`, `origin/feature`, `main:hola.c`… */
  misses: string[]
  course: GitCourse
}

// --- Pruebas de grupo ------------------------------------------------------

/** Un commit del git simulado (como lo guarda `@sanatorio/gitsim`). */
export type GitCommitView = {
  id: string
  parents: string[]
  message: string
  files: Record<string, string>
}

/** Tu repositorio en una prueba de grupo: lo que hace falta para pintarlo y para el prompt. */
export type GitRepoView = {
  commits: Record<string, GitCommitView>
  branches: Record<string, string>
  tracking: Record<string, string>
  tags: Record<string, string>
  head: { kind: 'branch'; name: string } | { kind: 'detached'; id: string }
  merging: { theirs: string; conflicts: string[] } | null
}

/** El origin común de la sala. */
export type GitRemoteView = {
  commits: Record<string, GitCommitView>
  branches: Record<string, string>
  tags: Record<string, string>
  locked: string[]
}

export type GitRoomStatus = 'lobby' | 'playing' | 'done'

/** `GET /gitcourse/rooms?gate=`: las salas sin empezar del campus y las tuyas. */
export type GitRoomLobby = {
  id: number
  gate: string
  host: string
  status: GitRoomStatus
  players: number
  joined: boolean
}

export type GitRoomPlayer = {
  login: string
  image: string | null
  /** El papel en la misión (`all`, `release`, `hotfix`, `feature`…). */
  role: string
  /** El puesto desde el que juega ahora (`null`: se ha levantado). */
  seat: string | null
  commands: number
  /** Lo último que escribió (en el jefe final no se ve lo de los demás). */
  last: string | null
}

export type GitMissionItem = { text: string; done: boolean; login: string | null; extra: boolean }

/** `GET /gitcourse/rooms/:id`: la sala, la misión y tu repositorio (la web lo pide cada dos segundos). */
export type GitRoom = {
  id: number
  gate: string
  host: string
  status: GitRoomStatus
  players: GitRoomPlayer[]
  missions: GitMissionItem[]
  /** Tu papel y tu repositorio, si juegas y ha empezado. */
  mine: { role: string; repo: GitRepoView } | null
  remote: GitRemoteView | null
  /** Hasta cuándo se puede jugar (desde que empieza). */
  deadline: string | null
  /** Al acabar: `passed` (misión cumplida) o `expired` (se acabó el tiempo). */
  result: 'passed' | 'expired' | null
  now: string
  joinable: boolean
  whyNot: string | null
}

/** `POST /gitcourse/rooms/:id/run`: una línea de la terminal. */
export type GitRunInput = { line: string }

export type GitRunResult = { ok: boolean; output: string[]; room: GitRoom }
