/**
 * Administración de la web.
 *
 * - **Permisos y bloqueos**: quién administra y quién no puede entrar.
 * - **Buzón**: incidencias, sugerencias y denuncias de la gente, con respuesta.
 * - **Consumo**: peticiones y bytes por persona y hora, y un tope por persona
 *   que se ajusta solo para que la suma de todos quepa en el presupuesto.
 * - **Presupuesto**: se regula desde el panel y es dinámico: lo de hoy sale de
 *   lo que queda del mes, lo de esta hora de lo que queda del día y lo de cada
 *   persona de cuánta gente hay (`budget.rules.ts`).
 *
 * El contador de consumo vive en memoria y se vuelca a la base cada minuto:
 * apuntar cada petición en SQLite costaría más que la propia petición. Al
 * cambiar de hora, y al arrancar, se recupera de la base lo ya servido: un
 * reinicio no pone el tope a cero.
 */

import type {
  AdminPeople,
  BudgetSettings,
  BudgetStatus,
  Consumption,
  Ticket,
  TicketKind,
  TicketStatus,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Actor } from '../../core/actor.js'
import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { domainError } from '../../core/errors.js'
import { createTtlCache } from '../../core/ttl-cache.js'
import { parse } from '../../core/validation.js'
import { DEFAULT_BUDGET, forecast, perPerson, periodOf, planDay, planHour } from './budget.rules.js'
import type { DayPlan } from './budget.rules.js'

export type AdminServiceOptions = {
  db: Db
  /** Admins fijos (`ADMIN_LOGINS`): no se pueden quitar desde el panel. */
  fixedAdmins: readonly string[]
  /** Peticiones a la API de 42 que quedan esta hora. */
  fortyTwoRemaining: () => number | undefined
  now?: () => number
}

const HOUR = 60 * 60_000

/** A partir de qué parte del presupuesto un tramo horario merece un aviso. */
const WARN_SHARE = 0.8

/** Cada cuánto se releen los ajustes y los topes a mano: cambian poco. */
const SETTINGS_TTL_MS = 60_000

const login = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{1,30}$/, 'login no válido')

const roleSchema = z.object({ login, admin: z.boolean() })
const blockSchema = z.object({
  login,
  reason: z.string().trim().min(3, 'explica el motivo').max(300),
  /** Días que dura. Sin él, hasta que se quite a mano. */
  days: z.number().int().min(1).max(365).optional(),
})
const limitSchema = z.object({
  login,
  /** `null` devuelve a esa persona al tope automático. */
  perHour: z.number().int().min(10).max(100_000).nullable(),
})
const budgetSchema = z
  .object({
    dailyRequests: z.number().int().min(1000).max(100_000_000),
    monthlyBytes: z.number().int().min(1_000_000).max(1e15).nullable(),
    renewDay: z.number().int().min(1).max(28),
    share: z.number().min(0.5).max(1),
    minPerPerson: z.number().int().min(10).max(100_000),
    maxPerPerson: z.number().int().min(10).max(100_000),
    saving: z.boolean(),
  })
  .partial()

/** Los ajustes con lo que traiga `patch` encima; lo que no venga se queda como estaba. */
function withChanges(base: BudgetSettings, patch: z.infer<typeof budgetSchema>): BudgetSettings {
  return {
    ...base,
    ...(Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<BudgetSettings>),
  }
}

const ticketSchema = z.object({
  kind: z.enum(['issue', 'idea', 'report']),
  subject: z.string().trim().min(3, 'ponle un título').max(120),
  body: z.string().trim().min(5, 'cuéntalo con un poco más de detalle').max(2000),
  target: z
    .string()
    .regex(/^(message|board|doubt|group):[0-9]{1,12}$/, 'destino no válido')
    .optional(),
})
const answerSchema = z.object({
  answer: z.string().trim().min(1, 'escribe la respuesta').max(2000),
  status: z.enum(['answered', 'closed']).default('answered'),
})

/** Tickets abiertos que puede tener una persona a la vez: el buzón no es un chat. */
const MAX_OPEN_TICKETS = 10

/** Y los que puede mandar en diez minutos, abiertos o no. */
const MAX_TICKETS_PER_WINDOW = 3
const TICKET_WINDOW_MS = 10 * 60_000

function toTicket(row: Record<string, unknown>): Ticket {
  const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

  return {
    id: toNumber(row.id),
    login: toText(row.login),
    kind: toText(row.kind) as TicketKind,
    subject: toText(row.subject),
    body: toText(row.body),
    target: text(row.target),
    status: toText(row.status) as TicketStatus,
    answer: text(row.answer),
    answeredBy: text(row.answered_by),
    createdAt: toText(row.created_at),
    answeredAt: text(row.answered_at),
  }
}

