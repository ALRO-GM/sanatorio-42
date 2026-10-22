import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CorrectionGate } from '../../src/features/network/CorrectionGate'
import { UnderstoodCard } from '../../src/features/profile/UnderstoodCard'
import { api } from '../../src/shared/api'
import { I18nProvider } from '../../src/shared/i18n'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('sanatorio_lang', 'es')
  // Fuera de la demostración pública, las correcciones inventadas salen si se piden.
  window.history.replaceState(null, '', '/?correccion#/expediente')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

const show = (onChange = vi.fn()) =>
  render(
    <I18nProvider>
      <CorrectionGate pending={2} onChange={onChange} />
    </I18nProvider>,
  )

describe('valorar una corrección de 42', () => {
  it('quien fue corregido dice qué tal lo entiende y deja una reacción; luego, la que corrigió', async () => {
    const user = userEvent.setup()
    const rate = vi.spyOn(api, 'rateCorrection')
    const onChange = vi.fn()

    show(onChange)

    const first = await screen.findByRole(
      'dialog',
      { name: 'Te corrigió rsoto' },
      { timeout: 3000 },
    )

    expect(first.textContent).toContain(text('net.rate.understand'))
    // Sin contestar la pregunta no se puede enviar; la reacción es opcional.
    const send = screen.getByRole('button', { name: text('net.rate.send') })

    expect((send as HTMLButtonElement).disabled).toBe(true)
    await user.click(screen.getByRole('radio', { name: text('net.rate.understanding.better') }))
    const patient = screen.getByRole('button', { name: text('react.patient') })

    await user.click(patient)
    expect(patient.getAttribute('aria-pressed')).toBe('true')
    await user.click(send)

    expect(rate).toHaveBeenCalledWith(9101, { understanding: 'better', reaction: 'patient' })

    // Después, la que corregiste tú, a un grupo: cómo llegó, con las etiquetas de la ayuda.
    const second = await screen.findByRole('dialog', { name: 'Corregiste a nmartin y dcano' })

    expect(second.textContent).toContain(text('net.rate.arrivedMany'))
    expect(screen.queryByRole('radio')).toBeNull()
    await user.click(screen.getByRole('button', { name: text('help.tag.curious') }))
    await user.click(screen.getByRole('button', { name: text('net.rate.send') }))

    expect(rate).toHaveBeenLastCalledWith(9102, { tag: 'curious' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('Escape es «Ahora no», y «No volver a preguntar» la descarta', async () => {
    const user = userEvent.setup()
    const skip = vi.spyOn(api, 'skipCorrection')

    show()

    const first = await screen.findByRole(
      'dialog',
      { name: 'Te corrigió rsoto' },
      { timeout: 3000 },
    )

    // Escape llega a la ventana como `cancel`: no se cierra hasta que contesta la API.
    fireEvent(first, new Event('cancel', { cancelable: true }))
    expect(skip).toHaveBeenCalledWith(9101, false)

    await screen.findByRole('dialog', { name: 'Corregiste a nmartin y dcano' })
    await user.click(screen.getByRole('button', { name: text('net.rate.never') }))
    expect(skip).toHaveBeenLastCalledWith(9102, true)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })

  it('quien corrigió ve en su expediente cuántas respuestas hay de cada, sin nombres', async () => {
    render(
      <I18nProvider>
        <UnderstoodCard />
      </I18nProvider>,
    )

    const row = await screen.findByText(text('net.rate.understanding.enough'))

    expect(row.closest('li')?.textContent).toContain('6')
    expect(screen.getByText(text('net.understood.title'))).toBeTruthy()
  })
})
