import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { courseText } from '@sanatorio/course'
import { docOf, indexOf, MEMORY } from '@sanatorio/ragsim'
import type { Chunk, Config, Focus, Judged, Question, Scored, Stage } from '@sanatorio/ragsim'

import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { PillGroup } from '../../shared/ui/PillGroup'
import { shortId, whereOf } from './labels'

/** Si un trozo contiene entera alguna de las frases con la respuesta. */
const holds = (chunk: Chunk | undefined, question: Question): boolean =>
  chunk !== undefined &&
  question.gold.some((gold) => gold.doc === chunk.doc && chunk.text.includes(gold.needle))

/** Las vistas que tiene una tubería con esa configuración, en el orden en que pasan las cosas. */
function viewsOf(config: Config): Focus[] {
  if (!config.context) return ['answer']

  return [
    'chunks',
    ...(config.mode === 'semantic' ? [] : (['lexical'] as const)),
    ...(config.mode === 'lexical' ? [] : (['semantic'] as const)),
    ...(config.mode === 'hybrid' ? (['fusion'] as const) : []),
    ...(config.rerank ? (['rerank'] as const) : []),
    'prompt',
    'answer',
  ]
}

/** En qué vista se ve el fallo de cada etapa. */
function lostAt(stage: Stage, views: readonly Focus[]): Focus | null {
  if (stage === 'ok') return null
  if (stage === 'chunking') return 'chunks'
  if (stage === 'prompt') return 'prompt'
  if (stage === 'generation') return 'answer'

  // La búsqueda: la última lista antes del prompt (la reordenada, la fusionada o la única que haya).
  return (
    views.findLast((view) => view !== 'prompt' && view !== 'answer' && view !== 'chunks') ?? null
  )
}

/**
 * Lo que pasó con una pregunta, etapa por etapa: del documento troceado a la
 * respuesta con su cita. Arriba, la tubería (se puede ir a cualquier etapa);
 * debajo, la etapa elegida. Lo usan el ejemplo de cada unidad y el banco de
 * pruebas, con lo que el motor ha hecho de verdad.
 */
export function TraceView({
  judged,
  config,
  focus,
  reveal = true,
}: {
  judged: Judged
  config: Config
  /** La etapa con la que se abre. */
  focus: Focus
  /** Si se enseña dónde se pierde la respuesta (no, cuando eso es lo que se pregunta). */
  reveal?: boolean
}) {
  const { t } = useI18n()
  const views = viewsOf(config)
  const [picked, setPicked] = useState<Focus | null>(null)
  const wanted = picked ?? focus
  const view = views.includes(wanted) ? wanted : (views.at(-1) ?? 'answer')
  const lost = reveal ? lostAt(judged.stage, views) : null
  const lostIndex = lost === null ? views.length : views.indexOf(lost)

  return (
    <div className="rag-trace">
      <p className="rag-question">
        <span className="rag-tag">{t('rag.answer.question')}</span> {judged.question.text}
      </p>
      <PillGroup
        className="rag-pipe"
        options={views}
        value={view}
        onChange={setPicked}
        label={t('rag.pipe.label')}
        text={(option) => t(`rag.focus.${option}`)}
        pillClass={(option) =>
          !reveal
            ? ''
            : option === lost
              ? 'rag-lost'
              : views.indexOf(option) < lostIndex
                ? 'rag-passed'
                : 'rag-after'
        }
      />
      <div className={`rag-panel rag-panel-${view}`} key={view}>
        {view === 'chunks' && <ChunksPanel judged={judged} config={config} />}
        {(view === 'lexical' || view === 'semantic') && (
          <ScoresPanel judged={judged} config={config} which={view} />
        )}
        {view === 'fusion' && (
          <RankFlow
            judged={judged}
            config={config}
            columns={[
              { title: t('rag.focus.lexical'), list: judged.trace.lexical },
              { title: t('rag.focus.fusion'), list: judged.trace.fused ?? [], main: true },
              { title: t('rag.focus.semantic'), list: judged.trace.semantic },
            ]}
          />
        )}
        {view === 'rerank' && (
          <RankFlow
            judged={judged}
            config={config}
            columns={[
              {
                title: t('rag.rerank.before'),
                list: judged.trace.fused ?? firstList(judged, config),
              },
              { title: t('rag.rerank.after'), list: judged.trace.reranked ?? [], main: true },
            ]}
          />
        )}
        {view === 'prompt' && <PromptPanel judged={judged} />}
        {view === 'answer' && <AnswerPanel judged={judged} />}
      </div>
      {view !== 'answer' && <AnswerLine judged={judged} />}
      {reveal && (
        <p className={`rag-verdict ${judged.stage === 'ok' ? 'ok' : 'lost'}`} role="status">
          {t(`rag.stage.${judged.stage}`)}
        </p>
      )}
    </div>
  )
}

