/**
 * Uso de la web: cuánto se usa cada sección y cada bloque de cada página.
 *
 * La web manda de vez en cuando lo que ha contado ("abrió el tablón 3 veces") y
 * pide el total de todo el mundo para poder ordenar los elementos por lo que
 * más usa la comunidad.
 */

import type { UsageCounts, UsageHeatmap } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import type { ReplicaRepository } from '../replica/index.js'

/** Claves como `nav.tablon` o `expediente.health`: dos palabras en minúsculas. */
const KEY = /^[a-z]{2,20}\.[a-z_]{2,30}$/

/** Usos que cuentan de una persona en un envío. Más es ruido (o alguien jugando). */
const MAX_PER_SEND = 200

/**
 * Lo que pesa como mucho una sola persona en el total de un elemento: así el
 * orden de la comunidad lo decide mucha gente y no una que no para de pulsar.
 */
const PERSON_CAP = 50

const sendSchema = z.object({
  counts: z
    .record(z.string().regex(KEY, 'clave no válida'), z.number().int().min(1).max(MAX_PER_SEND))
    .refine((counts) => Object.keys(counts).length <= 60, 'demasiadas claves'),
})

const heatmapSchema = z.object({
  by: z.enum(['total', 'activity', 'track', 'cohort']).default('total'),
})

/** Usos totales a partir de los cuales alguien es "habitual" o "intensivo". */
const REGULAR_FROM = 30
const HEAVY_FROM = 150

export function createUsageService(options: {
  db: Db
  replica: ReplicaRepository
  now?: () => number
}) {
  const { db, replica } = options
  const totals = createTtlCache<UsageCounts>({
    ttlMs: 5 * 60_000,
    maxEntries: 1,
    ...(options.now === undefined ? {} : { now: options.now }),
  })

  return {
    /** Suma lo que la web ha contado desde el último envío. */
    async record(actor: Actor, input: unknown): Promise<void> {
      const entries = Object.entries(parse(sendSchema, input).counts)

      if (entries.length === 0) {
        return
      }

      await db.batch(
        entries.map(([key, count]) => ({
          sql: `INSERT INTO usage_counts (key, login, count) VALUES (?, ?, ?)
                ON CONFLICT (key, login) DO UPDATE SET count = count + excluded.count`,
          args: [key, actor.login, count],
        })),
        'write',
      )
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
      if (!actor.admin) {
        throw domainError('forbidden', 'Solo para quien administra la web')
      }

      const { by } = parse(heatmapSchema, input)
      const [result, cohorts] = await Promise.all([
        db.execute('SELECT key, login, count FROM usage_counts'),
        by === 'track' || by === 'cohort' ? replica.cohorts() : Promise.resolve(new Map()),
      ])
      const rows = result.rows.map((row) => ({
        key: toText(row.key),
        login: toText(row.login),
        count: toNumber(row.count),
      }))
      const perPerson = new Map<string, number>()

      for (const row of rows) {
        perPerson.set(row.login, (perPerson.get(row.login) ?? 0) + row.count)
      }

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
