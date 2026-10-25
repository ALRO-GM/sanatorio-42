import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { answerGates, openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

/**
 * Abre el panel con el segundo factor de mentira (vale cualquier código de seis
 * cifras): dándose de alta la primera vez, solo con el código después, o nada
 * si ya estaba abierto.
 */
async function unlockPanel(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  // Abierto ya en un test anterior: dura 12 horas.
  if (
    await screen
      .findByRole('tablist', { name: text('admin.title') }, { timeout: 1500 })
      .then(() => true)
      .catch(() => false)
  ) {
    return
  }

  const generate = await screen
    .findByRole('button', { name: text('admin.lock.generate') }, { timeout: 1500 })
    .catch(() => null)

  if (generate !== null) await user.click(generate)
  await user.type(await screen.findByLabelText(text('admin.lock.code'), {}, WAIT), '123456')
  await user.click(
    screen.queryByRole('button', { name: text('admin.lock.confirm') }) ??
      screen.getByRole('button', { name: text('admin.lock.open') }),
  )
}

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
      await unlockPanel(user)

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

  it('trampas de Code Clicker: se ordenan por dos columnas y se les escribe solo a ellos', async () => {
    await quietly(async () => {
      const user = userEvent.setup()
      const sent = vi.spyOn(api, 'sendBroadcast')

      await openApp('#/gestion')
      await unlockPanel(user)
      await user.click(await screen.findByRole('tab', { name: 'Code Clicker' }, WAIT))
      await user.click(
        await screen.findByRole('tab', { name: text('admin.clicker.view.cheats') }, WAIT),
      )

      const who = await screen.findByText(text('admin.cheats.who'), {}, WAIT)
      const card = must(who.closest('article'), 'tarjeta de quién')
      const table = within(card).getByRole('table')
      const order = (): string[] =>
        within(table)
          .getAllByRole('rowheader')
          .map((cell) => cell.textContent)

      // Primero por quién, después por trampas: manda trampas y desempata el login.
      await user.click(within(table).getByRole('button', { name: text('common.person') }))
      await user.click(within(table).getByRole('button', { name: text('admin.cheats.times') }))
      const rows = order()

      expect(rows.length).toBeGreaterThan(1)
      expect(within(card).getByText(new RegExp(text('table.unsort')))).toBeTruthy()

      // Un comunicado solo para quienes salen.
      await user.click(within(card).getByRole('button', { name: /Escribir a estas/ }))
      await user.type(within(card).getByLabelText(text('admin.cast.title')), 'Aviso')
      await user.type(
        within(card).getByLabelText(text('admin.cast.body')),
        'Hablamos de tu partida.',
      )
      await user.click(within(card).getByRole('button', { name: text('common.send') }))
      await settle()
      expect(sent).toHaveBeenCalledWith({
        title: 'Aviso',
        body: 'Hablamos de tu partida.',
        audience: { kind: 'logins', logins: expect.arrayContaining(rows) as unknown },
      })
    })
  }, 60_000)

  it('personas ocultas: se busca en los dos grupos, se oculta, se lista y se quita', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/gestion')
      await unlockPanel(user)
      await user.click(await screen.findByRole('tab', { name: text('admin.tab.hidden') }, WAIT))
      expect(await screen.findByText(text('admin.hidden.empty'), {}, WAIT)).toBeTruthy()

      const add = screen.getByRole('button', { name: text('admin.hidden.add') })
      const box = screen.getByRole('combobox', { name: text('admin.hidden.login') })

      // Sin login no se puede.
      expect(add).toHaveProperty('disabled', true)

      // El buscador del panel trae también a piscineros, que el de arriba no ve.
      await user.type(box, 'pisci')
      const found = await screen.findByRole('listbox', { name: text('admin.hidden.login') }, WAIT)

      await user.click(within(found).getByText('pisci-ana'))
      expect(box).toHaveProperty('value', 'pisci-ana')
      await user.selectOptions(
        screen.getByRole('combobox', { name: text('admin.hidden.from') }),
        text('admin.hidden.from.pool'),
      )
      await user.type(
        screen.getByRole('textbox', { name: text('admin.hidden.reason') }),
        'Lo pidió',
      )
      await user.click(add)

      const list = await screen.findByRole('list', { name: text('admin.hidden.title') }, WAIT)

      expect(within(list).getByText('pisci-ana')).toBeTruthy()
      expect(within(list).getByText(new RegExp(text('admin.hidden.hiddenFrom.pool')))).toBeTruthy()
      expect(within(list).getByText(/Lo pidió/)).toBeTruthy()
      expect(box).toHaveProperty('value', '')

      // A estudiantes: desaparece del buscador de quien mira, que es estudiante.
      expect((await api.searchPeople('jdo')).map((person) => person.login)).toContain('jdoe')
      await user.type(box, 'jdoe')
      await user.selectOptions(
        screen.getByRole('combobox', { name: text('admin.hidden.from') }),
        text('admin.hidden.from.students'),
      )
      await user.click(add)
      expect(await within(list).findByText('jdoe', {}, WAIT)).toBeTruthy()
      expect((await api.searchPeople('jdo')).map((person) => person.login)).not.toContain('jdoe')
      await expect(api.getPersonCard('jdoe')).rejects.toThrow()

      // Al quitarlo, vuelve.
      await user.click(
        within(list).getByRole('button', {
          name: text('admin.hidden.removeOne').replace('{login}', 'jdoe'),
        }),
      )
      await waitFor(() => {
        expect(within(list).queryByText('jdoe')).toBeNull()
      })
      expect((await api.searchPeople('jdo')).map((person) => person.login)).toContain('jdoe')
      await user.click(
        within(list).getByRole('button', {
          name: text('admin.hidden.removeOne').replace('{login}', 'pisci-ana'),
        }),
      )
      expect(await screen.findByText(text('admin.hidden.empty'), {}, WAIT)).toBeTruthy()
    })
  }, 30_000)

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
      // La bienvenida espera a que no haya otra ventana delante. Una puede
      // llegar tarde (el aviso de una guardia que empieza ya): se cierra hasta
      // que la bienvenida sale.
      await waitFor(
        async () => {
          await answerGates()
          expect(screen.getByRole('button', { name: text('welcome.next') })).toBeTruthy()
        },
        { timeout: 12_000, interval: 500 },
      )

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
      await user.click(screen.getByRole('button', { name: text('common.next') }))
      await user.click(screen.getByRole('button', { name: text('agenda.today') }))
    })
  }, 30_000)

  it('terapias: abre y cierra el formulario de grupo nuevo', async () => {
    await quietly(async () => {
      const user = userEvent.setup()

      await openApp('#/terapia')
      await user.click(await screen.findByRole('button', { name: text('therapy.new') }, WAIT))
      expect(await screen.findByText(text('therapy.newHint'), {}, WAIT)).toBeTruthy()
      await user.click(screen.getByRole('button', { name: text('common.cancel') }))
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
