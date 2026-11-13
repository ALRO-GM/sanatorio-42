/**
 * Los logros de los cursos (`docs/cursos-logros.md`), que también son títulos
 * del banner. Lo usan el perfil (la lista de logros) y el banner de cada
 * título, que se dibuja con el icono y el patrón de su curso.
 */

import type { CourseAchievementId, CourseId } from '@sanatorio/contracts'

import type { IconName } from './ui/Icon'

/** El icono de cada curso: el de su pestaña. Lo de todos los cursos, un trofeo. */
const COURSE_ICON: Record<CourseId | 'courses', IconName> = {
  shell: 'terminal',
  git: 'chispa',
  docker: 'contenedor',
  k8s: 'timon',
  net: 'enrutador',
  rag: 'fuentes',
  courses: 'trofeo',
}

const PREFIXES = Object.keys(COURSE_ICON)

/** El curso de un logro (`shell_first` → `shell`), o `courses` si es de todos. */
const courseOf = (id: string): keyof typeof COURSE_ICON | null => {
  const prefix = id.split('_')[0] ?? ''

  return PREFIXES.includes(prefix) && id.includes('_') ? (prefix as keyof typeof COURSE_ICON) : null
}

/** `true` si el logro (o el título) es de los cursos. */
export const isCourseAchievement = (id: string): id is CourseAchievementId => courseOf(id) !== null

/** El icono de un logro o título de los cursos. */
export const courseIcon = (id: CourseAchievementId): IconName =>
  COURSE_ICON[courseOf(id) ?? 'courses']
