/**
 * Lo común de los cursos de Not-games en la API (`docs/plantilla-cursos.md`).
 * Las reglas (estrellas, desbloqueo, forma de una unidad) son código y viven
 * en `@sanatorio/course`; aquí solo la forma de lo que guarda la API.
 */

export type CourseStars = 1 | 2 | 3

/** La mejor vez de un punto: comandos que contaron y, si es contrarreloj, segundos. */
export type CourseBest = { commands: number; seconds: number | null }

/** Un contrarreloj empezado: la API apunta cuándo y lo corrige con su reloj. */
export type CourseRun = { startedAt: string; deadline: string }

/** Los tres niveles que certifica un jefe final. */
export type CourseTier = 'beginner' | 'intermediate' | 'advanced'

/** Un nivel superado en su jefe final. */
export type CourseCertificate = {
  tier: CourseTier
  stars: CourseStars
  seconds: number
  at: string
}