const firstList = (judged: Judged, config: Config): Scored[] =>
  config.mode === 'semantic' ? judged.trace.semantic : judged.trace.lexical

/* ---------- El documento, troceado ---------- */

type Segment = { text: string; chunks: number[]; gold: boolean; starts: number | null }

/** El texto partido en tramos: cada uno sabe qué trozos lo cubren y si es parte de la respuesta. */
function segmentsOf(
  text: string,
  chunks: readonly Chunk[],
  gold: [number, number] | null,
): Segment[] {
  const cuts = [
    ...new Set([
      0,
      text.length,
      ...chunks.flatMap((chunk) => [chunk.start, chunk.end]),
      ...(gold ?? []),
    ]),
  ].sort((a, b) => a - b)

  return cuts.slice(0, -1).map((from, at) => {
    const to = cuts[at + 1] ?? text.length
    const covering = chunks.flatMap((chunk, n) =>
      chunk.start <= from && chunk.end >= to ? [n] : [],
    )

    return {
      text: text.slice(from, to),
      chunks: covering,
      gold: gold !== null && from >= gold[0] && to <= gold[1],
      starts: chunks.findIndex((chunk) => chunk.start === from),
    }
  })
}

/** El documento de la respuesta con sus trozos a la vista: por dónde corta y si parte la frase. */
function ChunksPanel({ judged, config }: { judged: Judged; config: Config }) {
  const { t, tn } = useI18n()
  const gold = judged.question.gold[0]
  const path = gold?.doc ?? judged.trace.found[0]?.doc
  const doc = path === undefined ? undefined : docOf(path)
  const box = useRef<HTMLPreElement>(null)

  // La frase de la respuesta, a la vista aunque el documento no quepa entero en su caja.
  useEffect(() => {
    const mark = box.current?.querySelector('mark')

    if (box.current !== null && mark instanceof HTMLElement)
      box.current.scrollTop = Math.max(0, mark.offsetTop - box.current.offsetTop - 48)
  }, [config, judged.question.id])

  if (doc === undefined) return <p className="muted">{t('rag.chunks.nothing')}</p>

  const chunks = indexOf(config).chunks.filter((chunk) => chunk.doc === doc.path)
  const start = gold === undefined ? -1 : doc.text.indexOf(gold.needle)
  const span: [number, number] | null =
    gold === undefined || start < 0 ? null : [start, start + gold.needle.length]

  return (
    <>
      <p className="rag-caption">
        <strong>{doc.path}</strong> · {tn('rag.chunks.count', chunks.length)}
        {span !== null && (
          <>
            {' · '}
            <span className={judged.whole ? 'rag-good' : 'rag-bad'}>
              {t(judged.whole ? 'rag.chunks.whole' : 'rag.chunks.split')}
            </span>
          </>
        )}
      </p>
      {chunks.length === 0 ? (
        <p className="muted">{t('rag.chunks.unloaded')}</p>
      ) : (
        <pre className="rag-doc" tabIndex={0} aria-label={doc.path} ref={box}>
          {segmentsOf(doc.text, chunks, span).map((segment, at) => {
            const first = segment.chunks[0]
            const tone =
              first === undefined ? 'gap' : segment.chunks.length > 1 ? 'both' : `c${first % 2}`
            const body = segment.gold ? <mark>{segment.text}</mark> : segment.text

            return (
              <span key={at} className={`rag-seg ${tone}`}>
                {segment.starts !== null && segment.starts >= 0 && (
                  <span className="rag-chunk-tag">{segment.starts + 1}</span>
                )}
                {body}
              </span>
            )
          })}
        </pre>
      )}
      <p className="rag-legend">
        <span className="rag-key c0" /> <span className="rag-key c1" />{' '}
        {t('rag.chunks.legend.chunk')}
        {config.overlap > 0 && (
          <>
            {' '}
            <span className="rag-key both" /> {t('rag.chunks.legend.overlap')}
          </>
        )}{' '}
        <mark>{t('rag.chunks.legend.answer')}</mark>
      </p>
    </>
  )
}

/* ---------- Las listas de cada buscador ---------- */

function Hit({ good }: { good: boolean }) {
  const { t } = useI18n()

  return good ? (
    <span className="rag-hit" title={t('rag.hit')}>
      <span aria-hidden="true">✓</span>
      <span className="sr-only">{t('rag.hit')}</span>
    </span>
  ) : null
}

const SHOWN = 5

