import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type {
  Guide,
  GuideChange,
  GuideProposal,
  GuideSanctions,
  GuideSection,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

const SECTIONS = ['start', 'problems', 'concepts'] as const satisfies readonly GuideSection[]

/** La guía mientras se edita: cada sección es un texto con una línea por entrada. */
type Draft = Record<GuideSection, string>

type Mode = 'view' | 'edit' | 'propose' | 'proposed'

type GuidePanelProps = {
  project: { id: number; name: string }
  guide: Guide
  /** `true` si quien mira aprobó el proyecto: edita y revisa propuestas. */
  canEdit: boolean
  proposals: readonly GuideProposal[]
  /** Cambios validados en el último mes, que aún se pueden señalar. */
  recentChanges: readonly GuideChange[]
  /** Bloqueos de quien mira, si los tiene. */
  sanctions: GuideSanctions
  onChange: () => void
}

const toDraft = (guide: Guide): Draft => ({
  start: guide.start.join('\n'),
  problems: guide.problems.join('\n'),
  concepts: guide.concepts.join('\n'),
})

const lines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

/** La guía corta del proyecto: se lee, se edita (especialistas) o se propone un cambio. */
export function GuidePanel({
  project,
  guide,
  canEdit,
  proposals,
  recentChanges,
  sanctions,
  onChange,
}: GuidePanelProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState<Draft>(() => toDraft(guide))
  const [proposal, setProposal] = useState<{ section: GuideSection; body: string }>({
    section: 'problems',
    body: '',
  })
  const empty = SECTIONS.every((section) => guide[section].length === 0)

  const startEdit = (): void => {
    setDraft(toDraft(guide))
    setMode('edit')
  }

  const save = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    const next = {
      start: lines(draft.start),
      problems: lines(draft.problems),
      concepts: lines(draft.concepts),
    }

    if (await run(() => api.saveGuide(project.id, next))) {
      setMode('view')
      onChange()
    }
  }

  const propose = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault()
    if (await run(() => api.proposeGuideChange(project.id, proposal.section, proposal.body))) {
      setProposal({ section: 'problems', body: '' })
      setMode('proposed')
    }
  }

  const review = async (id: number, accept: boolean): Promise<void> => {
    if (await run(() => api.reviewProposal(id, accept))) onChange()
  }

  const flag = async (id: number): Promise<void> => {
    if (await run(() => api.flagGuideChange(id))) onChange()
  }

  // Un bloqueo se cuenta con su fecha: quien lo sufre tiene que saber cuándo acaba.
  const day = (iso: string): string => iso.slice(0, 10)
  const cannotPropose = sanctions.proposeBlockedUntil !== null
  const cannotReview = sanctions.reviewBlockedUntil !== null

  return (
    <aside className="card guide">
      <h3>{t('board.guide', { project: project.name })}</h3>
      <p className="hint">{t('board.guideBy')}</p>

      {mode === 'edit' ? (
        <form onSubmit={(event) => void save(event)}>
          <p className="hint">{t('board.editHint')}</p>
          {SECTIONS.map((section) => (
            <label key={section}>
              <span className="eyebrow">{t(`board.${section}`)}</span>
              <textarea
                rows={4}
                value={draft[section]}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, [section]: event.target.value }))
                }}
              />
            </label>
          ))}
          <ErrorNote error={error} />
          <div className="actions">
            <button type="submit" className="primary small" disabled={busy}>
              {t('board.save')}
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => {
                setMode('view')
              }}
            >
              {t('board.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <>
          {empty && <p className="estado">{t('board.guideEmpty')}</p>}
          {guide.start.length > 0 && (
            <>
              <span className="eyebrow">{t('board.start')}</span>
              <ol>
                {guide.start.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </>
          )}
          {guide.problems.length > 0 && (
            <>
              <span className="eyebrow">{t('board.problems')}</span>
              <ul>
                {guide.problems.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
          {guide.concepts.length > 0 && (
            <>
              <span className="eyebrow">{t('board.concepts')}</span>
              <div className="chips">
                {guide.concepts.map((concept) => (
                  <span key={concept} className="chip">
                    {concept}
                  </span>
                ))}
              </div>
            </>
          )}

          {mode === 'propose' && (
            <form onSubmit={(event) => void propose(event)} className="propose-form">
              <select
                value={proposal.section}
                aria-label={t('board.propose')}
                onChange={(event) => {
                  const section = SECTIONS.find((candidate) => candidate === event.target.value)

                  if (section !== undefined) setProposal((current) => ({ ...current, section }))
                }}
              >
                {SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {t(`board.${section}`)}
                  </option>
                ))}
              </select>
              <input
                value={proposal.body}
                onChange={(event) => {
                  setProposal((current) => ({ ...current, body: event.target.value }))
                }}
                placeholder={t('board.proposeHint')}
                aria-label={t('board.proposeHint')}
                maxLength={140}
                required
              />
              <ErrorNote error={error} />
              <div className="actions">
                <button type="submit" className="primary small" disabled={busy}>
                  {t('board.proposeSend')}
                </button>
                <button
                  type="button"
                  className="pill"
                  onClick={() => {
                    setMode('view')
                  }}
                >
                  {t('board.cancel')}
                </button>
              </div>
            </form>
          )}
          {mode === 'proposed' && (
            <p className="estado aviso" role="status">
              {t('board.proposeDone')}
            </p>
          )}
          {cannotReview && sanctions.reviewBlockedUntil !== null && (
            <p className="estado aviso">
              {t('board.reviewBlocked', { until: day(sanctions.reviewBlockedUntil) })}
            </p>
          )}
          {!canEdit && cannotPropose && sanctions.proposeBlockedUntil !== null && (
            <p className="estado aviso">
              {t('board.proposeBlocked', { until: day(sanctions.proposeBlockedUntil) })}
            </p>
          )}
          {mode !== 'propose' &&
            (canEdit ? (
              <button className="pill wide" disabled={cannotReview} onClick={startEdit}>
                {t('board.edit')}
              </button>
            ) : (
              <button
                className="pill wide"
                disabled={cannotPropose}
                onClick={() => {
                  setMode('propose')
                }}
              >
                {t('board.propose')}
              </button>
            ))}

          {canEdit && proposals.length > 0 && (
            <div className="proposals">
              <span className="eyebrow">{t('board.proposals')}</span>
              <ErrorNote error={error} />
              <ul>
                {proposals.map((entry) => (
                  <li key={entry.id}>
                    <p>
                      <span className="chip">{t(`board.${entry.section}`)}</span> {entry.body}
                      <span className="hint"> · {entry.author}</span>
                    </p>
                    <div className="actions">
                      <button
                        className="pill active"
                        disabled={busy || cannotReview}
                        onClick={() => void review(entry.id, true)}
                      >
                        {t('board.accept')}
                      </button>
                      <button
                        className="pill"
                        disabled={busy || cannotReview}
                        onClick={() => void review(entry.id, false)}
                      >
                        {t('board.reject')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {canEdit && recentChanges.length > 0 && (
            <div className="proposals">
              <span className="eyebrow">{t('board.recentChanges')}</span>
              <p className="hint">{t('board.recentChangesHint')}</p>
              {proposals.length === 0 && <ErrorNote error={error} />}
              <ul>
                {recentChanges.map((change) => (
                  <li key={change.id}>
                    <p>
                      <span className="chip">{t(`board.${change.section}`)}</span> {change.body}
                      <span className="hint">
                        {' '}
                        ·{' '}
                        {t('board.changeBy', {
                          proposer: change.proposer,
                          validator: change.validator,
                        })}
                      </span>
                    </p>
                    <div className="actions">
                      {change.canFlag ? (
                        <button
                          className="pill"
                          disabled={busy}
                          onClick={() => void flag(change.id)}
                        >
                          {t('board.flag')}
                        </button>
                      ) : (
                        change.flaggedByMe && <span className="hint">{t('board.flagged')}</span>
                      )}
                      {change.flags > 0 && (
                        <span className="hint">{t('board.flags', { n: change.flags })}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
