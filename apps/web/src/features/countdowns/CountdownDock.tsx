import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Countdown } from '@sanatorio/contracts'

import {
  dismissCountdown,
  loadCountdowns,
  unpinCountdown,
  useCountdowns,
} from '../../shared/countdowns'
import { eventTitle } from '../../shared/eventTitle'
import { focusing, useFocus } from '../../shared/focus'
import { useAction } from '../../shared/hooks/useAsync'
import { useNow } from '../../shared/hooks/useNow'
import { useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { CountdownClock } from '../../shared/ui/CountdownClock'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { CountdownPicker } from './CountdownPicker'

/** Lo que queda por debajo de esto sale resaltado: es para hoy. */
const URGENT_MS = 24 * 60 * 60_000
/** Dónde se deja la ventanita al arrastrarla, y si está plegada (solo en este navegador). */
const POS_KEY = 'sanatorio_countdowns_pos'
const MIN_KEY = 'sanatorio_countdowns_min'

type Pos = { x: number; y: number }

/** Lee de `localStorage` sin romper si no se puede (modo privado, sin permiso). */
function stored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)

    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function store(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento, se olvida al recargar: no pasa nada.
  }
}

/** `true` en una pantalla estrecha (la del móvil). */
const narrow = (): boolean => window.matchMedia('(max-width: 640px)').matches

/** Una posición que cabe en la pantalla, con un margen. */
const clamp = (pos: Pos, box: DOMRect): Pos => ({
  x: Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - box.width - 8)),
  y: Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - box.height - 8)),
})

/**
 * La ventanita de avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`),
 * flotando como el Pomodoro pero en la otra esquina: los avisos de quien
 * administra (la limpieza de taquillas) y lo que cada cual se ha fijado.
 *
 * Se arrastra por su cabecera y se vuelve a anclar con un botón; se pliega en
 * una píldora con lo más cercano. Cerrar un aviso lo guarda la API; plegarla
 * o moverla, solo este navegador.
 *
 * @param stamp La huella de los avisos que llega con el pulso: si cambia, se piden otra vez.
 */
