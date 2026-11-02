/**
 * La portada pública (`docs/seo.md`): lo que ven los buscadores y quien llega
 * sin cuenta de 42.
 *
 * La web de verdad está detrás del inicio de sesión y sus rutas van con `#/…`,
 * que los buscadores no cuentan como páginas. Así que al compilar se generan
 * aparte, en HTML sin JavaScript:
 *
 * - una portada por idioma (`/es/`, `/en/`…), enlazadas entre sí con
 *   `hreflang`, que cuentan qué es Peer4U y llevan a entrar;
 * - `robots.txt`, que deja fuera la API y la demostración;
 * - `sitemap.xml`, con la entrada y las portadas.
 *
 * Los textos salen de las tablas, como los de la web (`textos/portada/`, y
 * algunos de las de la web, que ya están traducidos). En la demostración no se
 * genera nada: vive en `/demo/` y no tiene portada propia.
 */

import { readFileSync } from 'node:fs'

import { LANG_CODES, dictionaryOf, readGroup } from './textos.ts'
import type { LangCode } from './textos.ts'

/** La dirección buena: la de los enlaces canónicos y el sitemap. */
export const SITE = 'https://peer4u.app'

/** Quien hace la web, enlazado a su perfil de la intra. */
const AUTHOR = 'albrodri'

/** Cada idioma en su idioma, para el selector. */
const LANG_NAMES: Record<LangCode, string> = {
  es: 'Español',
  en: 'English',
  ca: 'Català',
  eu: 'Euskara',
  fr: 'Français',
}

/** Para `og:locale`. */
const LOCALES: Record<LangCode, string> = {
  es: 'es_ES',
  en: 'en_GB',
  ca: 'ca_ES',
  eu: 'eu_ES',
  fr: 'fr_FR',
}

/** Lo que se ofrece: título y explicación, por clave. */
const FEATURES = [
  ['nav.consulta', 'portada.peers'],
  ['nav.tablon', 'portada.projects'],
  ['portada.groups', 'portada.groupsText'],
  ['nav.guardia', 'portada.oncall'],
  ['nav.cat.aprender', 'portada.learn'],
  ['nav.cat.campus', 'portada.campus'],
] as const

const QUESTIONS = ['who', 'where', 'official', 'price', 'data'] as const

/** La dirección de la portada de un idioma. */
export const landingPath = (lang: LangCode): string => `/${lang}/`

const escape = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/**
 * Los textos de un idioma, con lo que no esté traducido en español. Mezcla los
 * de la web (`login.button`, `nav.*`…) con los de la portada.
 */
function textsOf(lang: LangCode): (key: string) => string {
  const rows = [...readGroup(''), ...readGroup('portada')]
  const own = dictionaryOf(rows, lang)
  const spanish = dictionaryOf(rows, 'es')

  return (key) => {
    const text = own[key] ?? spanish[key]

    if (text === undefined) throw new Error(`La portada pide «${key}», que no está en las tablas`)

    return text
  }
}

/** El enlace al perfil de quien la hace, en el hueco `{author}` de un texto ya escapado. */
const withAuthor = (text: string): string =>
  escape(text).replace(
    '{author}',
    `<a href="https://profile.intra.42.fr/users/${AUTHOR}" rel="author">${AUTHOR}</a>`,
  )

/** Lo que leen los buscadores sobre la web: qué es, de quién y cuánto cuesta. */
function structuredData(lang: LangCode, t: (key: string) => string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Peer4U',
    alternateName: ['Peer 4 U', 'Peer for you'],
    url: `${SITE}/`,
    description: t('portada.description'),
    inLanguage: lang,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: { '@type': 'Person', name: AUTHOR, url: `https://profile.intra.42.fr/users/${AUTHOR}` },
  }

  // Un `<` dentro del JSON cerraría el `<script>` antes de tiempo.
  return JSON.stringify(data).replaceAll('<', '\\u003c')
}