export function createAdminService(options: AdminServiceOptions) {
  const { db, fixedAdmins } = options
  const now = options.now ?? Date.now
  const iso = (): string => new Date(now()).toISOString()
  // Permisos y bloqueos se miran en cada petición con sesión: se recuerdan medio minuto.
  const access = createTtlCache<{
    admin: boolean
    block: { reason: string; until: string | null } | null
  }>({ ttlMs: 30_000, maxEntries: 5000, now })

  /** Lo contado desde el último volcado: por persona y hora. */
  let pending = new Map<string, { requests: number; bytes: number; limited: number }>()
  /** Peticiones de cada persona en la hora en curso, para aplicar el tope. */
  let hourKey = ''
  let thisHour = new Map<string, number>()
  let manual = new Map<string, number>()
  let settings: BudgetSettings = DEFAULT_BUDGET
  let syncedAt = -Infinity
  /** Lo servido hasta que empezó esta hora: hoy, y en el periodo mensual en curso. */
  let before = { requestsToday: 0, bytesPeriod: 0, requestsPeriod: 0 }
  /** Peticiones de todo el mundo en la hora en curso. */
  let hourTotal = 0
  let dayPlan: DayPlan = { requests: 0, limitedBy: 'day' }
  let hourBudget = 0

  const slot = (): { day: string; hour: number; key: string } => {
    const at = new Date(now())
    const day = at.toISOString().slice(0, 10)

    return { day, hour: at.getUTCHours(), key: `${day}|${at.getUTCHours()}` }
  }

  const sum = (row: Record<string, unknown> | undefined, column: string): number =>
    toNumber(row?.[column] ?? 0)

  /**
   * Pone al día lo que hace falta para decidir un tope: los ajustes (cada
   * minuto) y, al cambiar de hora o al arrancar, lo ya servido según la base.
   */
  const refresh = async (): Promise<void> => {
    const { key, day, hour } = slot()
    const rolled = key !== hourKey

    if (!rolled && now() - syncedAt <= SETTINGS_TTL_MS) return

    syncedAt = now()

    const [stored, limits] = await Promise.all([
      db.execute("SELECT value FROM settings WHERE key = 'budget'"),
      db.execute('SELECT login, per_hour FROM user_limits'),
    ])

    manual = new Map(limits.rows.map((row) => [toText(row.login), toNumber(row.per_hour)]))
    settings = { ...DEFAULT_BUDGET }

    try {
      const value = stored.rows[0]?.value

      if (typeof value === 'string') {
        settings = withChanges(DEFAULT_BUDGET, parse(budgetSchema, JSON.parse(value)))
      }
    } catch {
      // Ajustes ilegibles: valen los de fábrica.
    }

    if (rolled) {
      const since = new Date(periodOf(now(), settings.renewDay).start).toISOString().slice(0, 10)
      const [people, today, period] = await Promise.all([
        // Lo de esta hora solo está en la base si el servidor se ha reiniciado a media hora.
        db.execute({
          sql: 'SELECT login, requests FROM request_stats WHERE day = ? AND hour = ?',
          args: [day, hour],
        }),
        db.execute({
          sql: 'SELECT SUM(requests) AS requests FROM request_stats WHERE day = ? AND hour < ?',
          args: [day, hour],
        }),
        db.execute({
          sql: `SELECT SUM(requests) AS requests, SUM(bytes) AS bytes FROM request_stats
                WHERE day >= ?`,
          args: [since],
        }),
      ])

      hourKey = key
      thisHour = new Map(people.rows.map((row) => [toText(row.login), toNumber(row.requests)]))
      hourTotal = [...thisHour.values()].reduce((total, requests) => total + requests, 0)
      before = {
        requestsToday: sum(today.rows[0], 'requests'),
        requestsPeriod: sum(period.rows[0], 'requests'),
        bytesPeriod: sum(period.rows[0], 'bytes'),
      }
    }

    dayPlan = planDay(settings, before, now())
    hourBudget = planHour(dayPlan.requests, before.requestsToday, now())
  }

  const assertAdmin = (actor: Actor): void => {
    if (!actor.admin) {
      throw domainError('forbidden', 'Solo para quien administra la web')
    }
  }

  /** Tope automático: lo de esta hora repartido entre quienes están usando la web. */
  const automaticLimit = (): number => perPerson(settings, hourBudget, thisHour.size)

  const budgetStatus = (): BudgetStatus => {
    const period = periodOf(now(), settings.renewDay)
    const used = before.requestsToday + hourTotal

    return {
      settings,
      day: {
        allowance: dayPlan.requests,
        used,
        left: Math.max(0, dayPlan.requests - used),
        forecast: forecast(used, now()),
        limitedBy: dayPlan.limitedBy,
      },
      month: {
        bytesUsed: before.bytesPeriod,
        bytesLeft:
          settings.monthlyBytes === null
            ? null
            : Math.max(0, settings.monthlyBytes - before.bytesPeriod),
        daysLeft: period.daysLeft,
        renewsOn: new Date(period.end).toISOString().slice(0, 10),
      },
    }
  }

  return {
    // --- Permisos y bloqueos ------------------------------------------------

    /**
     * Si alguien administra y si está bloqueado. Lo usa la sesión en cada
     * petición; un bloqueo caducado ya no cuenta.
     */
    accessOf(
      who: string,
    ): Promise<{ admin: boolean; block: { reason: string; until: string | null } | null }> {
      const wanted = who.toLowerCase()

      return access.get(wanted, async () => {
        const [role, block] = await Promise.all([
          db.execute({ sql: 'SELECT 1 FROM user_roles WHERE login = ?', args: [wanted] }),
          db.execute({
            sql: 'SELECT reason, until FROM user_blocks WHERE login = ?',
            args: [wanted],
          }),
        ])
        const row = block.rows[0]
        const until = typeof row?.until === 'string' ? row.until : null
        const active = row !== undefined && (until === null || Date.parse(until) > now())

        return {
          admin: fixedAdmins.includes(wanted) || role.rows.length > 0,
          block: active ? { reason: toText(row.reason), until } : null,
        }
      })
    },

    async people(actor: Actor): Promise<AdminPeople> {
      assertAdmin(actor)

      const [roles, blocks, limits] = await Promise.all([
        db.execute('SELECT login, granted_by FROM user_roles ORDER BY login'),
        db.execute(
          'SELECT login, reason, until, blocked_by FROM user_blocks ORDER BY created_at DESC',
        ),
        db.execute('SELECT login, per_hour FROM user_limits ORDER BY login'),
      ])

      return {
        admins: [
          ...fixedAdmins.map((entry) => ({ login: entry, fixed: true, grantedBy: null })),
          ...roles.rows
            .filter((row) => !fixedAdmins.includes(toText(row.login)))
            .map((row) => ({
              login: toText(row.login),
              fixed: false,
              grantedBy: toText(row.granted_by),
            })),
        ],
        blocks: blocks.rows.map((row) => ({
          login: toText(row.login),
          reason: toText(row.reason),
          until: typeof row.until === 'string' ? row.until : null,
          blockedBy: toText(row.blocked_by),
        })),
        limits: limits.rows.map((row) => ({
          login: toText(row.login),
          perHour: toNumber(row.per_hour),
        })),
      }
    },

    /** Da o quita el permiso de administrar. Los de `ADMIN_LOGINS` no se tocan desde aquí. */
    async setRole(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const change = parse(roleSchema, input)

      if (fixedAdmins.includes(change.login)) {
        throw domainError(
          'conflict',
          'Esa persona administra por configuración: no se cambia desde aquí',
        )
      }

      await (change.admin
        ? db.execute({
            sql: `INSERT OR REPLACE INTO user_roles (login, role, granted_by, created_at)
                  VALUES (?, 'admin', ?, ?)`,
            args: [change.login, actor.login, iso()],
          })
        : db.execute({ sql: 'DELETE FROM user_roles WHERE login = ?', args: [change.login] }))
      access.clear()
    },

    /** Bloquea una cuenta: no podrá usar la web hasta que pase el plazo o se le quite. */
    async block(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const change = parse(blockSchema, input)

      if (change.login === actor.login || fixedAdmins.includes(change.login)) {
        throw domainError('conflict', 'No se puede bloquear a quien administra la web')
      }

      await db.execute({
        sql: `INSERT OR REPLACE INTO user_blocks (login, reason, until, blocked_by, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          change.login,
          change.reason,
          change.days === undefined
            ? null
            : new Date(now() + change.days * 24 * HOUR).toISOString(),
          actor.login,
          iso(),
        ],
      })
      access.clear()
    },

    async unblock(actor: Actor, who: string): Promise<void> {
      assertAdmin(actor)
      await db.execute({
        sql: 'DELETE FROM user_blocks WHERE login = ?',
        args: [parse(login, who)],
      })
      access.clear()
    },

    /** Pone (o quita, con `null`) un tope por hora a mano a una persona. */
    async setLimit(actor: Actor, input: unknown): Promise<void> {
      assertAdmin(actor)

      const change = parse(limitSchema, input)

      await (change.perHour === null
        ? db.execute({ sql: 'DELETE FROM user_limits WHERE login = ?', args: [change.login] })
        : db.execute({
            sql: 'INSERT OR REPLACE INTO user_limits (login, per_hour) VALUES (?, ?)',
            args: [change.login, change.perHour],
          }))
      syncedAt = -Infinity
    },

    /**
     * Cambia los ajustes del presupuesto. Solo hace falta mandar lo que cambia;
     * vale desde la siguiente petición.
     */
    async setBudget(actor: Actor, input: unknown): Promise<BudgetStatus> {
      assertAdmin(actor)
      await refresh()

      const next = withChanges(settings, parse(budgetSchema, input))

      if (next.minPerPerson > next.maxPerPerson) {
        throw domainError('invalid_input', 'El mínimo por persona no puede pasar del máximo')
      }

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('budget', ?, ?, ?)`,
        args: [JSON.stringify(next), actor.login, iso()],
      })
      // El día de renovación cambia desde cuándo se cuenta el mes: se vuelve a
      // leer todo de la base, con lo de esta hora ya volcado.
      await this.flush()
      hourKey = ''
      await refresh()

      return budgetStatus()
    },

    // --- Consumo --------------------------------------------------------------

    /**
     * Cuenta una petición y dice si cabe en el tope de esa persona.
     *
     * @returns `false` si se ha pasado: la petición se rechaza con un `429`.
     */
    async allow(who: string, admin: boolean): Promise<boolean> {
      await refresh()

      const used = (thisHour.get(who) ?? 0) + 1

      thisHour.set(who, used)
      hourTotal += 1

      // Quien administra no se queda fuera de su propio panel.
      const allowed = admin || used <= (manual.get(who) ?? automaticLimit())

      if (!allowed) {
        const entry = pending.get(who) ?? { requests: 0, bytes: 0, limited: 0 }

        entry.limited += 1
        pending.set(who, entry)
      }

      return allowed
    },

    /** Apunta lo que ha pesado una respuesta ya servida. */
    count(who: string, bytes: number): void {
      const entry = pending.get(who) ?? { requests: 0, bytes: 0, limited: 0 }

      entry.requests += 1
      entry.bytes += bytes
      pending.set(who, entry)
    },

    /** Vuelca a la base lo contado. Lo lanza un trabajo cada minuto. */
    async flush(): Promise<void> {
      const counted = pending

      if (counted.size === 0) return

      pending = new Map()

      const { day, hour } = slot()

      await db.batch(
        [...counted].map(([who, entry]) => ({
          sql: `INSERT INTO request_stats (login, day, hour, requests, bytes, limited)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (login, day, hour) DO UPDATE SET
                  requests = requests + excluded.requests,
                  bytes = bytes + excluded.bytes,
                  limited = limited + excluded.limited`,
          args: [who, day, hour, entry.requests, entry.bytes, entry.limited],
        })),
        'write',
      )
    },

    async consumption(actor: Actor): Promise<Consumption> {
      assertAdmin(actor)
      await this.flush()
      await refresh()

      const since = (ms: number): string => new Date(now() - ms).toISOString().slice(0, 10)
      const [recent, pattern, top, limits] = await Promise.all([
        db.execute({
          sql: `SELECT day, hour, SUM(requests) AS requests, SUM(bytes) AS bytes, COUNT(*) AS people
                FROM request_stats WHERE day >= ? GROUP BY day, hour ORDER BY day, hour`,
          args: [since(2 * 24 * HOUR)],
        }),
        // Primero el total de cada hora concreta; después, la media por día de la semana y hora.
        db.execute({
          sql: `SELECT CAST(strftime('%w', day) AS INTEGER) AS weekday, hour, AVG(total) AS requests
                FROM (SELECT day, hour, SUM(requests) AS total FROM request_stats
                      WHERE day >= ? GROUP BY day, hour)
                GROUP BY weekday, hour ORDER BY weekday, hour`,
          args: [since(28 * 24 * HOUR)],
        }),
        db.execute({
          sql: `SELECT login, SUM(requests) AS requests, SUM(bytes) AS bytes, SUM(limited) AS limited
                FROM request_stats WHERE day >= ? GROUP BY login ORDER BY requests DESC LIMIT 25`,
          args: [since(24 * HOUR)],
        }),
        db.execute('SELECT login, per_hour FROM user_limits'),
      ])
      const manualLimits = new Map(
        limits.rows.map((row) => [toText(row.login), toNumber(row.per_hour)]),
      )
      // Para los avisos se compara con una hora cualquiera: el día repartido a partes iguales.
      const evenHour = Math.max(1, dayPlan.requests / 24)
      const cells = pattern.rows.map((row) => ({
        weekday: toNumber(row.weekday),
        hour: toNumber(row.hour),
        requests: Math.round(Number(row.requests)),
      }))

      return {
        budget: budgetStatus(),
        limit: {
          budget: hourBudget,
          activePeople: thisHour.size,
          perPerson: automaticLimit(),
          fortyTwoRemaining: options.fortyTwoRemaining() ?? null,
        },
        recent: recent.rows.map((row) => ({
          day: toText(row.day),
          hour: toNumber(row.hour),
          requests: toNumber(row.requests),
          bytes: toNumber(row.bytes),
          people: toNumber(row.people),
        })),
        pattern: cells,
        warnings: cells
          .filter((cell) => cell.requests >= evenHour * WARN_SHARE)
          .map((cell) => ({
            ...cell,
            share: Math.round((100 * cell.requests) / evenHour) / 100,
          }))
          .sort((a, b) => b.requests - a.requests),
        top: top.rows.map((row) => ({
          login: toText(row.login),
          requests: toNumber(row.requests),
          bytes: toNumber(row.bytes),
          limited: toNumber(row.limited),
          manualLimit: manualLimits.get(toText(row.login)) ?? null,
        })),
      }
    },

    // --- Buzón ----------------------------------------------------------------

    /** Manda una incidencia, una sugerencia o una denuncia. */
    async openTicket(actor: Actor, input: unknown): Promise<Ticket> {
      const ticket = parse(ticketSchema, input)

      if (ticket.kind === 'report' && ticket.target === undefined) {
        throw domainError('invalid_input', 'Una denuncia tiene que decir de qué es')
      }

      const open = await db.execute({
        sql: "SELECT COUNT(*) AS total FROM tickets WHERE login = ? AND status = 'open'",
        args: [actor.login],
      })

      if (toNumber(open.rows[0]?.total) >= MAX_OPEN_TICKETS) {
        throw domainError(
          'conflict',
          'Tienes demasiados avisos sin responder: espera a que se resuelvan',
        )
      }

      const recent = await db.execute({
        sql: 'SELECT COUNT(*) AS total FROM tickets WHERE login = ? AND created_at > ?',
        args: [actor.login, new Date(now() - TICKET_WINDOW_MS).toISOString()],
      })

      if (toNumber(recent.rows[0]?.total) >= MAX_TICKETS_PER_WINDOW) {
        throw domainError('conflict', 'Has mandado varios avisos seguidos: espera unos minutos')
      }

      const result = await db.execute({
        sql: `INSERT INTO tickets (login, kind, subject, body, target, created_at)
              VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [actor.login, ticket.kind, ticket.subject, ticket.body, ticket.target ?? null, iso()],
      })

      return toTicket(result.rows[0] ?? {})
    },

    /** Lo que ha mandado quien pregunta, con sus respuestas. */
    async myTickets(actor: Actor): Promise<Ticket[]> {
      const result = await db.execute({
        sql: 'SELECT * FROM tickets WHERE login = ? ORDER BY id DESC LIMIT 50',
        args: [actor.login],
      })

      return result.rows.map(toTicket)
    },

    /** El buzón entero, lo pendiente primero. */
    async tickets(actor: Actor): Promise<Ticket[]> {
      assertAdmin(actor)

      const result = await db.execute(
        `SELECT * FROM tickets ORDER BY (status = 'open') DESC, id DESC LIMIT 200`,
      )

      return result.rows.map(toTicket)
    },

    async answerTicket(actor: Actor, id: number, input: unknown): Promise<Ticket> {
      assertAdmin(actor)

      const { answer, status } = parse(answerSchema, input)
      const result = await db.execute({
        sql: `UPDATE tickets SET answer = ?, status = ?, answered_by = ?, answered_at = ?
              WHERE id = ? RETURNING *`,
        args: [answer, status, actor.login, iso(), id],
      })
      const row = result.rows[0]

      if (row === undefined) {
        throw domainError('not_found', 'Ese aviso no existe')
      }

      return toTicket(row)
    },
  }
}

export type AdminService = ReturnType<typeof createAdminService>
