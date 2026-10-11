import { useEffect, useRef } from 'react'

import type { CalendarEvent, CalendarSection } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { hasCodes, hasRoom } from '../alerts/eligible'
import { EventRoom } from '../alerts/EventRoom'
import { whenText } from './dates'
import { iconOf } from './kinds'

/** Minutos que faltan para un instante, redondeando hacia arriba. */
function minutesTo(iso: string): number {
  return Math.ceil((Date.parse(iso) - Date.now()) / 60_000)
}

type EventDialogProps = {
  event: CalendarEvent
  onClose: () => void
  /** Ir a la sección de la web donde se gestiona un evento propio. */
  onGo: (section: CalendarSection) => void
  /** Login de quien mira, para distinguir sus mensajes en el chat. */
  me: string
  /** `true` si la ficha ha saltado sola como aviso de que el evento está al caer. */
  alert?: boolean
}

/**
 * La ficha de un evento, en una ventana sobre el calendario.
 *
 * Es un `<dialog>` modal: el navegador se encarga de que el foco no se escape,
 * de cerrar con Escape y de devolver el foco a donde estaba. También se cierra
 * pulsando fuera o con "Volver al calendario".
 *
 * Lo de 42 lleva un enlace a su página en la intra; lo propio, a su sección.
 */
export function EventDialog({ event, onClose, onGo, me, alert = false }: EventDialogProps) {
  const { t, lang } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current

    // No hay limpieza a propósito: al desmontarse, el `<dialog>` desaparece con
    // su capa. Llamar aquí a `close()` dispararía `onClose`, y en desarrollo
    // (donde React monta cada efecto dos veces) la ficha se cerraría nada más abrirse.
    if (dialog !== null && !dialog.open) dialog.showModal()
  }, [])

  const seats = event.seats

  return (
    <dialog
      ref={ref}
      className={`event-dialog kind-${event.kind}`}
      aria-labelledby="event-dialog-title"
      onClose={onClose}
      onClick={(click) => {
        // El propio `<dialog>` es el fondo: un clic en él (y no en su contenido) cierra.
        if (click.target === ref.current) onClose()
      }}
    >
      <article className="event-sheet">
        <header className="event-sheet-head">
          <span className="event-kind">
            <span aria-hidden="true">{iconOf(event.kind)}</span> {t(`agenda.kind.${event.kind}`)}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('agenda.back')}
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        {alert && (
          <p className="event-alert" role="alert">
            🔔 {t('meet.alert', { minutes: Math.max(0, minutesTo(event.start)) })}
          </p>
        )}
        <h3 id="event-dialog-title">{event.title}</h3>

        <dl className="event-facts">
          <dt>{t('agenda.when')}</dt>
          <dd>{whenText(event, lang)}</dd>
          {event.place !== null && (
            <>
              <dt>{t('agenda.where')}</dt>
              <dd>{event.place}</dd>
            </>
          )}
          {event.withLogin !== null && (
            <>
              <dt>{t('agenda.with')}</dt>
              <dd>{event.withLogin}</dd>
            </>
          )}
          {seats !== null && (
            <>
              <dt>{t('agenda.seats')}</dt>
              <dd>
                {seats.max === null
                  ? t('agenda.seatsOpen', { taken: seats.taken })
                  : t('agenda.seatsOf', { taken: seats.taken, max: seats.max })}
              </dd>
            </>
          )}
          {event.joined !== null && (
            <>
              <dt>{t('agenda.you')}</dt>
              <dd>{t(event.joined ? 'agenda.joined' : `agenda.notJoined.${event.kind}`)}</dd>
            </>
          )}
        </dl>

        {event.description !== null && event.description !== '' && (
          <p className="event-description">{event.description}</p>
        )}

        {hasRoom(event) && <EventRoom eventId={event.id} me={me} codes={hasCodes(event)} />}

        <footer className="actions">
          {event.url !== null && (
            <a className="button primary small" href={event.url} target="_blank" rel="noreferrer">
              {t('agenda.open42')} ↗
            </a>
          )}
          {event.section !== null && (
            <button
              type="button"
              className="primary small"
              onClick={() => {
                if (event.section !== null) onGo(event.section)
              }}
            >
              {t('agenda.goTo', { section: t(`nav.${event.section}`) })}
            </button>
          )}
          <button type="button" className="pill" onClick={onClose}>
            {t('agenda.back')}
          </button>
        </footer>
      </article>
    </dialog>
  )
}
