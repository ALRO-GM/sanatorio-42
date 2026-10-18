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
