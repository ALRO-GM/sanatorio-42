import { useState } from 'react'

import type { AgendaGoal } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import {
  goalDeadline,
  goalPinOf,
  pinCountdown,
  unpinCountdown,
  useCountdowns,
} from '../../shared/countdowns'
import { useAction, useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { usePoolAllows } from '../../shared/pool'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { GoalForm } from '../agenda/GoalForm'

/**
 * Las metas de la agenda (`docs/agenda.md`) en el formulario de fijar: cada
 * meta en marcha, con su día de entrega, se fija o se quita con un botón. En
 * la vista de cuentas atrás del calendario se puede poner una meta nueva sin
 * salir de ahí, y queda fijada; en la ventanita, el botón lleva a la agenda.
 */
export function GoalPins({ inPage }: { inPage: boolean }) {
  const { t } = useI18n()
  const { date } = useFormat()
  const allowed = usePoolAllows('agenda')
  const agenda = useAsync(() => (allowed ? api.getAgenda() : Promise.resolve(null)), [allowed])
  const countdowns = useCountdowns()
  const action = useAction()
  const [creating, setCreating] = useState(false)
  const data = agenda.data

  // Sin agenda (sin permiso, o sin respuesta) no hay metas que ofrecer: el resto del formulario sigue.
  if (data === undefined || data === null) return null

  const titleOf = (goal: AgendaGoal): string => t('scrum.pin.title', { project: goal.projectName })
  const open = data.goals.filter((goal) => goal.status === 'active' && goal.targetDay >= data.today)

  const toggle = (goal: AgendaGoal): void => {
    const pin = goalPinOf(countdowns, titleOf(goal), goal.targetDay)

    void action.run(() =>
      pin === undefined
        ? pinCountdown({ kind: 'custom', title: titleOf(goal), at: goalDeadline(goal.targetDay) })
        : unpinCountdown(pin.id),
    )
  }

  /** La meta recién puesta (la de `id` más alto), ya fijada. */
  const created = async (): Promise<void> => {
    setCreating(false)
    await action.run(async () => {
      const fresh = await api.getAgenda()
      const newest = fresh.goals.reduce<AgendaGoal | null>(
        (best, goal) => (best === null || goal.id > best.id ? goal : best),
        null,
      )

      agenda.setData(fresh)
      if (newest !== null && newest.targetDay >= fresh.today) {
        await pinCountdown({
          kind: 'custom',
          title: t('scrum.pin.title', { project: newest.projectName }),
          at: goalDeadline(newest.targetDay),
        })
      }
    })
  }

  return (
    <div className="countdown-goals">
      <span className="countdown-goals-label">{t('countdown.goals')}</span>
      {open.length === 0 && !creating && <small className="hint">{t('countdown.goalsNone')}</small>}
      {open.length > 0 && (
        <ul className="countdown-goal-list">
          {open.map((goal) => {
            const pinned = goalPinOf(countdowns, titleOf(goal), goal.targetDay) !== undefined

            return (
              <li key={goal.id}>
                <button
                  type="button"
                  className="pill"
                  aria-pressed={pinned}
                  disabled={action.busy}
                  onClick={() => {
                    toggle(goal)
                  }}
                >
                  <Icon name="chincheta" size={14} /> {goal.projectName}
                  <small>{date(new Date(`${goal.targetDay}T12:00:00`), 'dayMonth')}</small>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {inPage && creating ? (
        data.projects.length === 0 ? (
          <p className="hint">{t('scrum.noProjects')}</p>
        ) : (
          <GoalForm
            projects={data.projects}
            options={data.options}
            today={data.today}
            onCancel={() => {
              setCreating(false)
            }}
            onSaved={() => void created()}
          />
        )
      ) : inPage ? (
        <button
          type="button"
          className="link"
          onClick={() => {
            setCreating(true)
          }}
        >
          <Icon name="mas" size={14} /> {t('countdown.goalNew')}
        </button>
      ) : (
        <a className="link" href="#/agenda">
          <Icon name="mas" size={14} /> {t('countdown.goalNew')}
        </a>
      )}
      <ErrorNote error={action.error} />
    </div>
  )
}
