import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { CourseRun, RagAttemptResult } from '@sanatorio/contracts'
import { starsFor } from '@sanatorio/course'
import {
  API_ROUTES,
  askView,
  baseOf,
  caseView,
  encodeRun,
  judge,
  KNOBS,
  LIMITS,
  measure,
  objectivesOf,
  orderView,
  questionOf,
  respond,
  runWorkload,
  starGoals,
  tally,
  targetOf,
  tuned,
  unitIn,
} from '@sanatorio/ragsim'
import type {
  ApiRequest,
  ApiTask,
  CalcTask,
  Knob,
  Metrics,
  OrderTask,
  PickTask,
  Run,
  Task,
  TuneTask,
  Unit,
} from '@sanatorio/ragsim'

import { api } from '../../shared/api'
import { activeSecondsOf, clearActiveTime } from '../../shared/course/activeTime'
import { clock, starText } from '../../shared/course/Stars'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { focusOf, metricKey, metricText, shortId, typedNumber } from './labels'
import { TraceView } from './Pipeline'
import { ApiExchange, AskData, AskTitle, MetricTiles, OpsTimeline } from './Views'

/** Segundos que faltan para una hora (nunca menos de cero). */
const secondsTo = (deadline: string): number =>
  Math.max(0, Math.ceil((Date.parse(deadline) - Date.now()) / 1000))

/**
 * La cuenta atrás de un jefe. Solo repinta (el tiempo de verdad lo mide la
 * API); al llegar a cero avisa una vez para que el banco se cierre.
 */
function Countdown({ deadline, onEnd }: { deadline: string; onEnd: () => void }) {
  const { t } = useI18n()
  const [left, setLeft] = useState(() => secondsTo(deadline))

  useEffect(() => {
    if (left === 0) {
      onEnd()

      return
    }

    const tick = window.setTimeout(() => {
      setLeft(secondsTo(deadline))
    }, 1000)

    return () => {
      window.clearTimeout(tick)
    }
  }, [deadline, left, onEnd])

  return (
    <p
      className={left <= 30 ? 'shell-timer hurry' : 'shell-timer'}
      role="timer"
      aria-live={left <= 10 ? 'assertive' : 'off'}
    >
      {t('shell.boss.left', { time: clock(left) })}
    </p>
  )
}

/** Lo que recibe el banco de cada tipo de tarea. */
type BenchProps<T extends Task> = {
  task: T
  /** Qué tarea de la unidad es. */
  t: number
  /** Lo que no cumplía la última comprobación de esta tarea (`null`: aún ninguna). */
  last: string[] | null
  /** Si ya no se puede comprobar más (ganado, sin tiempo o corrigiendo). */
  locked: boolean
  onCheck: (run: Run) => void
}

/**
 * La prueba: el banco de pruebas de la unidad (uno por tarea), lo que se
 * comprueba y cuántas comprobaciones llevas. Mirar, mover los mandos y probar
 * consultas es gratis; cada «Comprobar» cuenta. Al salir la última tarea se
 * manda todo a la API, que lo vuelve a corregir y pone las estrellas (y el
 * tiempo).
 */
