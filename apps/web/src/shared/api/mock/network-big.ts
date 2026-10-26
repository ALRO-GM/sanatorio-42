/**
 * Un campus grande de mentira para la red de correcciones, del tamaño de París
 * o Madrid con «Todo» (unas 3 600 personas y decenas de miles de parejas). Sirve
 * para probar y medir el grafo con un volumen de verdad sin servidor.
 *
 * Se genera en una sola pasada, con semilla: siempre el mismo y en poco tiempo.
 */

import type { NetworkLink } from '@sanatorio/contracts'

/** Personas del campus grande. */
const BIG_PEOPLE = 3600

/** Comunidades: grupos que se corrigen mucho entre sí. */
const BIG_GROUPS = 14

/** Parejas de cada persona, como mucho (la mayoría tiene muchas menos). */
const MOST_PARTNERS = 34

type BigPerson = { login: string; group: number; external: boolean; cohort: number }

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

/** Azar con semilla: el mismo campus en cada carga. */
function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

/**
 * El campus grande: gente repartida en comunidades y parejas con más peso
 * dentro de cada una. La actividad va muy desigual, como en un campus real:
 * unos pocos corrigen muchísimo y casi todo el mundo, poco.
 */
export function bigWorld(): { people: BigPerson[]; links: NetworkLink[] } {
  const random = seeded(1337)
  const people: BigPerson[] = Array.from({ length: BIG_PEOPLE }, (_, index) => {
    const group = Math.floor(random() * BIG_GROUPS)
    const a = LETTERS[Math.floor(random() * LETTERS.length)] ?? 'a'
    const b = LETTERS[Math.floor(random() * LETTERS.length)] ?? 'b'

    return {
      // El índice al final hace único cada login.
      login: `${a}${b}${index.toString(36)}-p`,
      group,
      external: random() < 0.05,
      cohort: 2019 + (group % 7),
    }
  })
  const byGroup = Array.from({ length: BIG_GROUPS }, () => [] as number[])

  for (const [index, person] of people.entries()) byGroup[person.group]?.push(index)

  const pairs = new Map<string, NetworkLink>()

  for (const [index, person] of people.entries()) {
    const wanted = 1 + Math.floor(random() ** 2 * MOST_PARTNERS)
    const own = byGroup[person.group] ?? []

    for (let made = 0; made < wanted; made += 1) {
      const same = random() < 0.85
      const other = same
        ? (own[Math.floor(random() * own.length)] ?? index)
        : Math.floor(random() * people.length)
      const partner = people[other]

      if (other === index || partner === undefined || (person.external && partner.external)) {
        continue
      }

      const [low, high] = index < other ? [person, partner] : [partner, person]
      const key = `${low.login}|${high.login}`
      const total = 1 + Math.floor(random() * random() * (same ? 10 : 3))
      const forth = Math.round(total * random())
      const known = pairs.get(key)

      if (known === undefined) {
        pairs.set(key, { source: low.login, target: high.login, forth, back: total - forth })
      } else {
        known.forth += forth
        known.back += total - forth
      }
    }
  }

  return { people, links: [...pairs.values()] }
}
