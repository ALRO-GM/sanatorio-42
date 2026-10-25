import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { AgendaCheckpointKey, AgendaOptions, AgendaProject } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { plusDays, progressLabel, progressSteps } from './steps'

type GoalFormProps = {
  projects: readonly AgendaProject[]
  options: AgendaOptions
  today: string
  onCancel: () => void
  onSaved: () => void
}

/**
 * Poner una meta: el proyecto, el día, cuánto llevas, lo que te queda y los
 * checkpoints. Al elegir proyecto salen los de fábrica de su tipo; se quitan
 * con un clic y se añaden de la lista. Los propios, después, en la meta.
 */
export function GoalForm({ projects, options, today, onCancel, onSaved }: GoalFormProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0)
  const kindOf = (id: number) => projects.find((project) => project.id === id)?.kind ?? 'c'
  const [targetDay, setTargetDay] = useState(plusDays(today, 7))
  const [progress, setProgress] = useState(0)
  const [note, setNote] = useState('')
  const [checks, setChecks] = useState<AgendaCheckpointKey[]>(options.defaults[kindOf(projectId)])
  const [extra, setExtra] = useState('')
  const missing = options.checkpoints.filter((key) => !checks.includes(key))
  const doing = projects.filter((project) => project.status === 'in_progress')
  const next = projects.filter((project) => project.status === 'next')

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    if (
      await run(() =>
        api.createAgendaGoal({ projectId, targetDay, progress, note, checkpoints: checks }),
      )
    ) {
      onSaved()
    }
  }

  return (
    <form
      className="card form scrum-form"
      aria-label={t('scrum.new')}
      onSubmit={(event) => void submit(event)}
    >
      <h3>{t('scrum.new')}</h3>
      <div className="form-grid">
        <label>
          {t('scrum.project')}
          <select
            value={projectId}
            required
            onChange={(event) => {
              const id = Number(event.target.value)

              setProjectId(id)
              setChecks(options.defaults[kindOf(id)])
            }}
          >
            {doing.length > 0 && (
              <optgroup label={t('scrum.project.doing')}>
                {doing.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </optgroup>
            )}
            {next.length > 0 && (
              <optgroup label={t('scrum.project.next')}>
                {next.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label>
          {t('scrum.targetDay')}
          <input
            type="date"
            value={targetDay}
            min={today}
            max={plusDays(today, 180)}
            required
            onChange={(event) => {
              setTargetDay(event.target.value)
            }}
          />
        </label>
        <label>
          {t('scrum.progress')}
          <select
            value={progress}
            onChange={(event) => {
              setProgress(Number(event.target.value))
            }}
          >
            {progressSteps().map((step) => (
              <option key={step} value={step}>
                {progressLabel(t, step)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('scrum.note')}
          <input
            value={note}
            maxLength={200}
            placeholder={t('scrum.note.hint')}
            onChange={(event) => {
              setNote(event.target.value)
            }}
          />
        </label>
      </div>

      <fieldset className="scrum-pick">
        <legend>{t('scrum.checkpoints')}</legend>
        <ul className="scrum-checks">
          {checks.map((key) => (
            <li key={key}>
              <span className="check">
                <Icon name="hecho" size={14} /> {t(`scrum.check.${key}`)}
              </span>
              <button
                type="button"
                className="link"
                aria-label={t('scrum.check.remove', { name: t(`scrum.check.${key}`) })}
                onClick={() => {
                  setChecks(checks.filter((other) => other !== key))
                }}
              >
                <Icon name="cerrar" size={14} />
              </button>
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <div className="scrum-add">
            <select
              value={extra}
              aria-label={t('scrum.check.add')}
              onChange={(event) => {
                setExtra(event.target.value)
              }}
            >
              <option value="">{t('scrum.check.pick')}</option>
              {missing.map((key) => (
                <option key={key} value={key}>
                  {t(`scrum.check.${key}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pill"
              disabled={extra === ''}
              onClick={() => {
                setChecks([...checks, extra as AgendaCheckpointKey])
                setExtra('')
              }}
            >
              {t('scrum.check.add')}
            </button>
          </div>
        )}
      </fieldset>

      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy || projectId === 0}>
          {t('scrum.create')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
