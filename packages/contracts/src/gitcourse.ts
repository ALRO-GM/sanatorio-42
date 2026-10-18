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
