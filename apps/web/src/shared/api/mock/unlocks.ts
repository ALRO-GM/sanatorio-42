/**
 * La celebración de lo desbloqueado, de mentira (`docs/cursos-logros.md`).
 * Con `?logro` en la dirección sale una al abrir la web, para verla en la
 * demostración; y el primer punto superado del curso de Kubernetes (el único
 * que la persona de la demo no ha empezado) da su logro, como en la API.
 */

import type { CourseAchievementId, Unlock } from '@sanatorio/contracts'

import { mockCourseXp, unlockMockAchievement } from './courses'
import { delay } from './state'
import type { Api } from '../types'

const asUnlock = (id: CourseAchievementId): Unlock => ({
  id,
  kind: 'achievement',
  xp: mockCourseXp(id),
  level: 0,
})

/** Lo que espera a celebrarse, mientras dura la página. */
let pending: Unlock[] = new URLSearchParams(window.location.search).has('logro')
  ? [asUnlock('docker_first')]
  : []

/** Consigue un logro de quien mira y lo deja esperando su celebración. */
export function queueMockUnlock(id: CourseAchievementId): void {
  if (unlockMockAchievement(id)) pending = [...pending, asUnlock(id)]
}

export const unlocksMock: Pick<Api, 'getUnlocks' | 'markUnlocksSeen'> = {
  async getUnlocks() {
    await delay(120)

    return { unlocks: pending }
  },

  async markUnlocksSeen(ids) {
    await delay(60)
    pending = pending.filter((unlock) => !ids.includes(unlock.id))
  },
}
