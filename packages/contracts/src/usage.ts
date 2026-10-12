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
  /** Los grupos, en el orden de las columnas, con cuánta gente tiene cada uno. */
  groups: { id: string; people: number }[]
  /** Un elemento por fila; `counts[i]` son los usos del grupo `groups[i]`. */
  rows: { key: string; counts: number[] }[]
}
