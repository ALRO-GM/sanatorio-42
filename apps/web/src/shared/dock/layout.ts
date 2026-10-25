/**
 * Cómo se colocan las ventanitas ancladas en la esquina (`shared/dock`):
 * cuentas pura, sin DOM, para que se puedan probar sin navegador.
 *
 * La pila sale de la esquina de abajo a la izquierda. Cada ventanita ocupa su
 * hueco y la siguiente va encima, así que nunca se tapan. En una pantalla
 * estrecha, las que caben en la misma fila van una al lado de otra (las
 * plegadas son píldoras pequeñas): una fila compacta en vez de una torre que
 * se come la pantalla.
 */

/** Lo que mide una ventanita, en píxeles. */
export type Size = { width: number; height: number }

/** Una ventanita de la pila: su nombre y lo que mide ahora. */
export type Box = Size & { id: string }

/** Dónde va: `x` desde el borde izquierdo y `y` desde el de abajo, ya con el margen. */
export type Slot = { x: number; y: number }

export type Layout = {
  slots: Record<string, Slot>
  /** Alto de la pila entera, margen incluido: lo que hay que dejar libre abajo. */
  height: number
  /** Ancho de la pila entera, margen incluido. */
  width: number
}

/** Separación entre la pila y el borde de la pantalla. */
export const MARGIN = 16
/** En el móvil, menos: la pantalla es pequeña. */
export const NARROW_MARGIN = 8
/** Separación entre una ventanita y la siguiente. */
export const GAP = 10
/** En el móvil, menos: que quepan más píldoras en la fila. */
export const NARROW_GAP = 6
/** Hasta este ancho, la pantalla es estrecha (la del móvil). */
export const NARROW_MAX = 640

/**
 * Los huecos de la pila, de la esquina hacia fuera en el orden dado.
 *
 * Por filas: una fila acaba cuando la siguiente ventanita ya no cabe al lado.
 * En una pantalla ancha cada ventanita es una fila (una lista de arriba
 * abajo); en una estrecha, la fila mide lo que la pantalla.
 *
 * @param boxes Las ventanitas ancladas que se ven, de la esquina hacia fuera.
 * @param viewport Lo que mide la ventana del navegador.
 */
export function stack(boxes: Box[], viewport: Size): Layout {
  const narrow = viewport.width <= NARROW_MAX
  const margin = narrow ? NARROW_MARGIN : MARGIN
  const gap = narrow ? NARROW_GAP : GAP
  // En ancho, una por fila: así es una lista y el orden se lee de un vistazo.
  const room = narrow ? viewport.width - 2 * margin : 0
  const slots: Record<string, Slot> = {}
  let rowBottom = margin
  let rowHeight = 0
  let x = margin
  let width = 0

  for (const box of boxes) {
    const fits = rowHeight > 0 && x - margin + box.width <= room

    if (!fits && rowHeight > 0) {
      rowBottom += rowHeight + gap
      rowHeight = 0
      x = margin
    }

    slots[box.id] = { x, y: rowBottom }
    x += box.width + gap
    rowHeight = Math.max(rowHeight, box.height)
    width = Math.max(width, x - gap + margin)
  }

  return { slots, height: rowHeight === 0 ? 0 : rowBottom + rowHeight + margin, width }
}

/**
 * En qué posición de la pila caería una ventanita que se arrastra: la del
 * hueco más cercano a donde está ahora. `null` si está lejos de todos (se
 * suelta flotando, fuera de la esquina).
 *
 * @param others Las demás ventanitas ancladas, de la esquina hacia fuera.
 * @param moving La que se arrastra.
 * @param at Dónde está ahora su esquina de arriba a la izquierda, contando desde arriba.
 * @param reach Hasta qué distancia de un hueco se considera dentro de la pila.
 */
export function dropIndex(
  others: Box[],
  moving: Box,
  at: { left: number; top: number },
  viewport: Size,
  reach = 120,
): number | null {
  let best: { index: number; distance: number } | null = null

  for (let index = 0; index <= others.length; index += 1) {
    const order = [...others.slice(0, index), moving, ...others.slice(index)]
    const slot = stack(order, viewport).slots[moving.id]

    if (slot === undefined) continue

    const top = viewport.height - slot.y - moving.height
    const distance = Math.hypot(slot.x - at.left, top - at.top)

    if (best === null || distance < best.distance) best = { index, distance }
  }

  return best !== null && best.distance <= reach ? best.index : null
}

/** Una posición que cabe en la pantalla, con un margen. */
export function clampTo(
  at: { left: number; top: number },
  size: Size,
  viewport: Size,
): { left: number; top: number } {
  const margin = NARROW_MARGIN

  return {
    left: Math.min(
      Math.max(margin, at.left),
      Math.max(margin, viewport.width - size.width - margin),
    ),
    top: Math.min(
      Math.max(margin, at.top),
      Math.max(margin, viewport.height - size.height - margin),
    ),
  }
}

/** Mueve `id` a la posición `index` de `order` (entre los que se ven, `shown`). */
export function moveTo(order: string[], shown: string[], id: string, index: number): string[] {
  const visible = shown.filter((each) => each !== id)
  const clamped = Math.max(0, Math.min(index, visible.length))

  visible.splice(clamped, 0, id)

  // Los que no se ven ahora conservan su sitio relativo: se ponen tras el que
  // tenían delante en el orden guardado.
  const rest = order.filter((each) => !visible.includes(each))
  const result = [...visible]

  for (const hidden of rest) {
    const before = order.slice(0, order.indexOf(hidden)).reverse()
    const anchor = before.find((each) => result.includes(each))
    const at = anchor === undefined ? 0 : result.indexOf(anchor) + 1

    result.splice(at, 0, hidden)
  }

  return result
}
