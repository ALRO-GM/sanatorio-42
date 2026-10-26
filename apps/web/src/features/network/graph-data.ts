/**
 * Cuentas del grafo de la Red que no necesitan lienzo, para poder probarlas:
 * cuándo unos datos son los mismos (y no hace falta recolocar nada), cómo
 * agrupar las uniones para pintarlas de una vez y qué burbuja hay bajo el ratón.
 */

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'
import { quadtree } from 'd3-quadtree'
import type { Quadtree } from 'd3-quadtree'

/**
 * Una huella de lo que importa para colocar el grafo: quién está, con qué
 * actividad y comunidad, y qué uniones hay con su peso. Dos respuestas con la
 * misma huella se pintan igual, así que la simulación no se recalienta.
 *
 * Sirve para el sondeo mientras se copia el histórico (cada 45 s llega otro
 * objeto con lo mismo dentro) y para cualquier render que cree arrays nuevos.
 * FNV-1a de 32 bits: rápido y suficiente; un choque solo dejaría sin recolocar.
 */
export function graphSignature(
  nodes: readonly NetworkNode[],
  links: readonly NetworkLink[],
): string {
  let hash = 0x811c9dc5
  const mix = (text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193)
    }
  }

  for (const node of nodes) {
    mix(`${node.login}|${node.given}|${node.received}|${node.community}|${node.external ? 1 : 0};`)
  }
  for (const link of links) {
    mix(`${link.source}>${link.target}|${link.forth}|${link.back};`)
  }

  return `${nodes.length}:${links.length}:${(hash >>> 0).toString(36)}`
}

/** El peso más alto con grupo propio: por encima, el trazo ya casi no cambia. */
const WEIGHT_GROUPS = 40

/**
 * Las uniones agrupadas por peso (de menos a más). El grosor y la opacidad de
 * una unión solo dependen de su peso, así que cada grupo se pinta con un solo
 * trazo: miles de `stroke()` pasan a ser unas decenas.
 */
export function byWeight<T extends { weight: number }>(links: readonly T[]): T[][] {
  const groups = new Map<number, T[]>()

  for (const link of links) {
    const key = Math.min(WEIGHT_GROUPS, Math.max(1, Math.round(link.weight)))
    const group = groups.get(key)

    if (group === undefined) groups.set(key, [link])
    else group.push(link)
  }

  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group)
}

/** Una burbuja con su sitio y su radio, como la ve el índice. */
type Spot = { x?: number | undefined; y?: number | undefined; r: number }

/** Índice de burbujas por sitio: con él, buscar la del ratón no recorre todas. */
export type SpotIndex<T extends Spot> = { tree: Quadtree<T>; widest: number }

export function spotIndex<T extends Spot>(spots: readonly T[]): SpotIndex<T> {
  let widest = 0

  for (const spot of spots) widest = Math.max(widest, spot.r)

  return {
    tree: quadtree<T>()
      .x((spot) => spot.x ?? 0)
      .y((spot) => spot.y ?? 0)
      .addAll([...spots]),
    widest,
  }
}

/**
 * La burbuja que hay en (`x`, `y`), con `margin` de más alrededor de cada una
 * para acertar también a las pequeñas; si hay varias, la de centro más cercano.
 * Solo se miran las ramas del árbol que caen a la distancia de la más grande.
 */
export function spotAt<T extends Spot>(
  index: SpotIndex<T>,
  x: number,
  y: number,
  margin: number,
): T | null {
  const reach = index.widest + margin
  let found: T | null = null
  let best = Infinity

  index.tree.visit((cell, x0, y0, x1, y1) => {
    // Rama entera fuera del alcance: no se baja por ella.
    if (x0 > x + reach || x1 < x - reach || y0 > y + reach || y1 < y - reach) return true

    if (!('length' in cell)) {
      let leaf: typeof cell | undefined = cell

      while (leaf !== undefined) {
        const spot = leaf.data
        const distance = Math.hypot((spot.x ?? 0) - x, (spot.y ?? 0) - y)

        if (distance <= spot.r + margin && distance < best) {
          found = spot
          best = distance
        }
        leaf = leaf.next
      }
    }

    return false
  })

  return found
}
