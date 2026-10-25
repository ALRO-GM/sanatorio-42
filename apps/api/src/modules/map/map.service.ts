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

import type {
  ClusterMap,
  MapCluster,
  MapSeat,
  Peer,
  PersonCard,
  SeatDuty,
  TitleId,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import { NO_POOL, seesFor } from '../../core/audience.js'
import type { Audience } from '../../core/audience.js'
import type { PeersService } from '../peers/index.js'
import { LOCATION_MAX_AGE_MS } from '../replica/index.js'
import type { ReplicaRepository, Syncer } from '../replica/index.js'
import type { TherapyService } from '../therapy/index.js'
import { domainError } from '../../core/errors.js'
import { parse } from '../../core/validation.js'
import { BROKEN_FOR_MS, MAX_BROKEN_PER_PERSON } from './broken-seats.js'
import type { BrokenSeats } from './broken-seats.js'
import { hostAt, parseHost } from './seat-layout.js'
import type { SeatPosition } from './seat-layout.js'

export type MapServiceOptions = {
  replica: ReplicaRepository
  /** Quién ve a quién: estudiantes y piscineros separados (`docs/piscineros.md`). */
  audience?: Audience
  sync: Syncer
  peers: PeersService
  therapy: TherapyService
  /** Quién tiene la web abierta ahora mismo. */
  online?: () => Promise<Set<string>>
  /** Los puestos que no funcionan. Sin esto, ninguno lo está. */
  broken?: BrokenSeats
  /** El círculo en que va cada persona, sin preguntar a 42. */
  circlesOf?: (logins: readonly string[]) => Promise<Map<string, number>>
  /** Si alguien tiene encendido «de guardia». */
  availableOf?: (login: string) => Promise<boolean>
  /** Quién de esos está en modo Pomodoro, y hasta cuándo. */
  focusOf?: (logins: readonly string[]) => Promise<Map<string, string>>
  /** El título que luce alguien: su ficha lleva el banner de ese título. */
  titleOf?: (login: string) => Promise<TitleId>
  now?: () => number
}

/** Un puesto con lo que hace falta para colocarlo, además de lo que se devuelve. */
type PlacedSeat = MapSeat & Pick<SeatPosition, 'cluster' | 'separator'>

/** Un login de 42: letras, números y guiones. */
const loginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,40}$/, 'login no válido')

/** Proyectos en curso que se enseñan de cada persona, como mucho. */
const MAX_PROJECTS = 4

