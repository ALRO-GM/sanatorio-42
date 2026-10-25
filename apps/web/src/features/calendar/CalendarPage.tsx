import { useEffect, useMemo, useState } from 'react'

import type { CalendarEvent, CalendarKind, CalendarSection } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { openCountdownPicker } from '../../shared/countdowns'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Show } from '../../shared/detail'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { addDays, daysOf, eventsOn, move, rangeTitle, sameDay, startOfDay } from './dates'
import { EventChip } from './EventChip'
import { EventDialog } from './EventDialog'
import { KINDS, loadHidden, loadView, saveHidden, saveView, VIEWS } from './kinds'
import type { View } from './kinds'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { AgendaTour } from './AgendaTour'
import { DayTimeline } from './DayTimeline'
import { LAYOUTS, loadLayout, saveLayout } from './timeline'
import type { Layout } from './timeline'

type CalendarPageProps = {
  /**
   * Un evento que abrir al entrar (`board:12`, `therapy:5`), de la dirección:
   * se busca su próxima vez, se salta a ese día y se abre su ficha.
   */
  focus?: string | null
  /** Ir a otra sección de la web, desde la ficha de un evento propio. */
  onGo: (section: CalendarSection) => void
  /** Login de quien mira, para el chat de los eventos. */
  me: string
}

/** Eventos que caben en cada casilla del mes antes de resumir el resto en "+N". */
const MONTH_CELL_EVENTS = 3

/**
 * Tu calendario: lo de Sanatorio (guardia, terapias, pizarras) y lo de 42
 * (correcciones, eventos, exámenes), por día, semana o mes. Cada tipo tiene su
 * color y su icono, y se puede ocultar.
 */
