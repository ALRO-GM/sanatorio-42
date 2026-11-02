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

  it('el que pide la dirección (`/?lang=en`, desde las portadas) manda y se guarda', () => {
    const saved: string[] = []

    vi.stubGlobal('localStorage', {
      getItem: () => 'eu',
      setItem: (_key: string, value: string) => saved.push(value),
    })
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    vi.stubGlobal('window', { location: { search: '?lang=en' } })
    expect(initialLang()).toBe('en')
    expect(saved).toEqual(['en'])

    // Uno que no es un idioma no cuenta ni se guarda.
    for (const search of ['?lang=xx', '?lang=constructor', '?lang=', '?idioma=en', '']) {
      vi.stubGlobal('window', { location: { search } })
      expect(initialLang(), search).toBe('eu')
    }
    expect(saved).toEqual(['en'])
  })

  it('el de la dirección vale aunque no se pueda guardar', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    })
    vi.stubGlobal('navigator', { language: 'es-ES' })
    vi.stubGlobal('window', { location: { search: '?lang=ca' } })
    expect(initialLang()).toBe('ca')
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
