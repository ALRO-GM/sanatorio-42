import { useMemo, useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { BoardCard } from './BoardCard'
import { BoardForm } from './BoardForm'
import { dayKey } from '../../shared/day'
import { InfoTip } from '../../shared/ui/InfoTip'
import { BoardsTour } from './BoardsTour'

/** Hasta dónde se miran las próximas pizarras, sin día elegido. */
const UPCOMING_DAYS = 60
/** Cuántas próximas se enseñan como mucho. */
const UPCOMING_MAX = 8

/**
 * Calendario de pizarras: el mes, el formulario para proponer una y, debajo,
 * las del día elegido o, sin día, las próximas a las que aún te puedes apuntar.
 */
export function BoardsCalendar() {
  const { t, lang } = useI18n()
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [proposing, setProposing] = useState(false)

  const from = month.toISOString()
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString()
  const boards = useAsync(() => api.getBoards(from, to), [from, to])
  // Las próximas desde ahora, aunque caigan en otro mes que el que se ve.
  const soon = useAsync(
    () =>
      api.getBoards(
        today.toISOString(),
        new Date(today.getTime() + UPCOMING_DAYS * 86_400_000).toISOString(),
      ),
    [today],
  )

  const list = boards.data ?? []
  const withBoard = new Set(list.map((board) => dayKey(new Date(board.startsAt))))
  const now = Date.now()
  // Sin día: las que no han terminado y tienen plaza (o ya tienes la tuya).
  const shown =
    selectedDay === null
      ? (soon.data ?? [])
          .filter(
            (board) =>
              Date.parse(board.endsAt) > now &&
              (board.joined || board.mine || board.attendees < board.capacity),
          )
          .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
          .slice(0, UPCOMING_MAX)
      : list.filter((board) => dayKey(new Date(board.startsAt)) === selectedDay)
  const reload = (): void => {
    void boards.reload()
    void soon.reload()
  }
  const nextId = list.find((board) => Date.parse(board.endsAt) > now)?.id

  const move = (delta: number): void => {
    setSelectedDay(null)
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  // Celdas del mes, empezando en lunes: huecos vacíos hasta el día 1.
  const offset = (month.getDay() + 6) % 7
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <section>
      <h2>
        {t('cal.title')}
        <InfoTip title={t('cal.title')}>
          <BoardsTour />
        </InfoTip>
      </h2>

      <div className="cal-layout">
        <div>
          <div className="card calendar">
            <header className="cal-head">
              <strong>
                {t('cal.months').split(',')[month.getMonth()]} {month.getFullYear()}
              </strong>
              <span>
                <button
                  className="icon-btn"
                  onClick={() => {
                    move(-1)
                  }}
                  aria-label={t('cal.prev')}
                >
                  ‹
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    move(1)
                  }}
                  aria-label={t('cal.next')}
                >
                  ›
                </button>
              </span>
            </header>
            <div className="cal-grid" role="grid">
              {t('days.short')
                .split(',')
                // Por posición: en inglés martes y jueves empiezan igual, y sábado y domingo.
                .map((label, index) => (
                  <span key={index} className="cal-dow" aria-hidden="true">
                    {label}
                  </span>
                ))}
              {cells.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} />
                const key = dayKey(new Date(month.getFullYear(), month.getMonth(), day))
                const classes = [
                  'cal-day',
                  key === dayKey(today) ? 'today' : '',
                  withBoard.has(key) ? 'has-board' : '',
                  key === selectedDay ? 'selected' : '',
                ].join(' ')

                return (
                  <button
                    key={key}
                    className={classes}
                    aria-pressed={key === selectedDay}
                    onClick={() => {
                      setSelectedDay(key === selectedDay ? null : key)
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="hint">{t('cal.legend')}</p>
          </div>

          <div className="card pitch">
            <strong>{t('cal.pitchTitle')}</strong>
            <p>{t('cal.pitch')}</p>
            {!proposing && (
              <button
                className="primary small"
                onClick={() => {
                  setProposing(true)
                }}
              >
                {t('cal.proposeBtn')}
              </button>
            )}
          </div>
        </div>

        <div>
          {proposing && (
            <BoardForm
              defaultDay={selectedDay ?? dayKey(new Date(now + 86_400_000))}
              onCancel={() => {
                setProposing(false)
              }}
              onSaved={() => {
                setProposing(false)
                reload()
              }}
            />
          )}
          <h3 className="boards-list-title">
            {selectedDay === null
              ? t('cal.upcoming')
              : new Date(`${selectedDay}T12:00:00`).toLocaleDateString(localeOf(lang), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
          </h3>
          {(selectedDay === null ? soon.loading : boards.loading) && <p>{t('cal.loading')}</p>}
          <ErrorNote
            error={selectedDay === null ? soon.error : boards.error}
            onRetry={() => {
              reload()
            }}
          />
          {(selectedDay === null ? soon.data : boards.data) !== undefined && shown.length === 0 && (
            <p className="estado">
              {selectedDay === null ? t('cal.upcomingEmpty') : t('cal.empty')}
            </p>
          )}
          <ul className="stack">
            {shown.map((board) => (
              <li key={board.id}>
                <BoardCard board={board} featured={board.id === nextId} onChange={reload} />
              </li>
            ))}
          </ul>
          {!proposing && (
            <button
              className="ghost-slot"
              onClick={() => {
                setProposing(true)
              }}
            >
              {t('cal.yours')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
