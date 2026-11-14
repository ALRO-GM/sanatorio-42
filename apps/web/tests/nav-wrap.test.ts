/**
 * Pestañas de la cabecera (#118): con ratón, si no caben, las dos filas
 * (categorías y secciones) pasan a otra línea en vez de quedarse fuera de la
 * pantalla con la barra escondida. Ningún estilo puede volver a impedirlo.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const src = join(__dirname, '../src')
const css = (path: string): string => readFileSync(join(src, path), 'utf8')

/** El bloque `@media (hover: hover) and (pointer: fine) { … }` que contiene a `.subtabs`. */
const finePointerBlock = (text: string): string => {
  const start = text.indexOf('@media (hover: hover) and (pointer: fine)')
  expect(start).toBeGreaterThan(-1)

  return text.slice(start, text.indexOf('\n}', start))
}

describe('pestañas de la cabecera con ratón', () => {
  it('las dos filas pasan a otra línea y dejan de deslizarse de lado', () => {
    const block = finePointerBlock(css('styles/system.css'))

    expect(block).toMatch(/\.tabs,\s*\.subtabs\s*\{/)
    expect(block).toContain('flex-wrap: wrap')
    expect(block).toContain('overflow-x: visible')
  })

  it('ningún estilo fuerza una sola fila en las pestañas', () => {
    const themes = readdirSync(join(src, 'themes'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `themes/${entry.name}/theme.css`)
      .filter((path) => {
        try {
          css(path)

          return true
        } catch {
          return false
        }
      })

    expect(themes.length).toBeGreaterThan(3)
    for (const path of themes) {
      // Una regla de .tab/.tabs/.subtab(s) con nowrap en la fila rompería el arreglo.
      const rules = css(path).match(/[^{}]*\.(?:sub)?tabs?\b[^{]*\{[^}]*\}/g) ?? []

      for (const rule of rules) expect(rule).not.toMatch(/flex-wrap:\s*nowrap/)
    }
  })
})
