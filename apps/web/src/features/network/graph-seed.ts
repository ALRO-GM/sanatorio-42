/**
 * Dónde empieza cada burbuja y cómo se apartan los grupos (`ForceGraph.tsx`).
 *
 * Antes, las nuevas salían en una sola espiral por orden de la lista: todas las
 * comunidades empezaban mezcladas en el centro y la fuerza de comunidad, que
 * tira hacia el centro de cada grupo, no las separaba (todos los centros
 * estaban casi en el mismo sitio). Con muchas personas quedaba una maraña que
 * había que desenredar a mano (pedido por Alberto, 2026-11-01).
 *
 * Ahora cada comunidad tiene su sitio desde el principio, en una espiral de
 * girasol de grupos (los grandes, en el centro), y sus personas, en una espiral
 * pequeña alrededor. Quien va solo (comunidad de una persona) va en un anillo
 * por fuera. Mientras la simulación tiene calor, los grupos que se pisan se
 * empujan entre sí (`separateCommunities`).
 */

/** Lo mínimo que hace falta de una persona para colocarla. */
type Seeded = { login: string; community: number }

/** Una burbuja de la simulación, con su sitio y su velocidad (d3 los rellena). */
type Moving = {
  x?: number | undefined
  y?: number | undefined
  vx?: number | undefined
  vy?: number | undefined
}

/** El ángulo de oro: los puntos de la espiral no se alinean nunca. */
const GOLDEN = 2.399963

/** Separación media entre burbujas de un mismo grupo al empezar. */
const NODE_GAP = 16

/** Cuánto aire se deja entre dos grupos al empezar, sobre la suma de sus radios. */
const GROUP_AIR = 1.35

/** Paso de la espiral en la que se buscan sitios para los grupos. */
const SPIRAL_STEP = 12

/** Radio con el que se siembra un grupo de `n` personas. */
const groupRadius = (n: number): number => NODE_GAP * Math.sqrt(n) + 10

/**
 * Sitio inicial de cada persona: agrupadas por comunidad y con los grupos
 * repartidos. Sin azar: los mismos datos dan siempre el mismo dibujo.
 */
export function seedLayout(people: readonly Seeded[]): Map<string, { x: number; y: number }> {
  const groups = new Map<number, Seeded[]>()
  const loose: Seeded[] = []

  for (const person of people)
    groups.set(person.community, [...(groups.get(person.community) ?? []), person])

  const ordered = [...groups.values()]
    .filter((members) => {
      if (members.length > 1) return true
      loose.push(...members)

      return false
    })
    .sort((a, b) => b.length - a.length || (a[0]?.community ?? 0) - (b[0]?.community ?? 0))
  const spots = new Map<string, { x: number; y: number }>()
  // Cada grupo, del más grande al más pequeño, en el primer punto libre de una
  // espiral fina: sin pisar a los que ya están puestos (con algo de aire).
  const placed: { x: number; y: number; r: number }[] = []
  let reach = 0
  let turn = 0

  for (const members of ordered) {
    const radius = groupRadius(members.length)
    let spot = { x: 0, y: 0 }

    for (; ; turn += 1) {
      const distance = SPIRAL_STEP * Math.sqrt(turn)

      spot = { x: Math.cos(turn * GOLDEN) * distance, y: Math.sin(turn * GOLDEN) * distance }
      if (
        placed.every(
          (other) =>
            Math.hypot(other.x - spot.x, other.y - spot.y) >= (other.r + radius) * GROUP_AIR,
        )
      ) {
        break
      }
    }

    placed.push({ ...spot, r: radius })
    reach = Math.max(reach, Math.hypot(spot.x, spot.y) + radius)
    members.forEach((member, at) => {
      const angle = at * GOLDEN
      const near = radius * Math.sqrt((at + 0.5) / members.length)

      spots.set(member.login, {
        x: spot.x + Math.cos(angle) * near,
        y: spot.y + Math.sin(angle) * near,
      })
    })
  }

  // Los sueltos, en un anillo por fuera de los grupos (o en espiral si no hay grupos).
  loose.forEach((member, at) => {
    const angle = at * GOLDEN
    const distance =
      ordered.length === 0
        ? groupRadius(loose.length) * Math.sqrt((at + 0.5) / loose.length)
        : reach + NODE_GAP * 2 + NODE_GAP * Math.sqrt(at)

    spots.set(member.login, { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance })
  })

  return spots
}

/** Grupos que se miran como mucho para separarlos: el coste es cuadrático en grupos. */
const MAX_GROUPS = 80

/** Con cuánta fuerza se apartan dos grupos que se pisan. */
const SEPARATION = 0.5

/**
 * Fuerza que aparta a los grupos que se pisan: si dos comunidades están más
 * cerca que la suma de sus radios (con algo de aire), todas sus burbujas se
 * empujan en sentidos opuestos. Solo cuentan las `MAX_GROUPS` más grandes.
 */
export function separateCommunities<N extends Moving>(
  nodes: readonly N[],
  communityOf: (node: N) => number,
): (alpha: number) => void {
  return (alpha) => {
    const centres = new Map<number, { x: number; y: number; n: number }>()

    for (const node of nodes) {
      const community = communityOf(node)
      const centre = centres.get(community) ?? { x: 0, y: 0, n: 0 }

      centre.x += node.x ?? 0
      centre.y += node.y ?? 0
      centre.n += 1
      centres.set(community, centre)
    }

    const groups = [...centres]
      .filter(([, centre]) => centre.n > 1)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, MAX_GROUPS)
      .map(([community, centre]) => ({
        community,
        x: centre.x / centre.n,
        y: centre.y / centre.n,
        r: groupRadius(centre.n),
        n: centre.n,
        dx: 0,
        dy: 0,
      }))

    for (let i = 0; i < groups.length; i += 1) {
      for (let j = i + 1; j < groups.length; j += 1) {
        const a = groups[i]
        const b = groups[j]

        if (a === undefined || b === undefined) continue

        let dx = b.x - a.x
        let dy = b.y - a.y
        let distance = Math.hypot(dx, dy)
        const wanted = (a.r + b.r) * GROUP_AIR

        if (distance >= wanted) continue
        // Dos grupos en el mismo punto: se apartan hacia un lado fijo.
        if (distance < 1e-6) {
          dx = 1
          dy = 0
          distance = 1
        }

        const push = ((wanted - distance) / distance) * SEPARATION * alpha
        // El grupo pequeño se mueve más que el grande.
        const share = b.n / (a.n + b.n)

        a.dx -= dx * push * share
        a.dy -= dy * push * share
        b.dx += dx * push * (1 - share)
        b.dy += dy * push * (1 - share)
      }
    }

    const moves = new Map(groups.map((group) => [group.community, group]))

    for (const node of nodes) {
      const move = moves.get(communityOf(node))

      if (move === undefined) continue
      node.vx = (node.vx ?? 0) + move.dx
      node.vy = (node.vy ?? 0) + move.dy
    }
  }
}
