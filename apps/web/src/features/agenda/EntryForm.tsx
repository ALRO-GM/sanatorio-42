import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type {
  AgendaEntryKind,
  AgendaGoal,
  AgendaOptions,
  AgendaOutcome,
  AgendaProblem,
  AgendaSolution,
} from '@sanatorio/contracts'

import { checkpointText } from '../../shared/agenda/labels'
import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { plusDays, progressLabel, progressSteps } from './steps'

type EntryFormProps = {
  goal: AgendaGoal
  options: AgendaOptions
  today: string
  onSaved: (goal: AgendaGoal) => void
  onCancel: () => void
}

const KINDS: readonly AgendaEntryKind[] = ['daily', 'weekly']
const OUTCOMES: readonly AgendaOutcome[] = ['done', 'partial', 'not_done']

/**
 * Un daily o un weekly: qué te propones (los checkpoints que quedan), cómo
 * fue, qué te atascó y cómo podrías desatascarte. Todo se elige; «Otro» abre
 * un campo para escribirlo. Apuntarlo otra vez el mismo día lo reescribe.
 */
export function EntryForm({ goal, options, today, onSaved, onCancel }: EntryFormProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [kind, setKind] = useState<AgendaEntryKind>('daily')
  const [day, setDay] = useState(today)
  const [plan, setPlan] = useState<number[]>([])
  const [outcome, setOutcome] = useState<AgendaOutcome | ''>('')
  const [problem, setProblem] = useState<AgendaProblem | ''>('')
  const [problemOther, setProblemOther] = useState('')
  const [solution, setSolution] = useState<AgendaSolution | ''>('')
  const [solutionOther, setSolutionOther] = useState('')
  const [progress, setProgress] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const pending = goal.checkpoints.filter((checkpoint) => !checkpoint.done)

  const submit = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()

    let saved: AgendaGoal | undefined

    if (
      await run(async () => {
        saved = await api.saveAgendaEntry(goal.id, {
          kind,
          day,
          plan,
          outcome: outcome === '' ? null : outcome,
          problem: problem === '' ? null : problem,
          problemOther: problem === 'other' ? problemOther : null,
          solution: problem === '' || solution === '' ? null : solution,
          solutionOther: solution === 'other' ? solutionOther : null,
          progress: progress === '' ? null : progress,
          note,
        })
      })
    ) {
      if (saved !== undefined) onSaved(saved)
    }
  }

  return (
    <form
      className="form scrum-entry"
      aria-label={t('scrum.entry.title', { project: goal.projectName })}
      onSubmit={(event) => void submit(event)}
    >
      <PillGroup
        options={KINDS}
        value={kind}
        onChange={setKind}
        label={t('scrum.entry.kind')}
        text={(option) => t(`scrum.kind.${option}`)}
      />
      <div className="form-grid">
        <label>
          {t(kind === 'daily' ? 'scrum.entry.day' : 'scrum.entry.week')}
          <input
            type="date"
            value={day}
            min={plusDays(today, -14)}
            max={plusDays(today, kind === 'daily' ? 1 : 7)}
            required
            onChange={(event) => {
              setDay(event.target.value)
            }}
          />
        </label>
        <label>
          {t('scrum.entry.outcome')}
          <select
            value={outcome}
            onChange={(event) => {
              setOutcome(event.target.value as AgendaOutcome | '')
            }}
          >
            <option value="">{t('scrum.outcome.open')}</option>
            {OUTCOMES.map((option) => (
              <option key={option} value={option}>
                {t(`scrum.outcome.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('scrum.entry.problem')}
          <select
            value={problem}
            onChange={(event) => {
              setProblem(event.target.value as AgendaProblem | '')
            }}
          >
            <option value="">{t('scrum.problem.none')}</option>
            {options.problems.map((option) => (
              <option key={option} value={option}>
                {t(`scrum.problem.${option}`)}
              </option>
            ))}
          </select>
        </label>
        {problem === 'other' && (
          <label>
            {t('scrum.entry.problemOther')}
            <input
              value={problemOther}
              maxLength={120}
              required
              onChange={(event) => {
                setProblemOther(event.target.value)
              }}
            />
          </label>
        )}
        {problem !== '' && (
          <label>
            {t('scrum.entry.solution')}
            <select
              value={solution}
              onChange={(event) => {
                setSolution(event.target.value as AgendaSolution | '')
              }}
            >
              <option value="">{t('scrum.solution.none')}</option>
              {options.solutions.map((option) => (
                <option key={option} value={option}>
                  {t(`scrum.solution.${option}`)}
                </option>
              ))}
            </select>
          </label>
        )}
        {problem !== '' && solution === 'other' && (
          <label>
            {t('scrum.entry.solutionOther')}
            <input
              value={solutionOther}
              maxLength={120}
              required
              onChange={(event) => {
                setSolutionOther(event.target.value)
              }}
            />
          </label>
        )}
        <label>
          {t('scrum.entry.progress')}
          <select
            value={progress}
            onChange={(event) => {
              setProgress(event.target.value === '' ? '' : Number(event.target.value))
            }}
          >
            <option value="">{t('scrum.entry.progressSame', { n: goal.progress })}</option>
            {progressSteps(goal.progress).map((step) => (
              <option key={step} value={step}>
                {progressLabel(t, step)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('scrum.entry.note')}
          <input
            value={note}
            maxLength={280}
            placeholder={t('scrum.entry.noteHint')}
            onChange={(event) => {
              setNote(event.target.value)
            }}
          />
        </label>
      </div>
      {pending.length > 0 && (
        <fieldset className="scrum-pick">
          <legend>{t(kind === 'daily' ? 'scrum.entry.planDay' : 'scrum.entry.planWeek')}</legend>
          <ul className="scrum-checks">
            {pending.map((checkpoint) => (
              <li key={checkpoint.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={plan.includes(checkpoint.id)}
                    onChange={(event) => {
                      setPlan(
                        event.target.checked
                          ? [...plan, checkpoint.id]
                          : plan.filter((id) => id !== checkpoint.id),
                      )
                    }}
                  />
                  {checkpointText(t, checkpoint)}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy}>
          {t('scrum.entry.save')}
        </button>
        <button type="button" className="pill" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
