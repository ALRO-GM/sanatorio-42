/**
 * Las otras vistas de la red (`features/network/GraphViews.tsx`): qué se ofrece
 * según cuánta gente se mira, y que cada vista se pinta. El grafo de siempre
 * sigue en las tres.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { NetworkLink, NetworkNode } from '@sanatorio/contracts'

import { GraphViews, viewsFor } from '../../src/features/network/GraphViews'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

beforeEach(() => {
  localStorage.setItem('sanatorio_lang', 'es')
})

afterEach(() => {
  cleanup()
})

/** `n` personas en grupos de 20, cada una unida a la siguiente. */
function network(n: number): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes = Array.from(
    { length: n },
    (_, index) =>
      ({ login: `p${String(index)}`, community: Math.floor(index / 20) }) as NetworkNode,
  )
  const links = nodes.slice(1).map((node, index) => ({
    source: `p${String(index)}`,
    target: node.login,
    forth: 2,
    back: index % 2,
  }))

  return { nodes, links }
}

function show(n: number, selected: string | null = null): void {
  const { nodes, links } = network(n)

  render(
    <I18nProvider>
      <GraphViews
        nodes={nodes}
        links={links}
        selected={selected}
        onSelect={() => undefined}
        colorOf={() => '#888'}
        describe={() => ''}
        graph={<p>el grafo de siempre</p>}
      />
    </I18nProvider>,
  )
}

describe('vistas de la red según cuánta gente se mira', () => {
  it('una persona: su red en anillos; un grupo mediano: matriz; mucha gente: el grafo', () => {
    expect(viewsFor(40, 'p1')).toEqual(['ego', 'graph'])
    expect(viewsFor(150, null)).toEqual(['graph', 'matrix'])
    expect(viewsFor(151, null)).toEqual(['graph'])
  })

  it('con mucha gente, solo el grafo y sin selector de vista', async () => {
    show(200)
    expect(await screen.findByText('el grafo de siempre')).toBeTruthy()
    expect(screen.queryByRole('tablist', { name: text('net.view.label') })).toBeNull()
  })

  it('con un grupo mediano, la matriz con un bloque por grupo', async () => {
    show(60)
    fireEvent.click(await screen.findByRole('tab', { name: text('net.view.matrix') }))
    expect(document.querySelectorAll('.net-matrix-block')).toHaveLength(3)
    expect(document.querySelectorAll('.net-matrix-cell').length).toBeGreaterThan(0)
  })

  it('con alguien elegido, su red en anillos de fábrica; el grafo, a un clic', async () => {
    show(60, 'p5')
    expect(await screen.findByRole('img', { name: /p5/ })).toBeTruthy()
    expect(document.querySelectorAll('.net-ego-person')).toHaveLength(2)
    fireEvent.click(screen.getByRole('tab', { name: text('net.view.graph') }))
    expect(screen.getByText('el grafo de siempre')).toBeTruthy()
  })
})
