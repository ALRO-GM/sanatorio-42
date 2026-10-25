/**
 * Qué sitio de la web hay debajo de la burbuja de sugerencias
 * (`docs/sugerencias.md`), sin React.
 *
 * Se busca el contenedor con sentido más cercano al punto: algo marcado con
 * `data-feedback`, una tarjeta, un bloque, una sección, una ventana… Su nombre
 * es su `aria-label` o su primer título; si no tiene, el del contenedor de
 * fuera. No se lee nada más de la página: ni textos sueltos ni capturas.
 */

/** Lo que se puede señalar: de lo más marcado a lo más genérico. */
const CONTAINERS = [
  '[data-feedback]',
  '.card',
  '.block',
  'section',
  'article',
  'dialog',
  'form',
  'fieldset',
  'table',
  'figure',
  'footer',
  'nav[aria-label]',
  '[role="dialog"]',
  '[role="region"]',
].join(', ')

/**
 * Dónde vive el nombre de un contenedor, si no lo dice su `aria-label`: un
 * título suyo, no uno de algo que lleva dentro (el de un certificado dentro
 * de la tarjeta del perfil no es el nombre de la tarjeta).
 */
const HEADINGS = [
  ':scope > :is(h1, h2, h3, h4, .block-head, legend, caption)',
  ':scope > :is(header, div:first-child) > :is(h1, h2, h3, h4)',
].join(', ')

/** Lo de la propia burbuja: no se señala a sí misma. */
const OWN = '.suggest-panel, .suggest-ghost, .suggest-bubble'

/** Largo máximo del nombre (como la API). */
const LABEL_MAX = 80

export type Spot = {
  /** El contenedor que se resalta. */
  element: Element
  /** Su nombre, o `null` si no tiene ninguno a la vista. */
  label: string | null
  /** El `data-feedback` más cercano (`cabecera`, `expediente.health`), si lo hay. */
  anchor: string | null
  /** Su ruta en el documento, para quien administra. */
  selector: string
}

/** Un texto en una línea, sin caracteres de control y cortado si es largo. */
export function clean(text: string, max = LABEL_MAX): string {
  const flat = text
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/**
 * El texto que se lee de un título, sin lo decorativo (flechas, iconos con
 * `aria-hidden`) ni los botones que lleva al lado (el `InfoTip`).
 */
function visibleText(heading: Element): string {
  const copy = heading.cloneNode(true) as Element

  for (const extra of copy.querySelectorAll('[aria-hidden="true"], button, svg')) extra.remove()

  // Trozo a trozo y con espacios: dos `<span>` seguidos no se pegan.
  const pieces: string[] = []
  const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    pieces.push(node.textContent ?? '')
  }

  return pieces.join(' ')
}

/** El nombre de un contenedor: su `aria-label` o su primer título. */
function nameOf(element: Element): string | null {
  const aria = element.getAttribute('aria-label')

  if (aria !== null && aria.trim() !== '') return clean(aria)

  const heading = element.querySelector(HEADINGS)
  const text = heading === null ? '' : clean(visibleText(heading))

  return text === '' ? null : text
}

/** Un trozo de ruta de CSS: solo letras, números, guiones y subrayados. */
const SAFE = /^[A-Za-z][\w-]*$/

/**
 * La ruta de un elemento, de fuera hacia dentro, hasta cinco niveles o hasta
 * algo con `data-feedback` o `id` (lo que no cambia de una visita a otra).
 */
export function pathOf(element: Element): string {
  const parts: string[] = []
  let node: Element | null = element

  while (node !== null && node.tagName !== 'BODY' && parts.length < 5) {
    const anchor = node.getAttribute('data-feedback')

    if (anchor !== null && /^[\w.-]+$/.test(anchor)) {
      parts.unshift(`[data-feedback="${anchor}"]`)
      break
    }
    if (SAFE.test(node.id)) {
      parts.unshift(`#${node.id}`)
      break
    }

    const tag = node.tagName.toLowerCase()
    const kind = [...node.classList].find((name) => SAFE.test(name))
    const parent: Element | null = node.parentElement
    const same =
      parent === null ? [] : [...parent.children].filter((c) => c.tagName === node?.tagName)
    const nth = same.length > 1 ? `:nth-of-type(${same.indexOf(node) + 1})` : ''

    parts.unshift(`${tag}${kind === undefined ? '' : `.${kind}`}${nth}`)
    node = parent
  }

  return parts.join(' > ').slice(0, 300)
}

/**
 * El sitio que hay debajo de `target` (lo que da `elementFromPoint`), o `null`
 * si no hay nada que señalar (fuera de la página, o la propia burbuja).
 */
export function detect(target: Element | null): Spot | null {
  // Sin nada debajo (`target` nulo) también sale `undefined !== null`.
  if (target?.closest(OWN) !== null) return null

  const element = target.closest(CONTAINERS)

  if (element === null) return null

  let label: string | null = null

  for (
    let node: Element | null = element;
    node !== null && label === null;
    node = node.parentElement?.closest(CONTAINERS) ?? null
  ) {
    label = nameOf(node)
  }

  return {
    element,
    label,
    anchor: element.closest('[data-feedback]')?.getAttribute('data-feedback') ?? null,
    selector: pathOf(element),
  }
}

/** Sitios marcados que no tienen título propio: su nombre está en los textos. */
const PARTS: Readonly<Record<string, string>> = {
  cabecera: 'suggest.part.header',
  pie: 'suggest.part.footer',
  'tablon.graph': 'suggest.part.graph',
  'clusters.map': 'suggest.part.map',
}

/** El nombre que se enseña de un sitio: el marcado, el detectado o el de la sección. */
export function spotLabel(spot: Spot | null, section: string, t: (key: string) => string): string {
  const anchor = spot?.anchor ?? null
  const key = anchor === null ? undefined : PARTS[anchor]
  const label = spot?.label ?? null
  // El propio sitio marcado se llama por su nombre de los textos, aunque
  // dentro haya un título (el plano lleva el de su leyenda, por ejemplo).
  const own = key !== undefined && spot?.element.getAttribute('data-feedback') === anchor

  if (key !== undefined && (own || label === null)) return t(key)

  return label ?? t(`nav.${section}`)
}
