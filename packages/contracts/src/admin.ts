/**
 * Administración de la web y el buzón de la gente (incidencias, sugerencias y
 * denuncias).
 */

/** `issue`: algo no va · `idea`: una mejora · `report`: denuncia de un contenido. */
export type TicketKind = 'issue' | 'idea' | 'report'

export type TicketStatus = 'open' | 'answered' | 'closed'

/**
 * De qué va un mensaje del buzón, lo elige quien escribe. Pocas opciones a
 * propósito: un fallo, una mejora de algo que ya hay, una idea nueva, un texto
 * mal traducido u otra cosa.
 */
export type TicketCategory = 'bug' | 'improvement' | 'idea' | 'translation' | 'other'

/** Por qué se denuncia algo. Con `other` hay que explicarlo. */
export type ReportReason = 'spam' | 'harassment' | 'insults' | 'other'

export type Ticket = {
  id: number
  login: string
  kind: TicketKind
  subject: string
  body: string
  /** De qué va una denuncia: `message:12`, `board:3`, `doubt:5`. `null` en el resto. */
  target: string | null
  /** Qué tipo de mensaje es, o `null` en los de antes de que se pudiera elegir y en las denuncias. */
  category: TicketCategory | null
  /** Sección de la web de la que va (`tablon`, `red`…), o `null` si no se dijo. */
  section: string | null
  /** El motivo de una denuncia, o `null` (no es denuncia, o es de antes de que se pudiera elegir). */
  reason: ReportReason | null
  status: TicketStatus
  /** Lo que respondió quien administra, o `null` si aún no. */
  answer: string | null
  answeredBy: string | null
  createdAt: string
  answeredAt: string | null
  /**
   * Hasta cuándo puede retirarlo quien lo escribió (ISO-8601): un rato después
   * de mandarlo y mientras nadie lo haya respondido. `null` si ya no se puede.
   */
  withdrawUntil: string | null
}

/** `POST /tickets`. */
export type TicketInput = {
  kind: TicketKind
  /** Si no se da, se saca del principio del mensaje. */
  subject?: string
  body: string
  target?: string
  category?: TicketCategory
  section?: string
  /** Solo en denuncias. Con un motivo que no sea `other`, el texto puede ir vacío. */
  reason?: ReportReason
}

/** Peticiones de una hora concreta. */
export type UsageHour = {
  /** Día (`YYYY-MM-DD`) y hora (0-23), en UTC. */
  day: string
  hour: number
  requests: number
  bytes: number
  /** Personas distintas que usaron la web esa hora. */
  people: number
}

/** Los ajustes del presupuesto de peticiones, que se cambian desde el panel. */
export type BudgetSettings = {
  /** Peticiones que la web se permite servir en un día, como mucho. */
  dailyRequests: number
  /** Bytes de salida al mes (el límite del alojamiento), o `null` si no hay. */
  monthlyBytes: number | null
  /** Día del mes (1-28) en que se renueva el límite mensual. */
  renewDay: number
  /** Colchón: la parte del tope diario que se gasta como mucho (0,5 a 1). */
  share: number
  /** El tope por persona y hora nunca baja ni sube de aquí. */
  minPerPerson: number
  maxPerPerson: number
  /** Modo ahorro: lo baja todo de golpe mientras esté puesto. */
  saving: boolean
}

/**
 * En qué punto está el servicio respecto al límite mensual del plan:
 *
 * - `ok`: normal.
 * - `admin_only`: se ha llegado al 90 %. Solo entra quien administra y no corre
 *   ningún trabajo de fondo.
 * - `stopped`: se ha llegado al 95 %. No entra nadie; solo queda el SSH.
 */
export type LimitLevel = 'ok' | 'admin_only' | 'stopped'

/** Cómo va el presupuesto de peticiones ahora mismo. Días y horas en UTC. */
export type BudgetStatus = {
  settings: BudgetSettings
  /** Si el servicio está cortado por el límite mensual. No se regula: vuelve solo al renovarse. */
  level: LimitLevel
  day: {
    /** Lo que se puede servir hoy, ya con el colchón. */
    allowance: number
    used: number
    left: number
    /** Con cuántas peticiones acabaría el día al ritmo que lleva. */
    forecast: number
    /** Qué manda hoy: el tope diario o lo que queda del mes. */
    limitedBy: 'day' | 'month'
  }
  month: {
    bytesUsed: number
    /** Bytes a partir de los que solo entra quien administra (el 90 % del límite), o `null` si no hay límite. */
    stopAt: number | null
    /** Bytes a partir de los que no entra nadie (el 95 %). */
    hardStopAt: number | null
    /** Lo que queda hasta el corte, o `null` si no hay límite mensual. */
    bytesLeft: number | null
    /** Días que quedan hasta que se renueve, contando hoy. */
    daysLeft: number
    /** Día en que se renueva (`YYYY-MM-DD`). */
    renewsOn: string
  }
}

