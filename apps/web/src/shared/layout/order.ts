/**
 * En qué orden se pinta una lista de elementos (pestañas, bloques de una página).
 */

/** `manual`: el que ha puesto la persona · `mine`: lo que más usa ella · `community`: lo que más usa todo el mundo. */
export type OrderMode = 'manual' | 'mine' | 'community'

/**
 * Ordena `defaults` según el modo.
 *
 * - `manual`: el orden guardado. Lo que no esté en él (un bloque nuevo) va al
 *   final, en su orden de fábrica; lo que ya no exista se ignora.
 * - `mine` / `community`: por usos, de más a menos. A igualdad (o sin datos),
 *   se respeta el orden de fábrica, así que sin usos no cambia nada.
 *
 * @param saved  Orden guardado por la persona.
 * @param counts Usos de cada elemento, con la clave que dé `keyOf`.
 */
export function arrange(
  defaults: readonly string[],
  saved: readonly string[],
  mode: OrderMode,
  counts: Readonly<Record<string, number>>,
  keyOf: (id: string) => string,
): string[] {
  if (mode === 'manual') {
    const known = saved.filter((id) => defaults.includes(id))

    return [...known, ...defaults.filter((id) => !known.includes(id))]
  }

  return defaults
    .map((id, index) => ({ id, index, uses: counts[keyOf(id)] ?? 0 }))
    .sort((a, b) => b.uses - a.uses || a.index - b.index)
    .map((entry) => entry.id)
}

/** Mueve un elemento una posición hacia arriba (`-1`) o hacia abajo (`1`). */
export function move(order: readonly string[], id: string, step: -1 | 1): string[] {
  const from = order.indexOf(id)
  const to = from + step

  if (from === -1 || to < 0 || to >= order.length) {
    return [...order]
  }

  const next = [...order]

  next.splice(from, 1)
  next.splice(to, 0, id)

  return next
}
