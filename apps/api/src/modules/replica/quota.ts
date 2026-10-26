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
 * Cuánto puede bajar el trabajo de fondo depende de la hora (`budget.ts`): de
 * día respeta la reserva; de noche y en los últimos minutos de cada hora gasta
 * lo que de otro modo se perdería, por orden de prioridad (`allowsBulk`).
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
  BudgetMode,
  FortyTwoQuota,
  FortyTwoQuotaSettings,
  QuotaBudget,
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
import {
  BULK_LEASE_MS,
  BULK_ORDER,
  CRITICAL_FLOOR,
  budgetAt,
  dayOnly,
  windowStart,
} from './budget.js'
import type { Budget, BudgetConfig, BulkJob } from './budget.js'
import { formatWindow } from '../../core/night-window.js'

type QuotaTier = 'background' | 'deferrable' | 'critical'

/** Lo aplazable que es de una persona y por tanto puede esperar turno. */
export type QuotaTask = 'agenda' | 'cursus' | 'track' | 'logtime'

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
  /** Cómo se reparte la cuota según la hora. Sin él, siempre de día (lo de antes). */
  budget?: BudgetConfig
  /** `true` si alguien ha usado la web hace poco: entonces no hay modo noche. */
  isActive?: () => boolean
}

/** Lo que se guarda en `sync_state` para `npm run sync:status`, que es otro proceso. */
export type BudgetState = Omit<QuotaBudget, 'resetsAt'>

/** Clave de `sync_state` con el modo de la cuota. */
export const BUDGET_STATE_KEY = 'budget'

/**
 * Lo que tiene que subir de golpe lo que queda en la hora para dar por hecho
 * que la cuota se ha renovado. Entre dos lecturas seguidas nunca sube sola.
 */
const RESET_JUMP = 100

