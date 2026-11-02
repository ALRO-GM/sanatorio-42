/**
 * La portada pública (`tools/portada.ts`): una página por idioma que leen los
 * buscadores, con el `robots.txt` y el `sitemap.xml` que la acompañan.
 */

import { describe, expect, it } from 'vitest'

import { SITE, landingPage, landingPath, robots, sitemap } from '../tools/portada'
import { LANG_CODES } from '../tools/textos'

/** Lo que captura el primer grupo de un patrón, o nada. */
const capture = (html: string, pattern: RegExp): string => pattern.exec(html)?.[1] ?? ''

describe('portada pública', () => {
  it('cada idioma tiene la suya, en su idioma y con su dirección canónica', () => {
    for (const lang of LANG_CODES) {
      const html = landingPage(lang)

      expect(html, lang).toContain(`<html lang="${lang}">`)
      expect(html, lang).toContain(`<link rel="canonical" href="${SITE}/${lang}/" />`)
      // Se enlazan todas entre sí, y la de reserva es la española.
      for (const other of LANG_CODES) {
        expect(html, `${lang} → ${other}`).toContain(
          `hreflang="${other}" href="${SITE}${landingPath(other)}"`,
        )
      }
      expect(html, lang).toContain(`hreflang="x-default" href="${SITE}/es/"`)
      // El botón lleva a la web en ese idioma.
      expect(html, lang).toContain(`href="/?lang=${lang}"`)
    }
  })

  it('título y descripción caben en el resultado de un buscador', () => {
    for (const lang of LANG_CODES) {
      const html = landingPage(lang)
      const title = capture(html, /<title>([^<]*)<\/title>/)
      const description = capture(html, /<meta name="description" content="([^"]*)"/)

      expect(title.length, lang).toBeGreaterThan(10)
      expect(title.length, lang).toBeLessThanOrEqual(65)
      expect(description.length, lang).toBeGreaterThan(50)
      expect(description.length, lang).toBeLessThanOrEqual(160)
    }
  })

  it('no se queda ningún hueco ni clave sin texto, y el autor va enlazado', () => {
    for (const lang of LANG_CODES) {
      const html = landingPage(lang)

      expect(html, lang).not.toMatch(/\{\w+\}/)
      expect(html, lang).not.toMatch(/>(portada|nav|login|legal)\.[\w.]+</)
      expect(html, lang).toContain('href="https://profile.intra.42.fr/users/albrodri"')
    }
  })

  it('los textos traducidos salen en su idioma', () => {
    expect(landingPage('en')).toContain('Sign in with 42')
    expect(landingPage('es')).toContain('Entrar con 42')
    expect(landingPage('fr')).toContain('Questions fréquentes')
  })

  it('los datos para buscadores son JSON válido y dicen cómo se llama la web', () => {
    for (const lang of LANG_CODES) {
      const json = capture(
        landingPage(lang),
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )
      const data = JSON.parse(json) as { name: string; inLanguage: string; url: string }

      expect(data.name).toBe('Peer4U')
      expect(data.inLanguage).toBe(lang)
      expect(data.url).toBe(`${SITE}/`)
    }
  })

  it('no lleva JavaScript: la política de contenido no deja scripts en línea', () => {
    for (const lang of LANG_CODES) {
      const scripts = [...landingPage(lang).matchAll(/<script([^>]*)>/g)].map((match) => match[1])

      expect(scripts, lang).toEqual([' type="application/ld+json"'])
    }
  })

  it('robots deja fuera la API y la demostración, y apunta al sitemap', () => {
    const text = robots()

    expect(text).toContain('Disallow: /api/')
    expect(text).toContain('Disallow: /demo/')
    expect(text).not.toMatch(/Disallow: \/\s*$/m)
    expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  it('el sitemap tiene la entrada y cada portada, una vez', () => {
    const urls = [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])

    expect(urls).toEqual([`${SITE}/`, ...LANG_CODES.map((lang) => `${SITE}/${lang}/`)])
  })
})
