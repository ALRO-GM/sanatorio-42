import { useEffect, useState } from 'react'

import type { Countdown } from '@sanatorio/contracts'

import {
  dismissCountdown,
  loadCountdowns,
  unpinCountdown,
  useCountdowns,
  useCountdownsPageOpen,
} from '../../shared/countdowns'
import { DockItem } from '../../shared/dock/DockItem'
import { eventTitle } from '../../shared/eventTitle'
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

/**
 * La ventanita de avisos con cuenta atrás (`docs/avisos-cuenta-atras.md`):
 * los avisos de quien administra (la limpieza de taquillas) y lo que cada
 * cual se ha fijado.
 *
 * Va en la pila de la esquina (`shared/dock`), con el Pomodoro y Code
 * Clicker: se arrastra por su cabecera, se reordena, se saca a flotar y se
 * pliega en una píldora con lo más cercano. Cerrar un aviso lo guarda la API;
 * lo demás, solo este navegador.
 *
 * @param stamp La huella de los avisos que llega con el pulso: si cambia, se piden otra vez.
 */
export function CountdownDock({ stamp }: { stamp: number | null }) {
  const { t } = useI18n()
  const list = useCountdowns()
  // En la vista de cuentas atrás del calendario ya está todo en grande.
  const onPage = useCountdownsPageOpen()
  const [adding, setAdding] = useState(false)
  const shown = list ?? []
  const now = useNow(1000, { active: shown.length > 0 && !onPage })

  useEffect(() => {
    void loadCountdowns()
  }, [stamp])

  // Sin nada que contar (o con la vista grande abierta) no ocupa sitio en la pila.
  if ((shown.length === 0 && !adding) || onPage) return null

  const nearest = shown.find((entry) => entry.at !== null && Date.parse(entry.at) > now)
  const title = t('countdown.title')

  return (
    <DockItem
      id="countdowns"
      title={title}
      size={{ width: 296, height: 260 }}
      foldedSize={{ width: 230, height: 44 }}
    >
      {({ folded, grip, controls }) => (
        <aside className={`countdown-dock ${folded ? 'folded' : ''}`} aria-label={title}>
          <header className="countdown-head" data-dock-handle="">
            {grip}
            <Icon name="reloj" />
            {folded && nearest !== undefined ? (
              <span className="countdown-peek">
                <span className="countdown-peek-title">{titleOf(nearest, t)}</span>
                <CountdownClock at={Date.parse(nearest.at ?? '')} now={now} />
              </span>
            ) : (
              <strong className="countdown-name">
                {title}
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
            {controls}
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
      )}
    </DockItem>
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
