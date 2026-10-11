import { useCallback, useEffect, useState } from 'react'

import type { CalendarSection, EventAlert, MeetCheckin } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { usePrefs } from '../../shared/layout/store'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { EventDialog } from '../calendar/EventDialog'

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
 * (los que hayas elegido; cinco por defecto) con qué es, dónde y a qué hora.
 *
 * Si el evento es con más gente, **hay que contestar**: voy, me retraso o no
 * voy. La ventana no se cierra de otra forma, y como lo pendiente lo guarda la
 * API, vuelve a salir aunque se recargue o se abra otra pestaña. Si hay varios
 * avisos esperando salen de uno en uno, por orden de inicio. Quien no contesta
 * en media hora desde el inicio queda como no asistido, y se le dice una vez.
 *
 * También recoge los enlaces de los QR de asistencia: al abrir uno, enseña el
 * código y pide confirmarlo antes de validarlo. No se valida solo: un enlace
 * con un código equivocado que te mande cualquiera te gastaría un intento.
 */
export function AlertCenter({ me, onGo }: AlertCenterProps) {
  const { t } = useI18n()
  const lead = usePrefs().alertLead ?? 5
  const [checkin, setCheckin] = useState<MeetCheckin | null>(null)
  const [link, setLink] = useState<{ id: string; code: string } | null>(null)
  const validation = useAction()

  // Lo último que dijo la API, y una marca que cambia cada medio minuto para
  // volver a mirar la hora sin pedir nada.
  const [alerts, setAlerts] = useState<EventAlert[]>([])
  const [, setTick] = useState(0)
  const [dismissed, setDismissed] = useState<readonly string[]>(seenIds)

  const refresh = useCallback((): void => {
    api.getEventAlerts().then(
      (next) => {
        setAlerts(next.alerts)
      },
      () => {
        // Sin lista nueva se sigue con la anterior; se reintenta en la siguiente vuelta.
      },
    )
  }, [])

  useEffect(() => {
    refresh()

    const fetching = setInterval(refresh, FETCH_MS)
    const ticking = setInterval(() => {
      setTick((tick) => tick + 1)
    }, TICK_MS)

    return () => {
      clearInterval(fetching)
      clearInterval(ticking)
    }
  }, [refresh])

  // Los que ya toca enseñar, por orden de inicio. Lo que pide respuesta sale
  // aunque los avisos estén apagados: entonces, a la hora de empezar.
  const now = Date.now()
  const due = alerts.filter(({ event, state }) => {
    const start = Date.parse(event.start)

    if (state === 'missed') return true
    if (state === 'pending') return start - now <= Math.max(0, lead) * 60_000
    // Lo que solo informa: si los avisos están encendidos, una vez, y mientras no haya empezado.
    return (
      lead > 0 &&
      !dismissed.includes(event.id) &&
      start - now <= lead * 60_000 &&
      start - now > -2 * 60_000
    )
  })
  const current = due[0] ?? null
  const currentId = current?.event.id ?? null

  // Si la web está en otra pestaña, que se entere el sistema también: una vez por aviso.
  useEffect(() => {
    if (current === null || !document.hidden) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    new Notification(current.event.title, {
      body: current.event.place ?? '',
      tag: current.event.id,
    })
    // Solo al cambiar de aviso: `current` es un objeto nuevo en cada pintado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  const dismiss = (id: string): void => {
    const next = [...seenIds(), id].slice(-50)

    sessionStorage.setItem(SEEN_KEY, JSON.stringify(next))
    setDismissed(next)
  }

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
      {current !== null && (
        <EventDialog
          // Con otra clave, la ventana del siguiente aviso es nueva: se abre sola.
          key={`${current.event.id}-${current.state}`}
          event={current.event}
          me={me}
          alert
          queued={due.length - 1}
          {...(current.state === 'pending'
            ? { must: 'reply' as const, onReplied: refresh }
            : current.state === 'missed'
              ? { must: 'missed' as const }
              : {})}
          onClose={() => {
            if (current.state === 'missed') {
              void api.ackEventAlert(current.event.id).then(refresh, refresh)
            } else if (current.state === 'info') {
              dismiss(current.event.id)
            }
          }}
          onGo={(section) => {
            if (current.state === 'info') dismiss(current.event.id)
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
            <Icon name="cerrar" />
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
            <Icon name="cerrar" />
          </button>
        </div>
      )}
    </>
  )
}