export function Bench({
  unit,
  run,
  onResult,
  onRestart,
}: {
  unit: Unit
  run: CourseRun | null
  onResult: (result: RagAttemptResult) => void
  onRestart?: () => void
}) {
  const { t, tn, lang } = useI18n()
  const [entries, setEntries] = useState<string[]>([])
  const [shown, setShown] = useState(0)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState<RagAttemptResult | null>(null)
  const { busy, error, run: act } = useAction()
  const [expired, setExpired] = useState(false)
  const stop = useCallback(() => {
    setExpired(true)
  }, [])
  const tallied = useMemo(() => tally(unit, entries), [unit, entries])
  const won = result?.done === true
  const timeUp = expired && !won
  const full = entries.length >= LIMITS.attemptEntries
  const text = unitIn(unit, lang)
  const goals = starGoals(unit)
  const numbers = unit.tasks.map((_, index) => index)

  function check(made: Run) {
    if (won || timeUp || full || busy) return

    const all = [...entries, encodeRun(made)]

    setEntries(all)
    if (!tally(unit, all).passed.every(Boolean)) return
    void act(async () => {
      const answer = await api.submitRagAttempt(unit.id, {
        entries: all,
        activeSeconds: activeSecondsOf('rag', unit.id),
      })

      if (answer.done && answer.stars > 0) clearActiveTime('rag', unit.id)
      setResult(answer)
      onResult(answer)
    })
  }

  return (
    <section className="rag-bench">
      {run !== null && !won && <Countdown deadline={run.deadline} onEnd={stop} />}
      <p className="course-count" aria-live="polite">
        {tn('rag.count', won ? result.commands : tallied.runs)}{' '}
        {run === null && (
          <span className="course-stars" title={t('course.starsNow')}>
            <span aria-hidden="true">{starText(starsFor(tallied.runs, goals))}</span>
            <span className="sr-only">
              {t('course.starsNowValue', { stars: starsFor(tallied.runs, goals) })}
            </span>
          </span>
        )}
      </p>
      {unit.tasks.length > 1 && (
        <PillGroup
          kind="tabs"
          id={`rag-task-${unit.id}`}
          options={numbers}
          value={shown}
          onChange={setShown}
          label={t('rag.bench.tasks')}
          text={(index) =>
            `${tallied.passed[index] === true ? '✓ ' : ''}${t('rag.bench.task', { n: index + 1 })}`
          }
          pillClass={(index) => (tallied.passed[index] === true ? 'rag-task-done' : '')}
        />
      )}
      {unit.tasks.map((task, index) => (
        <div key={`${round}-${index}`} className="rag-task" hidden={index !== shown}>
          {unit.tasks.length > 1 && <p className="rag-task-text">{text.tasks?.[index]}</p>}
          <TaskBench
            task={task}
            t={index}
            last={tallied.last[index] ?? null}
            locked={won || timeUp || full || busy}
            onCheck={check}
          />
          <Verdict
            last={tallied.last[index] ?? null}
            passed={tallied.passed[index] === true}
            next={
              tallied.passed[index] === true && !tallied.passed.every(Boolean)
                ? () => {
                    setShown(tallied.passed.findIndex((done) => !done))
                  }
                : undefined
            }
          />
        </div>
      ))}
      <div className="git-actions">
        <button
          type="button"
          className="ghost"
          onClick={
            run === null
              ? () => {
                  setEntries([])
                  setResult(null)
                  setShown(0)
                  setRound((current) => current + 1)
                }
              : onRestart
          }
        >
          ↺ {t('shell.reset')}
        </button>
      </div>
      {busy && <p className="muted">{t('shell.checking')}</p>}
      <ErrorNote error={error} />
      {full && !won && (
        <p className="notice">{t('rag.bench.full', { n: LIMITS.attemptEntries })}</p>
      )}
      {won && run === null && (
        <div className="git-won" role="status">
          <p>
            <span className="course-stars">{starText(result.stars)}</span> {t('shell.won')}
          </p>
          <p className="course-why">
            {tn('rag.why', result.commands)} {result.stars < 3 && tn('rag.why.three', goals.three)}
          </p>
        </div>
      )}
      {timeUp && (
        <p className="notice" role="status">
          {t('shell.boss.timeUp')}
        </p>
      )}
      {result !== null && !result.done && !timeUp && <p className="notice">{t('shell.notYet')}</p>}
    </section>
  )
}

/** Cómo quedó la última comprobación de una tarea. */
function Verdict({
  last,
  passed,
  next,
}: {
  last: string[] | null
  passed: boolean
  next: (() => void) | undefined
}) {
  const { t } = useI18n()

  if (last === null) return null

  return (
    <p className={`rag-task-verdict ${passed ? 'ok' : 'no'}`} role="status">
      {t(passed ? 'rag.bench.passed' : 'rag.bench.failed')}{' '}
      {next !== undefined && (
        <button type="button" onClick={next}>
          {t('rag.bench.next')}
        </button>
      )}
    </p>
  )
}

function TaskBench(props: BenchProps<Task>) {
  const { task } = props

  switch (task.kind) {
    case 'tune':
      return <TuneBench {...props} task={task} />
    case 'calc':
      return <CalcBench {...props} task={task} />
    case 'pick':
      return <PickBench {...props} task={task} />
    case 'order':
      return <OrderBench {...props} task={task} />
    case 'api':
      return <ApiBench {...props} task={task} />
  }
}