/** Los primeros de un buscador, con su puntuación en barras: BM25 o coseno. */
function ScoresPanel({
  judged,
  config,
  which,
}: {
  judged: Judged
  config: Config
  which: 'lexical' | 'semantic'
}) {
  const { t } = useI18n()
  const format = useFormat()
  const { chunks } = indexOf(config)
  const list = judged.trace[which].slice(0, SHOWN)
  const top = list[0]?.score ?? 1

  return (
    <>
      <p className="rag-caption">{t(`rag.scores.${which}`)}</p>
      {list.length === 0 ? (
        <p className="rag-empty">{t('rag.scores.none')}</p>
      ) : (
        <ol className={`rag-bars ${which}`}>
          {list.map((each, rank) => {
            const chunk = chunks[each.at]

            return (
              <li key={each.at} className={rank < config.k ? 'in' : 'out'}>
                <span className="rag-bar-name" title={chunk?.id}>
                  {shortId(chunk?.id ?? '')} <Hit good={holds(chunk, judged.question)} />
                </span>
                <span className="rag-bar">
                  <i style={{ width: `${Math.max(4, (each.score / top) * 100)}%` }} />
                </span>
                <span className="rag-bar-value">{format.number(each.score, 2)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

const ROW = 30
const GAP = 34

type Column = { title: string; list: readonly Scored[]; main?: boolean }

/**
 * Varias listas ordenadas, una junto a otra, con una línea de cada trozo a su
 * puesto en la lista principal: se ve quién sube y quién baja al fusionar o al
 * reordenar.
 */
function RankFlow({
  judged,
  config,
  columns,
}: {
  judged: Judged
  config: Config
  columns: Column[]
}) {
  const { chunks } = indexOf(config)
  const main = columns.findIndex((column) => column.main === true)
  const target = columns[main]?.list.slice(0, SHOWN) ?? []
  const height = SHOWN * ROW

  return (
    <div className="rag-flow" style={{ ['--rag-rows' as string]: SHOWN }}>
      {columns.map((column, at) => {
        const list = column.list.slice(0, SHOWN)
        const side = at < main ? 'left' : 'right'

        return (
          <div
            key={column.title}
            className={`rag-flow-part ${column.main === true ? 'main' : side}`}
          >
            {at > main && <Links from={target} to={list} height={height} flip />}
            <div className="rag-flow-col">
              <strong>{column.title}</strong>
              <ol>
                {list.map((each, rank) => {
                  const chunk = chunks[each.at]

                  return (
                    <li
                      key={each.at}
                      title={chunk?.id}
                      className={`${holds(chunk, judged.question) ? 'gold' : ''} ${
                        column.main === true && rank < config.k ? 'in' : ''
                      }`}
                      style={{ animationDelay: `${rank * 90}ms` }}
                    >
                      <span className="rag-rank">{rank + 1}</span>
                      <span className="rag-flow-name">{shortId(chunk?.id ?? '')}</span>
                      <Hit good={holds(chunk, judged.question)} />
                    </li>
                  )
                })}
                {list.length === 0 && <li className="rag-flow-none">—</li>}
              </ol>
            </div>
            {at < main && <Links from={list} to={target} height={height} />}
          </div>
        )
      })}
    </div>
  )
}

/** Las líneas entre dos listas: de cada trozo de una a su puesto en la otra. */
function Links({
  from,
  to,
  height,
  flip = false,
}: {
  from: readonly Scored[]
  to: readonly Scored[]
  height: number
  flip?: boolean
}) {
  const y = (rank: number): number => rank * ROW + ROW / 2
  const lines = from.flatMap((each, rank) => {
    const other = to.findIndex((candidate) => candidate.at === each.at)

    return other < 0
      ? []
      : [{ key: each.at, a: y(rank), b: y(other), up: flip ? rank > other : other < rank }]
  })

  return (
    <svg
      className="rag-links"
      width={GAP}
      height={height}
      viewBox={`0 0 ${GAP} ${height}`}
      aria-hidden="true"
    >
      {lines.map((line) => (
        <path
          key={line.key}
          className={line.a === line.b ? 'same' : line.up ? 'up' : 'down'}
          d={`M0 ${line.a} C${GAP / 2} ${line.a} ${GAP / 2} ${line.b} ${GAP} ${line.b}`}
        />
      ))}
    </svg>
  )
}

/* ---------- El prompt ---------- */

/** El prompt llenándose hasta su presupuesto: lo fijo, cada trozo que entra y lo que se queda fuera. */
function PromptPanel({ judged }: { judged: Judged }) {
  const { t } = useI18n()
  const prompt = judged.trace.prompt

  if (prompt === null) return <p className="rag-empty">{t('rag.prompt.none')}</p>

  const wanted = prompt.fixed + prompt.items.reduce((sum, item) => sum + item.tokens, 0)
  const scale = Math.max(prompt.budget, wanted)
  const width = (tokens: number): string => `${(tokens / scale) * 100}%`

  return (
    <>
      <p className="rag-caption">
        {t('rag.prompt.used', { used: prompt.tokens, budget: prompt.budget })}
      </p>
      <div
        className="rag-meter"
        role="img"
        aria-label={t('rag.prompt.used', { used: prompt.tokens, budget: prompt.budget })}
      >
        <i className="fixed" style={{ width: width(prompt.fixed) }} />
        {prompt.items.map((item, at) => (
          <i
            key={item.chunk.id}
            className={`${item.included ? 'in' : 'out'} ${holds(item.chunk, judged.question) ? 'gold' : ''}`}
            style={{ width: width(item.tokens), animationDelay: `${(at + 1) * 140}ms` }}
          />
        ))}
        <b className="rag-meter-limit" style={{ left: width(prompt.budget) }} />
      </div>
      <ul className="rag-sources">
        <li className="fixed">
          <span>{t('rag.prompt.fixed')}</span>
          <span className="rag-tokens">{prompt.fixed}</span>
        </li>
        {prompt.items.map((item) => (
          <li key={item.chunk.id} className={item.included ? 'in' : 'out'}>
            <span>
              {item.n !== null && <span className="rag-cite">[{item.n}]</span>}{' '}
              <code>{whereOf(item.chunk)}</code> <Hit good={holds(item.chunk, judged.question)} />
              {!item.included && <em> · {t('rag.prompt.out')}</em>}
            </span>
            <span className="rag-tokens">{item.tokens}</span>
          </li>
        ))}
        {prompt.items.length === 0 && <li className="out">{t('rag.prompt.empty')}</li>}
      </ul>
    </>
  )
}

/* ---------- La respuesta ---------- */

/** El texto de una respuesta y de qué tipo es. */
function useAnswerText(judged: Judged): { kind: 'grounded' | 'memory' | 'idk'; text: string } {
  const { t, lang } = useI18n()
  const answer = judged.trace.answer

  if (answer.kind === 'grounded') return { kind: 'grounded', text: answer.text }
  if (answer.kind === 'idk') return { kind: 'idk', text: t('rag.answer.idkText') }

  const fact = MEMORY.find((each) => each.id === answer.id)

  return {
    kind: 'memory',
    text: fact === undefined ? t('rag.answer.guess') : courseText(fact, lang),
  }
}

function Badge({ kind }: { kind: 'grounded' | 'memory' | 'idk' }) {
  const { t } = useI18n()

  return <span className={`rag-badge ${kind}`}>{t(`rag.answer.${kind}`)}</span>
}

/** La respuesta en una línea, bajo cualquier etapa: para ver en qué acaba lo de arriba. */
function AnswerLine({ judged }: { judged: Judged }) {
  const { kind, text } = useAnswerText(judged)
  const answer = judged.trace.answer

  return (
    <p className={`rag-answer-line ${kind}`}>
      <Badge kind={kind} /> <span className="rag-answer-text">{text}</span>
      {answer.kind === 'grounded' && answer.cite !== null && (
        <span className="rag-cite"> [{answer.cite}]</span>
      )}
    </p>
  )
}

/** La respuesta con su cita: al pulsarla se abre el trozo del que sale, con la frase marcada. */
function AnswerPanel({ judged }: { judged: Judged }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const sourceId = useId()
  const { kind, text } = useAnswerText(judged)
  const answer = judged.trace.answer
  const item =
    answer.kind === 'grounded'
      ? judged.trace.prompt?.items.find((each) => each.chunk.id === answer.chunk)
      : undefined
  let source: ReactNode = null

  if (answer.kind === 'grounded' && item !== undefined) {
    const from = answer.start - item.chunk.start
    const chunk = item.chunk.text

    source = (
      <div className="rag-source" id={sourceId}>
        <p className="rag-caption">
          <code>{whereOf(item.chunk)}</code> <Hit good={holds(item.chunk, judged.question)} />
        </p>
        <pre className="rag-doc">
          {chunk.slice(0, from)}
          <mark>{chunk.slice(from, from + answer.text.length)}</mark>
          {chunk.slice(from + answer.text.length)}
        </pre>
      </div>
    )
  }

  return (
    <>
      <div className={`rag-bubble ${kind}`}>
        <Badge kind={kind} />
        <p>
          <span className="rag-answer-text">{text}</span>
          {answer.kind === 'grounded' &&
            (answer.cite === null ? (
              <em className="rag-nocite"> ({t('rag.answer.nocite')})</em>
            ) : (
              <>
                {' '}
                <button
                  type="button"
                  className="rag-cite-btn"
                  aria-expanded={open}
                  aria-controls={open ? sourceId : undefined}
                  title={t('rag.answer.source')}
                  onClick={() => {
                    setOpen(!open)
                  }}
                >
                  [{answer.cite}]<span className="sr-only"> {t('rag.answer.source')}</span>
                </button>
              </>
            ))}
        </p>
      </div>
      {open && source}
    </>
  )
}
