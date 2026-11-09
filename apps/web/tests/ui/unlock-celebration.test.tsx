/**
 * La celebración de lo desbloqueado (`docs/cursos-logros.md`): al abrir la web
 * (o al superar un punto de un curso) sale una ventana por cada logro nuevo,
 * con su banner, la XP y «Lucirlo ahora». Lo celebrado no vuelve a salir.
 */
import { act, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import es from 'virtual:textos/es'
import { queueMockUnlock } from '../../src/shared/api/mock/unlocks'
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

const celebration = () =>
  screen.findByRole('dialog', { name: text('unlock.kind.achievement') }, WAIT)

afterEach(() => {
  cleanup()
})

describe('celebración de lo desbloqueado', () => {
  it('sale al abrir la web, con banner, XP y foco en ponérselo; Escape la cierra y no vuelve', async () => {
    queueMockUnlock('k8s_first')
    await openApp('#/expediente')

    const dialog = await celebration()

    expect(within(dialog).getByText(text('ach.k8s_first'))).toBeTruthy()
    expect(within(dialog).getByText(text('unlock.xp', { xp: 10 }))).toBeTruthy()
    expect(
      within(dialog).getByText(text('unlock.title', { title: text('title.k8s_first') })),
    ).toBeTruthy()
    // El banner del título nuevo, decorativo (no se lee en voz alta).
    const banner = dialog.querySelector('.title-banner')

    expect(banner?.getAttribute('data-title')).toBe('k8s_first')
    expect(banner?.getAttribute('aria-hidden')).toBe('true')
    // El foco va al botón de ponérselo.
    expect(document.activeElement).toBe(
      within(dialog).getByRole('button', { name: text('unlock.equip') }),
    )

    // Escape: `cancel` y cierre, como hace el navegador.
    act(() => {
      const cancel = new Event('cancel', { cancelable: true })

      dialog.dispatchEvent(cancel)
      if (!cancel.defaultPrevented) (dialog as HTMLDialogElement).close()
    })
    expect(screen.queryByRole('dialog', { name: text('unlock.kind.achievement') })).toBeNull()

    // Al volver a abrir la web, ya celebrado: no sale.
    await settle(300)
    cleanup()
    await openApp('#/expediente')
    await settle(400)
    expect(screen.queryByRole('dialog', { name: text('unlock.kind.achievement') })).toBeNull()
  }, 20_000)

  it('«Lucirlo ahora» pone el título y su banner en el perfil; «Ahora no» pasa al siguiente', async () => {
    const user = userEvent.setup()

    queueMockUnlock('k8s_beginner')
    queueMockUnlock('k8s_intermediate')
    await openApp('#/expediente')

    let dialog = await celebration()

    expect(within(dialog).getByText(text('ach.k8s_beginner'))).toBeTruthy()
    // Quedan más: lo dice.
    expect(within(dialog).getByText(text('unlock.more', { n: 1 }))).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: text('unlock.later') }))

    dialog = await celebration()
    expect(within(dialog).getByText(text('ach.k8s_intermediate'))).toBeTruthy()
    expect(within(dialog).queryByText(text('unlock.more', { n: 1 }))).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: text('unlock.equip') }))
    await settle()

    expect(screen.queryByRole('dialog', { name: text('unlock.kind.achievement') })).toBeNull()
    expect(document.querySelector('.record .title-banner')?.getAttribute('data-title')).toBe(
      'k8s_intermediate',
    )
  }, 20_000)
})