export function CalendarPage({ focus = null, onGo, me }: CalendarPageProps) {
  const { t, lang } = useI18n()
  const { date } = useFormat()
  const [view, setView] = useState<View>(loadView)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const [hidden, setHidden] = useState(loadHidden)
  const [open, setOpen] = useState<CalendarEvent | null>(null)
  // Cómo se ven el día y la semana: lista o con las horas.
  const [layout, setLayout] = useState<Layout>(loadLayout)

  const days = useMemo(() => daysOf(view, cursor), [view, cursor])
  const from = (days[0] ?? cursor).toISOString()
  const to = addDays(days.at(-1) ?? cursor, 1).toISOString()
  const { data, error, loading, reload } = useAsync(() => api.getCalendar(from, to), [from, to])

  // El evento de la dirección: su próxima vez en los dos meses que vienen.
  useEffect(() => {
    if (focus === null) return

    const start = startOfDay(new Date())

    void api
      .getCalendar(addDays(start, -1).toISOString(), addDays(start, 62).toISOString())
      .then((found) => {
        const now = Date.now()
        const event =
          found.events.find(
            (one) =>
              (one.id === focus || one.id.startsWith(`${focus}:`)) && Date.parse(one.end) > now,
          ) ?? found.events.find((one) => one.id === focus)

        if (event !== undefined) {
          setCursor(startOfDay(new Date(event.start)))
          setOpen(event)
        }
        // La dirección vuelve a ser la del calendario: recargar no lo reabre.
        window.history.replaceState(null, '', '#/calendario')
      })
      .catch(() => undefined)
  }, [focus])

  /** Apuntarse a una pizarra o a un grupo desde su ficha. */
  const join = async (event: CalendarEvent): Promise<void> => {
    const [kind, id] = event.id.split(':')

    if (kind === 'board') await api.joinBoard(Number(id))
    else if (kind === 'therapy') await api.joinGroup(Number(id))

    setOpen({ ...event, joined: true })
    await reload()
  }

  const today = startOfDay(new Date())
  const visible = (data?.events ?? []).filter((event) => !hidden.has(event.kind))
  // Cuántos hay de cada tipo en lo que se está viendo, para los filtros.
  const counts = new Map<CalendarKind, number>()

  for (const event of data?.events ?? []) {
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1)
  }

  const changeView = (next: View): void => {
    saveView(next)
    setView(next)
  }

  const toggleKind = (kind: CalendarKind): void => {
    const next = new Set(hidden)

    if (!next.delete(kind)) next.add(kind)

    saveHidden(next)
    setHidden(next)
  }

  const openDay = (day: Date): void => {
    setCursor(day)
    changeView('day')
  }

  const weekdays = (days.length >= 7 ? days.slice(0, 7) : []).map((day) => date(day, 'weekday'))

  return (
    <section>
      <h2>
        {t('agenda.title')}
        <InfoTip title={t('agenda.title')}>
          <AgendaTour />
        </InfoTip>
      </h2>

      <div className="card agenda">
        <div className="agenda-bar">
          <div className="agenda-nav">
            <button
              type="button"
              className="icon-btn"
              aria-label={t('common.prev')}
              onClick={() => {
                setCursor(move(view, cursor, -1))
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => {
                setCursor(today)
              }}
            >
              {t('agenda.today')}
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label={t('common.next')}
              onClick={() => {
                setCursor(move(view, cursor, 1))
              }}
            >
              ›
            </button>
            <strong className="agenda-range" aria-live="polite">
              {rangeTitle(view, cursor, lang)}
            </strong>
          </div>
          <PillGroup
            options={VIEWS}
            value={view}
            onChange={changeView}
            label={t('agenda.view')}
            text={(option) => t(`agenda.view.${option}`)}
          >
            {/* Fijarse el próximo compromiso o algo propio (`docs/avisos-cuenta-atras.md`). */}
            <button type="button" className="pill" onClick={openCountdownPicker}>
              <Icon name="chincheta" size={14} /> {t('countdown.open')}
            </button>
          </PillGroup>
        </div>

        {view !== 'month' && (
          <Show from="normal">
            <PillGroup
              className="agenda-layouts"
              options={LAYOUTS}
              value={layout}
              onChange={(option) => {
                saveLayout(option)
                setLayout(option)
              }}
              label={t('agenda.layout')}
              title={(option) => t(`agenda.layout.${option}.hint`)}
              text={(option) => t(`agenda.layout.${option}`)}
            />
          </Show>
        )}

        <div className="agenda-kinds" role="group" aria-label={t('agenda.kinds')}>
          {/* Que se vea que son filtros: cada tipo se enciende o se apaga. */}
          <span className="agenda-kinds-label" aria-hidden="true">
            {t('agenda.kindsShow')}
          </span>
          {KINDS.map(({ kind, icon }) => (
            <button
              key={kind}
              type="button"
              className={`kind-toggle kind-${kind} ${hidden.has(kind) ? 'off' : ''}`}
              aria-pressed={!hidden.has(kind)}
              onClick={() => {
                toggleKind(kind)
              }}
            >
              <span className="kind-dot" aria-hidden="true" />
              <Icon name={icon} />
              {t(`agenda.kind.${kind}`)}
              {(counts.get(kind) ?? 0) > 0 && (
                <span className="kind-count">{counts.get(kind)}</span>
              )}
            </button>
          ))}
        </div>

        {loading && <p>{t('agenda.loading')}</p>}
        {data === undefined && <ErrorNote error={error} onRetry={() => void reload()} />}

        {data !== undefined && view === 'month' && (
          <div className="month-grid">
            {/* Por posición: en inglés martes y jueves empiezan igual, y sábado y domingo. */}
            {weekdays.map((name, index) => (
              <span key={index} className="month-dow" aria-hidden="true">
                {name}
              </span>
            ))}
            {days.map((day) => {
              const events = eventsOn(visible, day)
              const shown = events.slice(0, MONTH_CELL_EVENTS)
              const outside = day.getMonth() !== cursor.getMonth()

              return (
                <div
                  key={day.toISOString()}
                  className={`month-cell ${outside ? 'outside' : ''} ${sameDay(day, today) ? 'today' : ''}`}
                >
                  <button
                    type="button"
                    className="month-day"
                    aria-label={date(day, 'long')}
                    onClick={() => {
                      openDay(day)
                    }}
                  >
                    {day.getDate()}
                  </button>
                  {shown.map((event) => (
                    <EventChip key={event.id} event={event} day={day} compact onOpen={setOpen} />
                  ))}
                  {events.length > shown.length && (
                    <button
                      type="button"
                      className="month-more"
                      onClick={() => {
                        openDay(day)
                      }}
                    >
                      {t('agenda.more', { n: events.length - shown.length })}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {data !== undefined && view !== 'month' && layout !== 'list' && (
          <DayTimeline
            days={days}
            events={visible}
            layout={layout}
            week={view === 'week'}
            onOpen={setOpen}
            onOpenDay={openDay}
          />
        )}

        {data !== undefined && view !== 'month' && layout === 'list' && (
          <div className={`day-columns view-${view}`}>
            {days.map((day) => {
              const events = eventsOn(visible, day)

              return (
                <div
                  key={day.toISOString()}
                  className={`day-column ${sameDay(day, today) ? 'today' : ''}`}
                >
                  {view === 'week' && (
                    <button
                      type="button"
                      className="day-head"
                      onClick={() => {
                        openDay(day)
                      }}
                    >
                      <span>{date(day, 'weekday')}</span>
                      <strong>{day.getDate()}</strong>
                    </button>
                  )}
                  {events.length === 0 && <p className="day-empty">{t('agenda.empty')}</p>}
                  {events.map((event) => (
                    <EventChip key={event.id} event={event} day={day} onOpen={setOpen} />
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {data !== undefined && (
          <p className="hint agenda-source">
            {data.fortyTwoAt === null
              ? t('agenda.no42')
              : t('agenda.from42', {
                  min: Math.max(0, Math.round((Date.now() - Date.parse(data.fortyTwoAt)) / 60_000)),
                })}{' '}
            <button type="button" className="link" disabled={loading} onClick={() => void reload()}>
              {t('common.refresh')}
            </button>
          </p>
        )}
      </div>

      {open !== null && (
        <EventDialog
          key={open.id}
          event={open}
          me={me}
          onClose={() => {
            setOpen(null)
          }}
          onGo={(section) => {
            setOpen(null)
            onGo(section)
          }}
          onJoin={join}
        />
      )}
    </section>
  )
}
