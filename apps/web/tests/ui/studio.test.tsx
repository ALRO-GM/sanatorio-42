/**
 * Personalizar, el estudio: la web en pequeño que se ordena arrastrando (con
 * el ratón, el dedo o el teclado) y el panel de opciones (estilo, orden y
 * ajustes). Lo que se mueve se guarda y la web de detrás cambia al momento.
 */

import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetPrefs } from '../../src/shared/layout/store'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
/** Un texto con sus huecos rellenos (`{name}`). */
const fill = (key: string, values: Record<string, string | number>): string =>
  text(key).replace(/\{(\w+)\}/g, (_match, name: string) => String(values[name]))

/** Lo guardado de la personalización. */
const saved = (): {
  mode: string
  categories?: string[]
  nav: string[]
  pages: Record<string, { order: string[]; folded: string[] }>
} => JSON.parse(localStorage.getItem('sanatorio_layout') ?? '{}') as ReturnType<typeof saved>

/** Las categorías de la vista previa, en orden. */
const miniCategories = (): string[] =>
  [...document.querySelectorAll('.mini-tabs li')].map((item) => item.textContent)

/** Las categorías de la web de verdad, detrás de la ventana. */
const realCategories = (): string[] =>
  [...document.querySelectorAll('nav.tabs .tab span:not(.tab-live)')].map(
    (span) => span.textContent,
  )

const CATEGORY_NAMES = (): string[] =>
  ['expediente', 'ayuda', 'calendario', 'clusters', 'datos'].map((id) => text(`nav.cat.${id}`))

async function openStudio(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await openApp('#/expediente')
  await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
  await user.click(await screen.findByRole('menuitem', { name: text('layout.open') }, WAIT))

  return screen.findByRole('group', { name: text('studio.preview') }, WAIT)
}

/**
 * jsdom no maqueta: cada elemento que se ordena recibe una caja según su
 * puesto. Las pestañas, en fila (100 px cada una); los bloques, en columna
 * (40 px cada uno).
 */
function stubLayout(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const item = this.closest<HTMLElement>('[data-sortable-id]')
    const index = item === null ? -1 : [...(item.parentElement?.children ?? [])].indexOf(item)
    const box = (x: number, y: number, width: number, height: number): DOMRect => ({
      x,
      y,
      left: x,
      top: y,
      width,
      height,
      right: x + width,
      bottom: y + height,
      toJSON: () => ({}),
    })

    if (index === -1) return box(0, 0, 0, 0)

    return item?.classList.contains('mini-block') === true
      ? box(0, index * 40, 300, 34)
      : box(index * 100, 0, 90, 30)
  })
}

