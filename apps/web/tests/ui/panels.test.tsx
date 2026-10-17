import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

/** Ni excepciones ni errores de React mientras dura `run`. */
async function quietly(run: () => Promise<void>): Promise<void> {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await run()
  expect(logged.mock.calls.map((call) => String(call[0]).slice(0, 200))).toEqual([])
  logged.mockRestore()
}

describe('ventanas y paneles', () => {
  it('panel de gestión: el segundo factor lo abre y cada pestaña se pinta', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/gestion')
      await user.click(
        await screen.findByRole('button', { name: text('admin.lock.generate') }, WAIT),
      )
      await user.type(await screen.findByLabelText(text('admin.lock.code'), {}, WAIT), '123456')
      await user.click(screen.getByRole('button', { name: text('admin.lock.confirm') }))

      const tabs = await screen.findByRole('tablist', { name: text('admin.title') }, WAIT)
      const names = within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent)

      expect(names.length).toBeGreaterThan(5)

      for (const name of names) {
        await user.click(within(tabs).getByRole('tab', { name: must(name, 'pestaña') }))
        await settle(500)
        expect(within(tabs).getByRole('tab', { selected: true }).textContent).toBe(name)
        expect(must(document.querySelector('main'), 'main').textContent.length).toBeGreaterThan(50)
      }
    })
  }, 60_000)

  it('buzón: se abre, cambia a conversaciones y vuelve a avisos', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/expediente')
      await user.click(screen.getByRole('button', { name: /buzón/i }))
      await user.click(await screen.findByRole('tab', { name: text('notices.tab.chats') }, WAIT))
      await settle()
      await user.click(screen.getByRole('tab', { name: text('notices.tab.notices') }))
      await settle()
      expect(
        screen
          .getByRole('tab', { name: text('notices.tab.notices') })
          .getAttribute('aria-selected'),
      ).toBe('true')
    })
  }, 30_000)

  it('menú de la cuenta: personalizar y la bienvenida se abren y se recorren', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/expediente')
      await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
      await user.click(await screen.findByRole('menuitem', { name: text('layout.open') }, WAIT))
      expect(await screen.findByText(text('layout.title'), {}, WAIT)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: text('layout.done') }))

      await user.click(screen.getByRole('button', { name: /tu cuenta/i }))
      await user.click(await screen.findByRole('menuitem', { name: text('welcome.open') }, WAIT))

      await screen.findByRole('button', { name: text('welcome.next') }, WAIT)

      for (let step = 0; step < 12; step++) {
        const next = screen.queryByRole('button', { name: text('welcome.next') })

        if (next === null) break
        await user.click(next)
      }
      await user.click(screen.getByRole('button', { name: text('welcome.done') }))
    })
  }, 30_000)

  it('calendario: cambia de vista y de forma del día', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/calendario')
      for (const view of ['agenda.view.week', 'agenda.view.month', 'agenda.view.day']) {
        await user.click(await screen.findByRole('button', { name: text(view) }, WAIT))
        await settle(300)
      }
      for (const layout of ['agenda.layout.full', 'agenda.layout.fit', 'agenda.layout.list']) {
        const button = screen.queryByRole('button', { name: new RegExp(text(layout)) })

        if (button !== null) await user.click(button)
      }
      await user.click(screen.getByRole('button', { name: text('agenda.next') }))
      await user.click(screen.getByRole('button', { name: text('agenda.today') }))
    })
  }, 30_000)

  it('terapias: abre y cierra el formulario de grupo nuevo', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/terapia')
      await user.click(await screen.findByRole('button', { name: text('therapy.new') }, WAIT))
      expect(await screen.findByText(text('therapy.newHint'), {}, WAIT)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: text('therapy.cancel') }))
    })
  }, 30_000)

  it('red, clústeres y exámenes se pintan con sus datos', async () => {
    await quietly(async () => {
      for (const [hash, title] of [
        ['#/red', 'net.title'],
        ['#/clusters', 'clusters.title'],
        ['#/examenes', 'exams.title'],
      ] as const) {
        await openApp(hash)
        expect(await screen.findAllByText(new RegExp(text(title)), {}, WAIT)).not.toHaveLength(0)
        cleanup()
      }
    })
  }, 30_000)
})
