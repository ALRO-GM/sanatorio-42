import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import es from 'virtual:textos/es'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '../../src/shared/i18n'
import { Modal } from '../../src/shared/ui/Modal'
import { useConfirm } from '../../src/shared/ui/useConfirm'
import { must } from './must'

const text = (key: string): string => must(es[key], `el texto ${key}`)

afterEach(() => {
  cleanup()
})

/** Lo que hace el navegador al pulsar Escape en un `<dialog>` modal: `cancel` y, si nadie lo impide, cerrar. */
function escape(dialog: HTMLElement): void {
  const cancel = new Event('cancel', { cancelable: true })

  act(() => {
    dialog.dispatchEvent(cancel)
    if (!cancel.defaultPrevented) (dialog as HTMLDialogElement).close()
  })
}

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn()

  localStorage.setItem('sanatorio_lang', 'es')
  render(
    <I18nProvider>
      <Modal label="Ventana" title="Ventana" onClose={onClose} {...props}>
        <p>Dentro</p>
      </Modal>
    </I18nProvider>,
  )

  return { onClose, dialog: screen.getByRole('dialog', { name: 'Ventana' }) }
}

describe('Modal: el armazón de las ventanas', () => {
  it('se abre al montarse y se cierra con su botón, con Escape o pulsando el fondo', async () => {
    const user = userEvent.setup()
    const first = renderModal()

    expect(first.dialog.hasAttribute('open')).toBe(true)
    await user.click(within(first.dialog).getByRole('button', { name: text('layout.close') }))
    expect(first.onClose).toHaveBeenCalledOnce()
    cleanup()

    const second = renderModal()

    escape(second.dialog)
    expect(second.onClose).toHaveBeenCalledOnce()
    cleanup()

    const third = renderModal()

    // Un clic en el contenido no cierra; en el fondo (el propio dialog), sí.
    fireEvent.click(screen.getByText('Dentro'))
    expect(third.onClose).not.toHaveBeenCalled()
    fireEvent.click(third.dialog)
    expect(third.onClose).toHaveBeenCalledOnce()
  })

  it('la obligatoria no se va con Escape ni con el fondo; onEscape sustituye al cierre', () => {
    const must = renderModal({ cancelable: false })

    escape(must.dialog)
    fireEvent.click(must.dialog)
    expect(must.onClose).not.toHaveBeenCalled()
    expect(must.dialog.hasAttribute('open')).toBe(true)
    cleanup()

    const onEscape = vi.fn()
    const asks = renderModal({ onEscape })

    escape(asks.dialog)
    expect(onEscape).toHaveBeenCalledOnce()
    expect(asks.onClose).not.toHaveBeenCalled()
  })
})

/** Un botón que pregunta antes de hacer algo, como «Retirar» en una pizarra. */
function Remove({ onAnswer }: { onAnswer: (ok: boolean) => void }) {
  const confirm = useConfirm()
  const [asked, setAsked] = useState(0)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAsked(asked + 1)
          void confirm
            .ask({ body: '¿Retirar la pizarra?', okText: 'Retirar', danger: true })
            .then(onAnswer)
        }}
      >
        Quitar
      </button>
      {confirm.dialog}
    </>
  )
}

describe('useConfirm: preguntar antes de lo que no se deshace', () => {
  it('el botón con el verbo dice que sí; «mejor no» o Escape, que no', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()

    localStorage.setItem('sanatorio_lang', 'es')
    render(
      <I18nProvider>
        <Remove onAnswer={onAnswer} />
      </I18nProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    const dialog = screen.getByRole('dialog', { name: text('confirm.title') })

    expect(within(dialog).getByText('¿Retirar la pizarra?')).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: 'Retirar' }))
    expect(onAnswer).toHaveBeenLastCalledWith(true)
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    await user.click(screen.getByRole('button', { name: text('confirm.cancel') }))
    expect(onAnswer).toHaveBeenLastCalledWith(false)

    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    escape(screen.getByRole('dialog'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(onAnswer).toHaveBeenLastCalledWith(false)
    expect(onAnswer).toHaveBeenCalledTimes(3)
  })
})
