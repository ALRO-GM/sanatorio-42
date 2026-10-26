/**
 * El grafo de la Red (`ForceGraph`): que no se quede gastando CPU. La
 * simulación se para al enfriarse, no se recalienta con lo que no cambia el
 * grafo (otro color, otra etiqueta, el sondeo con los mismos datos) y al
 * desmontarlo o esconder la pestaña no queda ningún fotograma pedido.
 *
 * Los fotogramas son de mentira (`requestAnimationFrame` con temporizadores
 * falsos): cada paso de 16 ms es uno.
 */
import { act, cleanup, render } from '@testing-library/react'
import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ForceGraph } from '../../src/features/network/ForceGraph'

const node = (index: number): NetworkNode => ({
  login: `p${String(index)}`,
  image: null,
  external: index % 9 === 0,
  given: 2 + (index % 7),
  received: 1 + (index % 5),
  partners: 2,
  repetition: 0,
  reciprocity: 0,
  endogamy: 10,
  givenPassRate: null,
  receivedPassRate: null,
  community: index % 4,
  cohort: null,
  campusId: null,
})

/** Cuarenta personas en corro, cada una unida a la siguiente y a la de siete más allá. */
const NODES = Array.from({ length: 40 }, (_, index) => node(index))
const LINKS: NetworkLink[] = NODES.flatMap((_, index) => [
  { source: `p${String(index)}`, target: `p${String((index + 1) % 40)}`, forth: 2, back: 1 },
  { source: `p${String(index)}`, target: `p${String((index + 7) % 40)}`, forth: 1, back: 0 },
])

const CONTROLS = {
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  fit: 'Ver todo',
  find: 'Buscar',
  none: 'Nadie',
  gave: 'Corrigió',
  got: 'Le corrigieron',
}

function Graph({
  nodes = NODES,
  links = LINKS,
  colorOf = () => '#888888',
  label = 'Red',
}: {
  nodes?: readonly NetworkNode[]
  links?: readonly NetworkLink[]
  colorOf?: (node: NetworkNode) => string
  label?: string
}) {
  return (
    <ForceGraph
      nodes={nodes}
      links={links}
      colorOf={colorOf}
      selected={null}
      onSelect={() => undefined}
      label={label}
      tooltip={(one) => one.login}
      controls={CONTROLS}
    />
  )
}

/** Fotogramas pedidos y aún sin pintar. */
const pending = (): number => vi.getTimerCount()

/** Deja pasar `count` fotogramas. */
function frames(count: number): void {
  for (let index = 0; index < count; index++) {
    act(() => {
      vi.advanceTimersByTime(16)
    })
  }
}

/** Deja pasar fotogramas hasta que no queda ninguno pedido; cuántos han sido. */
function untilQuiet(max = 3000): number {
  let count = 0

  while (pending() > 0 && count < max) {
    frames(1)
    count++
  }

  return count
}

function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  setVisibility('visible')
})

describe('ForceGraph', () => {
  it('la simulación se para sola al enfriarse y ya no pide fotogramas', () => {
    render(<Graph />)
    expect(pending()).toBe(1)

    const spent = untilQuiet()

    // Unos cientos de pasos, no un bucle sin fin.
    expect(spent).toBeGreaterThan(50)
    expect(spent).toBeLessThan(1000)
    expect(pending()).toBe(0)
    frames(600)
    expect(pending()).toBe(0)
  })

  it('otro color, otra etiqueta o los mismos datos en objetos nuevos no la recalientan', () => {
    const view = render(<Graph />)

    untilQuiet()
    // Lo que trae el sondeo mientras se copia: lo mismo, en arrays nuevos.
    view.rerender(
      <Graph
        nodes={NODES.map((one) => ({ ...one }))}
        links={LINKS.map((one) => ({ ...one }))}
        colorOf={() => '#123456'}
        label="Red (otra etiqueta)"
      />,
    )
    // Como mucho un repintado.
    expect(untilQuiet()).toBeLessThanOrEqual(1)

    // Con datos distintos de verdad, sí se recoloca.
    view.rerender(
      <Graph links={LINKS.map((one, index) => (index === 0 ? { ...one, forth: 9 } : one))} />,
    )
    expect(untilQuiet()).toBeGreaterThan(20)
    expect(pending()).toBe(0)
  })

  it('al desmontarlo no queda ningún fotograma pedido', () => {
    const view = render(<Graph />)

    frames(5)
    // Aún tiene calor: sigue pidiendo fotogramas.
    expect(pending()).toBe(1)
    view.unmount()
    expect(pending()).toBe(0)
    frames(100)
    expect(pending()).toBe(0)
  })

  it('con la pestaña oculta se para, y al volver sigue donde estaba hasta enfriarse', () => {
    render(<Graph />)
    frames(5)
    setVisibility('hidden')
    expect(pending()).toBe(0)
    frames(100)
    expect(pending()).toBe(0)

    setVisibility('visible')
    expect(pending()).toBe(1)
    expect(untilQuiet()).toBeGreaterThan(20)
    expect(pending()).toBe(0)
  })
})
