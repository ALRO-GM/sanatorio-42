import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'

import type { SprintBoard } from '@sanatorio/contracts'

import { api } from '../api'
import { todayKey } from '../day'
import { useAsync } from '../hooks/useAsync'
import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import { Async } from '../ui/Async'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'
import { checkpointText, dueText, outcomeText, problemText, solutionText } from './labels'

type Member = SprintBoard['members'][number]

/**
 * El tablero del sprint (`docs/agenda.md`): una fila por persona del grupo,
 * como en el tablero de un equipo de verdad, con su día objetivo, cuánto
 * lleva, sus checkpoints, su último daily y si está atascada. Al abrir una
 * fila salen sus checkpoints y sus últimos dailies, para ver por dónde va y
 * acercarse a echar una mano.
 *
 * Solo lo ve quien está en el grupo: lo comprueba la API. Lo usan la sección
 * de sprints (en la tarjeta de cada grupo) y la agenda (en cada meta).
 */
export function SprintBoardView({ groupId, me }: { groupId: number; me: string }) {
  const { t } = useI18n()
  const board = useAsync(() => api.getSprintBoard(groupId), [groupId])

  return (
    <div className="sprint-board" aria-label={t('scrum.board.title')} role="region">
      <Async state={board} loadingText={t('scrum.board.loading')}>
        {(data) => <BoardTable board={data} me={me} />}
      </Async>
    </div>
  )
}

function BoardTable({ board, me }: { board: SprintBoard; me: string }) {
  const { t, tn } = useI18n()
  const format = useFormat()
  const [open, setOpen] = useState<string | null>(null)
  const today = todayKey()

  return (
    <table className="sprint-table">
      <caption>{t('scrum.board.caption', { project: board.projectName ?? '' })}</caption>
      <thead>
        <tr>
          <th scope="col">{t('scrum.board.who')}</th>
          <th scope="col">{t('scrum.board.target')}</th>
          <th scope="col">{t('scrum.board.progress')}</th>
          <th scope="col">{t('scrum.board.checkpoints')}</th>
          <th scope="col">{t('scrum.board.latest')}</th>
          <th scope="col">{t('scrum.board.blocker')}</th>
        </tr>
      </thead>
      <tbody>
        {board.members.map((member) => (
          <Fragment key={member.login}>
            <Row
              member={member}
              me={me}
              open={open === member.login}
              onToggle={() => {
                setOpen(open === member.login ? null : member.login)
              }}
              due={(day) => (
                <>
                  {format.date(`${day}T12:00:00`, 'dayMonth')}
                  <small className="hint">{dueText(t, tn, today, day)}</small>
                </>
              )}
            />
            {open === member.login && member.goal !== null && (
              <tr className="sprint-detail">
                <td colSpan={6}>
                  <Detail member={member} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
}

type RowProps = {
  member: Member
  me: string
  open: boolean
  onToggle: () => void
  due: (day: string) => ReactNode
}

function Row({ member, me, open, onToggle, due }: RowProps) {
  const { t } = useI18n()
  const goal = member.goal
  const latest = goal?.entries[0]

  return (
    <tr className={`sprint-row ${goal?.blocker ? 'stuck' : ''}`}>
      <th scope="row">
        <span className="sprint-who">
          <Avatar login={member.login} image={member.image} size={28} />
          <strong>{member.login}</strong>
          {member.login === me && <span className="badge subtle">{t('scrum.board.you')}</span>}
        </span>
        {goal !== null && (
          <button type="button" className="link" aria-expanded={open} onClick={onToggle}>
            {t(open ? 'scrum.board.less' : 'scrum.board.more', { login: member.login })}
          </button>
        )}
      </th>
      {goal === null ? (
        <td colSpan={5} className="hint">
          {t('scrum.board.noGoal')}
        </td>
      ) : (
        <>
          <td data-label={t('scrum.board.target')} className="sprint-due">
            {due(goal.targetDay)}
          </td>
          <td data-label={t('scrum.board.progress')}>
            <span className="scrum-meter" title={`${goal.progress} %`}>
              <span style={{ width: `${goal.progress}%` }} />
              <small>{goal.progress} %</small>
            </span>
          </td>
          <td data-label={t('scrum.board.checkpoints')}>
            {t('scrum.board.doneOf', { done: goal.done, total: goal.total })}
          </td>
          <td data-label={t('scrum.board.latest')}>
            {latest === undefined
              ? t('scrum.board.noDaily')
              : `${t(`scrum.kind.${latest.kind}`)} · ${outcomeText(t, latest.outcome)}`}
          </td>
          <td data-label={t('scrum.board.blocker')}>
            {goal.blocker === null ? (
              <span className="badge on plain">{t('scrum.board.flowing')}</span>
            ) : (
              <span className="badge scrum-stuck" title={goal.blocker.day}>
                <Icon name="bicho" size={14} />{' '}
                {problemText(t, goal.blocker.problem, goal.blocker.problemOther)}
              </span>
            )}
          </td>
        </>
      )}
    </tr>
  )
}

/** Lo de una persona, abierto: por dónde va, su atasco y sus últimos dailies. */
function Detail({ member }: { member: Member }) {
  const { t } = useI18n()
  const format = useFormat()
  const goal = member.goal

  if (goal === null) return null

  return (
    <div className="sprint-more">
      {goal.stuckOn !== null && (
        <p>
          <span className="eyebrow">{t('scrum.board.stuckOn')}</span>{' '}
          <strong>{checkpointText(t, goal.stuckOn)}</strong>
        </p>
      )}
      {goal.blocker?.solution !== undefined && goal.blocker.solution !== null && (
        <p>
          <span className="eyebrow">{t('scrum.board.plan')}</span>{' '}
          {solutionText(t, goal.blocker.solution, goal.blocker.solutionOther)}
        </p>
      )}
      {/* Gancho con la ayuda (`docs/agenda.md`): aquí irá «Echarle una mano»
          cuando el sistema de ayuda lea los atascos de la agenda. */}
      <ul className="scrum-checks readonly">
        {goal.checkpoints.map((checkpoint) => (
          <li key={checkpoint.id} className={checkpoint.done ? 'done' : ''}>
            <Icon name={checkpoint.done ? 'hecho' : 'reloj'} size={14} />{' '}
            {checkpointText(t, checkpoint)}
          </li>
        ))}
      </ul>
      <ul className="scrum-entries">
        {goal.entries.map((entry) => (
          <li key={entry.id}>
            <span className="eyebrow">
              {t(`scrum.kind.${entry.kind}`)} · {format.date(`${entry.day}T12:00:00`, 'dayMonth')}
            </span>{' '}
            {outcomeText(t, entry.outcome)}
            {entry.problem !== null && ` · ${problemText(t, entry.problem, entry.problemOther)}`}
            {entry.note !== null && <em> · {entry.note}</em>}
          </li>
        ))}
      </ul>
    </div>
  )
}
