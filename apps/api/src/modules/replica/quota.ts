/**
 * La cuota de la API de 42: quién puede gastarla y cuándo.
 *
 * 42 da 1 200 peticiones por hora a toda la aplicación. Si se agotan, nadie
 * puede ni entrar. Por eso lo que se pide a 42 va en tres escalones, y se
 * frenan en este orden:
 *
 * 1. **Fondo** (`background`): la copia y el repaso. Es lo primero que para.
 * 2. **Aplazable** (`deferrable`): lo que pide la gente pero puede esperar:
 *    su agenda de 42, sus hitos, las horas de los proyectos. Se sirve con lo
 *    último guardado y, si es de una persona, se le da turno en una cola.
 * 3. **Crítico** (`critical`): entrar y ver quién puede ayudarte y dónde está.
 *    Solo para cuando la cuota de la hora está casi a cero.
 *
 * Además de la cuota horaria, que dice 42 en cada respuesta, se puede poner un
 * tope diario o mensual desde el panel; el de cada día es lo que queda del mes
 * entre los días que faltan para que se renueve.
 *
 * **La cola** es por orden de llegada y vive en la base, así que un reinicio no
 * la desordena. Avanza sola cuando vuelve a haber cuota para lo aplazable, y
 * mientras haya alguien esperando nadie se cuela: quien llega después también
 * coge turno. Quien administra no hace cola.
 */

import type {
  FortyTwoQuota,
  FortyTwoQuotaSettings,
  QuotaLevel,
  QuotaStatus,
} from '@sanatorio/contracts'
import { z } from 'zod'

import type { Db } from '../../core/db/database.js'
import { toNumber, toText } from '../../core/db/rows.js'
import { periodOf } from '../../core/period.js'
import { parse } from '../../core/validation.js'
import type { FortyTwoClient } from '../../integrations/forty-two/client.js'
import { dayOf, isoAt } from '../../core/time.js'

type QuotaTier = 'background' | 'deferrable' | 'critical'

/** Lo aplazable que es de una persona y por tanto puede esperar turno. */
export type QuotaTask = 'agenda' | 'cursus' | 'track'

