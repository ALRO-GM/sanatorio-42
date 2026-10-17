import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SECTIONS } from '../../src/app/sections'
import { es } from '../../src/shared/i18n/es'
import { openApp } from './render'

afterEach(() => {
  cleanup()
})

describe('cada sección se abre sin romperse', () => {
  for (const { id } of SECTIONS) {
    it(
      id,
      async () => {
        const errors: unknown[] = []
        const onError = (event: ErrorEvent): void => {
          errors.push(event.error)
        }

        const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        window.addEventListener('error', onError)
        await openApp(`#/${id}`)
        // La sección ya está descargada y pintada, no esperando.
        await waitFor(
          () => {
            expect(screen.queryByText(es['app.loadingSection'] ?? '')).toBeNull()
          },
          { timeout: 8000 },
        )
        window.removeEventListener('error', onError)
        // Ni excepciones sueltas ni errores de React (claves repetidas, estados
        // imposibles…) mientras se abre.
        expect(errors).toEqual([])
        expect(logged.mock.calls.map((call) => String(call[0]).slice(0, 200))).toEqual([])
        logged.mockRestore()
        // Ninguna clave de texto sin traducir a la vista.
        const text = document.body.textContent

        expect(Object.keys(es).filter((key) => key.includes('.') && text.includes(key))).toEqual([])
        expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
      },
      15_000,
    )
  }
})
