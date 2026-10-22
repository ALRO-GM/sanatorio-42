import { useState } from 'react'

import type { QuizReviewItem } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { CodeText } from '../../shared/ui/CodeText'

/**
 * El Repaso: lo que has fallado en Not-games (preguntas y ajedrez), cada
 * concepto con qué es, un ejemplo y la pregunta tal como salió. Lo que
 * acertaste después queda aparte, como superado.
 */
export function ReviewTab() {
  const { t } = useI18n()
  const review = useAsync(() => api.getQuizReview(), [])
  const [showMastered, setShowMastered] = useState(false)
  const items = review.data ?? []
  const pending = items.filter((item) => !item.mastered)
  const mastered = items.filter((item) => item.mastered)

  return (
    <div className="quiz-review">
      {review.loading && review.data === undefined && <p className="estado">{t('app.loading')}</p>}
      <ErrorNote error={review.error} onRetry={() => void review.reload()} />
      {review.data !== undefined && items.length === 0 && (
        <p className="estado">{t('notgames.review.empty')}</p>
      )}
      {pending.length > 0 && (
        <p className="hint">{t('notgames.review.pending', { n: pending.length })}</p>
      )}
      <div className="quiz-review-list">
        {pending.map((item) => (
          <ReviewCard key={item.conceptId} item={item} />
        ))}
      </div>
      {mastered.length > 0 && (
        <button
          type="button"
          className="link"
          aria-expanded={showMastered}
          onClick={() => {
            setShowMastered(!showMastered)
          }}
        >
          {t('notgames.review.mastered', { n: mastered.length })}
        </button>
      )}
      {showMastered && (
        <div className="quiz-review-list">
          {mastered.map((item) => (
            <ReviewCard key={item.conceptId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ item }: { item: QuizReviewItem }) {
  const { t } = useI18n()

  return (
    <article className={`card quiz-review-card ${item.mastered ? 'mastered' : ''}`}>
      <div className="quiz-review-head">
        <h3>{item.title}</h3>
        <span className="chip">{item.topic}</span>
      </div>
      <small className="hint">
        {item.mastered
          ? t('notgames.review.masteredOne')
          : t('notgames.review.misses', { n: item.misses })}
      </small>
      <p>
        <CodeText text={item.definition} />
      </p>
      <span className="eyebrow">{t('notgames.review.example')}</span>
      <pre className="quiz-code">{item.example}</pre>
      <details>
        <summary>{t('notgames.review.question')}</summary>
        <p className="hint">
          <CodeText text={item.question} />
        </p>
        <p>
          <CodeText text={item.why} />
        </p>
      </details>
    </article>
  )
}