type QuotaOptions = {
  db: Db
  client: Pick<FortyTwoClient, 'hourlyRemaining' | 'requestCount'>
  /** Cuota horaria que no tocan ni el trabajo de fondo ni lo aplazable. */
  hourlyReserve: number
  /**
   * `true` si el servicio está cortado por el límite del plan: entonces no se
   * pide nada a 42, ni lo crítico. Que no corra nada aunque no haya nadie.
   */
  halted?: () => boolean
  /** Quién no hace cola (quien administra). */
  priority?: (login: string) => boolean
  log?: (message: string) => void
  now?: () => number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Por debajo de esto no se hace desde una visita ninguna llamada a 42: lo poco
 * que queda es para que la gente pueda seguir entrando (el login son dos).
 */
const CRITICAL_FLOOR = 40

/** Parte del tope del día a partir de la que se frena cada escalón. */
const DAY_SHARE: Record<Exclude<QuotaTier, 'critical'>, number> = {
  background: 0.7,
  deferrable: 0.9,
}

const DEFAULT_QUOTA: FortyTwoQuotaSettings = {
  dailyRequests: null,
  monthlyRequests: null,
  renewDay: 1,
  saving: false,
}

/** Cada cuánto se releen los ajustes y se guarda lo gastado. */
const SYNC_EVERY_MS = MINUTE

/** Turnos que se atienden en cada pasada de la cola, y cada cuánto hay una. */
const DRAIN_BATCH = 5
export const DRAIN_EVERY_MS = 20_000

/** Los turnos atendidos se guardan un día, para poder decir por cuál va la cola. */
const KEEP_SERVED_MS = DAY

const settingsSchema = z
  .object({
    dailyRequests: z.number().int().min(100).max(10_000_000).nullable(),
    monthlyRequests: z.number().int().min(1000).max(1_000_000_000).nullable(),
    renewDay: z.number().int().min(1).max(28),
    saving: z.boolean(),
  })
  .partial()

/** El número de un turno, como en un tique: `A-042`. Da la vuelta cada mil. */
export function ticketNumber(id: number): string {
  return `A-${String(id % 1000).padStart(3, '0')}`
}

export function createQuota(options: QuotaOptions) {
  const { db, client, hourlyReserve } = options
  const now = options.now ?? Date.now
  const log = options.log ?? (() => undefined)
  const priority = options.priority ?? (() => false)
  const runners = new Map<QuotaTask, (login: string) => Promise<unknown>>()

  let settings: FortyTwoQuotaSettings = DEFAULT_QUOTA
  let syncedAt = -Infinity
  /** El día (UTC) al que corresponde lo contado, y lo gastado en él y en el periodo antes de él. */
  let day = ''
  let spentToday = 0
  let spentBefore = 0
  /** Lo que el cliente decía haber pedido la última vez que se miró, y lo que falta por guardar. */
  let seen = client.requestCount()
  let unsaved = 0
  /** Cuándo se hizo la última petición: lo que dijo 42 entonces caduca a la hora. */
  let askedAt = now()
  /** Personas esperando turno, y a quién se está atendiendo ahora. */
  let queued = 0
  let serving: string | null = null
  const today = (): string => dayOf(now())

  /** Apunta lo pedido a 42 desde la última vez que se miró. */
  const sample = (): void => {
    const made = client.requestCount()

    if (made > seen) {
      spentToday += made - seen
      unsaved += made - seen
      askedAt = now()
    }

    seen = made
  }

  /**
   * Lo que queda en la hora según la última respuesta de 42.
   *
   * Si hace más de una hora que no se pide nada, ese dato ya no vale: la cuota
   * se ha renovado. Sin esto, con todo parado por falta de cuota nadie haría la
   * petición que permite enterarse de que ha vuelto.
   */
  const hourlyRemaining = (): number | undefined =>
    now() - askedAt >= HOUR ? undefined : client.hourlyRemaining()

  /** Lo que se puede gastar hoy, o `null` si no hay tope diario ni mensual. */
  const allowance = (): number | null => {
    const byMonth =
      settings.monthlyRequests === null
        ? Infinity
        : Math.max(0, settings.monthlyRequests - spentBefore) /
          periodOf(now(), settings.renewDay).daysLeft
    const allowed = Math.min(settings.dailyRequests ?? Infinity, byMonth)

    return Number.isFinite(allowed) ? Math.floor(allowed) : null
  }

  /**
   * `true` si ese escalón puede gastar una petición ahora.
   *
   * @param reserve Cuota horaria que tiene que quedar por encima. Por defecto,
   *   la reserva de fondo, o el suelo si es crítico.
   */
  function allows(tier: QuotaTier, reserve?: number): boolean {
    sample()

    if (options.halted?.() === true) {
      return false
    }

    const remaining = hourlyRemaining()
    // Antes de la primera respuesta no se sabe cuánto queda; se asume que sí,
    // porque la propia respuesta lo dirá.
    const hourly =
      remaining === undefined ||
      remaining > (reserve ?? (tier === 'critical' ? CRITICAL_FLOOR : hourlyReserve))

    if (tier === 'critical' || !hourly) {
      return hourly
    }
    if (settings.saving) {
      return false
    }

    const cap = allowance()

    return cap === null || spentToday < cap * DAY_SHARE[tier]
  }

  const level = (): QuotaLevel =>
    !allows('critical') ? 'critical' : allows('deferrable') ? 'ok' : 'tight'

  /** Pone al día los ajustes y lo gastado, y guarda lo que falte. Barato si no toca. */
  async function refresh(force = false): Promise<void> {
    sample()

    if (!force && day === today() && now() - syncedAt < SYNC_EVERY_MS) {
      return
    }

    syncedAt = now()

    if (unsaved > 0) {
      const spent = unsaved

      unsaved = 0
      // Lo contado es del día en que se contó; antes de la primera puesta al día, de hoy.
      await db.execute({
        sql: `INSERT INTO forty_two_stats (day, requests) VALUES (?, ?)
              ON CONFLICT (day) DO UPDATE SET requests = requests + excluded.requests`,
        args: [day === '' ? today() : day, spent],
      })
    }

    const stored = await db.execute("SELECT value FROM settings WHERE key = 'quota42'")

    settings = { ...DEFAULT_QUOTA }

    try {
      const value = stored.rows[0]?.value

      if (typeof value === 'string') {
        settings = merge(DEFAULT_QUOTA, parse(settingsSchema, JSON.parse(value)))
      }
    } catch {
      // Ajustes ilegibles: valen los de fábrica.
    }

    day = today()

    const since = isoAt(periodOf(now(), settings.renewDay).start).slice(0, 10)
    const [mine, before, waiting] = await Promise.all([
      db.execute({ sql: 'SELECT requests FROM forty_two_stats WHERE day = ?', args: [day] }),
      db.execute({
        sql: 'SELECT SUM(requests) AS requests FROM forty_two_stats WHERE day >= ? AND day < ?',
        args: [since, day],
      }),
      db.execute('SELECT COUNT(*) AS total FROM quota_queue WHERE served_at IS NULL'),
    ])

    spentToday = toNumber(mine.rows[0]?.requests ?? 0)
    spentBefore = toNumber(before.rows[0]?.requests ?? 0)
    queued = toNumber(waiting.rows[0]?.total)
  }

  return {
    allows,
    level,
    refresh,

    /** Qué hay que hacer cuando le llega el turno a alguien que esperaba por `task`. */
    register(task: QuotaTask, run: (login: string) => Promise<unknown>): void {
      runners.set(task, run)
    },

    /**
     * Decide si algo aplazable de una persona se puede pedir ya a 42.
     *
     * Si no hay cuota, o hay gente esperando delante, le da turno en la cola y
     * devuelve `false`: quien llama sirve lo último que tenga guardado.
     */
    async defer(login: string, task: QuotaTask): Promise<boolean> {
      // Es su turno: la cola le está atendiendo.
      if (serving === `${login}|${task}`) {
        return true
      }
      if (priority(login)) {
        return allows('critical')
      }
      if (queued === 0 && allows('deferrable')) {
        return true
      }

      const added = await db.execute({
        sql: `INSERT INTO quota_queue (login, task, created_at)
              SELECT ?1, ?2, ?3 WHERE NOT EXISTS (
                SELECT 1 FROM quota_queue WHERE login = ?1 AND task = ?2 AND served_at IS NULL
              )`,
        args: [login, task, isoAt(now())],
      })

      queued += added.rowsAffected

      return false
    },

    /**
     * Atiende la cola por orden de llegada mientras haya cuota para lo
     * aplazable. La lanza un trabajo periódico.
     *
     * @returns Cuántos turnos ha atendido en esta pasada.
     */
    async drain(max = DRAIN_BATCH): Promise<number> {
      await refresh()

      let served = 0

      while (served < max && allows('deferrable')) {
        const next = (
          await db.execute(
            'SELECT id, login, task FROM quota_queue WHERE served_at IS NULL ORDER BY id LIMIT 1',
          )
        ).rows[0]

        if (next === undefined) {
          break
        }

        const login = toText(next.login)
        const task = toText(next.task) as QuotaTask

        serving = `${login}|${task}`

        try {
          await runners.get(task)?.(login)
        } catch (error) {
          // Un turno que falla no bloquea a los de detrás: se da por atendido.
          log(
            `cola de 42: ${task} de ${login}: ${error instanceof Error ? error.message : 'fallo'}`,
          )
        } finally {
          serving = null
        }

        await db.execute({
          sql: 'UPDATE quota_queue SET served_at = ? WHERE id = ?',
          args: [isoAt(now()), toNumber(next.id)],
        })
        queued = Math.max(0, queued - 1)
        served += 1
      }

      await db.execute({
        sql: 'DELETE FROM quota_queue WHERE served_at IS NOT NULL AND served_at < ?',
        args: [isoAt(now() - KEEP_SERVED_MS)],
      })

      return served
    },

    /** Lo que ve cada estudiante: si la cuota va justa y, si espera, su turno. */
    async statusFor(login: string): Promise<QuotaStatus> {
      await refresh()

      const mine = (
        await db.execute({
          sql: `SELECT id, created_at FROM quota_queue
                WHERE login = ? AND served_at IS NULL ORDER BY id LIMIT 1`,
          args: [login],
        })
      ).rows[0]

      if (mine === undefined) {
        return { level: level(), ticket: null }
      }

      const id = toNumber(mine.id)
      const [ahead, last] = await Promise.all([
        db.execute({
          sql: 'SELECT COUNT(*) AS total FROM quota_queue WHERE served_at IS NULL AND id < ?',
          args: [id],
        }),
        db.execute('SELECT MAX(id) AS id FROM quota_queue WHERE served_at IS NOT NULL'),
      ])
      const before = toNumber(ahead.rows[0]?.total)
      const served = last.rows[0]?.id
      // Lo que tarda la cola en llegar hasta aquí una vez que anda.
      const inQueue = Math.ceil(((Math.floor(before / DRAIN_BATCH) + 1) * DRAIN_EVERY_MS) / MINUTE)
      let wait: number | null = 0

      if (!allows('deferrable')) {
        const remaining = hourlyRemaining()

        if (settings.saving) {
          // El modo ahorro se quita a mano: no hay forma de saber cuándo.
          wait = null
        } else if (remaining !== undefined && remaining <= hourlyReserve) {
          // La cuota horaria vuelve al empezar la hora siguiente.
          wait = Math.ceil((HOUR - (now() % HOUR)) / MINUTE)
        } else {
          // Manda el tope del día: hasta mañana.
          wait = Math.ceil((DAY - (now() % DAY)) / MINUTE)
        }
      }

      return {
        level: level(),
        ticket: {
          number: ticketNumber(id),
          serving: served === null || served === undefined ? null : ticketNumber(toNumber(served)),
          ahead: before,
          etaMinutes: wait === null ? null : wait + inQueue,
          since: toText(mine.created_at),
        },
      }
    },

    /** Cómo va la cuota, para el panel. */
    async status(): Promise<FortyTwoQuota> {
      await refresh()

      const period = periodOf(now(), settings.renewDay)

      return {
        settings,
        level: level(),
        hourlyRemaining: hourlyRemaining() ?? null,
        day: { spent: spentToday, allowance: allowance() },
        month: {
          spent: spentBefore + spentToday,
          daysLeft: period.daysLeft,
          renewsOn: isoAt(period.end).slice(0, 10),
        },
        queued,
      }
    },

    /** Cambia los ajustes. Solo hace falta mandar lo que cambia. */
    async configure(input: unknown, by: string): Promise<FortyTwoQuota> {
      await refresh()

      const next = merge(settings, parse(settingsSchema, input))

      await db.execute({
        sql: `INSERT OR REPLACE INTO settings (key, value, updated_by, updated_at)
              VALUES ('quota42', ?, ?, ?)`,
        args: [JSON.stringify(next), by, isoAt(now())],
      })
      await refresh(true)

      return this.status()
    },
  }
}

export type Quota = ReturnType<typeof createQuota>

/** Lo que necesita de la cuota quien solo quiere saber si puede gastar. */
export type QuotaGate = Pick<Quota, 'allows' | 'defer'>

/**
 * Una cuota que solo mira lo que queda en la hora, sin topes ni cola. Es lo que
 * usa quien se monta sin base de datos (los tests de una sola pieza).
 */
export function hourlyQuota(
  client: Pick<FortyTwoClient, 'hourlyRemaining'>,
  hourlyReserve: number,
): QuotaGate {
  const allows = (tier: QuotaTier, reserve?: number): boolean => {
    const remaining = client.hourlyRemaining()

    return (
      remaining === undefined ||
      remaining > (reserve ?? (tier === 'critical' ? CRITICAL_FLOOR : hourlyReserve))
    )
  }

  return { allows, defer: () => Promise.resolve(allows('deferrable')) }
}

/** Los ajustes con lo que traiga `patch` encima; lo que no venga se queda como estaba. */
function merge(
  base: FortyTwoQuotaSettings,
  patch: z.infer<typeof settingsSchema>,
): FortyTwoQuotaSettings {
  return {
    ...base,
    ...(Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<FortyTwoQuotaSettings>),
  }
}
