/**
 * Troceado: de un documento a los trozos que se indexan. Dos maneras:
 *
 * - **Fijo**: ventanas de `size` palabras que avanzan `size - overlap`. No mira
 *   el contenido, así que parte frases y funciones por donde caiga; el solape
 *   repite el final de un trozo al principio del siguiente para que lo partido
 *   quede entero en alguno.
 * - **Por estructura**: un trozo por apartado (cada encabezado de Markdown) o
 *   por función o clase (cada `def` o `class` sin sangría de Python). Lo que
 *   aun así pasa de `size` se parte con ventanas fijas.
 */

import type { Doc } from './corpus.js'
import { clamp, LIMITS } from './limits.js'
import { words } from './text.js'
import type { Word } from './text.js'

export type Chunker = 'fixed' | 'structure'

type ChunkOptions = { chunker: Chunker; size: number; overlap: number }

export type Chunk = {
  /** `docs/colas.md#2`: el documento y el número del trozo dentro de él. */
  id: string
  doc: string
  /** Dónde empieza y acaba en el texto del documento (caracteres). */
  start: number
  end: number
  /** Líneas del documento que toca (la primera es la 1): lo que se cita. */
  lines: [number, number]
  text: string
  /** Cuántas palabras tiene. */
  size: number
}

/** Un apartado con menos palabras que esto es solo un título: no se indexa solo. */
const LONE_TITLE = 6

const lineAt = (text: string, offset: number): number => {
  let line = 1

  for (let index = 0; index < offset && index < text.length; index += 1)
    if (text[index] === '\n') line += 1

  return line
}

/** Ventanas de `size` palabras sobre un tramo del documento. */
function windows(all: readonly Word[], size: number, overlap: number): [number, number][] {
  const spans: [number, number][] = []
  const step = Math.max(1, size - overlap)

  for (let first = 0; first < all.length; first += step) {
    const last = Math.min(all.length, first + size) - 1
    const from = all[first]
    const to = all[last]

    if (from === undefined || to === undefined) break
    spans.push([from.start, to.end])
    if (last === all.length - 1) break
  }

  return spans
}

/** Dónde empieza cada apartado: encabezados de Markdown, `def` y `class` sin sangría, bloques de un `.lock`. */
function sections(doc: Doc): [number, number][] {
  const starts: number[] = [0]
  // En lo demás (un `poetry.lock`), cada bloque `[[paquete]]`.
  const pattern =
    doc.kind === 'md' ? /^#{1,6} /gm : doc.kind === 'py' ? /^(def|class) /gm : /^\[\[/gm

  for (const match of doc.text.matchAll(pattern)) if (match.index > 0) starts.push(match.index)

  return starts.map((start, index) => [start, starts[index + 1] ?? doc.text.length])
}

/** Los trozos de un documento. Los mandos se dejan dentro de sus topes. */
function chunkDoc(doc: Doc, options: ChunkOptions): Chunk[] {
  const size = Math.round(clamp(options.size, LIMITS.minSize, LIMITS.maxSize))
  const overlap = Math.round(clamp(options.overlap, 0, Math.floor(size / 2)))
  const all = words(doc.text)
  const spans: [number, number][] = []

  if (options.chunker === 'fixed') spans.push(...windows(all, size, overlap))
  else {
    let carried: number | null = null

    for (const [start, to] of sections(doc)) {
      const from: number = carried ?? start
      const inside = all.filter((word) => word.start >= from && word.end <= to)

      // Un título suelto (el `# Colas` de arriba) se queda con el apartado siguiente.
      if (inside.length < LONE_TITLE && to < doc.text.length) {
        carried = from
        continue
      }
      carried = null
      spans.push(...windows(inside, size, overlap))
    }
  }

  return spans.map(([start, end], index) => {
    const text = doc.text.slice(start, end)

    return {
      id: `${doc.path}#${index + 1}`,
      doc: doc.path,
      start,
      end,
      lines: [lineAt(doc.text, start), lineAt(doc.text, end)],
      text,
      size: words(text).length,
    }
  })
}

/** Los trozos de varios documentos, hasta el tope del índice. */
export function chunkDocs(docs: readonly Doc[], options: ChunkOptions): Chunk[] {
  return docs.flatMap((doc) => chunkDoc(doc, options)).slice(0, LIMITS.chunks)
}
