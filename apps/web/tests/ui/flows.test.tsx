import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import en from 'virtual:textos/en'
import es from 'virtual:textos/es'
import { must } from './must'
import { openApp, settle } from './render'

/** El texto en español de una clave, sin variables. Falla si no existe. */
/** Lo que espera cada búsqueda a que aparezca algo: la API de mentira tarda un poco. */
const WAIT = { timeout: 4000 }

const text = (key: string): string => {
  const value = es[key]

  if (value === undefined) throw new Error(`no hay texto para ${key}`)

  return value
}

afterEach(() => {
  cleanup()
})

describe('lo que hace la gente en la web, de principio a fin', () => {
  it('sala de espera: elegir proyecto enseña quién ayuda, y se vuelve atrás', async () => {
    const user = userEvent.setup()

    await openApp('#/consulta')
    const [first] = await screen.findAllByRole('button', { name: /libft|printf|push_swap/i }, WAIT)

    await user.click(must(first, 'proyecto'))
    expect(await screen.findByRole('button', { name: text('app.back') }, WAIT)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('app.back') }))
    expect(await screen.findByRole('heading', { name: /Qué te duele/ }, WAIT)).toBeTruthy()
  }, 20_000)

  it('pizarras: apuntarse y desapuntarse de una actividad', async () => {
    const user = userEvent.setup()

    await openApp('#/pizarras')
    const [join] = await screen.findAllByRole('button', { name: text('cal.join') }, WAIT)
    const card = must(
      must(join, 'botón de apuntarse').closest<HTMLElement>('article, li'),
      'tarjeta',
    )

    await user.click(must(join, 'botón de apuntarse'))
    await user.click(await within(card).findByRole('button', { name: text('cal.leave') }, WAIT))
    expect(await within(card).findByRole('button', { name: text('cal.join') }, WAIT)).toBeTruthy()
  }, 20_000)

  it('guardia: el interruptor de la cabecera te pone y te quita', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    const toggle = (): HTMLInputElement =>
      screen.getByRole<HTMLInputElement>('switch', { name: text('duty.switch') })
    const before = toggle().checked

    await user.click(toggle())
    await settle()
    expect(toggle().checked).toBe(!before)
    // Al ponerse de guardia se abren sus franjas de hoy.
    if (!before) expect(window.location.hash).toBe('#/guardia')

    await user.click(toggle())
    await settle()
    expect(toggle().checked).toBe(before)
  }, 20_000)

  it('buscador: escribir un login y abrir su expediente', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.click(screen.getByRole('button', { name: text('finder.label') }))
    await user.type(screen.getByPlaceholderText(text('finder.placeholder')), 'mgar')
    await settle(800)
    const finder = must(document.querySelector<HTMLElement>('.finder'), 'buscador')
    const [option] = await within(finder).findAllByText(/mgarcia/, {}, WAIT)

    await user.click(must(option, 'resultado'))
    await settle()
    expect(window.location.hash).toBe('#/expediente/mgarcia')
  }, 20_000)

  it('idioma: elegir inglés en el pie cambia las pestañas', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    await user.selectOptions(screen.getByRole('combobox', { name: text('settings.lang') }), 'en')
    await settle(100)
    expect(screen.getAllByText(en['nav.cat.ayuda'] ?? '?').length).toBeGreaterThan(0)
  }, 20_000)

  it('una dirección que no existe lleva a la portada, no a una pantalla en blanco', async () => {
    await openApp('#/no-existe')
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    expect(must(document.querySelector('main'), 'main').textContent.length).toBeGreaterThan(20)
  }, 20_000)
})
