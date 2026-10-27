/** Cada elemento de `GET /campuses`. */
export type CampusSummary = {
  id: number
  name: string
  city: string | null
  country: string | null
  /** `true` si ese campus se copia en segundo plano y sus listas son inmediatas. */
  tracked: boolean
}

/** Fases de la copia inicial de un campus. */
export type BackfillPhase = 'in_progress' | 'all' | 'done'

/** `GET /sync/status`: cómo va la réplica de 42. */
export type SyncStatus = {
  /** `true` si el bucle de fondo está andando en este proceso. */
  running: boolean
  /** Peticiones a 42 que quedan esta hora, o `null` si aún no se ha hecho ninguna. */
  hourlyRemaining: number | null
  /** Peticiones hechas por este proceso desde que arrancó. */
  requests: number
  replica: { users: number; projectUsers: number; projects: number; present: number }
  campuses: {
    id: number
    /** Última foto de puestos, en ISO-8601. */
    locationsAt: string | null
    present: number
    deltaAt: string | null
    backfill: { phase: BackfillPhase; rows: number; total: number | null }
  }[]
}

/**
 * Cómo anda la cuota de la API de 42.
 *
 * - `ok`: todo se pide con normalidad.
 * - `tight`: va justa. Solo pasa lo crítico (entrar, ver quién puede ayudarte y
 *   dónde está); lo demás se sirve con lo último guardado y espera turno.
 * - `critical`: casi agotada. No se pide nada: se sirve lo que hay.
 */
export type QuotaLevel = 'ok' | 'tight' | 'critical'

/** El turno de alguien en la cola de la cuota de 42, como un tique de sala de espera. */
export type QuotaTicket = {
  /** El número del turno: `A-042`. */
  number: string
  /** El último turno atendido, o `null` si aún no se ha atendido ninguno. */
  serving: string | null
  /** Turnos que hay delante. */
  ahead: number
  /** Minutos que se calcula que faltan, o `null` si no se puede saber. */
  etaMinutes: number | null
  /** Desde cuándo espera (ISO-8601). */
  since: string
}

/** `GET /quota`: si la cuota de 42 va justa y, si te toca esperar, tu turno. */
export type QuotaStatus = {
  level: QuotaLevel
  ticket: QuotaTicket | null
}

/** Los ajustes de la cuota de 42, que se cambian desde el panel. */
export type FortyTwoQuotaSettings = {
  /** Modo ahorro: mientras esté puesto, solo pasa lo crítico. */
  saving: boolean
}

/**
 * La cuota de 42, para el panel. 42 no tiene topes diarios ni mensuales: da
 * `hourlyLimit` peticiones que vuelven enteras a cada hora en punto (UTC) y
 * `secondlyLimit` por segundo.
 */
export type FortyTwoQuota = {
  settings: FortyTwoQuotaSettings
  level: QuotaLevel
  /** Peticiones que quedan esta hora según 42, o `null` si aún no se ha hecho ninguna. */
  hourlyRemaining: number | null
  /** Las que da 42 cada hora (1 200). */
  hourlyLimit: number
  /** Las que deja 42 por segundo (2). */
  secondlyLimit: number
  /** Lo gastado hoy (UTC), solo para mirar: no hay tope del día. */
  day: { spent: number }
  /** Personas esperando turno. */
  queued: number
  /** El ritmo de la copia según la hora (`docs/architecture.md`, «Réplica de 42»). */
  budget: QuotaBudget
}

/**
 * Los topes por hora de la cuota de 42 (`docs/consumo-api.md`). Un tope es
 * cuántas peticiones a 42 puede provocar en una hora (en punto, UTC); al
 * llegar, lo que pediría a 42 se sirve con lo guardado o falla con 503.
 */
export type ApiUsageLimits = {
  /** Lo que puede provocar cada persona en una hora, o `null` sin tope. */
  perPerson: number | null
  /** Topes de una persona concreta, que mandan sobre `perPerson`. */
  people: Record<string, number>
  /** Topes de una función (todas las personas juntas). */
  features: Record<string, number>
}

/** `PUT /admin/api-usage/limits`: solo lo que cambia; `null` quita el tope. */
export type ApiUsageLimitsChange = {
  perPerson?: number | null
  person?: { login: string; cap: number | null }
  feature?: { key: string; cap: number | null }
}

/**
 * `GET /admin/api-usage?hours=&feature=&login=`: a qué se van las peticiones a
 * 42. Una función es la sección de la web que las provoca (`network`,
 * `boards`…) o un trabajo de fondo (`sync:*`, `job:*`, `queue:*`).
 */
export type ApiUsage = {
  hours: number
  /** La hora en curso: lo gastado según lo contado aquí y cuándo vuelve la cuota. */
  hour: { start: string; spent: number; resetsAt: string }
  /** Peticiones por hora y función (o por persona, si se filtra por una función). */
  series: { hour: string; key: string; requests: number }[]
  /** Por función, de más a menos, con lo filtrado por persona si lo hay. */
  features: { key: string; requests: number; people: number; thisHour: number }[]
  /** Por persona, de más a menos, con lo filtrado por función si lo hay. */
  people: {
    login: string
    requests: number
    thisHour: number
    /** La función que más gasta. */
    top: string
    /** Su tope por hora, propio o el general, o `null` sin tope. */
    cap: number | null
  }[]
  /** Lo que no es de nadie (trabajo de fondo) dentro de lo filtrado. */
  background: number
  limits: ApiUsageLimits
}

/**
 * Cómo se reparte la cuota horaria ahora mismo:
 *
 * - `day`: de día, el trabajo de fondo no baja de la reserva.
 * - `night`: de madrugada y sin nadie en la web, la copia gasta casi todo.
 * - `spend`: en los últimos minutos de la hora, la copia gasta lo que sobra.
 */
export type BudgetMode = 'day' | 'night' | 'spend'

export type QuotaBudget = {
  mode: BudgetMode
  /** Desde cuándo está en este modo (ISO-8601). */
  since: string
  /** Hasta dónde puede bajar ahora la copia lo que queda en la hora. */
  bulkReserve: number
  /** Cuándo vuelve la cuota horaria (ISO-8601). */
  resetsAt: string
  /** La franja de la noche (`02:00-06:00`), o `null` si no hay. */
  nightWindow: string | null
  /** Zona horaria de la franja. */
  timeZone: string
  /** La última vez que se vio volver la cuota: cuándo y de cuánto a cuánto. */
  lastReset: { at: string; from: number; to: number } | null
}
