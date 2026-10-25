import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type {
  CoreTrack,
  ProgressMeasure,
  ProgressPopulation,
  ProgressScope,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PoolOnly } from '../../shared/ui/PoolOnly'
import { StepPicker } from '../../shared/ui/StepPicker'
import { useFormat } from '../../shared/i18n/useFormat'
import { readProgressPreset } from '../../shared/links'
import { ProgressChart, RANGES } from './ProgressChart'
import type { Range } from './ProgressChart'
import { ProgressCompare } from './ProgressCompare'
import { ProgressRanking } from './ProgressRanking'
import { POPULATIONS, SCOPES, TRACKS } from './progressSeries'

const RANGE_KEY = 'sanatorio_progress_range'
const MEASURES: readonly ProgressMeasure[] = ['circles', 'hours']

/** El periodo guardado; si el navegador no deja leerlo, el de siempre. */
function storedRange(): Range {
  try {
    const value = localStorage.getItem(RANGE_KEY)

    return RANGES.find((range) => range === value) ?? '24'
  } catch {
    return '24'
  }
}

function storeRange(range: Range): void {
  try {
    localStorage.setItem(RANGE_KEY, range)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): solo dura esta visita.
  }
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
 * alcance, cada combinación en su línea), hasta cinco personas con quien
 * compararte y lo que pide cada pace. Se mide por círculos o por horas.
 *
 * Como toda gráfica con opciones (`docs/interfaz.md`): la gráfica a la
 * izquierda, quieta a la vista, y las opciones en un panel a la derecha; al
 * cambiar una se ve el efecto sin moverse. En el móvil, la gráfica primero y
 * las opciones debajo.
 */
export function ProgressPage({ me }: { me: string }) {
  const { t } = useI18n()
  const { number } = useFormat()
  // Lo que pide el enlace con el que se abrió (`progressHref`, desde el health
  // check): manda en esta visita, sin tocar lo guardado.
  const [preset] = useState(() => readProgressPreset(window.location.hash))
  const [measure, setMeasure] = useState<ProgressMeasure>('circles')
  const [scopes, setScopes] = useState<ReadonlySet<ProgressScope>>(
    new Set(preset?.scope ?? ['campus']),
  )
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
  const [range, setRange] = useState<Range>(
    () => RANGES.find((each) => each === preset?.range) ?? storedRange(),
  )

  useEffect(() => {
    // La dirección vuelve a ser la del Avance: recargar no repite el enlace.
    // `replaceState` no dispara `hashchange`: la sección no se vuelve a montar.
    if (preset !== null) window.history.replaceState(null, '', '#/avance')
  }, [preset])
  const [others, setOthers] = useState<string[]>([])
  const { data, error, reload } = useAsync(() => api.getStatsProgress(others), [others.join(',')])
  const tracks: ReadonlySet<CoreTrack> =
    chosenTracks ??
    new Set(data?.track === undefined || data.track === null ? TRACKS : [data.track])
  const missing =
    data === undefined
      ? []
      : others.filter((login) => !data.others.some((each) => each.login === login))

  return (
    <section className="progress-page" aria-labelledby="stats-progress">
      <div className="section-head">
        <h2 id="stats-progress">
          {t('stats.progress.title')}
          <InfoTip title={t('stats.progress.title')}>
            <p>{t('stats.progress.info')}</p>
          </InfoTip>
        </h2>
      </div>
      <div className="progress-layout">
        <article className="card progress-card">
          {data === undefined ? (
            <ErrorNote error={error} onRetry={() => void reload()} />
          ) : (
            <ProgressChart
              data={data}
              measure={measure}
              picked={{ tracks, populations, scopes }}
              paces={paces}
              range={range}
              mine={mine}
            />
          )}
        </article>
        <aside className="card progress-rail" aria-label={t('stats.progress.options')}>
          <Option label={t('stats.progress.measure')}>
            <PillGroup
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
            <Toggles
              label={t('stats.progress.scope')}
              options={SCOPES}
              on={scopes}
              set={setScopes}
              text={(value) =>
                value === 'campus' && data !== undefined && data.campus !== null
                  ? data.campus
                  : t(`stats.progress.scope.${value}`)
              }
            />
          </Option>
          <div className="progress-option progress-option-row">
            <StepPicker
              options={RANGES}
              value={range}
              onChange={(next) => {
                setRange(next)
                storeRange(next)
              }}
              label={t('rank.period')}
              text={(value) =>
                value === 'all' ? t('net.period.all') : t('stats.progress.months', { n: value })
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
          <PoolOnly k="avance.compare">
            <div className="progress-option">
              <ProgressCompare
                others={others}
                onChange={setOthers}
                missing={missing}
                tracks={tracks}
                scopes={scopes}
                me={me}
                campus={data?.campus ?? null}
              />
            </div>
          </PoolOnly>
        </aside>
      </div>
      <ProgressRanking />
    </section>
  )
}
