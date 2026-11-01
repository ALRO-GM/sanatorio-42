import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reloadDetail } from '../../src/shared/detail'
import { must } from './must'
import { answerGates, openApp, settle } from './render'

// Las propuestas de la revisión de la UX (2026-11, `docs/revision-2026-11/ux.md`)
// que Alberto aprobó: la lista antes que el mapa en el móvil, el editor de
// franjas recogido, la bienvenida corta, Peer to peer que recuerda el proyecto
// y la cabecera de cada bloque como su título.

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const peersTitle = (project: string): string => text('peers.title').replace('{project}', project)

/** Hace como si la ventana tuviera el ancho de un móvil (390 px). */
function phone(): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

/** `true` si `first` va antes que `second` en la página. */
function before(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

/** Cambia de sección por la dirección, como el botón de atrás o un enlace. */
async function goTo(hash: string): Promise<void> {
  await act(async () => {
    window.location.hash = hash
    await new Promise((resolve) => setTimeout(resolve, 400))
  })
}

beforeEach(() => {
  localStorage.removeItem('sanatorio_detail')
  reloadDetail()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  cleanup()
})

describe('Peer to peer en el móvil', () => {
  it('en el escritorio, el mapa va antes que la gente; en el móvil, después', async () => {
    const user = userEvent.setup()

    await openApp('#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    const map = await screen.findByRole('region', { name: text('map.title') }, WAIT)

    expect(before(map, must(document.querySelector('ul.peer-list'), 'la lista'))).toBe(true)
    cleanup()

    phone()
    await openApp('#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    const mobileMap = await screen.findByRole('region', { name: text('map.title') }, WAIT)

    expect(before(must(document.querySelector('ul.peer-list'), 'la lista'), mobileMap)).toBe(true)
  }, 20_000)
})

describe('Peer to peer recuerda el proyecto', () => {
  it('se sigue en él al volver de otra sección; «Volver» lo olvida', async () => {
    const user = userEvent.setup()

    await openApp('#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    expect(await screen.findByRole('heading', { name: peersTitle('ft_printf') }, WAIT)).toBeTruthy()
    // La dirección lo dice, sin otra entrada en el historial.
    expect(window.location.hash).toBe('#/consulta/1314')

    await goTo('#/guardia')
    expect(screen.queryByRole('heading', { name: peersTitle('ft_printf') })).toBeNull()
    await goTo('#/consulta')
    expect(await screen.findByRole('heading', { name: peersTitle('ft_printf') }, WAIT)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('app.back') }))
    expect(await screen.findByRole('button', { name: 'get_next_line' }, WAIT)).toBeTruthy()
    expect(window.location.hash).toBe('#/consulta')

    await goTo('#/guardia')
    await goTo('#/consulta')
    expect(await screen.findByRole('button', { name: 'get_next_line' }, WAIT)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: peersTitle('ft_printf') })).toBeNull()
  }, 20_000)

  it('un enlace con el proyecto lo abre; uno que no es tuyo o no es un número deja la lista', async () => {
    await openApp('#/consulta/1337')
    expect(
      await screen.findByRole('heading', { name: peersTitle('get_next_line') }, WAIT),
    ).toBeTruthy()
    cleanup()

    for (const odd of ['#/consulta/99999', '#/consulta/abc', '#/consulta/1e3', '#/consulta/-1']) {
      await openApp(odd)
      expect(await screen.findByRole('button', { name: 'ft_printf' }, WAIT)).toBeTruthy()
      cleanup()
    }
  }, 20_000)
})

