/**
 * Las variables de una paleta que se pintan: solo nombres de variable y
 * valores sencillos (lo guardado en el navegador no puede colar otra cosa).
 */

import { describe, expect, it } from 'vitest'

import { paintable } from '../src/shared/theme'
import { bichota } from '../src/themes/bichota/theme'
import { clinica } from '../src/themes/clinica/theme'
import { espacio } from '../src/themes/espacio/theme'
import { historial } from '../src/themes/historial/theme'
import { libre } from '../src/themes/libre/theme'
import { terminal } from '../src/themes/terminal/theme'

describe('variables de paleta', () => {
  it('pasan los colores y las medidas, y no lo que cierra o carga algo', () => {
    expect(
      paintable({
        '--hue': '200',
        '--accent': 'oklch(70% 0.1 200 / 50%)',
        '--gap': 'calc(1rem + 2px)',
        '--bg': 'url(https://x/y.png)',
        '--fg': 'red; background: blue',
        '--bad name': 'red',
        color: 'red',
        '--x': '}',
      }),
    ).toEqual([
      ['--hue', '200'],
      ['--accent', 'oklch(70% 0.1 200 / 50%)'],
      ['--gap', 'calc(1rem + 2px)'],
    ])
  })

  it('las paletas de fábrica se pintan enteras', () => {
    const palettes = [clinica, terminal, historial, espacio, libre, bichota].flatMap(
      (theme) => theme.palettes ?? [],
    )

    expect(palettes.length).toBeGreaterThan(0)
    for (const palette of palettes) {
      expect(paintable(palette.vars)).toHaveLength(Object.keys(palette.vars).length)
    }
  })
})
