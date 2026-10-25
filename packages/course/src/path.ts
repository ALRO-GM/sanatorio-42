/**
 * El camino de un curso: los puntos se abren de uno en uno, en orden (como el
 * camino de Duolingo). Un punto está abierto si es el primero o si el de antes
 * está superado; así cada conocimiento se apoya en el anterior.
 */

export function unlocked(
  ids: readonly string[],
  done: (id: string) => boolean,
  index: number,
): boolean {
  const previous = ids[index - 1]

  return previous === undefined || done(previous)
}

/** El primer punto abierto y sin hacer (el que toca), o -1 si está todo. */
export function firstOpen(ids: readonly string[], done: (id: string) => boolean): number {
  return ids.findIndex((id, index) => unlocked(ids, done, index) && !done(id))
}