describe('on-call: el editor de franjas, recogido', () => {
  it('enseña de ahora a unas horas más y lo que tengas más tarde; se abre para ver el resto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 11, 10))
    const user = userEvent.setup()

    await openApp('#/guardia')
    const grid = await screen.findByRole('group', { name: text('help.today') }, WAIT)
    const slot = (time: string): HTMLElement | null =>
      within(grid).queryByRole('button', { name: new RegExp(`^${time}–`) })
    // Si hay una sesión sin valorar, primero se valora (si no, no deja ofrecerse).
    const pending = document.querySelector<HTMLButtonElement>('.rating-options button')

    if (pending !== null) await user.click(pending)
    await waitFor(() => {
      expect((slot('12:00') as HTMLButtonElement | null)?.disabled).toBe(false)
    })

    expect(slot('11:00')).toBeTruthy()
    expect(slot('14:30')).toBeTruthy()
    expect(slot('20:00')).toBeNull()
    expect(slot('23:30')).toBeNull()

    const more = screen.getByRole('button', { name: text('help.wholeDay') })

    expect(more.getAttribute('aria-expanded')).toBe('false')
    await user.click(more)
    expect(slot('20:00')).toBeTruthy()
    expect(slot('23:30')).toBeTruthy()
    // Algo a las 20:00 hace que, recogido, salga esa hora (y nada entre medias).
    // Con el teclado (el arrastre necesita saber qué hay bajo el puntero).
    must(slot('20:00'), 'las 20:00').focus()
    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(slot('20:00')?.getAttribute('aria-pressed')).toBe('true')
    })

    const less = screen.getByRole('button', { name: text('help.shortDay') })

    expect(less.getAttribute('aria-expanded')).toBe('true')
    await user.click(less)
    expect(slot('20:00')?.getAttribute('aria-pressed')).toBe('true')
    expect(slot('20:30')).toBeTruthy()
    expect(slot('17:00')).toBeNull()
    expect(slot('23:30')).toBeNull()
  }, 20_000)

  it('a última hora no hay nada más que abrir', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 21, 10))

    await openApp('#/guardia')
    const grid = await screen.findByRole('group', { name: text('help.today') }, WAIT)

    expect(within(grid).getByRole('button', { name: /^23:30–/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: text('help.wholeDay') })).toBeNull()
  }, 20_000)
})

describe('bienvenida corta', () => {
  /** Abre la bienvenida desde el menú y apunta el título de cada paso hasta el último. */
  async function walk(mode: 'simple' | 'normal'): Promise<{ titles: string[]; total: string }> {
    const user = userEvent.setup()

    await openApp('#/expediente', { detail: mode })
    reloadDetail()
    await settle(300)
    await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
    await user.click(await screen.findByRole('menuitem', { name: text('welcome.open') }, WAIT))
    await waitFor(
      async () => {
        await answerGates()
        expect(screen.getByRole('button', { name: text('welcome.next') })).toBeTruthy()
      },
      { timeout: 12_000, interval: 500 },
    )
    const dialog = screen.getByRole('dialog', { name: text('welcome.title') })
    const total = dialog.querySelector('.eyebrow')?.textContent ?? ''
    const titles: string[] = []

    for (let step = 0; step < 12; step++) {
      titles.push(dialog.querySelector('h3')?.textContent ?? '')
      const next = screen.queryByRole('button', { name: text('welcome.next') })

      if (next === null) break
      await user.click(next)
    }

    return { titles, total }
  }

  it('seis pasos en el simplificado, con el modo en el primero; Proyectos y Sprints juntos', async () => {
    const { titles, total } = await walk('simple')

    expect(total).toBe('1 de 6')
    expect(titles).toHaveLength(6)
    expect(titles[0]).toBe(text('welcome.hello.title'))
    expect(titles).toContain(text('welcome.board.title'))
    // El calendario y los ajustes cierran la bienvenida.
    expect(titles.at(-1)).toBe(text('welcome.agenda.title'))
    expect(screen.getByRole('button', { name: text('welcome.done') })).toBeTruthy()
  }, 30_000)

  it('siete en el normal, con la red', async () => {
    const { titles, total } = await walk('normal')

    expect(total).toBe('1 de 7')
    expect(titles).toHaveLength(7)
    expect(titles).toContain(text('welcome.net.title'))
  }, 30_000)
})

describe('cabecera de bloque', () => {
  it('abierto, es el título del bloque (a la izquierda); plegado, sigue siendo la barra', async () => {
    const style = document.createElement('style')

    style.textContent = readFileSync(resolve(__dirname, '../../src/styles/layout.css'), 'utf8')
    document.head.append(style)

    try {
      const user = userEvent.setup()

      await openApp('#/expediente')
      const head = await screen.findByRole(
        'button',
        { name: text('layout.expediente.health'), expanded: true },
        WAIT,
      )
      const open = getComputedStyle(head)

      expect(open.textTransform).toBe('uppercase')
      expect(open.marginLeft).not.toBe('auto')
      // Va antes que lo suyo, dentro de su bloque: no cuelga de la tarjeta de arriba.
      expect(head.parentElement?.firstElementChild).toBe(head)

      await user.click(head)
      const folded = screen.getByRole('button', {
        name: text('layout.expediente.health'),
        expanded: false,
      })

      expect(getComputedStyle(folded).textTransform).not.toBe('uppercase')
    } finally {
      style.remove()
    }
  }, 20_000)
})