const MODE_NAMES: Record<BudgetMode, string> = {
  day: 'día',
  night: 'noche',
  spend: 'gastar lo que sobra',
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

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
  const budgetConfig = options.budget ?? dayOnly(hourlyReserve)
  const isActive = options.isActive ?? (() => false)
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
  /** El modo de la última vez que se miró, y desde cuándo. */
  let mode: BudgetMode | null = null
  let modeSince = now()
  /** La hora de cuota en la que hubo noche o gasto final: lo aplazable puede bajar más. */
  let lowWindow = -Infinity
  /** Lo último que dijo 42 que quedaba, para ver cuándo se renueva. */
  let lastReading: number | undefined
  let lastReset: QuotaBudget['lastReset'] = null
  /** Si hay que guardar el modo en `sync_state`. */
  let budgetDirty = false
  /** Cuándo quiso gastar por última vez cada tarea de volumen. */
  const wanting = new Map<BulkJob, number>()

  /**
   * Apunta lo pedido a 42 desde la última vez que se miró, y si lo que queda en
   * la hora ha subido de golpe: la cuota se ha renovado.
   */
  const sample = (): void => {
    const made = client.requestCount()

    if (made > seen) {
      spentToday += made - seen
      unsaved += made - seen
      askedAt = now()
    }

    seen = made

    const reading = client.hourlyRemaining()

    if (reading !== undefined && lastReading !== undefined && reading >= lastReading + RESET_JUMP) {
      lastReset = { at: isoAt(now()), from: lastReading, to: reading }
      budgetDirty = true
      log(`cuota de 42 renovada: quedaban ${lastReading}, ahora ${reading}`)
    }

    lastReading = reading ?? lastReading
  }

  /**
   * Lo que queda en la hora según la última respuesta de 42.
   *
   * Si la última petición es de antes de la hora en punto, ese dato ya no vale:
   * la cuota se ha renovado. Sin esto, con todo parado por falta de cuota nadie
   * haría la petición que permite enterarse de que ha vuelto, y se perderían
   * los primeros minutos de cada hora (antes se esperaba una hora entera desde
   * la última petición).
   */
  const hourlyRemaining = (): number | undefined =>
    askedAt < windowStart(now()) ? undefined : client.hourlyRemaining()

  /** El reparto de ahora. Avisa en el registro cuando cambia de modo. */
  function budget(): Budget {
    const current = budgetAt(budgetConfig, now(), isActive())

    if (current.mode !== mode) {
      log(
        `cuota de 42: modo ${MODE_NAMES[current.mode]}` +
          (current.paced ? '' : `, la copia baja hasta ${current.bulkReserve}`),
      )
      mode = current.mode
      modeSince = now()
      budgetDirty = true
    }
    if (current.mode !== 'day') {
      lowWindow = windowStart(now())
    }

    return current
  }

  /**
   * La reserva de lo aplazable de las personas. Si en esta hora la copia ha
   * bajado de la reserva de día (noche o gasto final) y alguien llega, no se le
   * hace esperar a la hora siguiente: le vale el suelo con margen, que la copia
   * nunca toca porque su rampa va por encima.
   */
  const deferrableReserve = (): number =>
    budget().mode !== 'day' || lowWindow === windowStart(now())
      ? Math.min(hourlyReserve, CRITICAL_FLOOR + budgetConfig.spendMargin)
      : hourlyReserve

  const defaultReserve = (tier: QuotaTier): number =>
    tier === 'critical'
      ? CRITICAL_FLOOR
      : tier === 'deferrable'
        ? deferrableReserve()
        : hourlyReserve

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
    const hourly = remaining === undefined || remaining > (reserve ?? defaultReserve(tier))

    if (tier === 'critical' || !hourly) {
      return hourly
    }
    if (settings.saving) {
      return false
    }

    const cap = allowance()

    return cap === null || spentToday < cap * DAY_SHARE[tier]
  }

  /**
   * `true` si una tarea de volumen puede gastar ahora.
   *
   * De día, lo de siempre: su reserva (`dayReserve`). Fuera del día, la reserva
   * del modo, y por turno: si una tarea de más prioridad ha querido gastar hace
   * menos de `BULK_LEASE_MS`, esta espera. La que termina o falla deja de
   * pedir, y su turno caduca solo.
   */
  function allowsBulk(job: BulkJob, dayReserve: number): boolean {
    const current = budget()

    if (current.paced) {
      return allows('background', dayReserve)
    }
    if (!allows('background', current.bulkReserve)) {
      return false
    }

    const at = now()

    wanting.set(job, at)

    return BULK_ORDER.slice(0, BULK_ORDER.indexOf(job)).every(
      (other) => at - (wanting.get(other) ?? -Infinity) >= BULK_LEASE_MS,
    )
  }

  /**
   * La reserva del mantenimiento (puestos, cambios, novedades). De día, la suya
   * de siempre; fuera del día, como mucho el suelo del modo: la rampa de la
   * copia le deja sitio y no se queda sin turno.
   */
  const upkeep = (dayReserve: number): number => {
    const current = budget()

    return current.paced ? dayReserve : Math.min(dayReserve, current.floor)
  }

  /** `true` si la copia inicial va con su pausa entre peticiones (de día). */
  const paced = (): boolean => budget().paced

  /** Lo que se enseña y se guarda del modo. */
  const budgetState = (): BudgetState => {
    const current = budget()

    return {
      mode: current.mode,
      since: isoAt(modeSince),
      bulkReserve: current.bulkReserve,
      nightWindow: formatWindow(budgetConfig.nightWindow),
      timeZone: budgetConfig.timeZone,
      lastReset,
    }
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

    // El modo vive en memoria; se guarda al cambiar para que lo vea `sync:status`.
    if (budgetDirty) {
      budgetDirty = false
      await db.execute({
        sql: `INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT (key) DO UPDATE SET
                value = excluded.value, updated_at = excluded.updated_at`,
        args: [BUDGET_STATE_KEY, JSON.stringify(budgetState()), isoAt(now())],
      })
    }

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
    allowsBulk,
    upkeep,
    paced,
    budget: budgetState,
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
        } else if (remaining !== undefined && remaining <= deferrableReserve()) {
          // La cuota horaria vuelve al empezar la hora siguiente.
          wait = Math.ceil((windowStart(now()) + HOUR - now()) / MINUTE)
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
        budget: { ...budgetState(), resetsAt: isoAt(windowStart(now()) + HOUR) },
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
export type QuotaGate = Pick<Quota, 'allows' | 'allowsBulk' | 'defer' | 'paced' | 'upkeep'>

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

  // Sin reloj ni base: siempre de día, cada cual con su reserva.
  return {
    allows,
    allowsBulk: (_job: BulkJob, dayReserve: number) => allows('background', dayReserve),
    upkeep: (dayReserve: number) => dayReserve,
    paced: () => true,
    defer: () => Promise.resolve(allows('deferrable')),
  }
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
