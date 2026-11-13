import { questionOf } from '@sanatorio/ragsim'
import type { ApiRequest, ApiResponse, Ask, AskView, Metrics, OpsResult } from '@sanatorio/ragsim'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { metricKey, metricText, shortId } from './labels'

/** Lo que se pregunta en un cálculo, con sus datos puestos (`rag.ask.*`). */
export function AskTitle({ ask }: { ask: Ask }) {
  const { t } = useI18n()
  const question = 'question' in ask ? (questionOf(ask.question)?.text ?? '') : ''

  return (
    <>
      {t(`rag.ask.${ask.kind}`, {
        term: 'term' in ask ? ask.term : '',
        chunk: 'chunk' in ask ? shortId(ask.chunk) : '',
        concept: ask.kind === 'count' ? t(`rag.concept.${ask.concept}`) : '',
        k: 'k' in ask ? ask.k : '',
        question,
      })}
    </>
  )
}

/** Los datos de un cálculo: los textos que hay que leer, las listas y la fórmula. */
export function AskData({ view }: { view: AskView }) {
  const { t } = useI18n()

  return (
    <div className="rag-ask-data">
      {view.cards.length > 0 && (
        <ul className="rag-cards">
          {view.cards.map((card, at) => (
            <li key={`${card.id}-${at}`}>
              {card.id !== '' && <strong>{shortId(card.id)}</strong>}
              <span>{card.text}</span>
            </li>
          ))}
        </ul>
      )}
      {view.rows.length > 0 && (
        <ul className="rag-rows">
          {view.rows.map((row, at) => (
            <li key={at}>
              <span className="rag-row-label">
                {row.label === 'lexical' || row.label === 'semantic'
                  ? t(`rag.focus.${row.label}`)
                  : row.label}
              </span>
              <ol>
                {row.cells.map((cell, n) => (
                  <li key={n} className={cell.mark ? 'mark' : ''}>
                    {cell.text}
                    {cell.mark && <span className="sr-only"> ✓</span>}
                  </li>
                ))}
                {row.cells.length === 0 && <li className="none">—</li>}
              </ol>
            </li>
          ))}
        </ul>
      )}
      {view.facts.length > 0 && (
        <dl className="rag-facts">
          {view.facts.map(([name, value], at) => (
            <div key={at}>
              {name !== '' && <dt>{name}</dt>}
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="rag-formula">
        <span className="rag-tag">{t('rag.calc.formula')}</span> <code>{view.formula}</code>
      </p>
    </div>
  )
}

/** El cálculo hecho, línea a línea: las cuentas las ha echado el motor. */
export function CalcSteps({ view }: { view: AskView }) {
  return (
    <ol className="rag-steps">
      {view.steps.map((step, at) => (
        <li key={at} style={{ animationDelay: `${at * 500}ms` }}>
          <code>{step}</code>
        </li>
      ))}
    </ol>
  )
}

/** Unas métricas en fichas: lo que mide una configuración. */
export function MetricTiles({ metrics, keys }: { metrics: Metrics; keys: readonly string[] }) {
  const { t } = useI18n()
  const format = useFormat()

  return (
    <dl className="rag-tiles">
      {keys.map((key, at) => (
        <div key={key} style={{ animationDelay: `${at * 120}ms` }}>
          <dt>{t(`rag.metric.${metricKey(key)}`)}</dt>
          <dd>{metricText(key, metrics[key] ?? 0, format.number)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** La mañana de producción, paso a paso: lo que se indexa, lo que sale de la caché y lo que sale viejo. */
export function OpsTimeline({ result }: { result: OpsResult }) {
  const { t } = useI18n()

  return (
    <div className="rag-ops">
      <ol>
        {result.steps.map((step, at) => (
          <li
            key={at}
            className={
              step.kind === 'index' ? 'index' : step.stale ? 'stale' : step.cached ? 'cached' : ''
            }
            style={{ animationDelay: `${at * 160}ms` }}
          >
            {step.kind === 'index' ? (
              <>
                <strong>{t(step.version === 1 ? 'rag.ops.index' : 'rag.ops.reindex')}</strong>
                <span>{t('rag.ops.embedded', { n: step.embedded, total: step.chunks })}</span>
              </>
            ) : (
              <>
                <span className="rag-ops-q">{questionOf(step.question)?.text}</span>
                <span>
                  {step.cached && <em className="rag-badge cached">{t('rag.ops.cached')}</em>}{' '}
                  {step.stale && <em className="rag-badge memory">{t('rag.ops.stale')}</em>}{' '}
                  {t('rag.ops.ms', { n: step.latency })}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
      <MetricTiles
        metrics={{
          'ops.embeddings': result.embeddings,
          'ops.latency': result.latency,
          'ops.hits': result.hits,
          'ops.stale': result.stale,
        }}
        keys={['ops.embeddings', 'ops.latency', 'ops.hits', 'ops.stale']}
      />
    </div>
  )
}

/** Una petición a la API y lo que contesta. */
export function ApiExchange({ request, response }: { request: ApiRequest; response: ApiResponse }) {
  const question = questionOf(request.q)?.text ?? request.q
  const line =
    request.path === '/healthz'
      ? `${request.method} ${request.path}`
      : request.method === 'GET'
        ? `${request.method} ${request.path}?q=${question}&k=${request.k}`
        : `${request.method} ${request.path}  {"query": "${question}", "k": ${request.k}}`

  return (
    <div className="rag-api">
      <pre className="rag-api-req">
        <span className="course-prompt">→</span> {line}
      </pre>
      <pre className={`rag-api-res ${response.status === 200 ? 'ok' : 'bad'}`} aria-live="polite">
        <strong>{response.status}</strong> {JSON.stringify(response.body, null, 1)}
      </pre>
    </div>
  )
}
