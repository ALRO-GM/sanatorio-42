import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type {
  CoreTrack,
  ProgressMeasure,
  ProgressPopulation,
  ProgressScope,
  StatsProgress,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useDetail } from '../../shared/detail'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { CampusPicker } from '../../shared/ui/CampusPicker'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { useFormat } from '../../shared/i18n/useFormat'
import { readProgressPreset } from '../../shared/links'
import { PERIODS, periodOf } from '../../shared/period'
import type { Period } from '../../shared/period'
import { MONTH, ProgressChart } from './ProgressChart'
import type { Span } from './ProgressChart'
import { ProgressCompare } from './ProgressCompare'
import { ProgressRanking } from './ProgressRanking'
import { ProgressTour } from './ProgressTour'
import { progressAnswer } from './progressAnswer'
import type { ProgressAnswer } from './progressAnswer'
import { POPULATIONS, TRACKS } from './progressSeries'

const RANGE_KEY = 'sanatorio_progress_range'
/** Los meses de «a mano» (`desde,hasta`), aparte del periodo. */
const MONTHS_KEY = 'sanatorio_progress_months'
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']
/** Lo de «a mano» antes de tocarlo: los dos años del pace más lento. */
const DEFAULT_MONTHS = { from: '0', to: '24' }

type Months = { from: string; to: string }

/**
 * Un periodo guardado o de un enlace. Los de antes, en meses que ya no se
 * ofrecen (8, 15, 18, 22), caen en el siguiente que hay: 8 en 12; 15, 18 y 22
 * en 24. Lo que no se entiende, `null`.
 */
function rangeOf(value: unknown): Period | null {
  const known = periodOf(value)

  if (known !== null) return known
  const months = Number(value)

  if (typeof value !== 'string' || !Number.isFinite(months) || months <= 0) return null

  return PERIODS.find((period) => Number(period) >= months) ?? 'all'
}

/** Lo guardado; si el navegador no deja leerlo (o no hay nada), `null`. */
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): solo dura esta visita.
  }
}

/** Los meses de «a mano» guardados, o los de siempre. */
function storedMonths(): Months {
  const [from, to] = (stored(MONTHS_KEY) ?? '').split(',')

  return from === undefined || to === undefined ? DEFAULT_MONTHS : { from, to }
}

/**
 * Lo que abarca el eje: los primeros meses del periodo, todo o, a mano, del mes
 * `from` al `to` (al menos un mes; sin decir el final, uno después del principio).
 */
function spanOf(range: Period, months: Months): Span {
  if (range === 'all') return { first: 0, last: null }
  if (range !== 'custom') return { first: 0, last: Number(range) * MONTH }
  const from = Math.max(0, Math.floor(Number(months.from) || 0))
  const to = Math.floor(Number(months.to) || 0)

  return { first: from * MONTH, last: (to > from ? to : from + 1) * MONTH }
}

/** Un botón por opción que se enciende y apaga solo; varias a la vez. */
function Toggles<T extends string>(props: {
  label: string
  options: readonly T[]
  on: ReadonlySet<T>
  set: (next: Set<T>) => void
  text: (value: T) => string
}) {
  return (
    <PillGroup
      options={props.options}
      value={null}
      pressed={(option) => props.on.has(option)}
      onChange={(option) => {
        const next = new Set(props.on)

        if (next.has(option)) next.delete(option)
        else next.add(option)
        props.set(next)
      }}
      label={props.label}
      text={props.text}
    />
  )
}

/** Una opción del panel: su rótulo visible encima y el control debajo. */
function Option({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="progress-option">
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  )
}

/**
 * La pestaña Avance, en Datos: el avance en el common core a lo largo del
 * tiempo (#87). Tu línea, las medias que enciendas (plan × quién cuenta ×
 * campus, cada combinación en su línea: uno, varios o todos los campus, cada
 * uno en la suya, y todos juntos), hasta cinco personas con quien compararte y
 * lo que pide cada pace. Se mide por círculos o por horas.
 *
 * Por defecto, tu campus: el de tu 42cursus, no el que estés mirando en la web
 * (`StatsProgress.home`).
 *
 * Como toda gráfica con opciones (`docs/interfaz.md`): la gráfica a la
 * izquierda, quieta a la vista, y las opciones en un panel a la derecha; al
 * cambiar una se ve el efecto sin moverse. En el móvil, la gráfica primero y
 * las opciones debajo.
 */
