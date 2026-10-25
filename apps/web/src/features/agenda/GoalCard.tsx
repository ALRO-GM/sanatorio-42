import { useState } from 'react'

import type { AgendaCheckpointKey, AgendaGoal, AgendaOptions } from '@sanatorio/contracts'

import {
  checkpointText,
  dueText,
  outcomeText,
  problemText,
  solutionText,
} from '../../shared/agenda/labels'
import { SprintBoardView } from '../../shared/agenda/SprintBoardView'
import { api } from '../../shared/api'
import {
  goalDeadline,
  goalPinOf,
  pinCountdown,
  unpinCountdown,
  useCountdowns,
} from '../../shared/countdowns'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { useConfirm } from '../../shared/ui/useConfirm'
import { EntryForm } from './EntryForm'
import { progressLabel, progressSteps } from './steps'

type GoalCardProps = {
  goal: AgendaGoal
  options: AgendaOptions
  today: string
  me: string
  /** La meta ha cambiado aquí: se pone en la lista sin volver a pedirla entera. */
  onChange: (goal: AgendaGoal) => void
  /** Se ha borrado o cerrado: hay que volver a pedir la agenda. */
  onReload: () => void
  /** Abrir los sprints de su proyecto. */
  onSprints: () => void
}

/** Lo que se escribe a mano en un checkpoint propio. */
const OWN = 'own'
/** Dailies y weeklies que se ven sin desplegar. */
const ENTRIES_SHOWN = 3

/**
 * Una meta: su día y cuánto falta, el avance, lo que queda, los checkpoints
 * (marcar, quitar y añadir), sus dailies y weeklies y, si estás en un sprint
 * de su proyecto, el tablero del grupo dentro de su marco.
 */
