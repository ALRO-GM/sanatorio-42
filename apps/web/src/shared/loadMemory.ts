/**
 * Lo que costó la última carga de algo pesado (la red de asientos, la de
 * correcciones, el Avance): cuánto tardó y sus cifras. Con eso, la próxima vez
 * el aviso de carga cuenta hacia cifras de verdad y al ritmo de verdad, en vez
 * de inventárselas (`LoadingActivity`).
 *
 * Vive en el navegador de cada cual y es solo una comodidad: si no se puede
 * leer o guardar (ventana privada, almacenamiento bloqueado), se sigue sin ella.
 */

const PREFIX = 'peer4u.load.'

type LoadMemory = {
  /** Lo que tardó, en ms. */
  ms: number
  /** Sus cifras (horas, parejas, personas…), por nombre. */
  totals: Record<string, number>
}

export function readLoad(id: string): LoadMemory | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)

    if (typeof parsed !== 'object' || parsed === null) return null

    const { ms, totals } = parsed as Partial<LoadMemory>

    if (typeof ms !== 'number' || typeof totals !== 'object') return null

    return { ms, totals }
  } catch {
    return null
  }
}

function saveLoad(id: string, memory: LoadMemory): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(memory))
  } catch {
    // Sin almacenamiento, la próxima vez se cuenta hacia las cifras de fábrica.
  }
}

/**
 * Hace la carga `load` y apunta lo que tardó y sus cifras (`totalsOf`), para el
 * aviso de la próxima vez.
 */
export async function timedLoad<T>(
  id: string,
  load: () => Promise<T>,
  totalsOf: (result: T) => Record<string, number>,
): Promise<T> {
  const started = Date.now()
  const result = await load()

  saveLoad(id, { ms: Date.now() - started, totals: totalsOf(result) })

  return result
}

/** Las cifras hacia las que contar: las de la última vez o, si no hay, las de fábrica. */
export function expectedTotals(
  id: string,
  fallback: Record<string, number>,
): { ms: number | undefined; totals: Record<string, number> } {
  const memory = readLoad(id)

  return { ms: memory?.ms, totals: { ...fallback, ...memory?.totals } }
}
