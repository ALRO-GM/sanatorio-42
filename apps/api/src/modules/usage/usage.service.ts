/**
 * Uso de la web: cuánto se usa cada sección y cada bloque de cada página.
 *
 * La web manda de vez en cuando lo que ha contado ("abrió el tablón 3 veces") y
 * pide el total de todo el mundo para poder ordenar los elementos por lo que
 * más usa la comunidad.
 */

import type {
  OnlineUsers,
  Segment,
  StatTotals,
  UsageCounts,
  UsageFlows,
  UsageHeatmap,
  UsageStats,
} from '@sanatorio/contracts'
import { z } from 'zod'

import { assertAdmin } from '../../core/actor.js'
import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { day, parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'
import { sectionsOf, START } from './flows.rules.js'

/** Claves como `nav.tablon` o `expediente.health`: dos palabras en minúsculas. */
const KEY = /^[a-z]{2,20}\.[a-z_]{2,30}$/

/** Usos que cuentan de una persona en un envío. Más es ruido (o alguien jugando). */
const MAX_PER_SEND = 200
/**
 * Segundos que caben en un envío. La web manda cada minuto; con la pestaña
 * oculta el navegador la frena, así que se deja margen, pero no horas.
 */
const MAX_SECONDS_PER_SEND = 900
const seconds = z.number().int().min(0).max(MAX_SECONDS_PER_SEND)

/**
 * Lo que pesa como mucho una sola persona en el total de un elemento: así el
 * orden de la comunidad lo decide mucha gente y no una que no para de pulsar.
 */
const PERSON_CAP = 50

const sendSchema = z.object({
  counts: z
    .record(z.string().regex(KEY, 'clave no válida'), z.number().int().min(1).max(MAX_PER_SEND))
    .refine((counts) => Object.keys(counts).length <= 60, 'demasiadas claves'),
  time: z
    .record(z.string().regex(KEY, 'clave no válida'), z.tuple([seconds, seconds, seconds]))
    .refine((time) => Object.keys(time).length <= 20, 'demasiadas claves')
    .optional(),
  // Pasos de una sección a otra: `tablon>red`, o `start>tablon` al entrar.
  flows: z
    .record(
      z.string().regex(/^[a-z]{2,20}>[a-z]{2,20}$/, 'paso no válido'),
      z.number().int().min(1).max(MAX_PER_SEND),
    )
    .refine((flows) => Object.keys(flows).length <= 60, 'demasiados pasos')
    .optional(),
})

/**
 * El tramo de gente que se mira, por lo activa que es: del `low` % al `high` %
 * de menos a más activa. Del 0 al 100 es todo el mundo.
 */
const share = z.coerce.number().int().min(0).max(100)
const segmentFields = { low: share.default(0), high: share.default(100) }

const statsSchema = z.object({
  ...segmentFields,
  from: day.optional(),
  to: day.optional(),
  login: z
    .string()
    .regex(/^[a-z0-9-]{1,30}$/)
    .optional(),
})

/** Días que cubren las estadísticas si no se dice otra cosa, y lo máximo que se puede pedir. */
const STATS_DAYS = 7
const STATS_MAX_DAYS = 92
const DAY_MS = 24 * 60 * 60_000

/** Suma, campo a campo, lo de `add` sobre `into`. */
function addTo<K extends string>(
  into: Record<K, number>,
  add: Record<K, number>,
  keys: readonly K[],
): void {
  for (const key of keys) {
    into[key] += add[key]
  }
}

const TIME_FIELDS = ['clicks', 'seen', 'back', 'hidden'] as const
const TRAFFIC_FIELDS = ['requests', 'bytes'] as const
const zero = (): StatTotals => ({ clicks: 0, seen: 0, back: 0, hidden: 0, requests: 0, bytes: 0 })

const heatmapSchema = z.object({
  ...segmentFields,
  by: z.enum(['total', 'activity', 'track', 'cohort']).default('total'),
})

/**
 * Quién cae en un tramo de actividad.
 *
 * @param activity Lo activa que es cada persona (tiempo mirando la web, o usos).
 * @returns Los logins del tramo y de cuántos se ha elegido. Con el tramo entero
 *   no se quita a nadie, tampoco a quien no tiene actividad apuntada.
 */
export function segmentOf(
  activity: ReadonlyMap<string, number>,
  low: number,
  high: number,
): { keep: (login: string) => boolean; people: number; of: number } {
  const of = activity.size

  if (low <= 0 && high >= 100) return { keep: () => true, people: of, of }

  // De menos a más activa; a igualdad, por login, para que salga siempre igual.
  const ranked = [...activity].sort(([a, x], [b, y]) => x - y || (a < b ? -1 : 1))
  const chosen = new Set(
    ranked
      .slice(Math.floor((of * low) / 100), Math.ceil((of * Math.max(low, high)) / 100))
      .map(([login]) => login),
  )

  return { keep: (login) => chosen.has(login), people: chosen.size, of }
}

/** Usos totales a partir de los cuales alguien es "habitual" o "intensivo". */
const REGULAR_FROM = 30
const HEAVY_FROM = 150

/** El tráfico con la API de un periodo: lo sabe el módulo `admin`. */
export type Traffic = (
  from: string,
  to: string,
  login?: string,
) => Promise<{ login: string; day: string; hour: number; requests: number; bytes: number }[]>

/** Segundos en una sección: viéndola, con otra ventana delante y con la pestaña oculta. */
type SectionTime = { seen: number; back: number; hidden: number }

/** Quién está conectado ahora: lo sabe `profile`. */
export type Online = () => Promise<{ login: string; since: string; seenAt: string }[]>

export function createUsageService(options: {
  db: Db
  replica: ReplicaRepository
  traffic?: Traffic
  online?: Online
  now?: () => number
}) {
  const { db, replica } = options
  const now = options.now ?? Date.now
  const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)
  const totals = createTtlCache<UsageCounts>({
    ttlMs: 5 * 60_000,
    maxEntries: 1,
    ...(options.now === undefined ? {} : { now: options.now }),
  })

  /** El periodo que se pide: por defecto la última semana, y nunca más de `STATS_MAX_DAYS`. */
  const period = (
    input: unknown,
  ): { from: string; to: string; login: string | null; low: number; high: number } => {
    const asked = parse(statsSchema, input)
    const to = asked.to ?? dayOf(now())
    const earliest = dayOf(Date.parse(`${to}T00:00:00Z`) - (STATS_MAX_DAYS - 1) * DAY_MS)
    const wanted = asked.from ?? dayOf(Date.parse(`${to}T00:00:00Z`) - (STATS_DAYS - 1) * DAY_MS)
    // Ni un periodo al revés ni uno tan largo que pese.
    const from = wanted > to ? to : wanted < earliest ? earliest : wanted

    return { from, to, login: asked.login ?? null, low: asked.low, high: asked.high }
  }

  /**
   * El tramo de gente de un periodo, por el tiempo que ha pasado mirando la web
   * en él. Si se pide una sola persona no hay tramo que valga: es ella.
   */
  const segment = async (asked: {
    from: string
    to: string
    login: string | null
    low: number
    high: number
  }): Promise<ReturnType<typeof segmentOf> & { low: number; high: number }> => {
    if (asked.login !== null) {
      return { keep: () => true, people: 1, of: 1, low: 0, high: 100 }
    }

    const result = await db.execute({
      sql: `SELECT login, SUM(seen_s) AS seen FROM usage_time
            WHERE day >= ? AND day <= ? GROUP BY login`,
      args: [asked.from, asked.to],
    })
    const activity = new Map(result.rows.map((row) => [toText(row.login), toNumber(row.seen)]))

    return { ...segmentOf(activity, asked.low, asked.high), low: asked.low, high: asked.high }
  }
  /** Lo que se cuenta del tramo en la respuesta. */
  const told = ({ low, high, people, of }: Awaited<ReturnType<typeof segment>>): Segment => ({
    low,
    high,
    people,
    of,
  })

  return {
    /** Suma lo que la web ha contado desde el último envío. */
    async record(actor: Actor, input: unknown): Promise<void> {
      const sent = parse(sendSchema, input)
      const entries = Object.entries(sent.counts)
      const time = Object.entries(sent.time ?? {})
      const flows = Object.entries(sent.flows ?? {})

      if (entries.length === 0 && time.length === 0 && flows.length === 0) {
        return
      }

      const at = new Date(now())
      const when = [actor.login, dayOf(now()), at.getUTCHours()]
      // Lo mismo, por hora: una fila por elemento, con sus pulsaciones y su tiempo.
      const keys = new Set([...entries.map(([key]) => key), ...time.map(([key]) => key)])

      await db.batch(
        [
          ...entries.map(([key, count]) => ({
            sql: `INSERT INTO usage_counts (key, login, count) VALUES (?, ?, ?)
                  ON CONFLICT (key, login) DO UPDATE SET count = count + excluded.count`,
            args: [key, actor.login, count],
          })),
          ...flows.map(([step, count]) => {
            const [from = '', to = ''] = step.split('>')

            return {
              sql: `INSERT INTO usage_flows (login, day, from_key, to_key, count)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (login, day, from_key, to_key)
                    DO UPDATE SET count = count + excluded.count`,
              args: [actor.login, dayOf(now()), from, to, count],
            }
          }),
          ...[...keys].map((key) => {
            const [seen, back, hidden] = sent.time?.[key] ?? [0, 0, 0]

            return {
              sql: `INSERT INTO usage_time (login, day, hour, key, clicks, seen_s, back_s, hidden_s)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (login, day, hour, key) DO UPDATE SET
                      clicks = clicks + excluded.clicks,
                      seen_s = seen_s + excluded.seen_s,
                      back_s = back_s + excluded.back_s,
                      hidden_s = hidden_s + excluded.hidden_s`,
              args: [...when, key, sent.counts[key] ?? 0, seen, back, hidden],
            }
          }),
        ],
        'write',
      )
    },

    /**
     * Estadísticas de uso de un periodo: por hora, por elemento y por persona,
     * con el tráfico de la API al lado. Solo para quien administra la web.
     *
     * @param input `from` y `to` (días UTC; por defecto, la última semana) y,
     *   si se quieren las de una sola persona, `login`.
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async stats(actor: Actor, input: unknown): Promise<UsageStats> {
      assertAdmin(actor)

      const asked = period(input)
      const { from, to, login } = asked

      const [all, everyTraffic, chosen] = await Promise.all([
        db.execute({
          sql: `SELECT login, day, hour, key, clicks, seen_s, back_s, hidden_s FROM usage_time
                WHERE day >= ? AND day <= ? AND (? IS NULL OR login = ?)`,
          args: [from, to, login, login],
        }),
        options.traffic?.(from, to, login ?? undefined) ?? [],
        segment(asked),
      ])
      const used = { rows: all.rows.filter((row) => chosen.keep(toText(row.login))) }
      const traffic = everyTraffic.filter((row) => chosen.keep(row.login))

      type Hour = UsageStats['hours'][number] & { who: Set<string> }
      type Key = UsageStats['keys'][number] & { who: Set<string> }

      const hours = new Map<string, Hour>()
      const keys = new Map<string, Key>()
      const users = new Map<string, StatTotals>()
      const totals = zero()
      const everyone = new Set<string>()

      const hourOf = (day: string, hour: number): Hour => {
        const id = `${day} ${String(hour).padStart(2, '0')}`
        const found = hours.get(id) ?? { day, hour, people: 0, who: new Set<string>(), ...zero() }

        hours.set(id, found)

        return found
      }
      const userOf = (who: string): StatTotals => {
        const found = users.get(who) ?? zero()

        users.set(who, found)
        everyone.add(who)

        return found
      }

      for (const row of used.rows) {
        const who = toText(row.login)
        const key = toText(row.key)
        const part = {
          clicks: toNumber(row.clicks),
          seen: toNumber(row.seen_s),
          back: toNumber(row.back_s),
          hidden: toNumber(row.hidden_s),
        }
        const hour = hourOf(toText(row.day), toNumber(row.hour))
        const entry = keys.get(key) ?? {
          key,
          clicks: 0,
          seen: 0,
          back: 0,
          hidden: 0,
          people: 0,
          who: new Set<string>(),
        }

        keys.set(key, entry)
        hour.who.add(who)
        entry.who.add(who)

        for (const target of [hour, entry, userOf(who), totals]) {
          addTo(target, part, TIME_FIELDS)
        }
      }

      for (const row of traffic) {
        const hour = hourOf(row.day, row.hour)

        hour.who.add(row.login)

        for (const target of [hour, userOf(row.login), totals]) {
          addTo(target, row, TRAFFIC_FIELDS)
        }
      }

      return {
        from,
        to,
        login,
        segment: told(chosen),
        totals: { ...totals, people: everyone.size },
        hours: [...hours.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([, { who, ...hour }]) => ({ ...hour, people: who.size })),
        keys: [...keys.values()]
          .map(({ who, ...key }) => ({ ...key, people: who.size }))
          .sort((a, b) => b.seen - a.seen || b.clicks - a.clicks),
        users:
          login === null
            ? [...users.entries()]
                .map(([who, stats]) => ({ login: who, ...stats }))
                .sort((a, b) => b.seen - a.seen || b.requests - a.requests)
            : [],
      }
    },

    /**
     * El tiempo que cada quien ha pasado en una sección entre dos días (UTC,
     * los dos incluidos). Es para otros módulos: quien lo enseñe comprueba antes
     * que quien pregunta administra.
     */
    async timeOn(key: string, from: string, to: string): Promise<Map<string, SectionTime>> {
      const result = await db.execute({
        sql: `SELECT login, SUM(seen_s) AS seen, SUM(back_s) AS back, SUM(hidden_s) AS hidden
              FROM usage_time WHERE key = ? AND day >= ? AND day <= ? GROUP BY login`,
        args: [key, from, to],
      })

      return new Map(
        result.rows.map((row) => [
          toText(row.login),
          { seen: toNumber(row.seen), back: toNumber(row.back), hidden: toNumber(row.hidden) },
        ]),
      )
    },

    /**
     * Cómo se navega por la web en un periodo: los pasos de una sección a otra
     * y lo que eso dice de cada una (`flows.rules.ts`). De todo el mundo o de
     * una persona. Solo para quien administra la web.
     *
     * @param input Lo mismo que `stats`: `from`, `to` y, si se quiere, `login`.
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async flows(actor: Actor, input: unknown): Promise<UsageFlows> {
      assertAdmin(actor)

      const asked = period(input)
      const { from, to, login } = asked
      const [steps, time, chosen] = await Promise.all([
        db.execute({
          sql: `SELECT login, from_key, to_key, SUM(count) AS count FROM usage_flows
                WHERE day >= ? AND day <= ? AND (? IS NULL OR login = ?)
                GROUP BY login, from_key, to_key`,
          args: [from, to, login, login],
        }),
        db.execute({
          sql: `SELECT login, key, SUM(seen_s) AS seen FROM usage_time
                WHERE day >= ? AND day <= ? AND (? IS NULL OR login = ?) AND key LIKE 'nav.%'
                GROUP BY login, key`,
          args: [from, to, login, login],
        }),
        segment(asked),
      ])
      // Se suma aquí, y no en la consulta, para poder dejar fuera a quien no toca.
      const byStep = new Map<string, UsageFlows['flows'][number]>()
      const seen = new Map<string, number>()

      for (const row of steps.rows) {
        if (!chosen.keep(toText(row.login))) continue

        const [origin, target] = [toText(row.from_key), toText(row.to_key)]
        const step = byStep.get(`${origin}>${target}`) ?? {
          from: origin,
          to: target,
          count: 0,
          people: 0,
        }

        step.count += toNumber(row.count)
        step.people += 1
        byStep.set(`${origin}>${target}`, step)
      }
      for (const row of time.rows) {
        if (!chosen.keep(toText(row.login))) continue

        const key = toText(row.key).slice('nav.'.length)

        seen.set(key, (seen.get(key) ?? 0) + toNumber(row.seen))
      }

      const flows = [...byStep.values()].sort(
        (a, b) => b.count - a.count || (a.from + a.to < b.from + b.to ? -1 : 1),
      )
      const sections = sectionsOf(flows, seen)

      return {
        from,
        to,
        login,
        segment: told(chosen),
        // Cada entrada es una visita a la web.
        sessions: flows.reduce((sum, flow) => sum + (flow.from === START ? flow.count : 0), 0),
        sections,
        flows,
      }
    },

    /**
     * Quién tiene la web abierta ahora y cuánto lleva su sesión. Solo para
     * quien administra la web.
     *
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async online(actor: Actor): Promise<OnlineUsers> {
      assertAdmin(actor)

      const people = (await options.online?.()) ?? []
      const images = await replica.imagesOf(people.map((person) => person.login))

      return {
        now: new Date(now()).toISOString(),
        people: people.map((person) => ({ ...person, image: images.get(person.login) ?? null })),
      }
    },

    /** Cuánto usa la comunidad cada elemento. Se guarda unos minutos. */
    community(): Promise<UsageCounts> {
      return totals.get('all', async () => {
        const result = await db.execute({
          sql: 'SELECT key, SUM(MIN(count, ?)) AS total FROM usage_counts GROUP BY key',
          args: [PERSON_CAP],
        })

        return {
          counts: Object.fromEntries(
            result.rows.map((row) => [toText(row.key), toNumber(row.total)]),
          ),
        }
      })
    },

    /**
     * Mapa de calor del uso: cada elemento frente a cada grupo de personas.
     * Solo para quien administra la web.
     *
     * @param input `by`: `total`, `activity` (cuánto usa la web cada quien),
     *   `track` (plan de estudios) o `cohort` (año en que empezó el 42cursus).
     * @throws {DomainError} `forbidden` si quien pregunta no es admin.
     */
    async heatmap(actor: Actor, input: unknown): Promise<UsageHeatmap> {
      assertAdmin(actor)

      const { by, low, high } = parse(heatmapSchema, input)
      const [result, cohorts] = await Promise.all([
        db.execute('SELECT key, login, count FROM usage_counts'),
        by === 'track' || by === 'cohort' ? replica.cohorts() : Promise.resolve(new Map()),
      ])
      const everyRow = result.rows.map((row) => ({
        key: toText(row.key),
        login: toText(row.login),
        count: toNumber(row.count),
      }))
      const perPerson = new Map<string, number>()

      for (const row of everyRow) {
        perPerson.set(row.login, (perPerson.get(row.login) ?? 0) + row.count)
      }

      // Aquí los usos son los de siempre, así que la actividad también.
      const chosen = segmentOf(perPerson, low, high)
      const rows = everyRow.filter((row) => chosen.keep(row.login))

      const groupOf = (login: string): string => {
        switch (by) {
          case 'total':
            return 'all'
          case 'activity': {
            const total = perPerson.get(login) ?? 0

            return total >= HEAVY_FROM ? 'heavy' : total >= REGULAR_FROM ? 'regular' : 'casual'
          }
          case 'track':
            return (cohorts.get(login) as { track: string | null } | undefined)?.track ?? 'unknown'
          case 'cohort': {
            const year = (cohorts.get(login) as { year: number | null } | undefined)?.year

            return year === null || year === undefined ? 'unknown' : String(year)
          }
        }
      }

      const people = new Map<string, Set<string>>()
      const cells = new Map<string, Map<string, number>>()

      for (const row of rows) {
        const group = groupOf(row.login)
        const members = people.get(group) ?? new Set<string>()
        const line = cells.get(row.key) ?? new Map<string, number>()

        members.add(row.login)
        people.set(group, members)
        line.set(group, (line.get(group) ?? 0) + row.count)
        cells.set(row.key, line)
      }

      const groups = [...people.keys()].sort()

      return {
        by,
        segment: { low, high, people: chosen.people, of: chosen.of },
        groups: groups.map((id) => ({ id, people: people.get(id)?.size ?? 0 })),
        rows: [...cells]
          .map(([key, line]) => ({ key, counts: groups.map((id) => line.get(id) ?? 0) }))
          .sort((a, b) => (a.key < b.key ? -1 : 1)),
      }
    },

    /** Olvida el total guardado. Solo para los tests. */
    forget(): void {
      totals.clear()
    },
  }
}

export type UsageService = ReturnType<typeof createUsageService>
