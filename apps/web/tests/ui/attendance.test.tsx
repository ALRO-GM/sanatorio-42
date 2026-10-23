import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { Attendance } from '../../src/features/alerts/Attendance'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)
const starts = (key: string): RegExp =>
  new RegExp(
    `^${
      text(key)
        .split('{')[0]
        ?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ?? ''
    }`,
  )

afterEach(() => {
  cleanup()
})

function open(eventId: string): void {
  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <Attendance eventId={eventId} />
    </I18nProvider>,
  )
}

describe('Asistencia de un evento', () => {
  it('quien asiste valida el inicio y el fin; un código equivocado se explica', async () => {
    const user = userEvent.setup()

    open('help:901')

    const box = await screen.findByRole('textbox', { name: text('meet.att.code') })
    const validate = screen.getByRole('button', { name: text('meet.att.validate') })

    // Hasta tener cuatro caracteres no se puede mandar.
    await user.type(box, 'K7Q')
    expect(validate).toHaveProperty('disabled', true)

    // El de fin antes que el de inicio: no vale.
    await user.clear(box)
    await user.type(box, 'r3xd')
    expect(box).toHaveProperty('value', 'R3XD')
    await user.click(validate)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('Valida primero el código de inicio'),
    )

    await user.clear(box)
    await user.type(box, 'K7QM')
    await user.click(screen.getByRole('button', { name: text('meet.att.validate') }))
    expect(await screen.findByText(starts('meet.att.guestEnd'))).toBeTruthy()

    await user.type(await screen.findByRole('textbox', { name: text('meet.att.code') }), 'R3XD')
    await user.click(screen.getByRole('button', { name: text('meet.att.validate') }))
    expect(await screen.findByText(starts('meet.att.guestDone'))).toBeTruthy()
    // Validado: ya no hay nada que escribir.
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('quien organiza ve los dos códigos y quién ha validado', async () => {
    const user = userEvent.setup()

    open('board:901')

    expect(await screen.findByText('K7QM')).toBeTruthy()
    expect(screen.getByText('jdoe')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('meet.att.end') }))
    expect(screen.getByText('R3XD')).toBeTruthy()
    expect(screen.queryByText('K7QM')).toBeNull()
  })
})
