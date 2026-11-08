/**
 * API de mentira: el curso de Docker (`terminal-course.ts`, el mismo que el de
 * shell). Empieza con el primer bloque superado, para que la demostración
 * enseñe el camino a medias.
 */

import { checkAttempt, FINALS, TIERS, UNITS } from '@sanatorio/dockersim'

import { terminalCourseMock } from './terminal-course'
import type { Api } from '../types'

const docker = terminalCourseMock({
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  checkAttempt,
  doneBefore: 'docker-env',
})

export const dockerCourseMock: Pick<
  Api,
  'getDockerCourse' | 'submitDockerAttempt' | 'startDockerBoss'
> = {
  getDockerCourse: docker.get,
  startDockerBoss: docker.start,
  submitDockerAttempt: docker.submit,
}
