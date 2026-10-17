/**
 * La copia de los intentos de examen antiguos. Lo nuevo ya llega con la copia
 * de cada día (las filas de un examen traen sus intentos); esto completa lo de
 * antes, examen a examen y página a página, solo cuando sobra cuota y nadie
 * está usando la web.
 */

import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import type { QuotaGate, ReplicaRepository } from '../replica/index.js'
import type { ExamsRepository } from './exams.repository.js'

export type ExamsSyncOptions = {
  client: Pick<FortyTwoClient, 'getCampusProjectUsersPage'>
  replica: Pick<ReplicaRepository, 'ingestProjectUsers' | 'getState' | 'setState'>
  exams: Pick<ExamsRepository, 'exams'>
  campusIds: readonly number[]
  quota: QuotaGate
  /** Cuota que no se toca: la de la gente. */
  hourlyReserve: number
  /** `true` si alguien está usando la web: entonces espera. */
  isActive?: () => boolean
  log?: (message: string) => void
}

/** Lo que va copiado de un examen en un campus: la siguiente página, o hecho. */
type ExamState = { page: number; done: boolean }

/** Margen por encima de la reserva para lo de fondo. */
const MARGIN = 200

export const examKey = (campusId: number, projectId: number): string =>
  `exams:${campusId}:${projectId}`

export function createExamsSync(options: ExamsSyncOptions) {
  const { client, replica, exams, campusIds, quota, hourlyReserve } = options
  const isActive = options.isActive ?? (() => false)
  const log = options.log ?? (() => undefined)

  return {
    /**
     * Copia una página del primer examen que falte. Devuelve `false` si no
     * había nada que hacer (o no tocaba).
     */
    async step(): Promise<boolean> {
      if (isActive() || !quota.allows('background', hourlyReserve + MARGIN)) return false

      const projects = await exams.exams()

      for (const campusId of campusIds) {
        for (const project of projects) {
          const key = examKey(campusId, project.id)
          const state = (await replica.getState<ExamState>(key)) ?? { page: 1, done: false }

          if (state.done) continue

          try {
            const page = await client.getCampusProjectUsersPage({
              campusId,
              projectId: project.id,
              page: state.page,
            })

            await replica.ingestProjectUsers(page.items, campusId)
            await replica.setState(key, {
              page: state.page + 1,
              // Hecho cuando ya no quedan páginas (`total` son registros, no páginas).
              done: page.items.length === 0 || state.page * page.perPage >= page.total,
            })
          } catch (error) {
            log(
              `intentos de ${project.name}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }

          return true
        }
      }

      return false
    },

    /** Exámenes completos y cuántos hay, contando todos los campus copiados. */
    async progress(): Promise<{ done: number; total: number }> {
      const projects = await exams.exams()
      let done = 0

      for (const campusId of campusIds) {
        for (const project of projects) {
          if ((await replica.getState<ExamState>(examKey(campusId, project.id)))?.done === true) {
            done += 1
          }
        }
      }

      return { done, total: projects.length * campusIds.length }
    },
  }
}

export type ExamsSync = ReturnType<typeof createExamsSync>
