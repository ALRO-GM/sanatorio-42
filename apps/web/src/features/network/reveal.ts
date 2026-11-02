import { useEffect, useMemo, useRef, useState } from 'react'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

/** Cuántos pasos lleva enseñar un grafo entero, y cada cuánto se da uno. */
const STEPS = 12
const STEP_MS = 90

/**
 * El orden en que aparecen las burbujas: primero `start` (tú), luego quien
 * está unido a ti, luego quien está unido a esa gente… y al final quien no
 * cuelga de ti, en el orden en que llegó (de más a menos actividad).
 */
export function revealOrder(
  nodes: readonly NetworkNode[],
  links: readonly NetworkLink[],
  start: string | null,
): string[] {
  const known = new Set(nodes.map((node) => node.login))
  const near = new Map<string, string[]>()

  for (const link of links) {
    near.set(link.source, [...(near.get(link.source) ?? []), link.target])
    near.set(link.target, [...(near.get(link.target) ?? []), link.source])
  }

  const order: string[] = []
  const seen = new Set<string>()
  const queue = start !== null && known.has(start) ? [start] : []

  for (const login of queue) seen.add(login)
  while (queue.length > 0) {
    const login = queue.shift() ?? ''

    order.push(login)
    for (const other of near.get(login) ?? []) {
      if (!seen.has(other) && known.has(other)) {
        seen.add(other)
        queue.push(other)
      }
    }
  }

  for (const node of nodes) if (!seen.has(node.login)) order.push(node.login)

  return order
}

const reduced = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * El grafo que se va enseñando: cuando llega uno nuevo (no el mismo con otro
 * recorte), aparece por tandas desde `start` en un segundo, en vez de todo de
 * golpe tras la espera. Pedido por Alberto (2026-11-02): que se vea actividad.
 * Con «menos movimiento» en el sistema, sale entero.
 */
export function useReveal(
  nodes: readonly NetworkNode[],
  links: readonly NetworkLink[],
  start: string | null,
): { nodes: readonly NetworkNode[]; links: readonly NetworkLink[] } {
  const order = useMemo(() => revealOrder(nodes, links, start), [nodes, links, start])
  const [count, setCount] = useState(Infinity)
  // Lo que ya se ha enseñado entero: un recorte o un filtro de lo mismo no vuelve a empezar.
  const shown = useRef(new Set<string>())

  useEffect(() => {
    const before = shown.current
    const kept = order.filter((login) => before.has(login)).length

    shown.current = new Set(order)
    if (order.length < 3 || kept >= order.length / 2 || reduced()) {
      setCount(Infinity)

      return
    }

    const step = Math.max(1, Math.ceil(order.length / STEPS))
    let current = 1

    setCount(current)

    const timer = window.setInterval(() => {
      current += step
      setCount(current >= order.length ? Infinity : current)
      if (current >= order.length) window.clearInterval(timer)
    }, STEP_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [order])

  return useMemo(() => {
    if (count >= order.length) return { nodes, links }

    const visible = new Set(order.slice(0, count))

    return {
      nodes: nodes.filter((node) => visible.has(node.login)),
      links: links.filter((link) => visible.has(link.source) && visible.has(link.target)),
    }
  }, [count, order, nodes, links])
}