export function createMapService(options: MapServiceOptions) {
  const { replica, sync, peers, therapy } = options
  const now = options.now ?? Date.now
  const audience = options.audience ?? NO_POOL

  /** Desde cuándo vale un aviso de puesto roto. */
  const brokenSince = (): string => new Date(now() - BROKEN_FOR_MS).toISOString()

  /** El nombre del puesto, en minúsculas, si es uno que se sabe colocar. */
  const seatHost = (host: unknown): string => {
    const name = typeof host === 'string' ? host.trim().toLowerCase() : ''

    if (parseHost(name) === null) throw domainError('invalid_input', 'Ese puesto no existe')

    return name
  }

  return {
    /**
     * Avisa de que un puesto no funciona: sale tachado en el mapa una semana y
     * no se propone para una terapia.
     *
     * @throws {DomainError} `invalid_input` si el nombre no es de un puesto;
     *   `conflict` si ya tiene demasiados avisos puestos.
     */
    async reportBroken(actor: Actor, host: unknown): Promise<void> {
      const name = seatHost(host)

      const mine = (await options.broken?.countBy(actor.login, brokenSince())) ?? 0

      if (mine >= MAX_BROKEN_PER_PERSON) {
        throw domainError('conflict', `Como mucho ${MAX_BROKEN_PER_PERSON} puestos rotos a la vez`)
      }

      await options.broken?.report(actor.campusId, name, actor.login, new Date(now()).toISOString())
    },

    /** Ya funciona: cualquiera que esté delante puede decirlo. */
    async clearBroken(actor: Actor, host: unknown): Promise<void> {
      await options.broken?.clear(actor.campusId, seatHost(host))
    },

    /**
     * El campus que mira `actor`.
     *
     * Con `projectId`, la gente de guardia de ese proyecto va resaltada. Sin él
     * es el plano a secas: ocupación y reservas, para elegir puestos.
     *
     * @throws {DomainError} 404 si el proyecto no existe.
     */
    /**
     * La ficha de una persona para cuando se pasa el ratón por su login: foto,
     * dónde está sentada, círculo, proyectos en curso, si está de guardia y si
     * tiene la web abierta. Lo mismo que la ficha de un puesto, sin el plano.
     */
    async personCard(actor: Actor, login: unknown): Promise<PersonCard> {
      const who = parse(loginSchema, login)

      // Del otro mundo (estudiante o piscinero) no hay ficha.
      if (!(await seesFor(audience, actor))(who)) {
        throw domainError('not_found', 'No hay nadie con ese login')
      }

      const since = new Date(now() - LOCATION_MAX_AGE_MS).toISOString()
      const [present, images, active, circles, online, available, focusing, title] =
        await Promise.all([
          replica.presenceIn(actor.campusId, since),
          replica.imagesOf([who]),
          replica.activeProjectsOf([who]),
          options.circlesOf?.([who]) ?? new Map<string, number>(),
          options.online?.() ?? new Set<string>(),
          options.availableOf?.(who) ?? false,
          options.focusOf?.([who]) ?? new Map<string, string>(),
          // Sin título, la ficha sale sin banner: no se cae por esto.
          options.titleOf?.(who).catch(() => null) ?? null,
        ])
      const seat = present.find((person) => person.login === who)?.host ?? null

      return {
        login: who,
        image: images.get(who) ?? null,
        seat,
        circle: circles.get(who) ?? null,
        projects: (active.get(who) ?? []).slice(0, MAX_PROJECTS),
        onDuty: available && seat !== null,
        online: online.has(who),
        me: who === actor.login,
        focusUntil: focusing.get(who) ?? null,
        title,
      }
    },

    async forCampus(actor: Actor, projectId?: number): Promise<ClusterMap> {
      // Va primero: es lo que refresca la foto de puestos si se ha quedado vieja
      // y, con proyecto, lo que responde 404 si no existe.
      let actionable: readonly Peer[] = []

      if (projectId === undefined) {
        await sync.ensureFresh(actor.campusId)
      } else {
        actionable = (
          await peers.findPeers(projectId, actor.campusId, undefined, actor.pool === true)
        ).peers
      }

      const since = new Date(now() - LOCATION_MAX_AGE_MS).toISOString()
      const [known, everyone, reservations, online, broken, sees] = await Promise.all([
        replica.knownSeats(actor.campusId),
        replica.presenceIn(actor.campusId, since),
        therapy.reservations(actor.campusId),
        options.online?.() ?? new Set<string>(),
        options.broken?.listSince(actor.campusId, brokenSince()) ??
          new Map<string, { by: string; at: string }>(),
        seesFor(audience, actor),
      ])
      // Solo la gente de su mundo: a un estudiante, los piscineros no le salen.
      const present = everyone.filter((person) => sees(person.login))

      // De guardia = disponible y sentado. Misma regla que en la lista.
      const duty = new Map<string, SeatDuty>()

      for (const peer of actionable) {
        if (peer.available && peer.location !== null) {
          duty.set(peer.login, peer.status === 'finished' ? 'specialist' : 'patient')
        }
      }

      const seats = new Map<string, PlacedSeat>()
      const unplaced: ClusterMap['unplaced'] = []

      /** El puesto con ese nombre, creándolo vacío si aún no estaba. */
      const seatAt = (host: string): PlacedSeat | null => {
        const existing = seats.get(host)

        if (existing !== undefined) {
          return existing
        }

        const position = parseHost(host)

        if (position === null) {
          return null
        }

        const seat: PlacedSeat = {
          host,
          ...position,
          occupant: null,
          reservation: null,
          broken: broken.get(host) ?? null,
        }

        seats.set(host, seat)

        return seat
      }

      // Un puesto roto en el que alguien ha iniciado sesión después del aviso
      // funciona: se da por arreglado.
      for (const person of present) {
        const report = broken.get(person.host)

        if (report !== undefined && (person.beginAt === null || person.beginAt >= report.at)) {
          broken.delete(person.host)
          await options.broken?.clear(actor.campusId, person.host)
        }
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

      const logins = present.map((person) => person.login)
      const mine = await replica.projectsOf(actor.login)
      const [activeProjects, circles, marks, focusing] = await Promise.all([
        replica.activeProjectsOf([...logins, actor.login]),
        options.circlesOf?.([...logins, actor.login]) ?? new Map<string, number>(),
        replica.bestMarksIn(
          logins,
          mine.map((project) => project.id),
        ),
        options.focusOf?.(logins) ?? new Map<string, string>(),
      ])

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
          projects: (activeProjects.get(person.login) ?? []).slice(0, MAX_PROJECTS),
          duty: personDuty,
          me: person.login === actor.login,
          online: online.has(person.login),
          circle: circles.get(person.login) ?? null,
          finishedMine: marks.get(person.login) ?? null,
          focusUntil: focusing.get(person.login) ?? null,
        }
      }

      const clusters = new Map<string, MapCluster>()

      // El plano se completa: dentro del rectángulo que forman los puestos
      // conocidos de cada cluster, las casillas que faltan se dan por puestos
      // libres. Así se pueden elegir para una terapia aunque nadie se haya
      // sentado nunca en ellos. El nombre sigue la forma que usa ese cluster.
      const bounds = new Map<string, SeatPosition>()

      for (const seat of seats.values()) {
        const known = bounds.get(seat.cluster)

        bounds.set(seat.cluster, {
          cluster: seat.cluster,
          separator: seat.separator,
          row: Math.max(known?.row ?? 0, seat.row),
          seat: Math.max(known?.seat ?? 0, seat.seat),
        })
      }

      for (const limit of bounds.values()) {
        for (let row = 1; row <= limit.row; row += 1) {
          for (let seat = 1; seat <= limit.seat; seat += 1) {
            seatAt(hostAt({ ...limit, row, seat }))
          }
        }
      }

      for (const { cluster: id, separator: _separator, ...seat } of seats.values()) {
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
        me: {
          circle: circles.get(actor.login) ?? null,
          projects: activeProjects.get(actor.login) ?? [],
        },
      }
    },
  }
}

export type MapService = ReturnType<typeof createMapService>