/** Arrastra con el puntero desde `(x, y)` del asa, pasando por `path`, y suelta. */
async function pointerDrag(
  grip: HTMLElement,
  [x, y]: [number, number],
  path: [number, number][],
  during?: () => void,
): Promise<void> {
  const pointer = { pointerId: 7, button: 0, pointerType: 'mouse', isPrimary: true }

  await act(async () => {
    fireEvent.pointerDown(grip, { ...pointer, clientX: x, clientY: y })
    for (const [toX, toY] of path) {
      fireEvent.pointerMove(window, { ...pointer, clientX: toX, clientY: toY })
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  })
  during?.()
  const [endX, endY] = path.at(-1) ?? [x, y]

  await act(async () => {
    fireEvent.pointerUp(window, { ...pointer, clientX: endX, clientY: endY })
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

beforeEach(() => {
  resetPrefs()
})

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('Personalizar: el estudio', () => {
  it('se abre con la vista previa y salen todas las categorías, pestañas y bloques', async () => {
    const user = userEvent.setup()
    const mini = await openStudio(user)

    expect(screen.getByRole('tab', { name: text('studio.tab.style') })).toBeTruthy()
    expect(miniCategories()).toEqual(CATEGORY_NAMES())
    // Cada cosa que se mueve tiene su asa.
    for (const name of CATEGORY_NAMES()) {
      expect(within(mini).getByRole('button', { name: fill('studio.grab', { name }) })).toBeTruthy()
    }
    // El perfil, con la agenda y sus bloques con su título de verdad.
    expect(within(mini).getByRole('button', { name: text('nav.agenda') })).toBeTruthy()
    expect(within(mini).getByText(text('layout.expediente.health'))).toBeTruthy()
    // Datos: sus tres pestañas; la red, con sus bloques.
    await user.click(within(mini).getByRole('button', { name: text('nav.cat.datos') }))
    for (const id of ['red', 'avance', 'examenes']) {
      expect(within(mini).getByRole('button', { name: text(`nav.${id}`) })).toBeTruthy()
    }
    expect(within(mini).getByText(text('layout.red.endogamy'))).toBeTruthy()
    // Una página sin bloques lo dice.
    await user.click(within(mini).getByRole('button', { name: text('nav.avance') }))
    expect(within(mini).getByText(text('studio.noBlocks'))).toBeTruthy()
    // El on-call no es una pestaña: se abre desde su botón.
    await user.click(within(mini).getByRole('button', { name: text('nav.guardia') }))
    expect(within(mini).getByText(text('layout.guardia.prereview'))).toBeTruthy()
    // «Listo» cierra.
    await user.click(screen.getByRole('button', { name: text('layout.done') }))
    expect(screen.queryByRole('group', { name: text('studio.preview') })).toBeNull()
  }, 30_000)

  it('teclado: Espacio coge, las flechas mueven, Espacio suelta y Escape cancela', async () => {
    const user = userEvent.setup()
    const mini = await openStudio(user)
    const clusters = text('nav.cat.clusters')
    const live = must(document.querySelector('[aria-live]:not([data-dock-said])'), 'la región viva')

    within(mini)
      .getByRole('button', { name: fill('studio.grab', { name: clusters }) })
      .focus()
    await user.keyboard(' ')
    expect(live.textContent).toBe(fill('studio.lift', { name: clusters, pos: 4, total: 5 }))
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(live.textContent).toBe(fill('studio.move', { name: clusters, pos: 2, total: 5 }))
    // Mientras está cogido, nada se ha guardado todavía.
    expect(saved().categories).toBeUndefined()
    await user.keyboard(' ')
    expect(live.textContent).toBe(fill('studio.drop', { name: clusters, pos: 2, total: 5 }))

    const [first, ayuda, calendario, , datos] = CATEGORY_NAMES()
    const expected = [first, clusters, ayuda, calendario, datos]

    expect(miniCategories()).toEqual(expected)
    expect(saved().categories).toEqual(['expediente', 'clusters', 'ayuda', 'calendario', 'datos'])
    // La web de detrás ya va en ese orden.
    expect(realCategories()).toEqual(expected)
    // El asa sigue con el foco para seguir moviendo.
    expect(document.activeElement?.getAttribute('aria-label')).toBe(
      fill('studio.grab', { name: clusters }),
    )

    // Escape devuelve a su sitio sin guardar ni cerrar la ventana.
    await user.keyboard(' {ArrowRight}{ArrowRight}{Escape}')
    expect(live.textContent).toBe(fill('studio.cancel', { name: clusters, pos: 2, total: 5 }))
    expect(miniCategories()).toEqual(expected)
    expect(saved().categories).toEqual(['expediente', 'clusters', 'ayuda', 'calendario', 'datos'])
    expect(screen.getByRole('group', { name: text('studio.preview') })).toBeTruthy()
  }, 30_000)

  it('puntero: se arrastra una categoría por el asa y se guarda al soltar', async () => {
    const user = userEvent.setup()
    const mini = await openStudio(user)

    stubLayout()
    const grip = within(mini).getByRole('button', {
      name: fill('studio.grab', { name: text('nav.cat.clusters') }),
    })

    // De la cuarta (x 300-390) a encima de la mitad izquierda de la segunda.
    await pointerDrag(
      grip,
      [305, 15],
      [
        [315, 15],
        [200, 15],
        [120, 15],
      ],
    )
    expect(saved().categories).toEqual(['expediente', 'clusters', 'ayuda', 'calendario', 'datos'])
    expect(realCategories()[1]).toBe(text('nav.cat.clusters'))
    // Un clic sin moverse no arrastra: abre la categoría.
    await user.click(within(mini).getByRole('button', { name: text('nav.cat.ayuda') }))
    expect(within(mini).getByRole('button', { name: text('nav.tablon') })).toBeTruthy()
    expect(saved().categories?.[2]).toBe('ayuda')
  }, 30_000)

  it('bloques: al cogerlos se pliegan todos y al soltar se despliegan y se guardan', async () => {
    const user = userEvent.setup()
    const mini = await openStudio(user)

    // El perfil de detrás, con sus bloques ya pintados.
    await waitFor(
      () => {
        expect(document.querySelector('.block[data-feedback^="expediente."]')).not.toBeNull()
      },
      { timeout: 10_000 },
    )
    stubLayout()
    const list = must(mini.querySelector('.mini-blocks'), 'la lista de bloques')
    const grip = within(mini).getByRole('button', {
      name: fill('studio.grab', { name: text('layout.expediente.ranking') }),
    })

    // El quinto (y 160-194) arriba del todo.
    await pointerDrag(
      grip,
      [10, 170],
      [
        [10, 180],
        [10, 60],
        [10, 5],
      ],
      () => {
        expect(list.className).toContain('is-sorting')
        expect(document.querySelector('.mini-ghost')?.textContent).toBe(
          text('layout.expediente.ranking'),
        )
      },
    )
    expect(list.className).not.toContain('is-sorting')
    expect(document.querySelector('.mini-ghost')).toBeNull()
    expect(saved().pages.expediente?.order).toEqual([
      'ranking',
      'record',
      'health',
      'network',
      'achievements',
    ])
    // Los bloques de la página de detrás siguen ese orden.
    const real = [...document.querySelectorAll('.block[data-feedback^="expediente."]')].map(
      (block) => block.getAttribute('data-feedback')?.slice('expediente.'.length) ?? '',
    )

    expect(real.length).toBeGreaterThan(0)
    expect(real).toEqual(
      must(saved().pages.expediente, 'el perfil').order.filter((id) => real.includes(id)),
    )

    // Plegar desde la tarjeta.
    await user.click(
      within(mini).getByRole('button', {
        name: fill('studio.fold', { name: text('layout.expediente.health') }),
      }),
    )
    expect(saved().pages.expediente?.folded).toEqual(['health'])
    expect(
      within(mini)
        .getByRole('button', {
          name: fill('studio.unfold', { name: text('layout.expediente.health') }),
        })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  }, 30_000)

  it('con el orden automático, mover algo pasa a «a mano» sin que salte lo demás', async () => {
    const user = userEvent.setup()
    const mini = await openStudio(user)

    await user.click(screen.getByRole('tab', { name: text('studio.tab.order') }))
    await user.click(screen.getByRole('radio', { name: new RegExp(text('layout.mode.mine')) }))
    expect(saved().mode).toBe('mine')
    expect(screen.getByText(text('studio.autoNote'))).toBeTruthy()

    within(mini)
      .getByRole('button', { name: fill('studio.grab', { name: text('nav.cat.datos') }) })
      .focus()
    await user.keyboard(' {ArrowLeft} ')
    expect(saved().mode).toBe('manual')
    // Lo que se veía queda guardado tal cual: las pestañas y los bloques de cada página.
    expect(saved().nav.length).toBeGreaterThan(5)
    expect(Object.keys(saved().pages)).toEqual(['expediente', 'guardia', 'red'])
    expect(screen.queryByText(text('studio.autoNote'))).toBeNull()

    // Volver al orden de fábrica.
    await user.click(screen.getByRole('button', { name: text('layout.reset') }))
    expect(saved().categories).toBeUndefined()
  }, 30_000)

  it('estilo: cada estilo y cada paleta se aplican al momento, igual en todos', async () => {
    const user = userEvent.setup()

    await openStudio(user)
    const root = document.documentElement

    await user.click(screen.getByRole('radio', { name: /^Terminal/ }))
    expect(root.dataset.style).toBe('terminal')
    // Las paletas de Terminal (los temas de VS Code), como muestras de color.
    await user.click(screen.getByRole('radio', { name: 'Dracula' }))
    expect(JSON.parse(localStorage.getItem('sanatorio_palette') ?? '{}')).toMatchObject({
      terminal: 'dracula',
    })
    expect(screen.getByRole('group', { name: /Dracula/ })).toBeTruthy()

    // A tu color: las suyas, igual.
    await user.click(screen.getByRole('radio', { name: /^A tu color/ }))
    expect(root.dataset.style).toBe('libre')
    await user.click(screen.getByRole('radio', { name: 'Coral' }))
    expect(root.style.getPropertyValue('--hue')).toBe('30')

    // Un estilo sin paletas no enseña ninguna.
    await user.click(screen.getByRole('radio', { name: /^Clean code/ }))
    expect(root.dataset.style).toBe('clinica')
    expect(screen.queryByRole('radio', { name: 'Coral' })).toBeNull()

    // Tema claro u oscuro.
    await user.click(screen.getByRole('button', { name: text('settings.theme.dark') }))
    expect(root.dataset.theme).toBe('dark')
    await user.click(screen.getByRole('button', { name: text('settings.theme.auto') }))
    await settle(100)
  }, 30_000)

  it('ajustes: modo de la interfaz, avisos, iconos de ayuda e idioma', async () => {
    const user = userEvent.setup()

    await openStudio(user)
    await user.click(screen.getByRole('tab', { name: text('studio.tab.settings') }))
    await user.selectOptions(
      screen.getByRole('combobox', { name: text('layout.alerts.lead') }),
      '15',
    )
    expect(JSON.parse(localStorage.getItem('sanatorio_layout') ?? '{}')).toMatchObject({
      alertLead: 15,
    })
    await user.click(screen.getByRole('checkbox', { name: text('layout.tips.show') }))
    expect(JSON.parse(localStorage.getItem('sanatorio_layout') ?? '{}')).toMatchObject({
      tips: false,
    })
    await user.click(screen.getByRole('radio', { name: new RegExp(text('settings.detail.datos')) }))
    expect(localStorage.getItem('sanatorio_detail')).toBe('datos')
    await user.click(
      screen.getByRole('radio', { name: new RegExp(text('settings.detail.normal')) }),
    )
    expect(screen.getAllByRole('combobox', { name: text('settings.lang') }).length).toBeGreaterThan(
      0,
    )
  }, 30_000)

  it('«Ordenar o plegar estos bloques» abre el estudio en la pestaña del orden', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.click(
      await screen.findByRole('button', { name: text('layout.customizeHere') }, WAIT),
    )
    expect(
      (await screen.findByRole('tab', { name: text('studio.tab.order') }, WAIT)).getAttribute(
        'aria-selected',
      ),
    ).toBe('true')
  }, 30_000)
})
