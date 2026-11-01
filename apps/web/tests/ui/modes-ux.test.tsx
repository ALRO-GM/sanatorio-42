import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { reloadDetail } from '../../src/shared/detail'
import { must } from './must'
import { answerGates, openApp, settle } from './render'

// Revisión de la UX (2026-11, `docs/revision-2026-11/ux.md`): cada modo enseña
// lo que dicen sus pestañas, y los flujos de ayuda con un paso menos.

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
/** Un trozo fijo de un texto con huecos, para buscarlo sin saber el número. */
const tail = (key: string): RegExp => {
  const after = must(text(key).split('}').at(-1), key).trim()

  return new RegExp(after.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
}

async function openIn(mode: 'simple' | 'normal' | 'datos', hash: string): Promise<void> {
  await openApp(hash, { detail: mode })
  reloadDetail()
  await settle(300)
}

beforeEach(() => {
  localStorage.removeItem('sanatorio_detail')
  reloadDetail()
})

afterEach(() => {
  cleanup()
})

describe('coherencia de los modos', () => {
  it('el simplificado no enlaza al Avance, que no sale en sus pestañas; el normal sí', async () => {
    const compare = new RegExp(text('health.compare'))

    await openIn('simple', '#/expediente')
    expect(await screen.findAllByText(text('layout.expediente.health'), {}, WAIT)).not.toHaveLength(
      0,
    )
    await settle(300)
    expect(screen.queryByRole('link', { name: compare })).toBeNull()
    cleanup()

    await openIn('normal', '#/expediente')
    expect(await screen.findByRole('link', { name: compare }, WAIT)).toBeTruthy()
  }, 30_000)

  it('la endogamia de tu red, en el perfil, solo en el de datos (como en la Red)', async () => {
    await openIn('normal', '#/expediente')
    expect(await screen.findByText(text('net.given'), {}, WAIT)).toBeTruthy()
    expect(screen.queryByText(text('net.endogamy'))).toBeNull()
    expect(screen.queryByText(text('net.mostWith'))).toBeNull()
    cleanup()

    await openIn('datos', '#/expediente')
    expect(await screen.findByText(text('net.endogamy'), {}, WAIT)).toBeTruthy()
  }, 30_000)

  it('en Peer to peer, cuánta gente hay en la lista es una cifra: desde el normal', async () => {
    const user = userEvent.setup()
    const total = tail('peers.totalN')

    await openIn('simple', '#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    expect(await screen.findByRole('button', { name: text('app.back') }, WAIT)).toBeTruthy()
    await settle(300)
    expect(screen.queryByText(total)).toBeNull()
    cleanup()

    await openIn('normal', '#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    expect(await screen.findByText(total, {}, WAIT)).toBeTruthy()
  }, 30_000)

  it('en el simplificado, el mapa de Peer to peer va sin resaltados', async () => {
    const user = userEvent.setup()

    await openIn('simple', '#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    expect(await screen.findByText(text('map.title'), {}, WAIT)).toBeTruthy()
    await settle(600)
    expect(screen.queryByRole('group', { name: text('map.look') })).toBeNull()
    cleanup()

    await openIn('normal', '#/consulta')
    await user.click(await screen.findByRole('button', { name: 'ft_printf' }, WAIT))
    expect(await screen.findByRole('group', { name: text('map.look') }, WAIT)).toBeTruthy()
  }, 30_000)
})

describe('flujos', () => {
  it('con un solo proyecto en curso, Peer to peer va directo a quién ayuda; «Volver» no rebota', async () => {
    const user = userEvent.setup()
    const all = await api.getMyProjects()
    const only = must(all[0], 'un proyecto de mentira')
    const spy = vi.spyOn(api, 'getMyProjects').mockResolvedValue([only])

    try {
      await openIn('simple', '#/consulta')
      expect(await screen.findByRole('heading', { name: new RegExp(only.name) }, WAIT)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: text('app.back') }))
      expect(await screen.findByRole('button', { name: only.name }, WAIT)).toBeTruthy()
      await settle(300)
      expect(screen.queryByRole('button', { name: text('app.back') })).toBeNull()
    } finally {
      spy.mockRestore()
    }
  }, 20_000)

  it('la bienvenida, en el simplificado, no presenta lo que no le va a salir', async () => {
    const user = userEvent.setup()

    await openIn('simple', '#/expediente')
    await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
    await user.click(await screen.findByRole('menuitem', { name: text('welcome.open') }, WAIT))
    await waitFor(
      async () => {
        await answerGates()
        expect(screen.getByRole('button', { name: text('welcome.next') })).toBeTruthy()
      },
      { timeout: 12_000, interval: 500 },
    )
    const titles: string[] = []

    for (let step = 0; step < 12; step++) {
      titles.push(
        screen.getByRole('dialog', { name: text('welcome.title') }).querySelector('h3')
          ?.textContent ?? '',
      )
      const next = screen.queryByRole('button', { name: text('welcome.next') })

      if (next === null) break
      await user.click(next)
    }
    expect(titles).toContain(text('welcome.board.title'))
    expect(titles).not.toContain(text('welcome.net.title'))
  }, 30_000)

  it('el on-call avisa arriba de las reservas que esperan tu respuesta y lleva a ellas', async () => {
    const user = userEvent.setup()
    const scrolled: Element[] = []
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
      this: Element,
    ) {
      scrolled.push(this)
    })

    try {
      await openIn('normal', '#/guardia')
      const go = await screen.findByRole('button', { name: text('help.waitingGo') }, WAIT)

      expect(screen.getByText(tail('help.waiting.many'))).toBeTruthy()
      await user.click(go)
      expect(
        scrolled.some((element) => element.matches('[data-feedback="guardia.bookings"]')),
      ).toBe(true)
    } finally {
      spy.mockRestore()
    }
  }, 20_000)
})
