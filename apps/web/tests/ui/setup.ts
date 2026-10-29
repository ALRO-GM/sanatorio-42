/**
 * Preparación de los tests de pantallas (`tests/ui`), que corren en jsdom.
 *
 * Pone la API de mentira con la sesión iniciada y rellena lo que jsdom no trae
 * y la web usa: ventanas `<dialog>`, `<canvas>`, `matchMedia`, observadores de
 * tamaño y de visibilidad y URLs de ficheros. En Node no hay `window` y no se
 * toca nada.
 */
import { cleanup } from '@testing-library/react'
import { afterAll, vi } from 'vitest'

/** Pone `value` en `target[name]` solo si no lo trae ya. */
function fill(target: object, name: string, value: unknown): void {
  if ((target as Record<string, unknown>)[name] === undefined) {
    Object.defineProperty(target, name, { value, configurable: true, writable: true })
  }
}

const noop = (): void => undefined

/**
 * Lo que se espera al acabar cada fichero antes de cerrar jsdom: más que la
 * respuesta más lenta de la API de mentira (`delay(350)`), con margen para una
 * cadena de dos.
 */
const SETTLE_MS = 1000

if (typeof window !== 'undefined') {
  vi.stubEnv('VITE_USE_MOCK', 'true')
  vi.stubEnv('VITE_MOCK_LOGGED_IN', 'true')

  const dialog = HTMLDialogElement.prototype

  fill(dialog, 'showModal', function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  fill(dialog, 'show', function show(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  fill(dialog, 'close', function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  })

  // Un lienzo que acepta cualquier orden de dibujo y no pinta nada.
  const context: unknown = new Proxy(
    {},
    {
      get: (_target, name) =>
        name === 'measureText'
          ? () => ({ width: 10 })
          : name === 'createLinearGradient' || name === 'createRadialGradient'
            ? () => ({ addColorStop: noop })
            : name === 'getImageData'
              ? () => ({ data: new Uint8ClampedArray(4) })
              : noop,
      set: () => true,
    },
  )

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => context })

  fill(window, 'matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
    dispatchEvent: () => false,
  }))

  class Observer {
    observe = noop
    unobserve = noop
    disconnect = noop
    takeRecords = (): never[] => []
  }

  fill(window, 'ResizeObserver', Observer)
  // jsdom no trae eventos de puntero: uno de ratón con su identificador y su tipo.
  fill(
    window,
    'PointerEvent',
    class PointerEvent extends MouseEvent {
      pointerId: number
      pointerType: string
      isPrimary: boolean

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerId = init.pointerId ?? 1
        this.pointerType = init.pointerType ?? 'mouse'
        this.isPrimary = init.isPrimary ?? true
      }
    },
  )
  fill(window, 'IntersectionObserver', Observer)
  Object.defineProperty(window, 'scrollTo', { value: noop, writable: true })
  fill(Element.prototype, 'scrollIntoView', noop)
  fill(URL, 'createObjectURL', () => 'blob:prueba')
  fill(URL, 'revokeObjectURL', noop)

  // Una respuesta de la API de mentira que llega después del último test hace
  // un `setState` en una pantalla ya desmontada. Si jsdom ya se ha cerrado, sin
  // `window`, React falla y vitest da el fichero por roto («window is not
  // defined», solo en la CI, que es más lenta). Se desmonta todo y se deja que
  // terminen antes de cerrar.
  afterAll(async () => {
    cleanup()
    await new Promise((resolve) => {
      setTimeout(resolve, SETTLE_MS)
    })
  })

  // Como `main.tsx`: los textos del idioma del navegador, antes de pintar. Sin
  // ellos, `I18nProvider` no pinta nada hasta que llegan.
  const { initialLang, loadLang } = await import('../../src/shared/i18n')

  await loadLang(initialLang())
}
