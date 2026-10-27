/**
 * A qué se va la cuota de 42: cuánto gasta cada función y cada persona, hora a
 * hora, y los topes por hora para que nadie se la coma.
 *
 * La cuota es de 1 200 peticiones por hora para toda la aplicación y vuelve
 * entera a cada hora en punto (UTC); no hay tope diario ni mensual. Por eso
 * todo aquí va por horas: lo contado se guarda por hora, función y persona
 * (`api_usage`), y los topes son de la hora en curso.
 *
 * Quién y qué provoca cada petición lo dice `usage-context.ts`: las de la web
 * van a nombre de la sección y de la persona de la sesión; las de fondo, a
 * nombre de su trabajo. El cliente de 42 avisa antes de pedir (`check`, que
 * puede cortar) y en cada intento que sale (`count`).
 *
 * Al llegar al tope, la petición a 42 no sale: falla con un `ApiError` que no
 * se reintenta, y quien la pedía sirve lo guardado o da un 503 con el motivo.
 * Quien administra no tiene tope de persona; los de función valen para todos.
 */

import type { ApiUsage, ApiUsageLimits } from '@sanatorio/contracts'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { isoAt } from '../../core/time.js'
import { parse } from '../../core/validation.js'
import { ApiError } from '../../integrations/forty-two/errors.js'
import { currentApiUse } from '../../integrations/forty-two/usage-context.js'
import type { ApiMeter } from '../../integrations/forty-two/usage-context.js'
import { windowStart } from './budget.js'

const HOUR = 60 * 60_000

/** Lo que no va a nombre de nada: una petición fuera de cualquier petición o trabajo. */
const UNKNOWN_FEATURE = 'other'

/** Clave de `settings` con los topes. */
const LIMITS_KEY = 'apiLimits'

/** Cuántas horas se guardan: noventa días. */
const KEEP_HOURS = 90 * 24

/** Las series del gráfico: las que más gastan, y el resto juntas en `REST`. */
const SERIES_KEYS = 8
const REST = '*'

/** Las personas que se enseñan, de más a menos. */
const PEOPLE_SHOWN = 200

/** Lo más atrás que se puede mirar: una semana. */
export const MAX_HOURS = 7 * 24

const DEFAULT_LIMITS: ApiUsageLimits = { perPerson: null, people: {}, features: {} }

const cap = z.number().int().min(0).max(100_000)
const changeSchema = z
  .object({
    perPerson: cap.nullable(),
    person: z.object({ login: z.string().min(1).max(64), cap: cap.nullable() }),
    feature: z.object({ key: z.string().min(1).max(64), cap: cap.nullable() }),
  })
  .partial()
const limitsSchema = z.object({
  perPerson: cap.nullable(),
  people: z.record(z.string(), cap),
  features: z.record(z.string(), cap),
})

type ApiUsageOptions = {
  db: Db
  /** Quién no tiene tope de persona (quien administra). */
  priority?: (login: string) => boolean
  now?: () => number
}

/** La hora (UTC) en que cae `ms`, como se guarda: `2026-10-27T09`. */
function hourKey(ms: number): string {
  return isoAt(windowStart(ms)).slice(0, 13)
}

