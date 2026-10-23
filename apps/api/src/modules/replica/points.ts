/**
 * El historial de puntos de evaluación de alguien en 42: lo que ha ganado,
 * gastado y donado a la bolsa. Bajo demanda, y solo si la cuota deja gastar en
 * lo que puede esperar.
 */

import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { ApiCorrectionPoint } from '../../integrations/forty-two/types.js'
import type { Quota } from './quota.js'
import type { ReplicaRepository } from './replica.repository.js'

export function createPoints(deps: {
  client: Pick<FortyTwoClient, 'getCorrectionPoints'>
  quota: Pick<Quota, 'allows'>
  replica: Pick<ReplicaRepository, 'userIdOf'>
}) {
  return {
    /** Sus movimientos, o `null` si no se sabe quién es o ahora no hay cuota. */
    async movesOf(login: string): Promise<ApiCorrectionPoint[] | null> {
      const userId = await deps.replica.userIdOf(login)

      if (userId === null || !deps.quota.allows('deferrable')) return null

      return deps.client.getCorrectionPoints(userId)
    },
  }
}

export type Points = ReturnType<typeof createPoints>
