/**
 * Textos largos guardados en las tablas como muchas claves: listas (las frases
 * de ánimo), documentos con apartados (el texto legal) o todo un juego.
 *
 * En la tabla, cada trozo es una fila con una clave por niveles; los números
 * son posiciones de una lista, desde 1:
 *
 *   cheer.ask.1            → la primera frase de la lista `ask`
 *   legal.doc.sections.2.heading
 *
 * `unflatten` rehace la estructura a partir de esas claves.
 */

type Tree = string | Tree[] | { [key: string]: Tree }

/**
 * La estructura de todo lo que cuelga de `prefix`. Un nivel cuyas claves son
 * todas números es una lista, en orden. `undefined` si no hay nada.
 */
export function unflatten(
  dict: Readonly<Record<string, string>>,
  prefix: string,
): Tree | undefined {
  const start = `${prefix}.`
  const root: Record<string, unknown> = {}
  let found = false

  for (const [key, text] of Object.entries(dict)) {
    if (!key.startsWith(start)) continue

    const parts = key.slice(start.length).split('.')
    let node = root

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        node[part] = text
      } else {
        node[part] ??= {}
        node = node[part] as Record<string, unknown>
      }
    })
    found = true
  }

  return found ? toTree(root) : undefined
}

function toTree(node: unknown): Tree {
  if (typeof node === 'string') return node

  const entries = Object.entries(node as Record<string, unknown>)

  if (entries.length > 0 && entries.every(([key]) => /^\d+$/.test(key))) {
    return entries.sort(([a], [b]) => Number(a) - Number(b)).map(([, value]) => toTree(value))
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, toTree(value)]))
}

/**
 * Lo que cuelga de `prefix` en un idioma o, si ese idioma no lo tiene, en el de
 * reserva: primero `middle` (el `fallback` del idioma, como el inglés para el
 * francés) y después el español. `translated` dice si es del idioma pedido.
 *
 * @param own      Los textos del idioma pedido (`undefined` si no se conoce).
 * @param fallback Los del español.
 * @param isFallback `true` si el idioma pedido es el propio español.
 * @param middle   Los del idioma al que cae el pedido antes que al español.
 */
export function pickTree(
  own: Readonly<Record<string, string>> | undefined,
  fallback: Readonly<Record<string, string>>,
  prefix: string,
  isFallback: boolean,
  middle?: Readonly<Record<string, string>>,
): { value: unknown; translated: boolean } {
  const mine = own === undefined ? undefined : unflatten(own, prefix)

  if (mine !== undefined) return { value: mine, translated: true }

  const second = middle === undefined ? undefined : unflatten(middle, prefix)

  return second === undefined
    ? { value: unflatten(fallback, prefix), translated: isFallback }
    : { value: second, translated: false }
}
