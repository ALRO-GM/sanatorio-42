/**
 * Los topes del RAG en miniatura. No toca el ordenador de nadie (el corpus son
 * cadenas dentro del paquete: sin `fs`, sin red, sin `eval`, sin modelos), pero
 * lo que llega de la web lo vuelve a ejecutar la API: cada tope de aquí acota
 * cuánto trabajo puede costar un intento. Lo que se sale de un tope se
 * recorta al valor más cercano (un mando) o se descarta (una ejecución mal
 * formada): nada lanza una excepción hacia fuera ni cuelga la pestaña.
 *
 * Los números dejan de sobra para cualquier unidad: el corpus tiene quince
 * documentos y el troceado más fino del curso deja menos de 300 trozos.
 */

export const LIMITS = {
  /** Caracteres de una ejecución (un JSON con los mandos o la respuesta). */
  entry: 600,
  /** Ejecuciones de un intento que la API vuelve a corregir. */
  attemptEntries: 60,
  /** Tamaño de un trozo, en palabras. */
  minSize: 8,
  maxSize: 200,
  /** Trozos que caben en el índice (con un troceado más fino se corta ahí). */
  chunks: 600,
  /** Cuántos resultados se piden como mucho. */
  maxK: 10,
  /** Candidatos de cada buscador que entran en la fusión. */
  candidates: 20,
  /** Hasta dónde lee el reordenado. */
  maxDepth: 20,
  /** Presupuesto del prompt, en tokens. */
  minBudget: 40,
  maxBudget: 600,
  /** Valores que se escriben a mano en una ejecución (cálculos, elecciones). */
  values: 12,
  /** Caracteres de un identificador de una ejecución (un trozo, una opción). */
  id: 80,
  /** Índices que se guardan a la vez en memoria (los más viejos se van). */
  cache: 24,
} as const

/** Deja un número dentro de sus topes; lo que no es un número finito, en el mínimo. */
export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}