/** `GET /admin/consumption`: cuánto se usa la web y cómo de cerca está de sus límites. */
export type Consumption = {
  budget: BudgetStatus
  limit: {
    /** Peticiones de esta hora que se reparten entre quienes están usando la web. */
    budget: number
    /** Personas activas en la última hora. */
    activePeople: number
    /** Tope automático por persona y hora ahora mismo. */
    perPerson: number
    /** Peticiones a la API de 42 que quedan esta hora, o `null` si no se sabe. */
    fortyTwoRemaining: number | null
  }
  /** Las últimas 48 horas, de la más antigua a la más reciente. */
  recent: UsageHour[]
  /**
   * Media de peticiones por hora para cada día de la semana y hora (UTC), con
   * los últimos 28 días. `weekday`: 0 es domingo.
   */
  pattern: { weekday: number; hour: number; requests: number }[]
  /** Tramos en los que la media supera el 80 % del presupuesto. */
  warnings: { weekday: number; hour: number; requests: number; share: number }[]
  /** Quién más ha consumido en las últimas 24 horas. */
  top: {
    login: string
    requests: number
    bytes: number
    /** Peticiones que se le rechazaron por pasarse del tope. */
    limited: number
    /** Tope puesto a mano, o `null` si lleva el automático. */
    manualLimit: number | null
  }[]
}

/** `GET /admin/people`: permisos, bloqueos y topes a mano. */
export type AdminPeople = {
  admins: { login: string; fixed: boolean; grantedBy: string | null }[]
  blocks: { login: string; reason: string; until: string | null; blockedBy: string }[]
  limits: { login: string; perHour: number }[]
}

/** Un mensaje del chat de un evento, para revisarlo. */
export type LoggedMessage = {
  id: number
  eventId: string
  login: string
  kind: string
  body: string | null
  at: string
}

/** `GET /admin/data`: los tipos de dato que se pueden borrar a mano y cuántas filas tiene cada uno. */
export type AdminData = {
  kinds: { id: string; rows: number }[]
}

/**
 * Cuerpo de `POST /admin/data/count` y `/admin/data/delete`: qué filas. Sin
 * `login` son las de todo el mundo; sin fechas, todas. Los días van como
 * `YYYY-MM-DD`, en UTC.
 */
export type DataWipe = {
  kind: string
  login?: string
  /** Solo lo anterior a ese día. */
  before?: string
  /** Solo lo de ese día en adelante. */
  from?: string
}

/**
 * `POST /admin/data/preview`: lo que se borraría. Cuántas filas son y una
 * muestra de las más recientes (50 como mucho), con los textos largos recortados.
 */
export type DataPreview = {
  rows: number
  /** Los nombres de las columnas de la muestra. */
  columns: string[]
  /** Una fila por elemento, con sus valores en el orden de `columns`. */
  sample: (string | number | null)[][]
}

/** `GET /admin/totp`: el segundo factor del panel de quien pregunta. */
export type SecondFactorStatus = {
  /** `true` si ya se dio de alta (con un código confirmado). */
  enrolled: boolean
  /** Hasta cuándo está abierto el panel en este navegador (ISO-8601), o `null`. */
  elevatedUntil: string | null
}

/** `GET /me/legal`: la versión vigente de la privacidad y las condiciones, y si la aceptaste. */
export type LegalStatus = {
  /** Versión vigente (una fecha, `2026-10-16`). Cambia cuando cambia el texto. */
  version: string
  /** Cuándo aceptaste esa versión (ISO-8601), o `null` si aún no. */
  acceptedAt: string | null
}

/** Una tabla de `GET /me/export`. */
export type PersonalExportTable = {
  /** De dónde salen las filas: copiadas de la API de 42 (`42`) o hechas aquí (`sanatorio`). */
  source: '42' | 'sanatorio'
  /** `true` si la tabla tenía más filas que el tope (5 000) y faltan las demás. */
  truncated: boolean
  /** Las filas, ya recortadas a lo de la persona y sin secretos. */
  rows: Record<string, unknown>[]
}

/** `GET /me/export`: todo lo que Sanatorio 42 guarda de quien lo pide, tabla a tabla. */
export type PersonalExport = {
  login: string
  /** Cuándo se hizo la descarga (ISO-8601). */
  exportedAt: string
  /** Versión de la privacidad y condiciones vigente al descargar. */
  legalVersion: string
  tables: Record<string, PersonalExportTable>
}

/**
 * `GET /admin/growth?from=&to=&campus=22,58`: uso por campus y crecimiento
 * (#71 del buzón). Sin `campus`, todos. Días en UTC.
 */
export type AdminGrowth = {
  from: string
  to: string
  /** Los campus con gente en Sanatorio, para elegir. */
  campuses: { id: number; name: string; people: number }[]
  /** Los que se han pedido (todos si no se pidió ninguno). */
  selected: number[]
  /** Por día y campus: quién usó la web y quién entró por primera vez. Solo días con algo. */
  days: { day: string; campusId: number; active: number; newUsers: number }[]
  /** Cuánta gente había ya en cada campus antes de `from`, para sumar el total. */
  before: { campusId: number; people: number }[]
}
