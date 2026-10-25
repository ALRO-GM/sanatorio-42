/**
 * Lo que puede ver un piscinero (`docs/piscineros.md`): cada pestaña, sus
 * elementos (`pestaña.elemento`) y lo que no es una pestaña. Un elemento solo
 * vale si su pestaña también está permitida. La API (`modules/pool/pool.keys.ts`)
 * y la web (`shared/pool.ts`) tienen cada una su tabla con todas las claves.
 */
export type PoolKey =
  // Expediente
  | 'expediente'
  | 'expediente.health'
  | 'expediente.hours'
  | 'expediente.network'
  | 'expediente.achievements'
  | 'expediente.ranking'
  // Ayuda
  | 'consulta'
  | 'consulta.map'
  | 'guardia'
  | 'tablon'
  | 'tablon.graph'
  | 'tablon.corrections'
  | 'terapia'
  | 'pizarras'
  | 'notgames'
  | 'notgames.chess'
  | 'notgames.review'
  | 'gitcourse'
  | 'gitcourse.groups'
  | 'estadisticas'
  // Calendario
  | 'calendario'
  // Clústeres
  | 'clusters'
  | 'clusters.online'
  | 'clusters.broken'
  | 'clusters.report'
  // Datos
  | 'red'
  | 'red.rankings'
  | 'avance'
  | 'avance.compare'
  | 'examenes'
  | 'examenes.live'
  | 'examenes.stats'
  // Lo que no es una pestaña
  | 'clicker'
  | 'focus'
  | 'focus.stats'
  | 'mailbox'
  | 'people'
  | 'broadcasts'
  | 'tickets'

/** Los ajustes de la piscina, del panel (`GET` y `PUT /admin/pool`). */
export type PoolSettings = {
  /** Si los piscineros de una piscina en curso pueden entrar. */
  open: boolean
  /** Lo que ve un piscinero al volver de 42 con la piscina cerrada. Vacío: el de fábrica. */
  message: string
  /** Lo que puede ver un piscinero. */
  allow: PoolKey[]
}

/** `GET /pool/notice`, sin sesión: el aviso de la piscina cerrada para la portada. */
export type PoolNotice = { message: string }

/**
 * `GET /pool/access`: si quien pregunta es piscinero y, si lo es, qué puede
 * ver. Un estudiante lo ve todo (`allow: null`).
 */
export type PoolAccess = {
  pool: boolean
  allow: PoolKey[] | null
  /** `true` si es quien administra, en la vista de piscinero (`POST /admin/pool/preview`). */
  preview?: boolean
}