export function GoalCard({
  goal,
  options,
  today,
  me,
  onChange,
  onReload,
  onSprints,
}: GoalCardProps) {
  const { t, tn } = useI18n()
  const format = useFormat()
  const { busy, error, run } = useAction()
  const confirm = useConfirm()
  const countdowns = useCountdowns()
  const [writing, setWriting] = useState(false)
  const [adding, setAdding] = useState('')
  const [ownText, setOwnText] = useState('')
  const [allEntries, setAllEntries] = useState(false)
  const [board, setBoard] = useState(false)
  const active = goal.status === 'active'
  const done = goal.checkpoints.filter((checkpoint) => checkpoint.done).length
  const missing = options.checkpoints.filter(
    (key) => !goal.checkpoints.some((checkpoint) => checkpoint.key === key),
  )
  // La cuenta atrás de la meta es una propia con su título y su hora: así se reconoce.
  const pinTitle = t('scrum.pin.title', { project: goal.projectName })
  const pin = goalPinOf(countdowns, pinTitle, goal.targetDay)
  const late = goal.targetDay < today

  const change = async (fn: () => Promise<AgendaGoal>): Promise<void> => {
    let next: AgendaGoal | undefined

    if (
      await run(async () => {
        next = await fn()
      })
    ) {
      if (next !== undefined) onChange(next)
    }
  }

  const addCheckpoint = (): void => {
    if (adding === OWN) {
      if (ownText.trim() === '') return
      void change(() => api.addAgendaCheckpoint(goal.id, { text: ownText }))
      setOwnText('')
    } else if (adding !== '') {
      void change(() => api.addAgendaCheckpoint(goal.id, { key: adding as AgendaCheckpointKey }))
    }
    setAdding('')
  }

  const close = (status: 'done' | 'dropped' | 'active'): void => {
    void run(() => api.updateAgendaGoal(goal.id, { status })).then((ok) => {
      if (ok) onReload()
    })
  }

  return (
    <article
      className={`card scrum-goal ${active ? '' : 'closed'}`}
      aria-label={t('scrum.goal.label', { project: goal.projectName })}
    >
      <header className="card-head">
        <h3>{goal.projectName}</h3>
        <span className="badge subtle">{t(`scrum.kindOf.${goal.projectKind}`)}</span>
        {!active && <span className="badge on">{t(`scrum.status.${goal.status}`)}</span>}
      </header>

      {/* Lo que va con tu sprint sale enmarcado en él: lo ve tu grupo. */}
      {goal.sprints.map((sprint) => (
        <div key={sprint.groupId} className="scrum-frame">
          <Icon name="terapia" size={16} />
          <span>{tn('scrum.sprint.frame', sprint.members, { place: sprint.place })}</span>
          <button
            type="button"
            className="link"
            aria-expanded={board}
            onClick={() => {
              setBoard(!board)
            }}
          >
            {t(board ? 'scrum.sprint.hide' : 'scrum.sprint.show')}
          </button>
          {board && <SprintBoardView groupId={sprint.groupId} me={me} />}
        </div>
      ))}

      <div className="scrum-facts">
        <div>
          <span className="eyebrow">{t('scrum.targetDay')}</span>
          <strong>{format.date(`${goal.targetDay}T12:00:00`, 'long')}</strong>
          <span className={late && active ? 'scrum-late' : 'hint'}>
            {dueText(t, tn, today, goal.targetDay)}
          </span>
        </div>
        <div>
          <span className="eyebrow">{t('scrum.progress')}</span>
          <span className="scrum-meter big">
            <span style={{ width: `${goal.progress}%` }} />
            <small>{goal.progress} %</small>
          </span>
          {active && (
            <select
              aria-label={t('scrum.progress.change')}
              value={goal.progress}
              disabled={busy}
              onChange={(event) => {
                const progress = Number(event.target.value)

                void change(() => api.updateAgendaGoal(goal.id, { progress }))
              }}
            >
              {progressSteps(goal.progress).map((step) => (
                <option key={step} value={step}>
                  {progressLabel(t, step)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <span className="eyebrow">{t('scrum.checkpoints')}</span>
          <strong>{t('scrum.board.doneOf', { done, total: goal.checkpoints.length })}</strong>
        </div>
      </div>
      {goal.note !== null && (
        <p className="scrum-note">
          <span className="eyebrow">{t('scrum.note')}</span> {goal.note}
        </p>
      )}

      <ul className="scrum-checks">
        {goal.checkpoints.map((checkpoint) => (
          <li key={checkpoint.id} className={checkpoint.done ? 'done' : ''}>
            <label className="check">
              <input
                type="checkbox"
                checked={checkpoint.done}
                disabled={busy || !active}
                onChange={(event) => {
                  const next = event.target.checked

                  void change(() => api.markAgendaCheckpoint(goal.id, checkpoint.id, next))
                }}
              />
              {checkpointText(t, checkpoint)}
            </label>
            {active && (
              <button
                type="button"
                className="link"
                disabled={busy}
                aria-label={t('scrum.check.remove', { name: checkpointText(t, checkpoint) })}
                onClick={() => {
                  void change(() => api.removeAgendaCheckpoint(goal.id, checkpoint.id))
                }}
              >
                <Icon name="cerrar" size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {active && (
        <div className="scrum-add">
          <select
            value={adding}
            aria-label={t('scrum.check.add')}
            onChange={(event) => {
              setAdding(event.target.value)
            }}
          >
            <option value="">{t('scrum.check.pick')}</option>
            {missing.map((key) => (
              <option key={key} value={key}>
                {t(`scrum.check.${key}`)}
              </option>
            ))}
            <option value={OWN}>{t('scrum.check.own')}</option>
          </select>
          {adding === OWN && (
            <input
              value={ownText}
              maxLength={80}
              aria-label={t('scrum.check.ownText')}
              placeholder={t('scrum.check.ownHint')}
              onChange={(event) => {
                setOwnText(event.target.value)
              }}
            />
          )}
          <button
            type="button"
            className="pill"
            disabled={busy || adding === '' || (adding === OWN && ownText.trim() === '')}
            onClick={addCheckpoint}
          >
            {t('scrum.check.add')}
          </button>
        </div>
      )}

      {goal.entries.length > 0 && (
        <>
          <span className="eyebrow">{t('scrum.entries')}</span>
          <ul className="scrum-entries">
            {(allEntries ? goal.entries : goal.entries.slice(0, ENTRIES_SHOWN)).map((entry) => (
              <li key={entry.id}>
                <span className="eyebrow">
                  {t(`scrum.kind.${entry.kind}`)} ·{' '}
                  {format.date(`${entry.day}T12:00:00`, 'dayMonth')}
                </span>{' '}
                <strong>{outcomeText(t, entry.outcome)}</strong>
                {entry.plan.length > 0 && (
                  <span className="hint"> · {tn('scrum.entry.planned', entry.plan.length)}</span>
                )}
                {entry.problem !== null && (
                  <span className="badge scrum-stuck">
                    <Icon name="bicho" size={14} />{' '}
                    {problemText(t, entry.problem, entry.problemOther)}
                  </span>
                )}
                {entry.solution !== null && (
                  <span className="hint">
                    {' '}
                    → {solutionText(t, entry.solution, entry.solutionOther)}
                  </span>
                )}
                {entry.note !== null && <em> · {entry.note}</em>}
              </li>
            ))}
          </ul>
          {!allEntries && goal.entries.length > ENTRIES_SHOWN && (
            <button
              type="button"
              className="link"
              onClick={() => {
                setAllEntries(true)
              }}
            >
              {tn('scrum.entries.more', goal.entries.length - ENTRIES_SHOWN)}
            </button>
          )}
        </>
      )}

      {writing && (
        <EntryForm
          goal={goal}
          options={options}
          today={today}
          onCancel={() => {
            setWriting(false)
          }}
          onSaved={(next) => {
            setWriting(false)
            onChange(next)
          }}
        />
      )}

      <div className="actions">
        {active && !writing && (
          <button
            type="button"
            className="primary small"
            onClick={() => {
              setWriting(true)
            }}
          >
            {t('scrum.entry.write')}
          </button>
        )}
        {active && goal.targetDay >= today && (
          <button
            type="button"
            className="pill"
            aria-pressed={pin !== undefined}
            disabled={busy}
            onClick={() => {
              void run(() =>
                pin === undefined
                  ? pinCountdown({
                      kind: 'custom',
                      title: pinTitle,
                      at: goalDeadline(goal.targetDay),
                    })
                  : unpinCountdown(pin.id),
              )
            }}
          >
            <Icon name="chincheta" size={14} /> {t(pin === undefined ? 'scrum.pin' : 'scrum.unpin')}
          </button>
        )}
        {goal.sprints.length === 0 && active && (
          <button type="button" className="pill" onClick={onSprints}>
            <Icon name="terapia" size={14} /> {t('scrum.sprint.find')}
          </button>
        )}
        {active ? (
          <>
            <button
              type="button"
              className="pill"
              disabled={busy}
              onClick={() => {
                close('done')
              }}
            >
              <Icon name="hecho" size={14} /> {t('scrum.close.done')}
            </button>
            <button
              type="button"
              className="link"
              disabled={busy}
              onClick={() => {
                close('dropped')
              }}
            >
              {t('scrum.close.dropped')}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="pill"
            disabled={busy}
            onClick={() => {
              close('active')
            }}
          >
            {t('scrum.reopen')}
          </button>
        )}
        <button
          type="button"
          className="link"
          disabled={busy}
          onClick={() => {
            void confirm
              .ask({
                body: t('scrum.removeAsk', { project: goal.projectName }),
                okText: t('common.remove'),
                danger: true,
              })
              .then((ok) =>
                ok
                  ? run(() => api.removeAgendaGoal(goal.id)).then((removed) => {
                      if (removed) onReload()
                    })
                  : undefined,
              )
          }}
        >
          {t('common.remove')}
        </button>
      </div>
      <ErrorNote error={error} />
      {confirm.dialog}
    </article>
  )
}