export function ProgressPage({ me }: { me: string }) {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  // Lo que pide el enlace con el que se abrió (`progressHref`, desde el health
  // check): manda en esta visita, sin tocar lo guardado.
  const [preset] = useState(() => readProgressPreset(window.location.hash))
  const [measure, setMeasure] = useState<ProgressMeasure>('circles')
  // Los campus elegidos, cada uno en su línea; `null`, el tuyo (aún sin saber cuál es).
  const [chosen, setChosen] = useState<readonly number[] | null>(
    preset?.scope === undefined || preset.scope.includes('campus') ? null : [],
  )
  const [together, setTogether] = useState(preset?.scope?.includes('all') ?? false)
  // Por defecto, quien sigue más quien terminó: la media de la gente que está.
  const [populations, setPopulations] = useState<ReadonlySet<ProgressPopulation>>(
    new Set(preset?.pop ?? ['current']),
  )
  // Sin tocar, el plan de quien mira (C o Python); si no se sabe, los dos.
  const [chosenTracks, setTracks] = useState<ReadonlySet<CoreTrack> | null>(
    preset?.plan === undefined ? null : new Set(preset.plan),
  )
  const [paces, setPaces] = useState(preset?.paces ?? true)
  const [mine] = useState(preset?.me ?? true)
  const [range, setRange] = useState<Period>(
    () => rangeOf(preset?.range) ?? rangeOf(stored(RANGE_KEY)) ?? '24',
  )
  const [months, setMonths] = useState<Months>(storedMonths)

  useEffect(() => {
    // La dirección vuelve a ser la del Avance: recargar no repite el enlace.
    // `replaceState` no dispara `hashchange`: la sección no se vuelve a montar.
    if (preset !== null) window.history.replaceState(null, '', '#/avance')
  }, [preset])
  const [others, setOthers] = useState<string[]>([])
  // Sin campus elegido (o ninguno), lo de siempre: tu campus, que no se pinta si no se quiere.
  const asked = chosen === null || chosen.length === 0 ? null : chosen
  const fetched = useAsync(
    () => api.getStatsProgress(others, asked),
    [others.join(','), asked?.join(',') ?? ''],
  )
  // Mientras llega lo nuevo (otro campus, otra persona), se queda lo de antes:
  // la gráfica no se vacía a cada clic.
  const [kept, setKept] = useState<StatsProgress | undefined>(undefined)

  if (fetched.data !== undefined && fetched.data !== kept) setKept(fetched.data)
  const data = fetched.data ?? kept
  const tracks: ReadonlySet<CoreTrack> =
    chosenTracks ??
    new Set(data?.track === undefined || data.track === null ? TRACKS : [data.track])
  const home = data?.home ?? null
  const campuses = chosen ?? (home === null ? [] : [home])
  const picked = { tracks, populations, campuses, together }
  // Las sugerencias de «Los más rápidos»: de tu campus si va, y de cada campus
  // si van otros o todos juntos.
  const scopes = new Set<ProgressScope>([
    ...(home !== null && campuses.includes(home) ? (['campus'] as const) : []),
    ...(together || campuses.some((id) => id !== home) ? (['all'] as const) : []),
  ])
  const missing =
    data === undefined
      ? []
      : others.filter((login) => !data.others.some((each) => each.login === login))
  const maxMonths = Math.ceil((data?.days.at(-1) ?? 730) / MONTH)
  // Primera capa: la respuesta, con tu plan (el elegido si solo hay uno).
  const answer =
    data === undefined
      ? null
      : progressAnswer(data, tracks.size === 1 ? ([...tracks][0] ?? null) : null)
  // Tercera capa, plegada salvo para quien disfruta de los datos.
  const deep = useDetail() === 'datos'

  return (
    <section className="progress-page" aria-labelledby="stats-progress">
      <div className="section-head">
        <h2 id="stats-progress">
          {t('stats.progress.title')}
          <InfoTip title={t('stats.progress.title')}>
            <p>{t('stats.progress.info')}</p>
            <ProgressTour />
          </InfoTip>
        </h2>
      </div>
      {answer !== null && <Answer answer={answer} />}
      <div className="progress-layout">
        <article className="card progress-card">
          {data === undefined ? (
            <ErrorNote error={fetched.error} onRetry={() => void fetched.reload()} />
          ) : (
            <ProgressChart
              data={data}
              measure={measure}
              picked={picked}
              paces={paces}
              span={spanOf(range, months)}
              mine={mine}
            />
          )}
        </article>
        <aside className="card progress-rail" aria-label={t('stats.progress.options')}>
          <Option label={t('stats.progress.measure')}>
            {/* `progress-measure`: para la demostración (`spots` de `ProgressTour`). */}
            <PillGroup
              className="progress-measure"
              options={MEASURES}
              value={measure}
              onChange={setMeasure}
              label={t('stats.progress.measure')}
              text={(value) => t(`stats.progress.measure.${value}`)}
            />
            <p className="hint progress-measure-hint">
              {t(`stats.progress.measure.${measure}.hint`, { n: number(data?.axis.hours ?? 0) })}
            </p>
          </Option>
          <Option label={t('stats.progress.plan')}>
            <Toggles
              label={t('stats.progress.plan')}
              options={TRACKS}
              on={tracks}
              set={setTracks}
              text={(value) => t(`stats.progress.plan.${value}`)}
            />
          </Option>
          <div className="progress-option progress-option-row">
            {/* El eje es el tiempo desde el inicio de cada cual: los primeros N
                meses o, a mano, del mes X al Y. */}
            <PeriodPicker
              value={range}
              onChange={(next) => {
                setRange(next)
                store(RANGE_KEY, next)
              }}
              unit="months"
              maxMonths={maxMonths}
              from={months.from}
              to={months.to}
              onDates={(from, to) => {
                setMonths({ from, to })
                store(MONTHS_KEY, `${from},${to}`)
              }}
              text={(period) =>
                period === 'all'
                  ? t('period.all')
                  : period === 'custom'
                    ? t('period.customMonths')
                    : tn('stats.progress.first', Number(period))
              }
            />
            <label className="progress-toggle">
              <input
                type="checkbox"
                checked={paces}
                onChange={(event) => {
                  setPaces(event.target.checked)
                }}
              />{' '}
              {t('stats.progress.paces')}
            </label>
          </div>
          <details className="progress-deep" open={deep}>
            <summary>
              {t('stats.progress.deep')}
              <small>{t('stats.progress.deep.hint')}</small>
            </summary>
            <Option label={t('stats.progress.population')}>
              <Toggles
                label={t('stats.progress.population')}
                options={POPULATIONS}
                on={populations}
                set={setPopulations}
                text={(value) => t(`stats.progress.population.${value}`)}
              />
            </Option>
            <Option label={t('stats.progress.scope')}>
              {data !== undefined && (
                // Cada campus en su línea: uno, varios o todos («Todas»). Pedir
                // campus cuesta una petición: se espera a que acabes de marcar.
                <CampusPicker
                  available={data.available}
                  current={campuses}
                  label={t('stats.progress.scope')}
                  allowEmpty
                  onApply={(next) => {
                    setChosen(next === 'all' ? data.available.map((campus) => campus.id) : next)
                  }}
                />
              )}
              <label className="progress-toggle">
                <input
                  type="checkbox"
                  checked={together}
                  onChange={(event) => {
                    setTogether(event.target.checked)
                  }}
                />{' '}
                {t('stats.progress.together')}
              </label>
            </Option>
            <PoolOnly k="avance.compare">
              <div className="progress-option">
                <ProgressCompare
                  others={others}
                  onChange={setOthers}
                  missing={missing}
                  tracks={tracks}
                  scopes={scopes}
                  me={me}
                  campus={data?.available.find((campus) => campus.id === home)?.name ?? null}
                />
              </div>
            </PoolOnly>
          </details>
        </aside>
      </div>
      <ProgressRanking />
    </section>
  )
}

/**
 * La respuesta en una frase (primera capa): cómo vas frente a la media de tu
 * campus, con su color de estado. Lo demás, en la gráfica y en «Ver a fondo».
 */
function Answer({ answer }: { answer: ProgressAnswer }) {
  const { t, tn } = useI18n()
  const text =
    answer.kind === 'finished'
      ? answer.average === null
        ? tn('stats.progress.answer.finished', answer.months)
        : `${tn('stats.progress.answer.finished', answer.months)} · ${tn('stats.progress.answer.average', answer.average)}`
      : answer.kind === 'ahead' || answer.kind === 'behind'
        ? tn(`stats.progress.answer.${answer.kind}`, answer.weeks)
        : t(`stats.progress.answer.${answer.kind}`)
  const tone = answer.kind === 'behind' ? 'warn' : answer.kind === 'even' ? 'neutral' : 'good'

  return (
    <p className={`progress-answer ${tone}`}>
      <span className="eyebrow">{t('stats.progress.answer.label')}</span>
      <strong>{text}</strong>
    </p>
  )
}
