/**
 * API de mentira: el curso de Kubernetes (`terminal-course.ts`, el mismo que
 * los de shell y Docker). Empieza con el primer bloque superado, para que la
 * demostración enseñe el camino a medias.
 */

import { checkAttempt, FINALS, TIERS, UNITS } from '@sanatorio/k8ssim'

import { terminalCourseMock } from './terminal-course'
import type { Api } from '../types'

const k8s = terminalCourseMock({
  units: UNITS,
  finals: FINALS,
  tiers: TIERS,
  checkAttempt,
  doneBefore: 'k8s-deployment',
})

export const k8sCourseMock: Pick<Api, 'getK8sCourse' | 'submitK8sAttempt' | 'startK8sBoss'> = {
  getK8sCourse: k8s.get,
  startK8sBoss: k8s.start,
  submitK8sAttempt: k8s.submit,
}
