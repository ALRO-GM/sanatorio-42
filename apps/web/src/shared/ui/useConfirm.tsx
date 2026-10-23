import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { Modal } from './Modal'

type ConfirmOptions = {
  /** La pregunta («¿Retirar la pizarra de jdoe?»). */
  body: string
  /** Encima de la pregunta; sin él, «¿Seguro?». */
  title?: string
  /** El botón que confirma, con su verbo («Retirar»); sin él, «Sí, adelante». */
  okText?: string
  /** Es destructivo: el botón sale en rojo. */
  danger?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

/**
 * Una pregunta de sí o no antes de algo que no se deshace (retirar, borrar,
 * sancionar), en una ventana de la web y no en el `window.confirm` del
 * navegador: así sigue el tema, el botón dice qué va a pasar en vez de
 * «Aceptar», y se puede probar.
 *
 * @example
 *   const confirm = useConfirm()
 *   …
 *   if (await confirm.ask({ body: t('cal.removeAsk', { host }), okText: t('cal.remove'), danger: true })) …
 *   …
 *   return <>{…}{confirm.dialog}</>
 */
export function useConfirm(): {
  ask: (options: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const { t } = useI18n()
  const [pending, setPending] = useState<Pending | null>(null)
  // La respuesta antes de que se cierre la ventana; al cerrarse sin ella, es «no».
  const answer = useRef<boolean | null>(null)

  const ask = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        answer.current = null
        setPending({ ...options, resolve })
      }),
    [],
  )

  const dialog =
    pending === null ? null : (
      <Modal
        label={pending.title ?? t('confirm.title')}
        className="confirm-dialog"
        onClose={() => {
          pending.resolve(answer.current ?? false)
          setPending(null)
        }}
      >
        <h3>{pending.title ?? t('confirm.title')}</h3>
        <p>{pending.body}</p>
        <div className="confirm-actions">
          <button
            type="button"
            className="pill"
            onClick={(event) => {
              answer.current = false
              event.currentTarget.closest('dialog')?.close()
            }}
          >
            {t('confirm.cancel')}
          </button>
          <button
            type="button"
            className={pending.danger === true ? 'danger' : 'primary'}
            autoFocus
            onClick={(event) => {
              answer.current = true
              event.currentTarget.closest('dialog')?.close()
            }}
          >
            {pending.okText ?? t('confirm.ok')}
          </button>
        </div>
      </Modal>
    )

  return { ask, dialog }
}
