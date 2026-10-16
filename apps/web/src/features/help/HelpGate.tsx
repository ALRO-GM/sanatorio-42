import { useEffect, useRef, useState } from 'react'

import type { Booking } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

type HelpGateProps = {
  /** Cuántas cosas dice el pulso que hay (peticiones y rechazos sin ver). */
  pending: number
  /** Se ha contestado o visto alguna: conviene pedir el pulso otra vez. */
  onChange: () => void
}

/**
 * Lo de la ayuda que no se puede pasar por alto, en una ventana que no se
 * cierra sin contestar: alguien te pide ayuda (aceptar o rechazar), o te han
 * rechazado o anulado una reserva (enterado). Primero las peticiones.
 */
export function HelpGate({ pending, onChange }: HelpGateProps) {
  const { t, lang } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const [queue, setQueue] = useState<Booking[]>([])
  const { busy, error, run } = useAction()
  const current = queue[0]
  /** Las que quedan, a mano para `onClose` (que no se rehace). */
  const left = useRef(0)

  left.current = queue.length

  useEffect(() => {
    if (pending === 0) return

    let alive = true

    api.getHelpInbox().then(
      (inbox) => {
        if (alive) setQueue([...inbox.requests, ...inbox.news])
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

  const asking = current.role === 'helper' && current.status === 'pending'
  const next = (action: () => Promise<void>): void => {
    void run(async () => {
      await action()
      left.current -= 1
      setQueue((list) => list.slice(1))
      if (left.current <= 0) dialog.current?.close()
      onChange()
    })
  }
  const when = `${current.start}–${current.end}`
  const local = new Date()
  const todayKey = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
  const day =
    current.day === todayKey
      ? t('helpGate.today')
      : new Date(`${current.day}T12:00:00`).toLocaleDateString(localeOf(lang), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
  const title = asking
    ? t('helpGate.asks', { login: current.peer.login })
    : t(current.status === 'declined' ? 'helpGate.declined' : 'helpGate.cancelled', {
        login: current.peer.login,
      })

  return (
    <dialog
      ref={dialog}
      className={`layout-dialog help-gate ${asking ? 'asking' : 'news'}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
      }}
      onClose={() => {
        // Mientras quede algo, se vuelve a abrir.
        if (left.current > 0) dialog.current?.showModal()
      }}
    >
      <div className="layout-head">
        <span className="event-kind">
          <Icon name="guardia" /> {t(asking ? 'helpGate.kind' : 'helpGate.kindNews')}
        </span>
        {queue.length > 1 && (
          <span className="hint">{t('helpGate.more', { n: queue.length - 1 })}</span>
        )}
      </div>
      <div className="help-gate-who">
        <Avatar login={current.peer.login} image={current.peer.image} size={64} />
        <h3>{title}</h3>
      </div>
      <ul className="help-gate-facts">
        <li>
          <Icon name="calendario" /> {t('helpGate.when', { day, when })}
        </li>
        {current.projectName !== null && (
          <li>
            <Icon name="tablon" /> {current.projectName}
          </li>
        )}
        {current.note !== null && <li className="help-gate-note">«{current.note}»</li>}
      </ul>
      {!asking && <p className="hint">{t('helpGate.newsHint')}</p>}
      <ErrorNote error={error} />
      <div className="actions">
        {asking ? (
          <>
            <button
              type="button"
              className="pill"
              disabled={busy}
              onClick={() => {
                next(() => api.respondBooking(current.id, false))
              }}
            >
              {t('helpGate.decline')}
            </button>
            <button
              type="button"
              className="primary small"
              disabled={busy}
              onClick={() => {
                next(() => api.respondBooking(current.id, true))
              }}
            >
              {t('helpGate.accept')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="primary small"
            disabled={busy}
            onClick={() => {
              next(() => api.seenBooking(current.id))
            }}
          >
            {t('helpGate.ok')}
          </button>
        )}
      </div>
    </dialog>
  )
}
