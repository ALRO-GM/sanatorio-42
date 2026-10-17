import { useEffect, useRef, useState } from 'react'

import type { CalendarEvent, CalendarSection } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { hasCodes, hasRoom } from '../alerts/eligible'
import { EventRoom } from '../alerts/EventRoom'
import { whenText } from './dates'
import { iconOf } from './kinds'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'

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
  /**
   * Cómo de obligatorio es el aviso:
   *
   * - `reply`: es con más gente y hay que decir si vas, si te retrasas o si no.
   *   La ventana no se cierra con Escape ni pulsando fuera, y no tiene botón de
   *   cerrar: solo se va al contestar (`onReplied`).
   * - `missed`: no contestaste y ya se te dio por no asistido. Se cierra con su botón.
   */
  must?: 'reply' | 'missed'
  onReplied?: () => void
  /** Cuántos avisos más esperan detrás de este. */
  queued?: number
  /** Apuntarse a una pizarra o a un grupo al que aún no vas. */
  onJoin?: (event: CalendarEvent) => Promise<void>
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
export function EventDialog({
  event,
  onClose,
  onGo,
  me,
  alert = false,
  must,
  onReplied,
  queued = 0,
  onJoin,
}: EventDialogProps) {
  const { t, lang } = useI18n()
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<unknown>(null)
  // Se puede apuntar a pizarras y grupos a los que no va, si queda sitio.
  const joinable =
    onJoin !== undefined &&
    event.joined === false &&
    (event.id.startsWith('board:') || event.id.startsWith('therapy:'))
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
      onClose={() => {
        // El navegador deja cerrar con Escape a la segunda, aunque se le diga que
        // no. Un aviso que pide respuesta se vuelve a abrir.
        if (must === 'reply') {
          ref.current?.showModal()

          return
        }

        onClose()
      }}
      onCancel={(cancel) => {
        // Un aviso que pide respuesta no se quita con Escape.
        if (must !== undefined) cancel.preventDefault()
      }}
      onClick={(click) => {
        // El propio `<dialog>` es el fondo: un clic en él (y no en su contenido) cierra,
        // salvo que el aviso pida respuesta.
        if (must === undefined && click.target === ref.current) onClose()
      }}
    >
      <article className="event-sheet">
        <header className="event-sheet-head">
          <span className="event-kind">
            <Icon name={iconOf(event.kind)} /> {t(`agenda.kind.${event.kind}`)}
          </span>
          {must === undefined ? (
            <button
              type="button"
              className="icon-btn"
              aria-label={t('agenda.back')}
              onClick={onClose}
            >
              <Icon name="cerrar" />
            </button>
          ) : (
            queued > 0 && <span className="badge">{t('meet.queued', { n: queued })}</span>
          )}
        </header>

        {must === 'missed' && (
          <p className="event-alert missed" role="alert">
            <Icon name="aviso" /> {t('meet.missed')}
          </p>
        )}
        {must === 'reply' && (
          <p className="event-alert must" role="alert">
            <Icon name="campana" /> {t('meet.mustReply')}
          </p>
        )}

        {alert && must !== 'missed' && minutesTo(event.start) > 0 && (
          <p className="event-alert" role="alert">
            <Icon name="campana" />{' '}
            {t('meet.alert', { minutes: Math.max(0, minutesTo(event.start)) })}
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

        {must === 'reply' ? (
          <EventRoom
            eventId={event.id}
            me={me}
            replyOnly
            {...(onReplied === undefined ? {} : { onReplied })}
          />
        ) : (
          must === undefined &&
          hasRoom(event) && <EventRoom eventId={event.id} me={me} codes={hasCodes(event)} />
        )}

        {must === 'missed' && (
          <footer className="actions">
            <button type="button" className="primary small" onClick={onClose}>
              {t('meet.missedOk')}
            </button>
          </footer>
        )}
        <ErrorNote error={joinError} />
        <footer className="actions" hidden={must !== undefined}>
          {event.url !== null && (
            <a className="button primary small" href={event.url} target="_blank" rel="noreferrer">
              {t('agenda.open42')} ↗
            </a>
          )}
          {joinable && (
            <button
              type="button"
              className="primary small"
              disabled={joining}
              onClick={() => {
                setJoining(true)
                setJoinError(null)
                void onJoin(event)
                  .catch((caught: unknown) => {
                    setJoinError(caught)
                  })
                  .finally(() => {
                    setJoining(false)
                  })
              }}
            >
              <Icon name="mas" size={14} /> {t('agenda.join')}
            </button>
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
