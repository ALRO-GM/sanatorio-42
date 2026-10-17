import { useEffect, useRef, useState } from 'react'

import { api } from '../../shared/api'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { LegalDocument } from './LegalDocument'
import { legalText } from './text'

/**
 * La primera vez (y cada vez que cambia el texto), una ventana que no se cierra
 * sin aceptar la privacidad y las condiciones. Enseña lo esencial y deja leer
 * el texto entero sin salir.
 */
export function LegalGate() {
  const { t, tree } = useI18n()
  const status = useAsync(() => api.getLegal(), [])
  const { busy, error, run } = useAction()
  const dialog = useRef<HTMLDialogElement>(null)
  const [full, setFull] = useState(false)
  /** Ya aceptado: cerrar la ventana ya no la vuelve a abrir. */
  const accepted = useRef(false)
  const pending = status.data?.acceptedAt === null
  const { text } = legalText(tree)

  useEffect(() => {
    if (pending && dialog.current?.open === false) dialog.current.showModal()
  }, [pending])

  if (!pending || status.data === undefined) return null

  const version = status.data.version

  return (
    <dialog
      ref={dialog}
      className="layout-dialog legal-gate"
      aria-label={text.title}
      onCancel={(event) => {
        // No se cierra sin aceptar: ni con Escape.
        event.preventDefault()
      }}
      onClose={() => {
        if (!accepted.current) dialog.current?.showModal()
      }}
    >
      <div className="layout-head">
        <span className="event-kind">
          <Icon name="escudo" /> {t('legal.gateKind')}
        </span>
      </div>
      <h3>{text.title}</h3>
      <ul className="legal-summary">
        {text.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {full ? (
        <LegalDocument />
      ) : (
        <button
          type="button"
          className="link"
          onClick={() => {
            setFull(true)
          }}
        >
          {t('legal.readAll')}
        </button>
      )}
      <ErrorNote error={error} />
      <div className="actions">
        <button
          type="button"
          className="primary small"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await api.acceptLegal(version)
              accepted.current = true
              dialog.current?.close()
              await status.reload()
            })
          }
        >
          {t('legal.accept')}
        </button>
      </div>
    </dialog>
  )
}