/** El botón que cuenta, igual en todos los bancos. */
function CheckButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const { t } = useI18n()

  return (
    <button type="button" className="primary rag-check" disabled={disabled} onClick={onClick}>
      {t('rag.bench.check')}
    </button>
  )
}

/** Un objetivo cumplido o no, con su marca para quien no la ve. */
function Mark({ ok }: { ok: boolean | null }) {
  const { t } = useI18n()

  return (
    <>
      <span aria-hidden="true">{ok === null ? '○' : ok ? '✓' : '✗'}</span>
      <span className="sr-only">{t(ok === true ? 'shell.obj.done' : 'shell.obj.todo')}</span>
    </>
  )
}

/* ---------- Ajustar la tubería ---------- */

/** Un mando: interruptor, opciones, varias casillas o deslizador, según lo que sea. */
function KnobControl({
  knob,
  value,
  only,
  disabled,
  onChange,
}: {
  knob: Knob
  value: unknown
  only: readonly string[] | undefined
  disabled: boolean
  onChange: (value: unknown) => void
}) {
  const { t } = useI18n()
  const format = useFormat()
  const spec = KNOBS[knob]
  const label = t(`rag.knob.${knob}`)

  if (spec.type === 'flag')
    return (
      <label className="rag-knob flag">
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.checked)
          }}
        />
        <span>{label}</span>
      </label>
    )
  if (spec.type === 'range')
    return (
      <label className="rag-knob range">
        <span>
          {label} <strong className="rag-knob-value">{format.number(Number(value), 2)}</strong>
        </span>
        <input
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={Number(value)}
          disabled={disabled}
          onChange={(event) => {
            onChange(Number(event.target.value))
          }}
        />
      </label>
    )

  const options = spec.options.filter((option) => only === undefined || only.includes(option))

  if (spec.type === 'choice')
    return (
      <div className="rag-knob choice">
        <PillGroup
          options={options}
          value={typeof value === 'string' ? value : null}
          onChange={onChange}
          label={label}
          before={<span className="rag-knob-name">{label}</span>}
          text={(option) => t(`rag.opt.${knob}.${option}`)}
          disabled={() => disabled}
        />
      </div>
    )

  const chosen = Array.isArray(value) ? (value as string[]) : []

  return (
    <fieldset className="rag-knob many">
      <legend>{label}</legend>
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={chosen.includes(option)}
            disabled={disabled}
            onChange={(event) => {
              onChange(
                event.target.checked
                  ? [...chosen, option]
                  : chosen.filter((each) => each !== option),
              )
            }}
          />
          <span>{t(`rag.opt.${knob}.${option}`)}</span>
        </label>
      ))}
    </fieldset>
  )
}

const SIGN = { '>=': '≥', '<=': '≤', '=': '=' } as const

