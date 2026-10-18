/**
 * Clics para el mapa de calor (#69 del buzón). Se juntan aquí y se mandan cada
 * minuto (y al ocultar la pestaña), por sección y sin texto:
 *
 * - la casilla de una rejilla normalizada sobre el contenido (`main`): 24
 *   columnas a lo ancho y filas de 40 px desde arriba, aparte en móvil y en
 *   ordenador, para que una coordenada signifique lo mismo con cualquier zoom
 *   o ancho de ventana;
 * - el elemento pulsado, como etiqueta y clase (`img.avatar`) y si se podía
 *   pulsar: muchos clics en algo que no hace nada dicen que la gente espera
 *   que haga algo.
 */

import type { ClickBatch, ClickLayout } from '@sanatorio/contracts'

import { api } from '../api'

const COLUMNS = 24
const ROW_PX = 40
const MAX_ROWS = 150
const FLUSH_EVERY_MS = 60_000
/** Lo que se puede pulsar: si el clic cae dentro, cuenta como pulsable. */
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="gridcell"], [tabindex]:not([tabindex="-1"])'
/** Clases de estado: no dicen qué es el elemento. */
const STATE = new Set(['active', 'on', 'off', 'me', 'selected', 'open', 'pinned', 'past', 'today'])

type Pending = { layout: ClickLayout; cells: Map<string, number>; elements: Map<string, number> }

let pending = new Map<string, Pending>()
let started = false

/** `img.avatar`: etiqueta y la primera clase que diga qué es. Sin texto, nunca. */
export function elementKey(element: Element): string {
  const tag = element.tagName.toLowerCase()
  const name = [...element.classList].find(
    (one) => !STATE.has(one) && /^[a-zA-Z0-9_-]{1,40}$/.test(one),
  )

  return name === undefined ? tag : `${tag}.${name}`
}

/** La sección abierta, de la dirección (`#/tablon/12` → `tablon`). */
function sectionNow(): string {
  const section = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? ''

  return section === '' ? 'expediente' : section
}

function onPointer(event: PointerEvent): void {
  const target = event.target instanceof Element ? event.target : null
  const main = document.querySelector('main')

  if (target === null || !main?.contains(target)) return

  const box = main.getBoundingClientRect()
  const x = Math.floor(((event.clientX - box.left) / Math.max(1, box.width)) * COLUMNS)
  const y = Math.min(MAX_ROWS - 1, Math.floor((event.clientY - box.top) / ROW_PX))

  if (x < 0 || x >= COLUMNS || y < 0) return

  const section = sectionNow()
  const layout: ClickLayout = window.innerWidth < 700 ? 'mobile' : 'desktop'
  const key = `${section}|${layout}`
  const bucket: Pending = pending.get(key) ?? {
    layout,
    cells: new Map<string, number>(),
    elements: new Map<string, number>(),
  }
  const pressable = target.closest(INTERACTIVE)
  const element = `${pressable === null ? 0 : 1}|${elementKey(pressable ?? target)}`

  bucket.cells.set(`${x},${y}`, Math.min(500, (bucket.cells.get(`${x},${y}`) ?? 0) + 1))
  bucket.elements.set(element, Math.min(500, (bucket.elements.get(element) ?? 0) + 1))
  pending.set(key, bucket)
}

function flush(): void {
  const batches: ClickBatch[] = [...pending.entries()].map(([key, bucket]) => ({
    section: key.split('|')[0] ?? 'expediente',
    layout: bucket.layout,
    cells: [...bucket.cells.entries()].slice(0, 400).map(([cell, n]) => {
      const [x = 0, y = 0] = cell.split(',').map(Number)

      return { x, y, n }
    }),
    elements: [...bucket.elements.entries()].slice(0, 150).map(([entry, n]) => {
      const [interactive = '0', element = 'div'] = entry.split('|')

      return { element, interactive: interactive === '1', n }
    }),
  }))

  pending = new Map()
  // Si algo falla, se pierde: es estadística, no hace falta reintentarlo.
  for (const batch of batches) void api.sendClicks(batch).catch(() => undefined)
}

/** Empieza a contar clics. Una sola vez. */
export function startClicks(): void {
  if (started) return

  started = true
  document.addEventListener('pointerdown', onPointer, { capture: true, passive: true })
  setInterval(flush, FLUSH_EVERY_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush()
  })
}
