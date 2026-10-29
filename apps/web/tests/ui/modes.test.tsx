import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { reloadDetail } from '../../src/shared/detail'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 5000 }
const text = (key: string): string => must(es[key], `el texto ${key}`)

/** Los nombres de las pestañas de una fila de navegación. */
const tabsOf = (name: string): string[] =>
  within(screen.getByRole('navigation', { name }))
    .getAllByRole('button')
    // Sin la etiqueta «en vivo» de los exámenes: solo el nombre.
    .map((tab) => tab.querySelector('span')?.textContent ?? '')

/** Abre la web en ese modo de la interfaz. */
async function openIn(mode: string, hash: string): Promise<void> {
  await openApp(hash)
  localStorage.setItem('sanatorio_detail', mode)
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

describe('categorías', () => {
  it('arriba hay cuatro categorías y la abierta enseña sus secciones debajo', async () => {
    await openIn('normal', '#/tablon')

    expect(tabsOf(text('nav.label'))).toEqual([
      text('nav.cat.yo'),
      text('nav.cat.ayuda'),
      text('nav.cat.aprender'),
      text('nav.cat.campus'),
    ])
    expect(tabsOf(text('nav.cat.ayuda'))).toEqual(
      expect.arrayContaining([
        text('nav.consulta'),
        text('nav.tablon'),
        text('nav.terapia'),
        text('nav.pizarras'),
        text('nav.guardia'),
      ]),
    )
  }, 20_000)

  it('volver a una categoría abre la última sección que se miró en ella', async () => {
    const user = userEvent.setup()

    await openIn('normal', '#/pizarras')
    await user.click(screen.getByRole('button', { name: new RegExp(text('nav.cat.campus')) }))
    expect(window.location.hash).toBe('#/clusters')
    await user.click(screen.getByRole('button', { name: text('nav.cat.ayuda') }))
    expect(window.location.hash).toBe('#/pizarras')
  }, 20_000)

  it('una categoría de una sola sección no saca segunda fila', async () => {
    await openIn('normal', '#/notgames')
    expect(screen.queryByRole('navigation', { name: text('nav.cat.aprender') })).toBeNull()
  }, 20_000)
})

describe('modos de la interfaz', () => {
  it('el simplificado quita Campus y lo que es de cifras', async () => {
    await openIn('simple', '#/expediente')

    expect(tabsOf(text('nav.label'))).not.toContain(text('nav.cat.campus'))
    expect(screen.queryByText(text('layout.expediente.ranking'))).toBeNull()
    expect(screen.queryByText(text('layout.expediente.network'))).toBeNull()
    expect(await screen.findAllByText(text('layout.expediente.health'), {}, WAIT)).not.toHaveLength(
      0,
    )
  }, 20_000)

  it('el de datos enseña los rankings de la red que el normal no', async () => {
    await openIn('normal', '#/red')
    // Ya pintada (sale su explicación), y sin el ranking de los más estrictos.
    expect(await screen.findAllByText(text('net.about'), {}, WAIT)).not.toHaveLength(0)
    expect(screen.queryByText(text('net.strict.title'))).toBeNull()
    cleanup()

    await openIn('datos', '#/red')
    expect(await screen.findByText(text('net.strict.title'), {}, WAIT)).toBeTruthy()
  }, 30_000)

  it('cambiar el modo en el pie cambia la web al momento y se recuerda', async () => {
    const user = userEvent.setup()

    await openIn('normal', '#/expediente')
    await user.selectOptions(
      screen.getByRole('combobox', { name: text('settings.detail') }),
      'simple',
    )
    expect(tabsOf(text('nav.label'))).not.toContain(text('nav.cat.campus'))
    expect(localStorage.getItem('sanatorio_detail')).toBe('simple')
  }, 20_000)

  it('una sección que no toca en el modo sigue abriéndose por su dirección', async () => {
    await openIn('simple', '#/red')
    expect(await screen.findAllByText(new RegExp(text('net.title')), {}, WAIT)).not.toHaveLength(0)
  }, 20_000)
})
