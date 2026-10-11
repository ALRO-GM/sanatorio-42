import { useEffect, useState } from 'react'

import type { CalendarEvent, CalendarSection, MeetCheckin } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { usePrefs } from '../../shared/layout/store'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { EventDialog } from '../calendar/EventDialog'
import { alerts } from './eligible'

type AlertCenterProps = {
  me: string
  onGo: (section: CalendarSection) => void
}

/**
 * Cada cuánto se pide el calendario, y cada cuánto se mira, sin pedir nada, si
 * algo de lo que ya se sabe está a punto de empezar. Pedirlo cada minuto desde
 * cada pestaña abierta era casi todo el tráfico de la web en reposo.
 */
const FETCH_MS = 5 * 60_000
const TICK_MS = 30_000

/** Hasta dónde se mira por delante: de sobra para el aviso más largo. */
const AHEAD_MS = 3 * 60 * 60_000

const SEEN_KEY = 'sanatorio_alerts_seen'

function seenIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

/** Un enlace de QR (`#/asistencia/<evento>/<código>`), o `null`. */
function checkinInUrl(): { id: string; code: string } | null {
  const [section, id, code] = window.location.hash.replace(/^#\/?/, '').split('/')

  return section === 'asistencia' && id !== undefined && code !== undefined
    ? { id: decodeURIComponent(id), code }
    : null
}

/**
 * Los avisos: una ventana que sale sola unos minutos antes de cada evento tuyo
 * (los que hayas elegido; cinco por defecto) con qué es, dónde y a qué hora, y,
 * si es con más gente, las respuestas rápidas y el chat.
 *
 * También recoge los enlaces de los QR de asistencia: al abrir uno, enseña el
 * código y pide confirmarlo antes de validarlo. No se valida solo: un enlace
 * con un código equivocado que te mande cualquiera te gastaría un intento.
 */
export function AlertCenter({ me, onGo }: AlertCenterProps) {
  const { t } = useI18n()
  const lead = usePrefs().alertLead ?? 5
  const [event, setEvent] = useState<CalendarEvent | null>(null)
  const [checkin, setCheckin] = useState<MeetCheckin | null>(null)
  const [link, setLink] = useState<{ id: string; code: string } | null>(null)
  const validation = useAction()

  useEffect(() => {
    // Con el aviso apagado no se mira nada.
    if (lead <= 0) return undefined

    let current = true
    let upcoming: CalendarEvent[] = []
    let fetchedAt = -Infinity

    /** Avisa de lo que ya toca, con lo que se sabe: no pide nada. */
    const look = (): void => {
      const now = Date.now()
      const seen = seenIds()
      const due = upcoming
        .filter((entry) => alerts(entry) && !seen.includes(entry.id))
        .filter((entry) => {
          const start = Date.parse(entry.start)

          // Ya toca avisar y aún no ha empezado (o acaba de hacerlo).
          return start - now <= lead * 60_000 && start - now > -2 * 60_000
        })
        .sort((a, b) => a.start.localeCompare(b.start))[0]

      if (due !== undefined) {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, due.id].slice(-50)))
        setEvent(due)

        // Si la web está en otra pestaña, que se entere el sistema también.
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(due.title, { body: due.place ?? '', tag: due.id })
        }
      }
    }

    /** Pide el calendario si lo que hay ya es viejo, y mira. */
    const tick = (): void => {
      const now = Date.now()

      if (now - fetchedAt < FETCH_MS) {
        look()

        return
      }

      fetchedAt = now
      api.getCalendar(new Date(now).toISOString(), new Date(now + AHEAD_MS).toISOString()).then(
        (calendar) => {
          if (!current) return

          upcoming = calendar.events
          look()
        },
        () => {
          // Sin calendario nuevo se sigue avisando con el anterior; se reintenta a la siguiente.
          fetchedAt = -Infinity
          look()
        },
      )
    }

    tick()

    const timer = setInterval(tick, TICK_MS)

    return () => {
      current = false
      clearInterval(timer)
    }
  }, [lead])

  // Un QR de asistencia abre la web con el código en la dirección.
  useEffect(() => {
    const read = (): void => {
      const found = checkinInUrl()

      if (found === null) return

      window.history.replaceState(null, '', '#/calendario')
      setCheckin(null)
      setLink(found)
    }

    read()
    window.addEventListener('hashchange', read)

    return () => {
      window.removeEventListener('hashchange', read)
    }
  }, [])

  const confirm = async (): Promise<void> => {
    if (link === null) return

    const done = await validation.run(async () => {
      setCheckin(await api.checkinEvent(link.id, link.code))
    })

    if (done) setLink(null)
  }

  return (
    <>
      {event !== null && (
        <EventDialog
          event={event}
          me={me}
          alert
          onClose={() => {
            setEvent(null)
          }}
          onGo={(section) => {
            setEvent(null)
            onGo(section)
          }}
        />
      )}
      {link !== null && (
        <div className="meet-toast" role="alertdialog" aria-label={t('meet.att.title')}>
          <div>
            {t('meet.qr.confirm', { code: link.code })}
            <ErrorNote error={validation.error} />
          </div>
          <button
            type="button"
            className="primary small"
            disabled={validation.busy}
            onClick={() => void confirm()}
          >
            {t('meet.att.validate')}
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setLink(null)
              validation.clearError()
            }}
          >
            ✕
          </button>
        </div>
      )}
      {checkin !== null && (
        <div className="meet-toast" role="status">
          <span>
            {checkin.presence.minutes === null
              ? t('meet.qr.start')
              : t('meet.qr.end', { n: checkin.presence.minutes })}
          </span>
          <button
            type="button"
            className="link"
            onClick={() => {
              setCheckin(null)
            }}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
