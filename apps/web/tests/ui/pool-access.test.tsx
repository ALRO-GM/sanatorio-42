import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)
const defaults = await api.getPoolSettings()

afterEach(async () => {
  cleanup()
  await api.updatePoolSettings(defaults)
})

/** El panel en la pestaña Piscina, con el segundo factor de mentira (vale cualquier código). */
async function openPoolTab(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await openApp('#/gestion')

  // El panel sigue abierto de un test anterior: el segundo factor dura 12 horas.
  const open = await screen
    .findByRole('tab', { name: text('admin.tab.pool') }, { timeout: 1500 })
    .catch(() => null)

  if (open !== null) {
    await user.click(open)

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
  await user.click(await screen.findByRole('tab', { name: text('admin.tab.pool') }, WAIT))
}

describe('lo que ve un piscinero (docs/piscineros.md)', () => {
  it('solo las pestañas permitidas; un elemento sin su pestaña no cuenta; sin buzón ni buscador', async () => {
    await api.updatePoolSettings({
      allow: ['expediente', 'calendario', 'clusters', 'red.rankings', 'focus'],
    })
    await openApp('#/tablon', { pool: true, detail: 'datos' })

    const nav = await screen.findByRole('navigation', { name: text('nav.label') }, WAIT)
    const tabs = (): (string | null)[] =>
      within(nav)
        .getAllByRole('button')
        .map((button) => button.textContent)

    await waitFor(() => {
      expect(tabs()).not.toContain(text('nav.cat.ayuda'))
    }, WAIT)
    // Yo (expediente y calendario) y Campus (por los clústeres); sin Aprender.
    expect(tabs()).toEqual([text('nav.cat.yo'), text('nav.cat.campus')])
    // `red.rankings` sin `red`: en Campus no sale la Red.
    await userEvent.setup().click(within(nav).getByRole('button', { name: text('nav.cat.campus') }))
    expect(window.location.hash).toBe('#/clusters')
    expect(screen.queryByRole('navigation', { name: text('nav.cat.campus') })).toBeNull()
    await userEvent.setup().click(within(nav).getByRole('button', { name: text('nav.cat.yo') }))
    // Llegó por un enlace al tablón, que no tiene: vuelve al expediente.
    expect(window.location.hash).toMatch(/^#\/expediente/)
    expect(screen.queryByRole('button', { name: text('notices.open') })).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  }, 20_000)

  it('un estudiante lo ve todo, marque lo que marque el panel', async () => {
    await api.updatePoolSettings({ allow: [] })
    await openApp('#/tablon', { detail: 'datos' })

    const nav = await screen.findByRole('navigation', { name: text('nav.label') }, WAIT)

    await waitFor(() => {
      expect(
        within(nav)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(expect.arrayContaining([text('nav.cat.ayuda'), text('nav.cat.campus')]))
    }, WAIT)
    expect(window.location.hash).toMatch(/^#\/tablon/)
  }, 20_000)

  it('el panel: un elemento se apaga con su pestaña y se guarda lo marcado', async () => {
    const user = userEvent.setup()

    await openPoolTab(user)

    const red = await screen.findByRole('checkbox', { name: text('pool.key.red') }, WAIT)
    const rankings = screen.getByRole('checkbox', { name: text('pool.key.red.rankings') })

    expect(red).toHaveProperty('checked', true)
    expect(rankings).toHaveProperty('disabled', false)
    await user.click(red)
    expect(rankings).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('checkbox', { name: text('pool.key.clicker') }))
    await user.click(screen.getByRole('button', { name: text('admin.pool.save') }))
    await screen.findByText(text('admin.pool.saved'), {}, WAIT)

    const saved = await api.getPoolSettings()

    expect(saved.allow).toContain('clicker')
    expect(saved.allow).not.toContain('red')
  }, 30_000)
})

describe('la vista de piscinero de quien administra', () => {
  it('se entra desde el panel, se ve como un piscinero y se vuelve desde la franja', async () => {
    const user = userEvent.setup()
    // jsdom no sabe recargar la página y lo cuenta por la consola: aquí se calla.
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await api.updatePoolSettings({ open: false, allow: ['expediente', 'calendario'] })
    await openPoolTab(user)
    await user.click(screen.getByRole('button', { name: text('admin.pool.preview') }))
    // Funciona con la piscina cerrada; la web se vuelve a cargar en la portada.
    await waitFor(async () => {
      expect((await api.getPoolAccess()).preview).toBe(true)
    }, WAIT)
    expect(window.location.hash).toBe('#/expediente')
    cleanup()

    // Lo que ve al recargar: la franja, y solo lo permitido.
    await openApp('#/expediente', { preview: true, detail: 'datos' })

    const bar = await screen.findByRole(
      'complementary',
      { name: text('pool.preview.banner') },
      WAIT,
    )
    const nav = await screen.findByRole('navigation', { name: text('nav.label') }, WAIT)

    await waitFor(() => {
      expect(
        within(nav)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).not.toContain(text('nav.cat.ayuda'))
    }, WAIT)
    expect(document.documentElement.dataset.poolPreview).toBe('on')

    await user.click(within(bar).getByRole('button', { name: text('pool.preview.back') }))
    await waitFor(() => {
      expect(window.location.hash).toBe('#/gestion')
    }, WAIT)
    expect((await api.getPoolAccess()).pool).toBe(false)
    quiet.mockRestore()
  }, 30_000)

  it('si no se puede volver, la franja lo dice', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente', { preview: true })

    const bar = await screen.findByRole(
      'complementary',
      { name: text('pool.preview.banner') },
      WAIT,
    )

    // Otra pestaña ya salió de la vista: la API de mentira contesta 403.
    localStorage.removeItem('mock_pool_preview')
    await user.click(within(bar).getByRole('button', { name: text('pool.preview.back') }))
    expect(await within(bar).findByRole('alert')).toHaveProperty(
      'textContent',
      text('pool.preview.failed'),
    )
  }, 20_000)
})