function TuneBench({ task, t: index, last, locked, onCheck }: BenchProps<TuneTask>) {
  const { t } = useI18n()
  const format = useFormat()
  const base = useMemo(() => baseOf(task), [task])
  const [knobs, setKnobs] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(task.knobs.map((knob) => [knob, base[knob]])),
  )
  const probes = task.dev ?? task.questions
  const [probe, setProbe] = useState(probes[0] ?? '')
  const [checked, setChecked] = useState<Metrics | null>(null)
  const [dev, setDev] = useState<Metrics | null>(null)
  const config = useMemo(() => tuned(task, knobs), [task, knobs])
  const target = useMemo(() => targetOf(task), [task])
  const question = questionOf(probe)
  const judged = useMemo(
    () => (question === undefined ? null : judge(config, question)),
    [config, question],
  )
  const ops = useMemo(() => (task.workload === true ? runWorkload(config) : null), [task, config])
  const shownKeys = [
    ...new Set([...objectivesOf(task), ...(task.dev === undefined ? [] : ['match'])]),
  ]

  return (
    <div className="rag-tune">
      <div className="rag-knobs">
        <h4>{t('rag.bench.knobs')}</h4>
        {task.knobs.map((knob) => (
          <KnobControl
            key={knob}
            knob={knob}
            value={knobs[knob]}
            only={task.only?.[knob]}
            disabled={locked}
            onChange={(value) => {
              setKnobs({ ...knobs, [knob]: value })
              setDev(null)
            }}
          />
        ))}
        <h4 className="shell-objectives-title">{t('shell.objectives')}</h4>
        <ul className="shell-objectives rag-objectives" aria-label={t('shell.objectives')}>
          {task.objectives.map(({ metric, op }) => (
            <li key={metric} className={last !== null && !last.includes(metric) ? 'ok' : ''}>
              <Mark ok={last === null ? null : !last.includes(metric)} />{' '}
              {t(`rag.metric.${metricKey(metric)}`)}{' '}
              <strong>
                {SIGN[op]} {metricText(metric, target[metric] ?? 0, format.number)}
              </strong>
              {checked !== null && (
                <span className="rag-now">
                  {' '}
                  {t('rag.bench.now', {
                    value: metricText(metric, checked[metric] ?? 0, format.number),
                  })}
                </span>
              )}
            </li>
          ))}
        </ul>
        {task.dev !== undefined && <p className="muted rag-hidden-note">{t('rag.bench.hidden')}</p>}
        <CheckButton
          disabled={locked}
          onClick={() => {
            setChecked(measure(task, config).metrics)
            onCheck({ t: index, c: knobs })
          }}
        />
      </div>
      <div className="rag-look">
        <h4>{t(ops === null ? 'rag.bench.probe' : 'rag.bench.simulate')}</h4>
        {ops !== null ? (
          <OpsTimeline result={ops} />
        ) : (
          <>
            <label className="rag-probe">
              <span className="sr-only">{t('rag.answer.question')}</span>
              <select
                value={probe}
                onChange={(event) => {
                  setProbe(event.target.value)
                }}
              >
                {probes.map((id) => (
                  <option key={id} value={id}>
                    {questionOf(id)?.text}
                  </option>
                ))}
              </select>
            </label>
            {judged !== null && (
              <TraceView judged={judged} config={config} focus={focusOf(task.knobs)} />
            )}
          </>
        )}
        {task.dev !== undefined && (
          <div className="rag-dev">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setDev(measure(task, config, task.dev).metrics)
              }}
            >
              {t('rag.bench.dev')}
            </button>
            {dev !== null && <MetricTiles metrics={dev} keys={shownKeys} />}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Calcular a mano ---------- */

function CalcBench({ task, t: index, last, locked, onCheck }: BenchProps<CalcTask>) {
  const { t, tn } = useI18n()
  const views = useMemo(() => task.asks.map(askView), [task])
  const [typed, setTyped] = useState<string[]>(() => task.asks.map(() => ''))
  const values = typed.map(typedNumber)

  return (
    <div className="rag-calc">
      {views.map((view, at) => {
        const ok = last === null ? null : !last.includes(`ask:${at}`)

        return (
          <fieldset key={at} className={`rag-ask ${ok === null ? '' : ok ? 'ok' : 'no'}`}>
            <legend>
              <Mark ok={ok} /> <AskTitle ask={view.ask} />
            </legend>
            <AskData view={view} />
            <label className="rag-answer-input">
              <span>
                {t('rag.calc.answer')}{' '}
                <small>
                  {view.decimals === 0
                    ? t('rag.calc.integer')
                    : tn('rag.calc.decimals', view.decimals)}
                </small>
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={typed[at] ?? ''}
                disabled={locked}
                maxLength={12}
                onChange={(event) => {
                  setTyped(typed.map((each, n) => (n === at ? event.target.value : each)))
                }}
              />
            </label>
          </fieldset>
        )
      })}
      <CheckButton
        disabled={locked || values.some((value) => !Number.isFinite(value))}
        onClick={() => {
          onCheck({ t: index, v: values })
        }}
      />
    </div>
  )
}

/* ---------- Elegir ---------- */

function PickBench({ task, t: index, last, locked, onCheck }: BenchProps<PickTask>) {
  const { t } = useI18n()
  const format = useFormat()
  const views = useMemo(() => task.cases.map(caseView), [task])
  const [picks, setPicks] = useState<string[][]>(() => task.cases.map(() => []))
  const [measured, setMeasured] = useState(false)

  function toggle(at: number, id: string, multi: boolean) {
    setPicks(
      picks.map((each, n) =>
        n !== at
          ? each
          : !multi
            ? [id]
            : each.includes(id)
              ? each.filter((other) => other !== id)
              : [...each, id],
      ),
    )
  }

  return (
    <div className="rag-pick">
      {views.map((view, at) => {
        const ok = last === null ? null : !last.includes(`case:${at}`)
        const given = view.given
        const question = 'question' in given ? (questionOf(given.question)?.text ?? '') : ''
        const stageCase = given.of === 'stage' ? view.judged[0] : undefined
        let title: ReactNode = t('rag.pick.best', {
          metric: given.of === 'best' ? t(`rag.metric.${metricKey(given.metric)}`) : '',
        })

        if (given.of === 'relevant') title = t('rag.pick.relevant', { question })
        if (given.of === 'stage') title = t('rag.pick.stage', { question })

        return (
          <fieldset key={at} className={`rag-ask ${ok === null ? '' : ok ? 'ok' : 'no'}`}>
            <legend>
              <Mark ok={ok} /> {title}
            </legend>
            {stageCase !== undefined && (
              <TraceView
                judged={stageCase.judged}
                config={stageCase.config}
                focus="chunks"
                reveal={false}
              />
            )}
            {given.of === 'best' && (
              <div className="rag-presets">
                <p className="rag-caption">{t('rag.pick.demo')}</p>
                <ul className="rag-rows">
                  {view.options.map((option) => (
                    <li key={option.id}>
                      <span className="rag-row-label">{option.id}</span>
                      <ol>
                        {view.judged
                          .filter((each) => each.option === option.id)
                          .map((each) => (
                            <li
                              key={each.judged.question.id}
                              className={each.judged.rank === 1 ? 'mark' : ''}
                            >
                              {each.judged.question.text}:{' '}
                              {each.judged.rank === null ? '—' : `${each.judged.rank}º`}
                            </li>
                          ))}
                      </ol>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setMeasured(true)
                  }}
                >
                  {t('rag.pick.measure')}
                </button>
              </div>
            )}
            <div className={`rag-options ${given.of}`}>
              {view.options.map((option) => (
                <label key={option.id} className="rag-option">
                  <input
                    type={view.multi ? 'checkbox' : 'radio'}
                    name={`rag-pick-${index}-${at}`}
                    checked={(picks[at] ?? []).includes(option.id)}
                    disabled={locked}
                    onChange={() => {
                      toggle(at, option.id, view.multi)
                    }}
                  />
                  <span>
                    {given.of === 'relevant' && (
                      <>
                        <strong>{shortId(option.id)}</strong> {option.text}
                      </>
                    )}
                    {given.of === 'stage' && t(`rag.stagename.${option.id}`)}
                    {given.of === 'best' && (
                      <>
                        <strong>{option.id}</strong>{' '}
                        <PresetText setup={given.presets[option.id] ?? {}} />
                        {measured && (
                          <em className="rag-now">
                            {' '}
                            {metricText(given.metric, view.measured[option.id] ?? 0, format.number)}
                          </em>
                        )}
                      </>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      })}
      <CheckButton
        disabled={locked || picks.some((each) => each.length === 0)}
        onClick={() => {
          onCheck({ t: index, p: picks })
        }}
      />
    </div>
  )
}

/** Una configuración candidata, en palabras: lo que cambia sobre la de fábrica. */
function PresetText({ setup }: { setup: Record<string, unknown> }) {
  const { t } = useI18n()
  const changes = Object.entries(setup)

  if (changes.length === 0) return <>{t('rag.pick.default')}</>

  return (
    <>
      {changes
        .map(([knob, value]) => {
          const name = t(`rag.knob.${knob}`)

          return typeof value === 'string'
            ? `${name}: ${t(`rag.opt.${knob}.${value}`)}`
            : `${name}: ${String(value)}`
        })
        .join(' · ')}
    </>
  )
}

/* ---------- Ordenar ---------- */

function OrderBench({ task, t: index, last, locked, onCheck }: BenchProps<OrderTask>) {
  const { t } = useI18n()
  const view = useMemo(() => orderView(task), [task])
  const [order, setOrder] = useState<string[]>(() => view.items.map((item) => item.id))
  const ok = last === null ? null : last.length === 0

  function move(at: number, by: number) {
    const to = at + by
    const moved = [...order]
    const [taken] = moved.splice(at, 1)

    if (taken === undefined || to < 0 || to >= order.length) return
    moved.splice(to, 0, taken)
    setOrder(moved)
  }

  return (
    <div className="rag-order">
      <p className="rag-task-text">
        <Mark ok={ok} /> {t('rag.order.title', { question: questionOf(task.question)?.text ?? '' })}
      </p>
      <ol className="rag-order-list">
        {order.map((id, at) => {
          const item = view.items.find((each) => each.id === id)

          return (
            <li key={id}>
              <span className="rag-rank">{at + 1}</span>
              <span className="rag-order-name">
                <strong>{shortId(id)}</strong>
                <small>
                  {t('rag.order.ranks', {
                    lex: item?.lexical ?? '—',
                    sem: item?.semantic ?? '—',
                  })}
                </small>
              </span>
              <span className="rag-order-moves">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={locked || at === 0}
                  aria-label={t('rag.order.up', { name: shortId(id) })}
                  onClick={() => {
                    move(at, -1)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={locked || at === order.length - 1}
                  aria-label={t('rag.order.down', { name: shortId(id) })}
                  onClick={() => {
                    move(at, 1)
                  }}
                >
                  ↓
                </button>
              </span>
            </li>
          )
        })}
      </ol>
      <CheckButton
        disabled={locked}
        onClick={() => {
          onCheck({ t: index, o: order })
        }}
      />
    </div>
  )
}

/* ---------- La API ---------- */

/** Las rutas que se pueden pedir: las de verdad y una que no existe. */
const PATHS = [...new Set(API_ROUTES.map((route) => route.path)), '/ask']

function ApiBench({ task, t: index, last, locked, onCheck }: BenchProps<ApiTask>) {
  const { t } = useI18n()
  const [request, setRequest] = useState<ApiRequest>({
    method: 'GET',
    path: '/healthz',
    q: '',
    k: 5,
  })
  const [sent, setSent] = useState<ApiRequest | null>(null)
  const set = (change: Partial<ApiRequest>): void => {
    setRequest({ ...request, ...change })
  }

  return (
    <div className="rag-apibench">
      <div className="rag-api-form">
        <label>
          <span>{t('rag.api.method')}</span>
          <select
            value={request.method}
            disabled={locked}
            onChange={(event) => {
              set({ method: event.target.value === 'POST' ? 'POST' : 'GET' })
            }}
          >
            <option>GET</option>
            <option>POST</option>
          </select>
        </label>
        <label>
          <span>{t('rag.api.path')}</span>
          <select
            value={request.path}
            disabled={locked}
            onChange={(event) => {
              set({ path: event.target.value })
            }}
          >
            {PATHS.map((path) => (
              <option key={path}>{path}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          <span>{t('rag.api.query')}</span>
          <select
            value={request.q}
            disabled={locked}
            onChange={(event) => {
              set({ q: event.target.value })
            }}
          >
            <option value="">{t('rag.api.empty')}</option>
            {task.questions.map((id) => (
              <option key={id} value={id}>
                {questionOf(id)?.text}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>k</span>
          <input
            type="number"
            min={0}
            max={20}
            value={request.k}
            disabled={locked}
            onChange={(event) => {
              set({ k: Number(event.target.value) })
            }}
          />
        </label>
      </div>
      <div className="git-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setSent(request)
          }}
        >
          {t('rag.api.send')}
        </button>
        <CheckButton
          disabled={locked}
          onClick={() => {
            setSent(request)
            onCheck({ t: index, r: request })
          }}
        />
      </div>
      {sent !== null && <ApiExchange request={sent} response={respond(task, sent)} />}
      <ul className="shell-objectives rag-objectives" aria-label={t('shell.objectives')}>
        {objectivesOf(task).map((key) => (
          <li key={key} className={last !== null && !last.includes(key) ? 'ok' : ''}>
            <Mark ok={last === null ? null : !last.includes(key)} /> {t(`rag.api.obj.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
