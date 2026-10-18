import type { Commit, Head } from '@sanatorio/gitsim'

/** Colores de las ramas: cada carril, el suyo (en claro y en nocturno se leen igual). */
const LANES = ['#e8590c', '#2f9e44', '#1971c2', '#ae3ec9', '#f08c00', '#0c8599', '#e64980']
const STEP_X = 58
const STEP_Y = 46
const PAD_X = 26
const PAD_TOP = 30

type Refs = {
  commits: Record<string, Commit>
  branches: Record<string, string>
  /** Ramas de seguimiento (`origin/main`), si las hay. */
  tracking?: Record<string, string>
  tags: Record<string, string>
  /** Sin HEAD: es el remoto. */
  head?: Head
}

type Placed = { id: string; x: number; y: number; lane: number; parents: string[] }

/** Todo lo que se ve desde alguna referencia (lo que se queda sin rama, no se pinta). */
function visible(refs: Refs, tips: string[]): Set<string> {
  const seen = new Set<string>()
  const stack = [...tips]

  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    const commit = refs.commits[id]

    if (commit === undefined || seen.has(id)) continue
    seen.add(id)
    stack.push(...commit.parents)
  }

  return seen
}

/**
 * Coloca los commits: de izquierda a derecha por generación, y un carril por
 * rama (la primera que lo reclama siguiendo el primer padre; main, antes).
 */
function layout(refs: Refs): { nodes: Map<string, Placed>; width: number; height: number } {
  const headId = refs.head?.kind === 'detached' ? refs.head.id : undefined
  const ordered = [
    ...Object.entries(refs.branches).sort(([a], [b]) => (a === 'main' ? -1 : b === 'main' ? 1 : 0)),
    ...Object.entries(refs.tracking ?? {}),
    ...(headId === undefined ? [] : [['HEAD', headId] as [string, string]]),
    ...Object.entries(refs.tags),
  ]
  const shown = visible(
    refs,
    ordered.map(([, id]) => id),
  )
  const generation = new Map<string, number>()
  const genOf = (id: string): number => {
    const known = generation.get(id)

    if (known !== undefined) return known

    const parents = refs.commits[id]?.parents ?? []
    const value = parents.length === 0 ? 0 : 1 + Math.max(...parents.map(genOf))

    generation.set(id, value)

    return value
  }
  const laneOf = new Map<string, number>()
  let lanes = 0

  for (const [, tip] of ordered) {
    let claimed = false

    for (
      let id: string | undefined = tip;
      id !== undefined && !laneOf.has(id);
      id = refs.commits[id]?.parents[0]
    ) {
      laneOf.set(id, lanes)
      claimed = true
    }
    if (claimed) lanes++
  }

  const nodes = new Map<string, Placed>()
  let maxGen = 0

  for (const id of shown) {
    const gen = genOf(id)
    const lane = laneOf.get(id) ?? 0

    maxGen = Math.max(maxGen, gen)
    nodes.set(id, {
      id,
      lane,
      x: PAD_X + gen * STEP_X,
      y: PAD_TOP + lane * STEP_Y,
      parents: refs.commits[id]?.parents.filter((parent) => shown.has(parent)) ?? [],
    })
  }

  return {
    nodes,
    width: PAD_X * 2 + maxGen * STEP_X + 60,
    height: PAD_TOP + (Math.max(lanes, 1) - 1) * STEP_Y + 16,
  }
}

type GitGraphProps = Refs & {
  /** Título encima (`Tu repositorio`, `origin`). */
  label?: string | undefined
  small?: boolean
}

/**
 * La historia como en las animaciones de git: círculos que se unen, ramas de
 * colores y etiquetas encima. Los círculos van con su id, así que al cambiar de
 * estado se deslizan a su sitio nuevo (transición de CSS, sin bucles).
 */
export function GitGraph({ label, small = false, ...refs }: GitGraphProps) {
  const { nodes, width, height } = layout(refs)
  const scale = small ? 0.75 : 1
  const color = (lane: number) => LANES[lane % LANES.length] ?? LANES[0]
  const labels = new Map<string, { text: string; kind: 'branch' | 'head' | 'remote' | 'tag' }[]>()
  const add = (id: string, text: string, kind: 'branch' | 'head' | 'remote' | 'tag') => {
    labels.set(id, [...(labels.get(id) ?? []), { text, kind }])
  }

  for (const [name, id] of Object.entries(refs.branches)) {
    const current = refs.head?.kind === 'branch' && refs.head.name === name

    add(id, current ? `${name}*` : name, current ? 'head' : 'branch')
  }
  if (refs.head?.kind === 'detached') add(refs.head.id, 'HEAD', 'head')
  for (const [name, id] of Object.entries(refs.tracking ?? {})) add(id, name, 'remote')
  for (const [name, id] of Object.entries(refs.tags)) add(id, `⌂ ${name}`, 'tag')

  const most = (kinds: string[]) =>
    Math.max(
      0,
      ...[...labels.values()].map((list) => list.filter((l) => kinds.includes(l.kind)).length),
    )
  // Sitio para las etiquetas: una cabe en el margen de arriba; las de debajo, al final.
  const top = Math.max(0, most(['branch', 'head']) - 1) * 13
  const bottom = most(['remote', 'tag']) * 12 + 4
  const tall = height + top + bottom

  return (
    <figure className={`git-graph ${small ? 'small' : ''}`}>
      {label !== undefined && <figcaption>{label}</figcaption>}
      <svg
        viewBox={`0 ${-top} ${width} ${tall}`}
        width={width * scale}
        height={tall * scale}
        role="img"
        aria-label={label}
      >
        {[...nodes.values()].flatMap((node) =>
          node.parents.map((parentId) => {
            const parent = nodes.get(parentId)

            if (parent === undefined) return null

            const d =
              parent.y === node.y
                ? `M${parent.x},${parent.y} L${node.x},${node.y}`
                : `M${parent.x},${parent.y} C${parent.x + STEP_X * 0.6},${parent.y} ${node.x - STEP_X * 0.6},${node.y} ${node.x},${node.y}`

            return (
              <path
                key={`${parentId}-${node.id}`}
                className="git-edge"
                d={d}
                stroke={color(node.y === parent.y ? node.lane : Math.max(node.lane, parent.lane))}
              />
            )
          }),
        )}
        {[...nodes.values()].map((node) => {
          const list = labels.get(node.id) ?? []
          const above = list.filter((l) => l.kind === 'branch' || l.kind === 'head')
          const below = list.filter((l) => l.kind === 'remote' || l.kind === 'tag')

          return (
            <g
              key={node.id}
              className="git-node"
              style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
            >
              <circle
                r={11}
                fill={color(node.lane)}
                className={node.id.endsWith("'") ? 'copy' : undefined}
              />
              <text className="git-id" y={3.5}>
                {node.id}
              </text>
              {above.map((item, index) => (
                <text key={item.text} className={`git-ref ${item.kind}`} y={-17 - index * 13}>
                  {item.text}
                </text>
              ))}
              {below.map((item, index) => (
                <text key={item.text} className={`git-ref ${item.kind}`} y={25 + index * 12}>
                  {item.text}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
