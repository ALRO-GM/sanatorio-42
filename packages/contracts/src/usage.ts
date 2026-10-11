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
}

/** `GET /usage/heatmap?by=`: uso de cada elemento por grupo de personas. Solo admins. */
export type UsageHeatmap = {
  by: 'total' | 'activity' | 'track' | 'cohort'
  /** Los grupos, en el orden de las columnas, con cuánta gente tiene cada uno. */
  groups: { id: string; people: number }[]
  /** Un elemento por fila; `counts[i]` son los usos del grupo `groups[i]`. */
  rows: { key: string; counts: number[] }[]
}
