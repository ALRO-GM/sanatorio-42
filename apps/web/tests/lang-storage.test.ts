/**
 * El idioma con el que arranca la web (`initialLang`): el guardado, si es un
 * idioma; si no, el del navegador; y con el almacenamiento bloqueado no rompe
 * el arranque (se llama antes de pintar nada, en `main.tsx`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { initialLang, isLang } from '../src/shared/i18n'

const storage = (value: string | null) => ({ getItem: () => value })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('idioma inicial', () => {
  it('el guardado manda sobre el del navegador', () => {
    vi.stubGlobal('localStorage', storage('eu'))
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(initialLang()).toBe('eu')
  })

  it('sin guardar, el del navegador; si no lo tenemos, español', () => {
    vi.stubGlobal('localStorage', storage(null))
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    expect(initialLang()).toBe('fr')
    vi.stubGlobal('navigator', { language: 'de-DE' })
    expect(initialLang()).toBe('es')
    vi.stubGlobal('navigator', { language: '' })
    expect(initialLang()).toBe('es')
  })

  it('lo guardado que no es un idioma no vale, tampoco lo heredado de Object', () => {
    vi.stubGlobal('navigator', { language: 'en-GB' })
    for (const value of ['constructor', 'toString', '__proto__', 'ES', 'xx', '']) {
      vi.stubGlobal('localStorage', storage(value))
      expect(initialLang(), value).toBe('en')
      expect(isLang(value), value).toBe(false)
    }
  })

  it('con el almacenamiento bloqueado, arranca con el del navegador', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    })
    vi.stubGlobal('navigator', { language: 'ca-ES' })
    expect(initialLang()).toBe('ca')
  })
})
