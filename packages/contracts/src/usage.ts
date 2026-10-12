/**
 * Uso de la web. Las claves son `<página>.<elemento>` (`nav.tablon`,
 * `expediente.health`).
 */

/** `GET /usage`: usos de cada elemento sumando a toda la comunidad. */
export type UsageCounts = {
  counts: Record<string, number>
}

/** `POST /usage`: lo que has usado desde el último envío. */
export type UsageSend = {
  counts: Record<string, number>
  /**
   * Segundos pasados en cada sección (`nav.tablon`) desde el último envío:
   * `[viéndola, abierta detrás de otra ventana, con la pestaña oculta]`.
   */
  time?: Record<string, [seen: number, back: number, hidden: number]>
  /**
   * Pasos de una sección a otra desde el último envío: `"tablon>red": 2`. Al
   * entrar en la web, el primero viene de `start`.
   */
  flows?: Record<string, number>
}

/**
 * El tramo de gente que cubre una respuesta, por lo activa que es: del `low` %
 * al `high` %, de la menos a la más activa. Del 0 al 100 es todo el mundo. Sirve
 * para dejar fuera a quien más usa la web, a quien menos, o a los dos.
 */
export type Segment = {
  low: number
  high: number
  /** Cuántas personas entran en el tramo, y de cuántas. */
  people: number
  of: number
}

/** Lo que se mide de un tramo: pulsaciones, tiempo y tráfico con la API. */
export type StatTotals = {
  clicks: number
  /** Segundos con la ventana a la vista y con el foco. */
  seen: number
  /** Segundos con la web visible pero el foco en otra ventana. */
  back: number
  /** Segundos con la pestaña oculta o la ventana minimizada. */
  hidden: number
  /** Peticiones a la API de Sanatorio y los bytes que han ocupado. */
  requests: number
  bytes: number
}

/**
 * `GET /admin/stats?from=&to=&login=`: estadísticas de uso de un periodo, de
 * toda la web o de una persona. Solo admins.
 */
export type UsageStats = {
  /** Primer y último día (`YYYY-MM-DD`, UTC), los dos incluidos. */
  from: string
  to: string
  /** De quién son; `null` si son las de todo el mundo. */
  login: string | null
  /** El tramo de gente, por el tiempo que ha pasado mirando la web en el periodo. */
  segment: Segment
  totals: StatTotals & { people: number }
  /** Una fila por hora con actividad. El día y la hora van en UTC. */
  hours: ({ day: string; hour: number; people: number } & StatTotals)[]
  /** Una fila por elemento: las secciones llevan tiempo; los bloques, solo pulsaciones. */
  keys: {
    key: string
    clicks: number
    seen: number
    back: number
    hidden: number
    people: number
  }[]
  /** Una fila por persona, la que más tiempo la ha visto primero. Vacío si se pide una. */
  users: ({ login: string } & StatTotals)[]
}

/** `GET /usage/heatmap?by=`: uso de cada elemento por grupo de personas. Solo admins. */
export type UsageHeatmap = {
  by: 'total' | 'activity' | 'track' | 'cohort'
  /** El tramo de gente, por sus usos de siempre. */
  segment: Segment
  /** Los grupos, en el orden de las columnas, con cuánta gente tiene cada uno. */
  groups: { id: string; people: number }[]
  /** Un elemento por fila; `counts[i]` son los usos del grupo `groups[i]`. */
  rows: { key: string; counts: number[] }[]
}

/**
 * `GET /admin/flows?from=&to=&login=`: cómo se navega por la web en un periodo,
 * de todo el mundo o de una persona. Solo admins.
 */
export type UsageFlows = {
  from: string
  to: string
  login: string | null
  /** El tramo de gente, por el tiempo que ha pasado mirando la web en el periodo. */
  segment: Segment
  /** Veces que se ha entrado en la web. */
  sessions: number
  /** Una fila por sección, la más visitada primero. */
  sections: {
    /** La sección, sin el `nav.` (`tablon`). */
    key: string
    /** Veces que se ha llegado, desde otra sección o al entrar. */
    visits: number
    /** Las que fueron lo primero que se abrió. */
    entries: number
    /** Las que no siguieron a otra sección: ahí se acabó la visita a la web. */
    exits: number
    /** Las que sí siguieron a otra. */
    onward: number
    /** Segundos mirándola, en total y por visita. */
    seen: number
    avgSeen: number
    /** Parte de las visitas que acaban ahí, de 0 a 1. */
    exitRate: number
    /**
     * Qué papel hace: `pass`, de paso (poco rato y se sigue); `end`, final de
     * trayecto (casi siempre lo último); `stay`, de estancia (ahí se pasa el
     * rato). `null` si no destaca o hay pocas visitas.
     */
    role: 'pass' | 'end' | 'stay' | null
  }[]
  /** Los pasos, el más repetido primero. `from` vale `start` al entrar. */
  flows: { from: string; to: string; count: number; people: number }[]
}

/** `GET /admin/online`: quién tiene la web abierta ahora. Solo admins. */
export type OnlineUsers = {
  /** La hora de la API, para contar cuánto lleva cada sesión. */
  now: string
  people: {
    login: string
    image: string | null
    /** Cuándo empezó la sesión en curso, y su última señal de vida. */
    since: string
    seenAt: string
  }[]
}
