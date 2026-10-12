import { useEffect, useRef, useState } from 'react'

import type { Broadcast } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

type BroadcastGateProps = {
  /** Cuántos comunicados dice el pulso que hay por leer. */
  pending: number
  /** Se ha contestado alguno: conviene pedir el pulso otra vez. */
  onChange: () => void
}

/**
 * Los comunicados de quien administra: una ventana que sale sola, de uno en
 * uno y por orden de llegada.
 *
 * Si el comunicado lo pide, no se cierra sin elegir una de sus opciones: ni con
 * Escape ni pulsando fuera. Como lo pendiente lo guarda la API, vuelve a salir
 * aunque se recargue la página o se abra en otro sitio.
 */
export function BroadcastGate({ pending, onChange }: BroadcastGateProps) {
  const { t, lang } = useI18n()
  const [queue, setQueue] = useState<Broadcast[]>([])
  const dialog = useRef<HTMLDialogElement>(null)
  const { busy, error, run } = useAction()
  const current = queue[0]
  // Con opciones y obligación de elegir, no hay otra forma de cerrarlo.
  const locked = current !== undefined && current.required && current.options.length > 0

  // El pulso solo trae la cuenta: la lista se pide cuando hay algo.
  useEffect(() => {
    if (pending === 0) return

    let alive = true

    api.getBroadcasts().then(
      (list) => {
        if (alive) setQueue(list)
      },
      () => undefined,
    )

    return () => {
      alive = false
    }
  }, [pending])

  useEffect(() => {
    if (current !== undefined && dialog.current?.open === false) dialog.current.showModal()
  }, [current])

  if (current === undefined) return null

  const answer = (option: number | null): void => {
    void run(async () => {
      setQueue(await api.answerBroadcast(current.id, { option }))
      onChange()
    })
  }

  return (
    <dialog
      ref={dialog}
      className="layout-dialog broadcast-dialog"
      aria-label={current.title}
      onCancel={(event) => {
        // Escape: si hay que elegir, no hace nada; si no, cuenta como visto.
        event.preventDefault()

        if (!locked) answer(null)
      }}
      onClose={() => {
        // El navegador puede cerrarla aunque se le diga que no (un segundo
        // Escape, por ejemplo): si hay que elegir, se vuelve a abrir.
        if (locked) dialog.current?.showModal()
        else answer(null)
      }}
    >
      <div className="layout-head">
        <span className="event-kind">
          <Icon name="campana" /> {t('broadcast.from', { login: current.from })}
        </span>
        {queue.length > 1 && (
          <span className="badge">{t('meet.queued', { n: queue.length - 1 })}</span>
        )}
      </div>
      <h3>{current.title}</h3>
      <p className="broadcast-body">{current.body}</p>
      <small className="hint">
        {new Date(current.at).toLocaleString(localeOf(lang), {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </small>

      {locked && <p className="event-alert must">{t('broadcast.must')}</p>}
      <ErrorNote error={error} />

      <div className="actions">
        {current.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className="primary small"
            disabled={busy}
            onClick={() => {
              answer(index)
            }}
          >
            {option}
          </button>
        ))}
        {!locked && (
          <button
            type="button"
            className={current.options.length === 0 ? 'primary small' : 'pill'}
            disabled={busy}
            onClick={() => {
              answer(null)
            }}
          >
            {t(current.options.length === 0 ? 'broadcast.ok' : 'broadcast.later')}
          </button>
        )}
      </div>
    </dialog>
  )
}
