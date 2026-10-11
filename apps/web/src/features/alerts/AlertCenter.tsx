import { useEffect, useState } from 'react'

import type { CalendarEvent, CalendarSection, MeetCheckin } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { usePrefs } from '../../shared/layout/store'
import { EventDialog } from '../calendar/EventDialog'
import { alerts } from './eligible'

type AlertCenterProps = {
  me: string
  onGo: (section: CalendarSection) => void
}

/** Cada cuánto se mira el calendario en busca de algo que esté a punto de empezar. */
const POLL_MS = 60_000

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
 * También recoge los enlaces de los QR de asistencia: al abrir uno, valida el
 * código y dice cómo ha quedado.
 */
export function AlertCenter({ me, onGo }: AlertCenterProps) {
  const { t } = useI18n()
  const lead = usePrefs().alertLead ?? 5
  const [event, setEvent] = useState<CalendarEvent | null>(null)
  const [checkin, setCheckin] = useState<MeetCheckin | 'error' | null>(null)

  useEffect(() => {
    // Con el aviso apagado no se mira nada.
    if (lead <= 0) return undefined

    let current = true
    const look = (): void => {
      const now = Date.now()

      api.getCalendar(new Date(now).toISOString(), new Date(now + AHEAD_MS).toISOString()).then(
        (calendar) => {
          if (!current) return

          const seen = seenIds()
          const due = calendar.events
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
            if (
              document.hidden &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification(due.title, { body: due.place ?? '', tag: due.id })
            }
          }
        },
        () => {
          // Sin calendario no hay aviso: se vuelve a intentar en la siguiente vuelta.
        },
      )
    }

    look()

    const timer = setInterval(look, POLL_MS)

    return () => {
      current = false
      clearInterval(timer)
    }
  }, [lead])

  // Un QR de asistencia abre la web con el código en la dirección.
  useEffect(() => {
    const validate = (): void => {
      const link = checkinInUrl()

      if (link === null) return

      window.history.replaceState(null, '', '#/calendario')
      api.checkinEvent(link.id, link.code).then(setCheckin, () => {
        setCheckin('error')
      })
    }

    validate()
    window.addEventListener('hashchange', validate)

    return () => {
      window.removeEventListener('hashchange', validate)
    }
  }, [])

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
      {checkin !== null && (
        <div className="meet-toast" role="status">
          <span>
            {checkin === 'error'
              ? t('meet.qr.error')
              : checkin.presence.minutes === null
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