export function CountdownDock({ stamp }: { stamp: number | null }) {
  const { t } = useI18n()
  const list = useCountdowns()
  const [adding, setAdding] = useState(false)
  // En el móvil empieza plegada (una píldora con lo más cercano): desplegada tapa media pantalla.
  const [folded, setFolded] = useState(() => stored(MIN_KEY, narrow()))
  const [pos, setPos] = useState<Pos | null>(() => stored<Pos | null>(POS_KEY, null))
  const box = useRef<HTMLElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const pomodoro = focusing(useFocus())
  const shown = list ?? []
  const now = useNow(1000, { active: shown.length > 0 })

  useEffect(() => {
    void loadCountdowns()
  }, [stamp])

  if (shown.length === 0 && !adding) return null

  const fold = (next: boolean): void => {
    setFolded(next)
    store(MIN_KEY, next)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    // Los botones de la cabecera se pulsan, no arrastran.
    if ((event.target as HTMLElement).closest('button') !== null || box.current === null) return

    const rect = box.current.getBoundingClientRect()

    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>): void => {
    if (drag.current === null || box.current === null) return

    setPos(
      clamp(
        { x: event.clientX - drag.current.dx, y: event.clientY - drag.current.dy },
        box.current.getBoundingClientRect(),
      ),
    )
  }

  const onPointerUp = (): void => {
    if (drag.current === null) return
    drag.current = null
    store(POS_KEY, pos)
  }

  const nearest = shown.find((entry) => entry.at !== null && Date.parse(entry.at) > now)
  const style =
    pos === null ? undefined : { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
  const classes = ['countdown-dock', folded ? 'folded' : '', pos === null ? 'docked' : 'moved']

  if (pomodoro) classes.push('beside-focus')

  return (
    <aside ref={box} className={classes.join(' ')} style={style} aria-label={t('countdown.title')}>
      <header
        className="countdown-head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <Icon name="reloj" />
        {folded && nearest !== undefined ? (
          <span className="countdown-peek">
            <span className="countdown-peek-title">{titleOf(nearest, t)}</span>
            <CountdownClock at={Date.parse(nearest.at ?? '')} now={now} />
          </span>
        ) : (
          <strong className="countdown-name">
            {t('countdown.title')}
            {shown.length > 1 && <span className="badge subtle">{shown.length}</span>}
          </strong>
        )}
        {!folded && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('countdown.add')}
            aria-pressed={adding}
            onClick={() => {
              setAdding((open) => !open)
            }}
          >
            <Icon name="mas" />
          </button>
        )}
        {pos !== null && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('countdown.dock')}
            title={t('countdown.dock')}
            onClick={() => {
              setPos(null)
              store(POS_KEY, null)
            }}
          >
            <Icon name="chincheta" />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label={t(folded ? 'countdown.unfold' : 'countdown.fold')}
          aria-expanded={!folded}
          onClick={() => {
            fold(!folded)
          }}
        >
          <Icon name="abajo" className={folded ? 'flip' : ''} />
        </button>
      </header>

      {!folded && (
        <div className="countdown-body">
          {adding && (
            <CountdownPicker
              list={shown}
              onDone={() => {
                setAdding(false)
              }}
            />
          )}
          {shown.length > 0 && (
            <ul className="countdown-list">
              {shown.map((entry) => (
                <CountdownItem key={`${entry.kind}-${entry.id}`} entry={entry} now={now} />
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}

/**
 * El título de una cuenta atrás: el de su evento en el idioma de quien mira
 * (`eventTitle`), el escrito, el de la limpieza de taquillas o «nada a la vista».
 */
function titleOf(entry: Countdown, t: Translate): string {
  if (entry.title !== null) return eventTitle(t, entry)
  if (entry.preset === 'lockers') return t('countdown.lockers.title')

  return t('countdown.next.none')
}

/** Una cuenta atrás de la lista, con lo que falta y cómo quitarla. */
export function CountdownItem({ entry, now }: { entry: Countdown; now: number }) {
  const { t } = useI18n()
  const { dateTime } = useFormat()
  const action = useAction()
  const at = entry.at === null ? null : Date.parse(entry.at)
  const title = titleOf(entry, t)
  const body = entry.body ?? (entry.preset === 'lockers' ? t('countdown.lockers.body') : null)
  const past = at !== null && at <= now
  const notice = entry.kind === 'notice'
  const state = past ? 'past' : at !== null && at - now < URGENT_MS ? 'urgent' : ''

  return (
    <li className={`countdown-item kind-${entry.kind} ${state}`}>
      <div className="countdown-item-head">
        <span className="countdown-tag">{t(`countdown.kind.${entry.kind}`)}</span>
        <button
          type="button"
          className="icon-btn"
          disabled={action.busy}
          aria-label={t(notice ? 'countdown.dismiss' : 'countdown.unpin', { title })}
          title={t(notice ? 'countdown.dismissHint' : 'countdown.unpinHint')}
          onClick={() => {
            void action.run(() => (notice ? dismissCountdown(entry.id) : unpinCountdown(entry.id)))
          }}
        >
          <Icon name="cerrar" size={16} />
        </button>
      </div>
      <strong className="countdown-title">{title}</strong>
      {body !== null && <p className="countdown-text">{body}</p>}
      {at === null ? (
        <small className="hint">{t('countdown.next.empty')}</small>
      ) : past ? (
        <span className="countdown-past" role="status">
          {t('countdown.past')}
        </span>
      ) : (
        <span className="countdown-when" role="timer">
          <CountdownClock at={at} now={now} />
          <small>{dateTime(at)}</small>
        </span>
      )}
      <ErrorNote error={action.error} />
    </li>
  )
}
