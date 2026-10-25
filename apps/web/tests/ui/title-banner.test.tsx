/**
 * El perfil: el número del nivel abre cómo se gana XP, los títulos van en un
 * desplegable y cada título trae su banner, que se ve también en el perfil de
 * los demás.
 */
import { act, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import es from 'virtual:textos/es'
import { must } from './must'
import { openApp, settle } from './render'

const WAIT = { timeout: 4000 }

/** El texto en español de una clave. Falla si no existe. */
const text = (key: string, vars: Record<string, string | number> = {}): string => {
  const value = es[key]

  if (value === undefined) throw new Error(`no hay texto para ${key}`)

  return Object.entries(vars).reduce(
    (out, [name, val]) => out.replace(`{${name}}`, String(val)),
    value,
  )
}

/** El título que dice la franja del perfil (`data-title`), o `null` si no lleva. */
const bannerTitle = (): string | null =>
  document.querySelector('.record .title-banner')?.getAttribute('data-title') ?? null

afterEach(() => {
  cleanup()
})

describe('perfil: nivel, títulos y banners', () => {
  it('el número del nivel abre cómo se gana XP, con las cifras de la API, y Escape lo cierra', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    // En la demo se va por 340 XP: nivel 4.
    const level = await screen.findByRole(
      'button',
      { name: text('xp.levelHow', { level: 4 }) },
      WAIT,
    )

    expect(level.getAttribute('aria-expanded')).toBe('false')
    await user.click(level)

    const dialog = await screen.findByRole('dialog', { name: text('xp.howTo') }, WAIT)

    expect(level.getAttribute('aria-expanded')).toBe('true')
    // Cuánto da cada cosa: lo de ayudar en un proyecto aprobado son 40.
    expect(within(dialog).getByText(text('xp.rule.specialist_help', { xp: 40 }))).toBeTruthy()

    // Escape: `cancel` y cierre, como hace el navegador.
    act(() => {
      const cancel = new Event('cancel', { cancelable: true })

      dialog.dispatchEvent(cancel)
      if (!cancel.defaultPrevented) (dialog as HTMLDialogElement).close()
    })
    expect(screen.queryByRole('dialog', { name: text('xp.howTo') })).toBeNull()
    expect(level.getAttribute('aria-expanded')).toBe('false')
  }, 20_000)

  it('los títulos van plegados con el activo a la vista; elegir otro cambia el banner', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    const picker = must(
      (await screen.findByText(text('xp.titles'), {}, WAIT)).closest<HTMLDetailsElement>('details'),
      'desplegable de títulos',
    )

    // Cerrado: se ve el que luces (Developer) y su banner.
    expect(picker.open).toBe(false)
    expect(within(picker).getAllByText(text('title.residente')).length).toBeGreaterThan(0)
    expect(bannerTitle()).toBe('residente')

    await user.click(must(picker.querySelector('summary'), 'resumen'))
    expect(picker.open).toBe(true)

    // Uno que aún no tienes: bloqueado, con el nivel que lo da.
    const lead = within(picker).getByRole('button', { name: new RegExp(text('title.jefe')) })

    expect((lead as HTMLButtonElement).disabled).toBe(true)
    expect(lead.textContent).toContain(text('xp.locked', { level: 7 }))

    // El activo, marcado.
    const current = within(picker).getByRole('button', {
      name: new RegExp(text('title.residente')),
    })

    expect(current.getAttribute('aria-pressed')).toBe('true')

    // Elegir otro: se guarda, el banner cambia y el desplegable se cierra.
    await user.click(
      within(picker).getByRole('button', { name: new RegExp(text('title.maestro')) }),
    )
    await settle()
    expect(bannerTitle()).toBe('maestro')
    expect(picker.open).toBe(false)
    expect(document.querySelector('.record-title')?.textContent).toBe(text('title.maestro'))
  }, 20_000)

  it('Escape cierra el desplegable de títulos', async () => {
    const user = userEvent.setup()

    await openApp('#/expediente')
    const picker = must(
      (await screen.findByText(text('xp.titles'), {}, WAIT)).closest<HTMLDetailsElement>('details'),
      'desplegable de títulos',
    )

    await user.click(must(picker.querySelector('summary'), 'resumen'))
    expect(picker.open).toBe(true)
    await user.keyboard('{Escape}')
    expect(picker.open).toBe(false)
  }, 20_000)

  it('el perfil de otra persona lleva el banner de su título', async () => {
    await openApp('#/expediente/mgarcia')
    await screen.findByText(text('title.maestro'), {}, WAIT)
    expect(bannerTitle()).toBe('maestro')
  }, 20_000)
})