/** La portada de un idioma, entera. */
export function landingPage(lang: LangCode): string {
  const t = textsOf(lang)
  const url = `${SITE}${landingPath(lang)}`

  const alternates = [
    ...LANG_CODES.map(
      (code) => `<link rel="alternate" hreflang="${code}" href="${SITE}${landingPath(code)}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${SITE}${landingPath('es')}" />`,
  ]

  const langs = LANG_CODES.map((code) =>
    code === lang
      ? `<a aria-current="page" lang="${code}">${LANG_NAMES[code]}</a>`
      : `<a href="${landingPath(code)}" hreflang="${code}" lang="${code}">${LANG_NAMES[code]}</a>`,
  )

  const features = FEATURES.map(
    ([title, text]) => `<li><h3>${escape(t(title))}</h3><p>${escape(t(text))}</p></li>`,
  )

  const questions = QUESTIONS.map((id) => {
    const answer = withAuthor(t(`portada.faq.${id}.a`))
    const privacy =
      id === 'data' ? ` <a href="/?lang=${lang}#/privacidad">${escape(t('legal.link'))}</a>` : ''

    return `<h3>${escape(t(`portada.faq.${id}.q`))}</h3><p>${answer}${privacy}</p>`
  })

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escape(t('portada.title'))}</title>
    <meta name="description" content="${escape(t('portada.description'))}" />
    <link rel="canonical" href="${url}" />
    ${alternates.join('\n    ')}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="theme-color" content="#00babc" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Peer4U" />
    <meta property="og:title" content="${escape(t('portada.title'))}" />
    <meta property="og:description" content="${escape(t('portada.description'))}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${LOCALES[lang]}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escape(t('portada.imageAlt'))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/portada.css" />
    <script type="application/ld+json">${structuredData(lang, t)}</script>
  </head>
  <body>
    <header>
      <a class="brand" href="${landingPath(lang)}"><img src="/favicon.svg" alt="" width="36" height="36" />Peer4U</a>
      <nav aria-label="${escape(t('settings.lang'))}">${langs.join('')}</nav>
    </header>
    <main>
      <section class="hero">
        <h1>Peer4U</h1>
        <p class="lead">${escape(t('portada.lead'))}</p>
        <p class="actions">
          <a class="primary" href="/?lang=${lang}">${escape(t('login.button'))}</a>
          <a href="/demo/">${escape(t('login.demo'))}</a>
        </p>
      </section>
      <section>
        <h2>${escape(t('portada.what'))}</h2>
        <ul class="features">${features.join('')}</ul>
      </section>
      <section class="faq">
        <h2>${escape(t('portada.faq'))}</h2>
        ${questions.join('\n        ')}
      </section>
    </main>
    <footer>
      <p>${withAuthor(t('app.footer'))} · <a href="/?lang=${lang}#/privacidad">${escape(t('legal.link'))}</a></p>
    </footer>
  </body>
</html>
`
}

/** Lo que pueden mirar los buscadores: todo menos la API y la demostración. */
export function robots(): string {
  return `User-agent: *
Disallow: /api/
Disallow: /demo/

Sitemap: ${SITE}/sitemap.xml
`
}

/** La entrada y las portadas de cada idioma. */
export function sitemap(): string {
  const urls = ['/', ...LANG_CODES.map(landingPath)].map(
    (path) => `  <url><loc>${SITE}${path}</loc></url>`,
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
}

/** Plugin de Vite: al compilar la web (no la demostración), deja estos ficheros en `dist/`. */
export function portadaPlugin() {
  let demo = false

  return {
    name: 'peer4u-portada',
    apply: 'build' as const,
    configResolved(config: { mode: string }): void {
      demo = config.mode === 'demo'
    },
    generateBundle(this: {
      emitFile: (file: { type: 'asset'; fileName: string; source: string }) => void
    }): void {
      if (demo) return

      for (const lang of LANG_CODES) {
        this.emitFile({ type: 'asset', fileName: `${lang}/index.html`, source: landingPage(lang) })
      }
      this.emitFile({
        type: 'asset',
        fileName: 'portada.css',
        source: readFileSync(new URL('portada.css', import.meta.url), 'utf8'),
      })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() })
    },
  }
}
