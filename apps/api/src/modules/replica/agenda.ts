/**
 * Agenda de 42: eventos, exámenes y correcciones.
 *
 * A diferencia del resto de la réplica, esto no lo mantiene el bucle de fondo:
 * se pide **cuando alguien abre su calendario** y se guarda un rato. Lo del
 * campus (eventos y exámenes) vale para todo el mundo y se refresca como mucho
 * una vez por hora; lo de cada persona (a qué está apuntada, qué correcciones
 * tiene), cada cuarto de hora. Si nadie mira el calendario, no cuesta nada.
 *
 * Si 42 falla o queda poca cuota, se sirve lo último que se guardó.
 */

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { hourlyQuota } from './quota.js'
import type { QuotaGate } from './quota.js'
import type { ApiEvent, ApiExam, ApiScaleTeam } from '../../integrations/forty-two/types.js'

export type AgendaEvent = {
  source: 'event' | 'exam'
  id: number
  name: string
  description: string | null
  location: string | null
  /** Tipo de evento en 42 (`conference`, `hackathon`…). `null` en los exámenes. */
  kind: string | null
  beginAt: string
  endAt: string
  maxPeople: number | null
  subscribers: number | null
}

/** Una corrección concertada. No se guarda con quién: 42 lo oculta hasta que llega la hora. */
export type AgendaEvaluation = {
  id: number
  beginAt: string
  endAt: string
  projectId: number | null
  /** `corrector` si es quien corrige; `corrected` si es a quien corrigen. */
  role: 'corrector' | 'corrected'
}

export type UserAgenda = {
  /** Ids de los eventos a los que está apuntada. */
  events: number[]
  /** Ids de los exámenes a los que está apuntada. */
  exams: number[]
  evaluations: AgendaEvaluation[]
  fetchedAt: string
}

