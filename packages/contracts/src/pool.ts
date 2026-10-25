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
  | 'shellcourse'
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
  | 'red.seats'
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

/** El grupo de una persona: estudiante o piscinero (`docs/piscineros.md`). */
export type PersonGroup = 'student' | 'pool'

/**
 * Una persona oculta (`GET /admin/hidden`, `docs/personas-ocultas.md`): para
 * el grupo del que se oculta no existe en ningún sitio de la web.
 */
export type HiddenPerson = {
  login: string
  image: string | null
  /** Su grupo, si se la conoce (`null`: no está en la réplica ni en la piscina). */
  group: PersonGroup | null
  /** Si no la ven los estudiantes. */
  fromStudents: boolean
  /** Si no la ven los piscineros. */
  fromPool: boolean
  /** Por qué, si se dijo. Solo lo lee quien administra. */
  reason: string | null
  /** Quién la ocultó y cuándo. */
  by: string
  at: string
}

/** Cuerpo de `PUT /admin/hidden/:login`: de qué grupos se oculta (al menos uno). */
export type HiddenPersonInput = {
  fromStudents: boolean
  fromPool: boolean
  reason?: string
}

/** `GET /admin/hidden/search?q=`: gente de cualquier grupo, para elegir a quién ocultar. */
export type HiddenCandidate = {
  login: string
  name: string | null
  image: string | null
  group: PersonGroup
}
