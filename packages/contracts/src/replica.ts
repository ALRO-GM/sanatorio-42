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
  /** Peticiones a 42 que se permiten al día, o `null` si solo cuenta la cuota horaria. */
  dailyRequests: number | null
  /** Tope mensual de la aplicación en 42, o `null` si no tiene o no se sabe. */
  monthlyRequests: number | null
  /** Día del mes (1-28) en que se renueva el tope mensual. */
  renewDay: number
  /** Modo ahorro: mientras esté puesto, solo pasa lo crítico. */
  saving: boolean
}

/** La cuota de 42, para el panel. Días en UTC. */
export type FortyTwoQuota = {
  settings: FortyTwoQuotaSettings
  level: QuotaLevel
  /** Peticiones que quedan esta hora según 42, o `null` si aún no se ha hecho ninguna. */
  hourlyRemaining: number | null
  day: {
    spent: number
    /** Lo que se puede gastar hoy, o `null` si no hay tope diario ni mensual. */
    allowance: number | null
  }
  month: { spent: number; daysLeft: number; renewsOn: string }
  /** Personas esperando turno. */
  queued: number
}