export type AgendaOptions = {
  db: Db
  client: FortyTwoClient
  /** Peticiones de la hora que no se tocan: son para los logins. */
  hourlyReserve: number
  /** Quién puede gastar cuota de 42 y la cola de quien espera. Sin ella, solo cuenta la hora. */
  quota?: QuotaGate
  now?: () => number
  log?: (message: string) => void
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** Cada cuánto se vuelve a pedir lo del campus y lo de cada persona. */
const CAMPUS_TTL_MS = 60 * MINUTE
const USER_TTL_MS = 15 * MINUTE
/**
 * Lo más fresco que se puede pedir lo de una persona: quien abre el calendario
 * quiere ver la corrección que acaba de reservar, pero recargar sin parar no
 * debe costar tres peticiones cada vez.
 */
export const FRESH_USER_TTL_MS = 2 * MINUTE

/** Ventana que se copia: un mes atrás (para ver el mes en curso entero) y tres adelante. */
const PAST_DAYS = 31
const FUTURE_DAYS = 92

/** Lo que dura una corrección si 42 no lo dice. */
const DEFAULT_EVALUATION_MS = 30 * MINUTE

function parseList<T>(value: unknown): T[] {
  try {
    const parsed: unknown = JSON.parse(toText(value))

    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function createAgenda(options: AgendaOptions) {
  const { db, client } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  /** Última vez que se pidió lo de cada campus. En memoria: perderlo solo cuesta una petición. */
  const campusFetchedAt = new Map<number, number>()

  const iso = (at: number): string => new Date(at).toISOString()
  const window = (): [string, string] => [
    iso(now() - PAST_DAYS * DAY),
    iso(now() + FUTURE_DAYS * DAY),
  ]

  const quota = options.quota ?? hourlyQuota(client, options.hourlyReserve)

  /** `true` si queda cuota para gastar en algo que no es imprescindible. */
  const canSpend = (): boolean => quota.allows('deferrable')

  const describe = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

  async function saveEvents(
    source: AgendaEvent['source'],
    campusId: number,
    items: readonly (ApiEvent | ApiExam)[],
    from: string,
  ): Promise<void> {
    await db.batch([
      // Se sustituye la ventana entera: así desaparece lo que 42 ha cancelado.
      {
        sql: 'DELETE FROM agenda_events WHERE source = ? AND campus_id = ? AND begin_at >= ?',
        args: [source, campusId, from],
      },
      ...items.map((item) => ({
        sql: `INSERT OR REPLACE INTO agenda_events
                (source, id, campus_id, name, description, location, kind,
                 begin_at, end_at, max_people, subscribers)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          source,
          item.id,
          campusId,
          item.name,
          'description' in item ? (item.description ?? null) : null,
          item.location === '' ? null : (item.location ?? null),
          'kind' in item ? (item.kind ?? null) : null,
          item.begin_at,
          item.end_at,
          // En 42, `max_people: 0` significa "sin tope", igual que `null`.
          item.max_people === 0 ? null : (item.max_people ?? null),
          item.nbr_subscribers ?? null,
        ],
      })),
    ])
  }

  function toEvaluation(scaleTeam: ApiScaleTeam, userId: number): AgendaEvaluation {
    const begin = Date.parse(scaleTeam.begin_at)
    const seconds = scaleTeam.scale?.duration
    const corrector = scaleTeam.corrector

    return {
      id: scaleTeam.id,
      beginAt: scaleTeam.begin_at,
      endAt: iso(begin + (typeof seconds === 'number' ? seconds * 1000 : DEFAULT_EVALUATION_MS)),
      projectId: scaleTeam.team?.project_id ?? null,
      // Si quien corrige viene oculto, es que no es esta persona: la corrigen a ella.
      role:
        typeof corrector === 'object' && corrector !== null && corrector.id === userId
          ? 'corrector'
          : 'corrected',
    }
  }

  return {
    /** Eventos y exámenes de un campus, refrescándolos antes si toca. */
    async campusEvents(campusId: number, from: string, to: string): Promise<AgendaEvent[]> {
      if (now() - (campusFetchedAt.get(campusId) ?? 0) >= CAMPUS_TTL_MS && canSpend()) {
        const [start, end] = window()

        try {
          await saveEvents(
            'event',
            campusId,
            await client.getCampusEvents(campusId, start, end),
            start,
          )
          await saveEvents(
            'exam',
            campusId,
            await client.getCampusExams(campusId, start, end),
            start,
          )
          campusFetchedAt.set(campusId, now())
        } catch (error) {
          log(`agenda del campus ${campusId}: ${describe(error)}. Se sirve lo que hay`)
        }
      }

      const result = await db.execute({
        sql: `SELECT * FROM agenda_events
              WHERE campus_id = ? AND begin_at < ? AND end_at > ? ORDER BY begin_at`,
        args: [campusId, to, from],
      })

      return result.rows.map((row) => ({
        source: toText(row.source) as AgendaEvent['source'],
        id: toNumber(row.id),
        name: toText(row.name),
        description: typeof row.description === 'string' ? row.description : null,
        location: typeof row.location === 'string' ? row.location : null,
        kind: typeof row.kind === 'string' ? row.kind : null,
        beginAt: toText(row.begin_at),
        endAt: toText(row.end_at),
        maxPeople: row.max_people === null ? null : toNumber(row.max_people),
        subscribers: row.subscribers === null ? null : toNumber(row.subscribers),
      }))
    },

    /**
     * Lo que una persona tiene apuntado en 42, refrescándolo antes si toca.
     *
     * @param userId Su id en 42. Sin él (sesiones antiguas) no se puede pedir nada.
     * @param maxAgeMs Cuánto puede tener lo guardado para servirlo sin preguntar.
     *   De fábrica, un cuarto de hora; nunca menos de `FRESH_USER_TTL_MS`.
     * @returns `null` si nunca se ha podido leer.
     */
    async userAgenda(
      login: string,
      userId: number | null,
      maxAgeMs: number = USER_TTL_MS,
    ): Promise<UserAgenda | null> {
      const read = async (): Promise<UserAgenda | null> => {
        const result = await db.execute({
          sql: 'SELECT * FROM agenda_users WHERE login = ?',
          args: [login],
        })
        const row = result.rows[0]

        return row === undefined
          ? null
          : {
              events: parseList<number>(row.events),
              exams: parseList<number>(row.exams),
              evaluations: parseList<AgendaEvaluation>(row.evaluations),
              fetchedAt: toText(row.fetched_at),
            }
      }
      const stored = await read()
      const ttl = Math.max(FRESH_USER_TTL_MS, maxAgeMs)
      const fresh = stored !== null && now() - Date.parse(stored.fetchedAt) < ttl

      // Si la cuota va justa, se sirve lo guardado y esa persona coge turno en la cola.
      if (fresh || userId === null || !(await quota.defer(login, 'agenda'))) {
        return stored
      }

      const [start, end] = window()

      try {
        const [inscriptions, exams, scaleTeams] = [
          await client.getUserEventsUsers(userId),
          await client.getUserExams(userId, start, end),
          // Las correcciones solo interesan de ayer en adelante.
          await client.getUserScaleTeams(userId, iso(now() - DAY), end),
        ]

        await db.execute({
          sql: `INSERT OR REPLACE INTO agenda_users (login, events, exams, evaluations, fetched_at)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            login,
            JSON.stringify(inscriptions.map((inscription) => inscription.event_id)),
            JSON.stringify(exams.map((exam) => exam.id)),
            JSON.stringify(scaleTeams.map((scaleTeam) => toEvaluation(scaleTeam, userId))),
            iso(now()),
          ],
        })

        return await read()
      } catch (error) {
        log(`agenda de ${login}: ${describe(error)}. Se sirve lo que hay`)

        return stored
      }
    },
  }
}

export type Agenda = ReturnType<typeof createAgenda>
