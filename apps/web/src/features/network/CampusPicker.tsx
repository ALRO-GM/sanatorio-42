import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../../shared/i18n'

/** Lo que se espera tras el último clic antes de pedir el grafo: da tiempo a marcar otra. */
export const CAMPUS_WAIT_MS = 2000

type Campus = { id: number; name: string }

type CampusPickerProps = {
  available: readonly Campus[]
  /** Las que se están viendo ahora. */
  current: readonly number[]
  onApply: (campuses: readonly number[] | 'all') => void
}

/**
 * Elegir escuelas para la red sin pedir el grafo a cada clic (pedir varias es
 * caro): un clic marca o desmarca y pone el reloj a dos segundos; si en ese rato
 * se marca otra, vuelve a empezar. Al acabar se pide con lo marcado. Un doble
 * clic deja solo esa escuela, al momento. «Todas», también al momento.
 */
export function CampusPicker({ available, current, onApply }: CampusPickerProps) {
  const { t } = useI18n()
  // Lo marcado y aún sin pedir; `null` si no hay nada pendiente.
  const [pending, setPending] = useState<number[] | null>(null)
  // Cambia a cada clic: reinicia la barra que enseña la espera.
  const [round, setRound] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shown = pending ?? current

  const stop = (): void => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(() => stop, [])

  const apply = (next: readonly number[] | 'all'): void => {
    stop()
    setPending(null)
    onApply(next)
  }

  const toggle = (id: number): void => {
    const next = shown.includes(id) ? shown.filter((one) => one !== id) : [...shown, id]

    stop()
    setPending(next)
    setRound((count) => count + 1)
    // Sin ninguna marcada no hay grafo: se queda como estaba.
    timer.current = setTimeout(() => {
      timer.current = null
      setPending(null)
      if (next.length > 0) onApply(next)
    }, CAMPUS_WAIT_MS)
  }

  const all = shown.length === available.length

  return (
    <div className="campus-picker">
      <div className="filter-pills" role="group" aria-label={t('net.campuses')}>
        {available.map((campus) => {
          const on = shown.includes(campus.id)

          return (
            <button
              key={campus.id}
              type="button"
              className={`pill ${on ? 'active' : ''} ${on !== current.includes(campus.id) ? 'pending' : ''}`}
              aria-pressed={on}
              title={t('net.campuses.hint')}
              onClick={() => {
                toggle(campus.id)
              }}
              onDoubleClick={() => {
                apply([campus.id])
              }}
            >
              {campus.name}
            </button>
          )
        })}
        <button
          type="button"
          className={`pill ${all ? 'active' : ''}`}
          aria-pressed={all}
          onClick={() => {
            apply('all')
          }}
        >
          {t('net.campuses.all')}
        </button>
      </div>
      {pending !== null && (
        <div className="campus-wait" role="status">
          <span key={round} className="campus-wait-bar" aria-hidden="true" />
          <small>{pending.length === 0 ? t('net.campuses.none') : t('net.campuses.waiting')}</small>
        </div>
      )}
    </div>
  )
}
