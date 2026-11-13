import type { Death, Hop, Trace } from '@sanatorio/netsim'

/**
 * La traza de un ping, troceada para animarla: un fotograma por cada nodo que
 * pisa el paquete (switches incluidos), con lo que hay que contar al llegar
 * ahí. La cuenta la hace el motor; aquí solo se pone en fila.
 */

export type Leg = 'out' | 'back'

/** Lo que se cuenta en un fotograma: el salto que acaba, la muerte, la llegada o el final feliz. */
export type Note =
  | { kind: 'hop'; leg: Leg; hop: Hop }
  | { kind: 'death'; leg: Leg; death: Death }
  | { kind: 'arrived' }
  | { kind: 'ok' }

export type Frame = {
  /** Dónde está el paquete. */
  at: string
  leg: Leg
  /** El cable que acaba de cruzar (`a|b`, en orden alfabético), si se ha movido. */
  wire: string | null
  notes: Note[]
}

export const wireKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

function legFrames(start: string, leg: Leg, hops: Hop[], death: Death | null): Frame[] {
  const frames: Frame[] = [{ at: start, leg, wire: null, notes: [] }]

  for (const hop of hops)
    hop.path.slice(1).forEach((node, index) => {
      const last = index === hop.path.length - 2

      frames.push({
        at: node,
        leg,
        wire: wireKey(hop.path[index] ?? node, node),
        notes: last ? [{ kind: 'hop', leg, hop }] : [],
      })
    })

  if (death !== null) {
    const end = frames.at(-1)

    // Lo normal es que muera donde está; si lo mal configurado es el destino, se señala allí.
    if (end?.at === death.at) end.notes.push({ kind: 'death', leg, death })
    else frames.push({ at: death.at, leg, wire: null, notes: [{ kind: 'death', leg, death }] })
  }

  return frames
}

/** Los fotogramas de un ping: la ida y, si llegó, la vuelta. */
export function framesOf(trace: Trace): Frame[] {
  const out = legFrames(trace.from, 'out', trace.out.hops, trace.out.death)

  if (trace.back === null) return out

  const [first, ...rest] = legFrames(trace.to, 'back', trace.back.hops, trace.back.death)
  const turn = out.at(-1)

  if (trace.ok) (rest.at(-1) ?? first)?.notes.push({ kind: 'ok' })
  // La vuelta empieza donde acabó la ida: lo que pase ahí se cuenta en ese mismo fotograma.
  turn?.notes.push({ kind: 'arrived' }, ...(first?.notes ?? []))

  return [...out, ...rest]
}
