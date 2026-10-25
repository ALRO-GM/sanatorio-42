import { useState } from 'react'

import type { AgendaGoal, AgendaView, CalendarEvent } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import {
  openCountdownsPage,
  pinCountdown,
  unpinCountdown,
  useCountdowns,
} from '../../shared/countdowns'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { Async } from '../../shared/ui/Async'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { InfoTip } from '../../shared/ui/InfoTip'
import { GoalCard } from './GoalCard'
import { GoalForm } from './GoalForm'
import { ScrumTour } from './ScrumTour'

type AgendaPageProps = {
  /** Ir al calendario o a los sprints (con el proyecto, si se sabe). */
  onGo: (section: 'calendario' | 'terapia', projectId?: number) => void
  me: string
}

/**
 * La agenda (`docs/agenda.md`): tu Scrum individual. Arriba, tus metas en
 * marcha, cada una con sus checkpoints y sus dailies; al lado, lo de 42 a lo
 * que vas en las próximas dos semanas, para fijarlo como cuenta atrás.
 */
export function AgendaPage({ onGo, me }: AgendaPageProps) {
  const { t } = useI18n()
  const agenda = useAsync(() => api.getAgenda(), [])
  const [creating, setCreating] = useState(false)

  // Lo que cambia en una meta se pone en su sitio sin pedir la agenda entera.
  const replace = (goal: AgendaGoal): void => {
    if (agenda.data === undefined) return
    agenda.setData({
      ...agenda.data,
      goals: agenda.data.goals.map((each) => (each.id === goal.id ? goal : each)),
    })
  }

  return (
    <section className="scrum">
      <h2>
        {t('scrum.title')}
        <InfoTip title={t('scrum.title')}>
          <ScrumTour />
        </InfoTip>
      </h2>

      <div className="filters">
        {!creating && (
          <button
            type="button"
            className="primary small"
            onClick={() => {
              setCreating(true)
            }}
          >
            <Icon name="mas" size={14} /> {t('scrum.new')}
          </button>
        )}
        <button type="button" className="pill" onClick={openCountdownsPage}>
          <Icon name="reloj" size={14} /> {t('scrum.countdown')}
        </button>
        <button
          type="button"
          className="pill"
          onClick={() => {
            onGo('calendario')
          }}
        >
          <Icon name="calendario" size={14} /> {t('scrum.calendar')}
        </button>
      </div>

      <Async state={agenda} loadingText={t('scrum.loading')}>
        {(data) => (
          <Board
            data={data}
            me={me}
            creating={creating}
            onCreated={() => {
              setCreating(false)
              void agenda.reload()
            }}
            onCancel={() => {
              setCreating(false)
            }}
            onChange={replace}
            onReload={() => void agenda.reload()}
            onSprints={(projectId) => {
              onGo('terapia', projectId)
            }}
          />
        )}
      </Async>
    </section>
  )
}

type BoardProps = {
  data: AgendaView
  me: string
  creating: boolean
  onCreated: () => void
  onCancel: () => void
  onChange: (goal: AgendaGoal) => void
  onReload: () => void
  onSprints: (projectId: number) => void
}

function Board({
  data,
  me,
  creating,
  onCreated,
  onCancel,
  onChange,
  onReload,
  onSprints,
}: BoardProps) {
  const { t } = useI18n()
  const [showClosed, setShowClosed] = useState(false)
  const active = data.goals.filter((goal) => goal.status === 'active')
  const closed = data.goals.filter((goal) => goal.status !== 'active')
  const card = (goal: AgendaGoal) => (
    <li key={goal.id}>
      <GoalCard
        goal={goal}
        options={data.options}
        today={data.today}
        me={me}
        onChange={onChange}
        onReload={onReload}
        onSprints={() => {
          onSprints(goal.projectId)
        }}
      />
    </li>
  )

  return (
    <div className="scrum-layout">
      <div className="scrum-main">
        {creating &&
          (data.projects.length === 0 ? (
            <p className="estado">{t('scrum.noProjects')}</p>
          ) : (
            <GoalForm
              projects={data.projects}
              options={data.options}
              today={data.today}
              onCancel={onCancel}
              onSaved={onCreated}
            />
          ))}
        {active.length === 0 && !creating && <p className="estado">{t('scrum.empty')}</p>}
        <ul className="stack">{active.map(card)}</ul>
        {closed.length > 0 && (
          <>
            <button
              type="button"
              className="link"
              aria-expanded={showClosed}
              onClick={() => {
                setShowClosed(!showClosed)
              }}
            >
              {t(showClosed ? 'scrum.closed.hide' : 'scrum.closed.show', { n: closed.length })}
            </button>
            {showClosed && <ul className="stack">{closed.map(card)}</ul>}
          </>
        )}
      </div>
      <aside className="scrum-side" aria-label={t('scrum.events')}>
        <h3>{t('scrum.events')}</h3>
        {data.events.length === 0 ? (
          <p className="hint">{t('scrum.events.empty')}</p>
        ) : (
          <ul className="scrum-events">
            {data.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}

/** Un evento de 42 al que vas, con su chincheta para la ventanita de cuentas atrás. */
function EventRow({ event }: { event: CalendarEvent }) {
  const { t } = useI18n()
  const format = useFormat()
  const countdowns = useCountdowns()
  const action = useAction()
  const pin = (countdowns ?? []).find(
    (entry) => entry.kind === 'event' && entry.eventId === event.id,
  )

  return (
    <li className={`scrum-event kind-${event.kind}`}>
      <span className="eyebrow">
        {t(`agenda.kind.${event.kind}`)} · {format.dateTime(event.start)}
      </span>
      <strong>{event.title}</strong>
      <button
        type="button"
        className="link"
        aria-pressed={pin !== undefined}
        disabled={action.busy}
        onClick={() => {
          void action.run(() =>
            pin === undefined
              ? pinCountdown({ kind: 'event', eventId: event.id })
              : unpinCountdown(pin.id),
          )
        }}
      >
        <Icon name="chincheta" size={14} />{' '}
        {t(pin === undefined ? 'countdown.pinEvent' : 'countdown.unpinEvent')}
      </button>
      <ErrorNote error={action.error} />
    </li>
  )
}
