import { useEffect, useState } from 'react'

import type { MeetMessage, MeetMessageInput } from '@sanatorio/contracts'

import { api } from '../api'
import { useAction } from '../hooks/useAsync'

/**
 * Cada cuánto se mira si hay mensajes nuevos, con el chat abierto. Mientras
 * nadie escribe, la espera se va alargando hasta el máximo; en cuanto llega
 * algo, vuelve al mínimo. Con la pestaña en segundo plano no se mira.
 */
const POLL_MIN_MS = 8000
const POLL_MAX_MS = 30_000

export type Thread = {
  /** `null` mientras llega la primera carga. */
  messages: MeetMessage[] | null
  /** Por qué no se ha podido leer el chat, si ha fallado. */
  loadError: unknown
  /** Manda un aviso o un mensaje. `true` si ha entrado. */
  send: (message: Omit<MeetMessageInput, 'id'>) => Promise<boolean>
  sending: boolean
  sendError: unknown
}

/**
 * El chat de un evento (o de un grupo de terapia, con `group:<id>`): lo lee, lo
 * mantiene al día y manda mensajes. Lo comparten la sala de un evento y el chat
 * de un grupo, que solo se diferencian en lo que pintan alrededor.
 */
export function useThread(eventId: string): Thread {
  const [messages, setMessages] = useState<MeetMessage[] | null>(null)
  const [loadError, setLoadError] = useState<unknown>(null)
  const action = useAction()

  useEffect(() => {
    let current = true
    let timer: number | undefined
    let wait = POLL_MIN_MS
    // El último mensaje que ya se tiene: al refrescar solo se piden los posteriores.
    let last: number | undefined

    const load = (): void => {
      window.clearTimeout(timer)

      // Con la pestaña en segundo plano no se pregunta: al volver se pone al día.
      if (document.hidden) return

      api
        .getEventThread(eventId, last)
        .then(
          (thread) => {
            if (!current) return

            const fresh = thread.messages

            wait = fresh.length > 0 ? POLL_MIN_MS : Math.min(POLL_MAX_MS, wait * 1.5)
            last = fresh.at(-1)?.id ?? last ?? 0
            setLoadError(null)
            setMessages((known) => {
              const seen = new Set((known ?? []).map((message) => message.id))

              return [...(known ?? []), ...fresh.filter((message) => !seen.has(message.id))]
            })
          },
          (cause: unknown) => {
            if (current) setLoadError(cause)
          },
        )
        .finally(() => {
          if (current) timer = window.setTimeout(load, wait)
        })
    }

    setMessages(null)
    load()
    document.addEventListener('visibilitychange', load)

    return () => {
      current = false
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [eventId])

  const { run } = action

  return {
    messages,
    loadError,
    send: (message) =>
      run(async () => {
        setMessages((await api.sendEventMessage({ id: eventId, ...message })).messages)
      }),
    sending: action.busy,
    sendError: action.error,
  }
}
