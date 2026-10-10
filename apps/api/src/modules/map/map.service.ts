/**
 * Mapa de clusters: quién está sentado dónde, visto desde un proyecto.
 *
 * Junta tres cosas que ya saben otros módulos y no guarda nada propio:
 *
 * - la réplica dice qué puestos existen y quién ocupa cada uno;
 * - la consulta dice quién está de guardia para ese proyecto, y si lo está
 *   haciendo (verde) o ya lo aprobó (dorado);
 * - las terapias dicen qué puestos están reservados para un grupo (azul).
 *
 * No cuesta peticiones a 42: los puestos son la misma foto que ya usa la lista
 * de compañeros.
 */

import type { ClusterMap, MapCluster, MapSeat, Peer, SeatDuty } from '@sanatorio/contracts'

import type { Actor } from '../../core/actor.js'
import type { PeersService } from '../peers/index.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'
import { parseHost } from './seat-layout.js'

export type MapServiceOptions = {
  replica: ReplicaRepository
  sync: Syncer
  peers: PeersService
  therapy: TherapyService
  now?: () => number
}

export function createMapService(options: MapServiceOptions) {
  const { replica, sync, peers, therapy } = options
  const now = options.now ?? Date.now

  return {
    /**
     * El campus que mira `actor`.
     *
     * Con `projectId`, la gente de guardia de ese proyecto va resaltada. Sin él
     * es el plano a secas: ocupación y reservas, para elegir puestos.
     *
     * @throws {DomainError} 404 si el proyecto no existe.
     */
    async forCampus(actor: Actor, projectId?: number): Promise<ClusterMap> {
      // Va primero: es lo que refresca la foto de puestos si se ha quedado vieja
      // y, con proyecto, lo que responde 404 si no existe.
      let actionable: readonly Peer[] = []

      if (projectId === undefined) {
        await sync.ensureFresh(actor.campusId)
      } else {
        actionable = (await peers.findPeers(projectId, actor.campusId)).peers
      }

      const since = new Date(now() - LOCATION_MAX_AGE_MS).toISOString()
      const [known, present, reservations] = await Promise.all([
        replica.knownSeats(actor.campusId),
        replica.presenceIn(actor.campusId, since),
        therapy.reservations(actor.campusId),
      ])

      // De guardia = disponible y sentado. Misma regla que en la lista.
      const duty = new Map<string, SeatDuty>()

      for (const peer of actionable) {
        if (peer.available && peer.location !== null) {
          duty.set(peer.login, peer.status === 'finished' ? 'specialist' : 'patient')
        }
      }

      const seats = new Map<string, MapSeat & { cluster: string }>()
      const unplaced: ClusterMap['unplaced'] = []

      /** El puesto con ese nombre, creándolo vacío si aún no estaba. */
      const seatAt = (host: string): (MapSeat & { cluster: string }) | null => {
        const existing = seats.get(host)

        if (existing !== undefined) {
          return existing
        }

        const position = parseHost(host)

        if (position === null) {
          return null
        }

        const seat = { host, ...position, occupant: null, reservation: null }

        seats.set(host, seat)

        return seat
      }

      for (const host of known) {
        seatAt(host)
      }

      for (const [host, reservation] of reservations) {
        const seat = seatAt(host)

        if (seat !== null) {
          seat.reservation = reservation
        }
      }

      for (const person of present) {
        const seat = seatAt(person.host)
        const personDuty = duty.get(person.login) ?? null

        if (seat === null) {
          unplaced.push({ host: person.host, login: person.login, duty: personDuty })
          continue
        }

        seat.occupant = {
          login: person.login,
          image: person.image,
          duty: personDuty,
          me: person.login === actor.login,
        }
      }

      const clusters = new Map<string, MapCluster>()

      for (const { cluster: id, ...seat } of seats.values()) {
        const cluster = clusters.get(id) ?? {
          id,
          rows: 0,
          seatsPerRow: 0,
          seats: [],
          occupied: 0,
          onDuty: 0,
        }

        cluster.rows = Math.max(cluster.rows, seat.row)
        cluster.seatsPerRow = Math.max(cluster.seatsPerRow, seat.seat)
        cluster.seats.push(seat)
        cluster.occupied += seat.occupant === null ? 0 : 1
        cluster.onDuty += seat.occupant?.duty === null || seat.occupant === null ? 0 : 1
        clusters.set(id, cluster)
      }

      for (const cluster of clusters.values()) {
        cluster.seats.sort((a, b) => a.row - b.row || a.seat - b.seat)
      }

      return {
        // `numeric` para que `c10` vaya después de `c2`.
        clusters: [...clusters.values()].sort((a, b) =>
          a.id.localeCompare(b.id, 'en', { numeric: true }),
        ),
        unplaced: unplaced.sort((a, b) => a.host.localeCompare(b.host, 'en', { numeric: true })),
      }
    },
  }
}

export type MapService = ReturnType<typeof createMapService>
