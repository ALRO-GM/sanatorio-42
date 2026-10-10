/**
 * Servicio de proyectos y compañeros.
 *
 * Todo lo que devuelve sale de la réplica local con una consulta. Antes de
 * leer se llama a `sync.ensureFresh`, que es quien decide si hace falta pedirle
 * algo a 42 **para esta pantalla** (los puestos, si la foto es vieja; el
 * proyecto, si el campus aún no está copiado). Con el bucle de fondo andando
 * casi nunca hace falta, y la respuesta son unos milisegundos.
 *
 * Aquí tampoco se mira a qué campus pertenece nadie: `campusId` llega de la
 * ruta, que lo saca de la sesión o de lo que la persona haya elegido.
 */

import type { ReplicaRepository } from '../replica/index.js'
import { domainError } from '../../core/errors.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import type { Peer, ProjectSummary } from '@sanatorio/contracts'
import type { Syncer } from '../replica/index.js'

export type PeersResult = {
  /** Los accionables, ya ordenados: de guardia primero. */
  peers: Peer[]
  /** Personas del campus con alguna fila en el proyecto. */
  totalParticipants: number
  /** `false` cuando aún faltan participantes por bajar. */
  complete: boolean
}

export type PeersServiceOptions = {
  replica: ReplicaRepository
  sync: Syncer
  now?: () => number
}

/** Quién pregunta. `id` puede faltar en sesiones antiguas. */
export type Viewer = { login: string; id: number | null }

export function createPeersService(options: PeersServiceOptions) {
  const { replica, sync } = options
  const now = options.now ?? Date.now

  /** Ids de proyecto válidos: enteros positivos, como los de la 42. */
  function assertValidProjectId(projectId: number): void {
    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw domainError('invalid_input', `El id de proyecto ${projectId} no es válido`)
    }
  }

  /** Desde cuándo se cree un puesto. Ver `LOCATION_MAX_AGE_MS`. */
  const presenceSince = (): string => new Date(now() - LOCATION_MAX_AGE_MS).toISOString()

  return {
    /**
     * Proyectos de una persona, para `GET /me/projects`.
     *
     * Vienen del login: `/v2/me` ya trae todos sus proyectos, así que esta
     * pantalla no cuesta ninguna petición. Solo si el perfil llegó sin ellos se
     * piden aparte, una vez.
     *
     * Lista vacía si no tiene ninguno: no es un error, es que todavía no le toca.
     *
     * @param includeFinished También los aprobados, con `status` en cada uno.
     */
    async findByUser(viewer: Viewer, includeFinished = false): Promise<ProjectSummary[]> {
      sync.touch()

      try {
        await sync.ensureUserProjects(
          viewer.login,
          viewer.id === null ? undefined : { id: viewer.id, login: viewer.login },
        )
      } catch {
        // Si 42 no contesta, se devuelve lo que haya (puede que nada). Mejor una
        // sala de espera vacía con su mensaje que un error.
      }

      return replica.projectsOf(viewer.login, includeFinished)
    },

    /**
     * Compañeros accionables del proyecto, para `GET /projects/:id/peers`.
     *
     * Solo los que sirven para emparejarse: quien lo está haciendo y quien lo
     * aprobó y está de guardia. Se excluye a quien pregunta.
     *
     * @throws {DomainError} 404 si no se conoce el proyecto ni después de
     *   preguntar por él: no existe, o nadie de ese campus lo ha tocado nunca.
     */
    async findPeers(
      projectId: number,
      campusId: number,
      excludeLogin?: string,
    ): Promise<PeersResult> {
      assertValidProjectId(projectId)

      const { partial } = await sync.ensureFresh(campusId, projectId)

      if ((await replica.projectName(projectId)) === null) {
        throw domainError('not_found', `El proyecto ${projectId} no existe en 42`)
      }

      const [peers, totalParticipants] = await Promise.all([
        replica.findPeers({ projectId, campusId, excludeLogin, presenceSince: presenceSince() }),
        replica.countParticipants(projectId, campusId),
      ])

      return { peers, totalParticipants, complete: !partial }
    },

    /** Nombre del proyecto, o `null` si no se ha visto todavía. */
    async nameOf(projectId: number): Promise<string | null> {
      return replica.projectName(projectId)
    },

    /** Puesto actual de una persona, con la misma regla de frescura. */
    async locationOf(login: string): Promise<string | null> {
      return replica.locationOf(login, presenceSince())
    },
  }
}

export type PeersService = ReturnType<typeof createPeersService>
