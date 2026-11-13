/**
 * La parte de juego de los cursos (`docs/cursos-logros.md`): clasificaciones
 * por campus en Clasificaciones y logros que se lucen como título del banner.
 * Todo sale de lo que ya guarda cada curso (`*_progress`).
 */

import type { LeaderboardPeriod } from './profile.js'
import type { StatsEntry, StatsTotal } from './stats.js'

/**
 * Los cursos. Los cuatro primeros, en el orden sugerido: shell → git → Docker →
 * Kubernetes. El de RAG va aparte: tiene su clasificación y sus logros, pero no
 * entra en los de «los cuatro cursos».
 */
export type CourseId = 'shell' | 'git' | 'docker' | 'k8s' | 'rag'

/**
 * Las clasificaciones de los cursos: el total de todos, una por curso, los
 * jefes vencidos y los certificados (en git, su jefe final).
 */
export type CourseBoardId = 'total' | CourseId | 'bosses' | 'certificates'

/** Una clasificación de cursos: como las de Ayuda (`StatsSection`), con sus cifras del campus. */
export type CourseBoard = {
  id: CourseBoardId
  totals: StatsTotal[]
  ranking: StatsEntry[]
  me: StatsEntry | null
}

/** `GET /courses/ranking?period=month|all`: las clasificaciones de los cursos del campus que se mira. */
export type CourseRanking = {
  period: LeaderboardPeriod
  boards: CourseBoard[]
}

/**
 * Los logros de los cursos. Cada uno, al conseguirlo, también es un título
 * para el banner. De shell, Docker, Kubernetes y RAG: el primer punto, cada
 * certificado de nivel y todos los jefes con tres estrellas. De git: el primer
 * punto, las tres pruebas de grupo, el jefe final y todos los jefes con tres
 * estrellas. Y de todos: empezar los cuatro, terminarlos y terminarlos en el
 * orden sugerido.
 */
export type CourseAchievementId =
  | 'shell_first'
  | 'shell_beginner'
  | 'shell_intermediate'
  | 'shell_advanced'
  | 'shell_bosses'
  | 'git_first'
  | 'git_group'
  | 'git_boss'
  | 'git_bosses'
  | 'docker_first'
  | 'docker_beginner'
  | 'docker_intermediate'
  | 'docker_advanced'
  | 'docker_bosses'
  | 'k8s_first'
  | 'k8s_beginner'
  | 'k8s_intermediate'
  | 'k8s_advanced'
  | 'k8s_bosses'
  | 'rag_first'
  | 'rag_beginner'
  | 'rag_intermediate'
  | 'rag_advanced'
  | 'rag_bosses'
  | 'courses_explorer'
  | 'courses_all'
  | 'courses_order'
