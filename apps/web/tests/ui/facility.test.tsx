import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, describe, expect, it } from 'vitest'

import { api } from '../../src/shared/api'
import { must } from './must'
import { openApp } from './render'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

describe('avisar al staff de un problema', () => {
  it('desde Clústeres: qué pasa, dónde y una nota; con «otro» la nota hace falta', async () => {
    const user = userEvent.setup()

    await openApp('#/clusters')
    await user.click(await screen.findByRole('button', { name: new RegExp(text('facility.open')) }))

    const send = screen.getByRole('button', { name: text('facility.send') })

    // Sin elegir qué pasa no se puede enviar.
    expect((send as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('button', { name: text('facility.category.other') }))
    await user.click(send)
    expect(await screen.findByText(/hace falta una nota/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: text('facility.category.toilets') }))
    await user.type(screen.getByRole('textbox', { name: text('facility.where') }), 'Baños planta 1')
    await user.click(send)
    expect(await screen.findByText(text('facility.sent'))).toBeTruthy()

    // Le llega al staff (y al panel).
    expect((await api.getStaffFacility()).some((report) => report.place === 'Baños planta 1')).toBe(
      true,
    )
  }, 20_000)
})
