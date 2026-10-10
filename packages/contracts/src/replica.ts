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
