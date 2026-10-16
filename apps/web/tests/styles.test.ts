/**
 * Estilos: los exclusivos solo salen en el selector de su dueña.
 */

import { describe, expect, it } from 'vitest'

import { canUseStyle, EXCLUSIVE_STYLES, PUBLIC_STYLES } from '../src/themes/ids'

describe('estilos exclusivos', () => {
  it('bichota es solo de acamelo', () => {
    expect(EXCLUSIVE_STYLES.bichota).toEqual(['acamelo'])
    expect(canUseStyle('bichota', 'acamelo')).toBe(true)
    expect(canUseStyle('bichota', 'albrodri')).toBe(false)
    expect(canUseStyle('bichota', '')).toBe(false)
  })

  it('los de todo el mundo, cualquiera; un exclusivo no es también público', () => {
    for (const style of PUBLIC_STYLES) expect(canUseStyle(style, 'cualquiera')).toBe(true)
    for (const style of Object.keys(EXCLUSIVE_STYLES)) {
      expect(PUBLIC_STYLES as readonly string[]).not.toContain(style)
    }
  })
})
