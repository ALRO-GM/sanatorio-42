import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

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
    expect(tabs()).toEqual(
      expect.arrayContaining([text('nav.cat.calendario'), text('nav.cat.clusters')]),
    )
    // `red.rankings` sin `red`: Datos no sale.
    expect(tabs()).not.toContain(text('nav.cat.datos'))
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
      ).toEqual(expect.arrayContaining([text('nav.cat.ayuda'), text('nav.cat.datos')]))
    }, WAIT)
    expect(window.location.hash).toMatch(/^#\/tablon/)
  }, 20_000)

  it('el panel: un elemento se apaga con su pestaña y se guarda lo marcado', async () => {
    const user = userEvent.setup()

    await openApp('#/gestion')

    // El segundo factor de mentira: vale cualquier código de seis cifras.
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
