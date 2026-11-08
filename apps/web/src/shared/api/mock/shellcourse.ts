/**
 * API de mentira: el curso de shell (`terminal-course.ts`, el mismo que el de
 * Docker). Empieza con el nivel principiante superado (y su certificado) y dos
 * unidades del intermedio, para que la demostración enseñe el camino a medias.
 */

import { checkAttempt, FINALS, TIERS, UNITS } from '@sanatorio/shellsim'

import { terminalCourseMock } from './terminal-course'
import type { Api } from '../types'

const shell = terminalCourseMock({
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  checkAttempt,
  doneBefore: 'cut-tr',
})

export const shellCourseMock: Pick<
  Api,
  'getShellCourse' | 'submitShellAttempt' | 'startShellBoss'
> = {
  getShellCourse: shell.get,
  startShellBoss: shell.start,
  submitShellAttempt: shell.submit,
}
