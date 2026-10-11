/**
 * Administración de la web.
 *
 * - **Permisos y bloqueos**: quién administra y quién no puede entrar.
 * - **Buzón**: incidencias, sugerencias y denuncias de la gente, con respuesta.
 * - **Consumo**: peticiones y bytes por persona y hora, y un tope por persona
 *   que se ajusta solo para que la suma de todos quepa en el presupuesto.
 *
 * El contador de consumo vive en memoria y se vuelca a la base cada minuto:
 * apuntar cada petición en SQLite costaría más que la propia petición.
 */

import type {
  AdminPeople,
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

export type AdminServiceOptions = {
  db: Db
  /** Admins fijos (`ADMIN_LOGINS`): no se pueden quitar desde el panel. */
  fixedAdmins: readonly string[]
  /** Peticiones por hora que la web se permite servir en total. */
  hourlyBudget: number
  /** Peticiones a la API de 42 que quedan esta hora. */
  fortyTwoRemaining: () => number | undefined
  now?: () => number
}

const HOUR = 60 * 60_000

/** El tope automático por persona nunca baja ni sube de aquí. */
const MIN_PER_PERSON = 240
const MAX_PER_PERSON = 3000

/** A partir de qué parte del presupuesto un tramo horario merece un aviso. */
const WARN_SHARE = 0.8

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
  const { db, fixedAdmins, hourlyBudget } = options
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
  let manualAt = -Infinity

  const slot = (): { day: string; hour: number; key: string } => {
    const at = new Date(now())
    const day = at.toISOString().slice(0, 10)

    return { day, hour: at.getUTCHours(), key: `${day}|${at.getUTCHours()}` }
  }

  const roll = (): void => {
    const { key } = slot()

    if (key !== hourKey) {
      hourKey = key
      thisHour = new Map()
    }
  }

  const assertAdmin = (actor: Actor): void => {
    if (!actor.admin) {
      throw domainError('forbidden', 'Solo para quien administra la web')
    }
  }

  /** Tope automático: el presupuesto repartido entre quienes están usando la web esta hora. */
  const automaticLimit = (): number =>
    Math.max(
      MIN_PER_PERSON,
      Math.min(MAX_PER_PERSON, Math.floor(hourlyBudget / Math.max(1, thisHour.size))),
    )

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
      manualAt = -Infinity
    },

    // --- Consumo --------------------------------------------------------------

    /**
     * Cuenta una petición y dice si cabe en el tope de esa persona.
     *
     * @returns `false` si se ha pasado: la petición se rechaza con un `429`.
     */
    async allow(who: string, admin: boolean): Promise<boolean> {
      roll()

      // Los topes a mano cambian poco: se releen cada minuto.
      if (now() - manualAt > 60_000) {
        manualAt = now()
        manual = new Map(
          (await db.execute('SELECT login, per_hour FROM user_limits')).rows.map((row) => [
            toText(row.login),
            toNumber(row.per_hour),
          ]),
        )
      }

      const used = (thisHour.get(who) ?? 0) + 1

      thisHour.set(who, used)

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
      roll()

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
      const cells = pattern.rows.map((row) => ({
        weekday: toNumber(row.weekday),
        hour: toNumber(row.hour),
        requests: Math.round(Number(row.requests)),
      }))

      return {
        limit: {
          budget: hourlyBudget,
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
          .filter((cell) => cell.requests >= hourlyBudget * WARN_SHARE)
          .map((cell) => ({
            ...cell,
            share: Math.round((100 * cell.requests) / hourlyBudget) / 100,
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
