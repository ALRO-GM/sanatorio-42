/**
 * Qué detecta la burbuja de sugerencias bajo el puntero (`features/suggest/detect.ts`):
 * el contenedor con sentido más cercano, su nombre y una ruta estable.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { clean, detect, pathOf, spotLabel } from '../../src/features/suggest/detect'
import { placeHref } from '../../src/shared/links'

afterEach(() => {
  document.body.innerHTML = ''
})

const t = (key: string): string => `«${key}»`

function page(html: string): void {
  document.body.innerHTML = html
}

const at = (selector: string): Element => {
  const found = document.querySelector(selector)

  if (found === null) throw new Error(`no hay ${selector}`)

  return found
}

describe('detect', () => {
  it('una tarjeta: su título, sin la flecha ni el botón de ayuda', () => {
    page(`<main><section><h2>Peer to peer</h2>
      <div class="card"><h3><span aria-hidden="true">▾</span> Mapa <button>?</button></h3><p id="x1">texto</p></div>
      <div class="card"><p class="dentro">sin título</p></div></section></main>`)

    const spot = detect(at('#x1'))

    expect(spot?.label).toBe('Mapa')
    expect(spot?.anchor).toBeNull()
    expect(spot?.selector).toBe('main > section > div.card:nth-of-type(1)')
    // Sin título propio, el de fuera.
    expect(detect(at('.dentro'))?.label).toBe('Peer to peer')
  })

  it('lo marcado con data-feedback manda y corta la ruta', () => {
    page(`<div data-feedback="expediente.health"><button class="block-head">Health check</button>
      <div class="card"><p id="p">x</p></div></div>`)

    const spot = detect(at('#p'))

    expect(spot?.anchor).toBe('expediente.health')
    expect(spot?.selector).toBe('[data-feedback="expediente.health"] > div.card')
    expect(spot?.label).toBe('Health check')
    expect(pathOf(at('[data-feedback]'))).toBe('[data-feedback="expediente.health"]')
  })

  it('nada que señalar: la propia burbuja, fuera de todo o nada debajo', () => {
    page(
      `<p id="suelto">x</p><div class="suggest-panel"><div class="card"><h3 id="h">y</h3></div></div>`,
    )

    expect(detect(null)).toBeNull()
    expect(detect(at('#suelto'))).toBeNull()
    expect(detect(at('#h'))).toBeNull()
  })

  it('el nombre que se enseña: el de los textos para lo marcado sin título', () => {
    page(`<div data-feedback="cabecera"><span id="s">x</span></div>
      <div class="card" data-feedback="clusters.map"><h3>Leyenda</h3><i id="m">x</i></div>`)

    expect(spotLabel(detect(at('#s')), 'consulta', t)).toBe('«suggest.part.header»')
    expect(spotLabel(detect(at('#m')), 'clusters', t)).toBe('«suggest.part.map»')
    expect(spotLabel(null, 'tablon', t)).toBe('«nav.tablon»')
  })
})

describe('clean y placeHref', () => {
  it('deja el nombre en una línea y corto', () => {
    expect(clean('  a\n\tb  ')).toBe('a b')
    expect(clean('x'.repeat(100))).toHaveLength(80)
  })

  it('solo vuelve a direcciones de la web', () => {
    expect(placeHref('#/tablon/12', 'tablon')).toBe('#/tablon/12')
    expect(placeHref('javascript:alert(1)', 'red')).toBe('#/red')
    expect(placeHref('', 'red')).toBe('#/red')
  })
})
