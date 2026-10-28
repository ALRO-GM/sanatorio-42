/**
 * Recortar la red de asientos para que se lea (`docs/asientos.md`, «Recortar
 * el grafo»): de cada persona, solo la gente con la que más se sienta. Se hace
 * en la web, al momento, sin volver a pedir el grafo. Sin lienzo: solo las
 * cuentas, para poder probarlas.
 */

/** Una unión de la red de asientos: la cercanía de dos personas. */
type Link = { source: string; target: string; closeness: number }

export type SeatTrim = {
  /** Las personas más cercanas que se guardan de cada una, o todas. */
  most: number | 'all'
  /**
   * Hasta qué parte de su cercanía total (de 0 a 1): se guardan sus personas,
   * de la más a la menos cercana, hasta reunirla. Con 1, todas (hasta `most`).
   */
  share: number
}

/** De fábrica: las 5 más cercanas de cada cual, mientras no pasen del 80 % de su tiempo acompañado. */
export const DEFAULT_TRIM: SeatTrim = { most: 5, share: 0.8 }

/** Las opciones: 1 a 10 personas o todas, y del 50 % al 100 % de la cercanía. */
export const MOST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'all'] as const
export const SHARE_OPTIONS = [0.5, 0.6, 0.7, 0.8, 0.9, 1] as const

type Partner = { other: string; closeness: number }

/** Las personas de cada cual con su cercanía, de la más a la menos cercana: una sola pasada. */
function partnersOf(links: readonly Link[]): Map<string, Partner[]> {
  const partners = new Map<string, Partner[]>()
  const add = (login: string, other: string, closeness: number): void => {
    const list = partners.get(login)

    if (list === undefined) partners.set(login, [{ other, closeness }])
    else list.push({ other, closeness })
  }

  for (const link of links) {
    add(link.source, link.target, link.closeness)
    add(link.target, link.source, link.closeness)
  }

  // A igual cercanía, por nombre: el mismo grafo da siempre lo mismo.
  for (const list of partners.values()) {
    list.sort((a, b) => b.closeness - a.closeness || a.other.localeCompare(b.other))
  }

  return partners
}

/**
 * Las personas que se guardan de alguien, de la más a la menos cercana: se
 * van cogiendo mientras lo cogido no llegue a `share` de su cercanía total y
 * no pasen de `most`. Siempre la primera, si tiene alguna.
 *
 * Así, quien pasa la mitad de su tiempo con dos personas y el resto repartido
 * entre muchas, con el 50 %, se queda solo con esas dos.
 */
function closest(partners: readonly Partner[], trim: SeatTrim): string[] {
  const total = partners.reduce((sum, partner) => sum + partner.closeness, 0)
  const kept: string[] = []
  let taken = 0

  for (const partner of partners) {
    if (trim.most !== 'all' && kept.length >= trim.most) break
    if (kept.length > 0 && taken >= trim.share * total - 1e-9) break

    kept.push(partner.other)
    taken += partner.closeness
  }

  return kept
}

/**
 * El grafo recortado.
 *
 * - Sin nadie en `focus`: una unión se queda si es de las más cercanas de
 *   cualquiera de sus dos personas (a quien solo se sienta con alguien muy
 *   sociable no se le queda sin nadie). Las personas, todas.
 * - Con `focus`: solo esa persona y sus más cercanas, y solo sus uniones con
 *   ella: sin las de las demás entre sí, para que se vea despejado.
 */
export function trimSeats<P extends { login: string }, L extends Link>(
  people: readonly P[],
  links: readonly L[],
  trim: SeatTrim,
  focus: string | null = null,
): { people: P[]; links: L[] } {
  if (focus !== null && people.some((person) => person.login === focus)) {
    const near = new Set(closest(partnersOf(links).get(focus) ?? [], trim))

    return {
      people: people.filter((person) => person.login === focus || near.has(person.login)),
      links: links.filter(
        (link) =>
          (link.source === focus && near.has(link.target)) ||
          (link.target === focus && near.has(link.source)),
      ),
    }
  }

  if (trim.most === 'all' && trim.share >= 1) return { people: [...people], links: [...links] }

  const partners = partnersOf(links)
  const kept = new Set<string>()

  for (const [login, list] of partners) {
    for (const other of closest(list, trim)) kept.add(pairKey(login, other))
  }

  return {
    people: [...people],
    links: links.filter((link) => kept.has(pairKey(link.source, link.target))),
  }
}

/** La misma clave para (a, b) y (b, a). */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}\n${b}` : `${b}\n${a}`
}