export function createApiUsage(options: ApiUsageOptions) {
  const { db } = options
  const now = options.now ?? Date.now
  const priority = options.priority ?? (() => false)

  /** Lo contado que aún no está en la base: `hora\tfunción\tlogin` → peticiones. */
  const unsaved = new Map<string, number>()
  /** Lo gastado en la hora en curso por persona y por función, para los topes. */
  const byLogin = new Map<string, number>()
  const byFeature = new Map<string, number>()
  let hour = ''
  /** La hora cuyos totales ya se han leído de la base (tras un reinicio). */
  let loadedHour = ''
  let limits: ApiUsageLimits = DEFAULT_LIMITS
  let prunedAt = ''

  /** Si ha cambiado la hora, los totales de la hora empiezan de cero. */
  const roll = (): void => {
    const current = hourKey(now())

    if (current !== hour) {
      hour = current
      byLogin.clear()
      byFeature.clear()
    }
  }

  /** El tope de una persona, propio o el general, o `null` sin tope. */
  const capOf = (login: string): number | null => limits.people[login] ?? limits.perPerson

  const capped = (endpoint: string, message: string): ApiError =>
    new ApiError(message, 429, { endpoint, code: 'rate_limited', retryable: false })

  const meter: ApiMeter = {
    check(endpoint) {
      const use = currentApiUse()

      if (use === undefined) return

      roll()

      const featureCap = limits.features[use.feature]

      if (featureCap !== undefined && (byFeature.get(use.feature) ?? 0) >= featureCap) {
        throw capped(endpoint, 'Esta sección ha llegado a su tope de peticiones a 42 esta hora')
      }

      if (use.login === null || priority(use.login)) return

      const personCap = capOf(use.login)

      if (personCap !== null && (byLogin.get(use.login) ?? 0) >= personCap) {
        throw capped(endpoint, 'Has llegado a tu tope de peticiones a 42 esta hora')
      }
    },

    count() {
      const use = currentApiUse() ?? { feature: UNKNOWN_FEATURE, login: null }

      roll()

      const key = `${hour}\t${use.feature}\t${use.login ?? ''}`

      unsaved.set(key, (unsaved.get(key) ?? 0) + 1)
      byFeature.set(use.feature, (byFeature.get(use.feature) ?? 0) + 1)

      if (use.login !== null) {
        byLogin.set(use.login, (byLogin.get(use.login) ?? 0) + 1)
      }
    },
  }

  /** Lee los topes guardados. Unos ilegibles valen como ninguno. */
  const loadLimits = async (): Promise<void> => {
    const stored = (
      await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [LIMITS_KEY] })
    ).rows[0]?.value

    try {
      limits =
        typeof stored === 'string'
          ? parse(limitsSchema, JSON.parse(stored) as unknown)
          : DEFAULT_LIMITS
    } catch {
      limits = DEFAULT_LIMITS
    }
  }

  /**
   * Guarda lo contado, relee los topes y, al empezar una hora (o tras un
   * reinicio), los totales de la hora desde la base. La lanza un trabajo
   * periódico y la consulta del panel.
   */
  async function flush(): Promise<void> {
    roll()

    const pending = [...unsaved]

    unsaved.clear()

    for (const [key, requests] of pending) {
      const [at = '', feature = '', login = ''] = key.split('\t')

      await db.execute({
        sql: `INSERT INTO api_usage (hour, feature, login, requests) VALUES (?, ?, ?, ?)
              ON CONFLICT (hour, feature, login) DO UPDATE SET
                requests = requests + excluded.requests`,
        args: [at, feature, login, requests],
      })
    }

    await loadLimits()

    if (loadedHour !== hour) {
      loadedHour = hour

      const rows = (
        await db.execute({
          sql: 'SELECT feature, login, requests FROM api_usage WHERE hour = ?',
          args: [hour],
        })
      ).rows

      byLogin.clear()
      byFeature.clear()

      for (const row of rows) {
        const requests = toNumber(row.requests)
        const feature = toText(row.feature)
        const login = toText(row.login)

        byFeature.set(feature, (byFeature.get(feature) ?? 0) + requests)

        if (login !== '') byLogin.set(login, (byLogin.get(login) ?? 0) + requests)
      }
    }

    // Lo de hace más de noventa días se borra, una vez al día.
    const today = hour.slice(0, 10)

    if (prunedAt !== today) {
      prunedAt = today
      await db.execute({
        sql: 'DELETE FROM api_usage WHERE hour < ?',
        args: [hourKey(now() - KEEP_HOURS * HOUR)],
      })
    }
  }

  /** Lo que enseña el panel, de las últimas `hours` horas (la en curso incluida). */
  async function report(query: {
    hours: number
    feature?: string | undefined
    login?: string | undefined
  }): Promise<ApiUsage> {
    await flush()

    const hours = Math.min(Math.max(1, Math.round(query.hours)), MAX_HOURS)
    const since = hourKey(now() - (hours - 1) * HOUR)
    const where = ['hour >= ?']
    const args: (string | number)[] = [since]

    if (query.feature !== undefined) {
      where.push('feature = ?')
      args.push(query.feature)
    }
    if (query.login !== undefined) {
      where.push('login = ?')
      args.push(query.login)
    }

    const rows = (
      await db.execute({
        sql: `SELECT hour, feature, login, requests FROM api_usage WHERE ${where.join(' AND ')}`,
        args,
      })
    ).rows.map((row) => ({
      hour: toText(row.hour),
      feature: toText(row.feature),
      login: toText(row.login),
      requests: toNumber(row.requests),
    }))

    // Filtrando por una función (y no por persona), las series son de personas.
    const byPerson = query.feature !== undefined && query.login === undefined
    const seriesKey = (row: (typeof rows)[number]): string => (byPerson ? row.login : row.feature)
    const totals = new Map<string, number>()

    for (const row of rows) {
      totals.set(seriesKey(row), (totals.get(seriesKey(row)) ?? 0) + row.requests)
    }

    const kept = new Set(
      [...totals]
        .sort((a, b) => b[1] - a[1])
        .slice(0, SERIES_KEYS)
        .map(([key]) => key),
    )
    const series = new Map<string, number>()

    for (const row of rows) {
      const key = kept.has(seriesKey(row)) ? seriesKey(row) : REST
      const id = `${row.hour}\t${key}`

      series.set(id, (series.get(id) ?? 0) + row.requests)
    }

    const features = new Map<string, { requests: number; people: Set<string>; thisHour: number }>()
    const people = new Map<
      string,
      { requests: number; thisHour: number; perFeature: Map<string, number> }
    >()
    let background = 0

    for (const row of rows) {
      const current = row.hour === hour ? row.requests : 0
      const feature = features.get(row.feature) ?? { requests: 0, people: new Set(), thisHour: 0 }

      feature.requests += row.requests
      feature.thisHour += current
      features.set(row.feature, feature)

      if (row.login === '') {
        background += row.requests
        continue
      }

      feature.people.add(row.login)

      const person = people.get(row.login) ?? {
        requests: 0,
        thisHour: 0,
        perFeature: new Map<string, number>(),
      }

      person.requests += row.requests
      person.thisHour += current
      person.perFeature.set(row.feature, (person.perFeature.get(row.feature) ?? 0) + row.requests)
      people.set(row.login, person)
    }

    return {
      hours,
      hour: {
        start: isoAt(windowStart(now())),
        spent: [...byFeature.values()].reduce((sum, value) => sum + value, 0),
        resetsAt: isoAt(windowStart(now()) + HOUR),
      },
      series: [...series]
        .map(([id, requests]) => {
          const [at = '', key = ''] = id.split('\t')

          return { hour: at, key, requests }
        })
        .sort((a, b) => a.hour.localeCompare(b.hour) || b.requests - a.requests),
      features: [...features]
        .map(([key, value]) => ({
          key,
          requests: value.requests,
          people: value.people.size,
          thisHour: value.thisHour,
        }))
        .sort((a, b) => b.requests - a.requests),
      people: [...people]
        .sort((a, b) => b[1].requests - a[1].requests)
        .slice(0, PEOPLE_SHOWN)
        .map(([login, value]) => ({
          login,
          requests: value.requests,
          thisHour: value.thisHour,
          top: [...value.perFeature].sort((a, b) => b[1] - a[1])[0]?.[0] ?? UNKNOWN_FEATURE,
          cap: priority(login) ? null : capOf(login),
        })),
      background,
      limits,
    }
  }

  /** Cambia un tope (o el general) y devuelve cómo quedan. */
  async function configure(input: unknown, by: string): Promise<ApiUsageLimits> {
    const change = parse(changeSchema, input)

    await loadLimits()

    const next: ApiUsageLimits = {
      perPerson: change.perPerson === undefined ? limits.perPerson : change.perPerson,
      people:
        change.person === undefined
          ? limits.people
          : withCap(limits.people, change.person.login, change.person.cap),
      features:
        change.feature === undefined
          ? limits.features
          : withCap(limits.features, change.feature.key, change.feature.cap),
    }

    await db.execute({
      sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
            VALUES (?, ?, ?, ?)`,
      args: [LIMITS_KEY, JSON.stringify(next), by, isoAt(now())],
    })
    limits = next

    return limits
  }

  return { meter, flush, report, configure }
}

/** Los topes con el de `key` cambiado; `null` lo quita. */
function withCap(
  caps: Record<string, number>,
  key: string,
  cap: number | null,
): Record<string, number> {
  const rest = Object.fromEntries(Object.entries(caps).filter(([name]) => name !== key))

  return cap === null ? rest : { ...rest, [key]: cap }
}

export type ApiUsageService = ReturnType<typeof createApiUsage>
