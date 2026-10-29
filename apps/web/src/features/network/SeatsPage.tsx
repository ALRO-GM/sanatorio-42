import { useCallback, useMemo, useState } from 'react'

import type {
  NetworkLink,
  NetworkNode,
  SeatGraph,
  SeatHeat,
  SeatPerson,
} from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { SeatDates } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { StepPicker } from '../../shared/ui/StepPicker'
import { daysOf } from '../../shared/period'
import type { Period } from '../../shared/period'
import { Avatar } from '../../shared/ui/Avatar'
import { InfoTip } from '../../shared/ui/InfoTip'
import { PersonLink } from '../../shared/ui/PersonLink'
import { colorOf, scaleColor } from './colors'
import { ForceGraph } from './ForceGraph'
import { SeatHeatMap } from './SeatHeatMap'
import { SeatsTour } from './SeatsTour'
import { DEFAULT_TRIM, MOST_OPTIONS, SHARE_OPTIONS, trimSeats } from './seat-trim'
import type { SeatTrim } from './seat-trim'

/** «Todo»: los días más que acepta la API (diez años). */
const ALL_DAYS = 3650

/** Cómo se colorea: por grupo de gente que se sienta junta, o por lo solo que se sienta. */
const MODES = ['community', 'alone'] as const

type Mode = (typeof MODES)[number]

/** Lo solo que se sienta, de verde (casi siempre con alguien) a rojo (casi siempre solo). */
const ALONE_SCALE = { min: 0, max: 100 }

/** Personas con las que más se sienta alguien que salen en su ficha. */
const PARTNERS_SHOWN = 8

/**
 * Una persona de la red de asientos como burbuja del grafo de la red: el
 * tamaño es la fuerza de sus uniones a la vista (`strength`) y la endogamia
 * guarda lo solo que se sienta (0-100).
 */
function toNode(person: SeatPerson, strength: number): NetworkNode {
  return {
    login: person.login,
    image: person.image,
    external: false,
    given: strength,
    received: 0,
    partners: person.partners,
    endogamy: Math.round(person.alone * 100),
    reciprocity: 0,
    repetition: 0,
    givenPassRate: null,
    receivedPassRate: null,
    community: person.community,
    cohort: null,
    campusId: null,
  }
}

/**
 * La red de asientos (`docs/asientos.md`): con quién se sienta cada cual en
 * los clústeres. Cada unión es la cercanía de dos personas: horas sentadas a
 * la vez por el peso de lo cerca que estaban los puestos.
 */
export function SeatsPage() {
  const { t, tn } = useI18n()
  const { number } = useFormat()
  const [period, setPeriod] = useState<Period>('1')
  const [dates, setDates] = useState<SeatDates>({ from: '', to: '' })
  // A mano, hasta que haya fecha de inicio se sigue con el último mes.
  const custom = period === 'custom' && dates.from !== '' ? dates : undefined
  const days = period === 'custom' ? 30 : (daysOf(period) ?? ALL_DAYS)
  const key = custom === undefined ? String(days) : `${custom.from}..${custom.to}`
  const [mode, setMode] = useState<Mode>('community')
  const [selected, setSelected] = useState<string | null>(null)
  const { data, error, reload } = useAsync<SeatGraph>(() => api.getSeatGraph(days, custom), [key])
  const heat = useAsync<SeatHeat>(() => api.getSeatHeat(days, custom), [key])

  // Recortado en la web, al momento (`seat-trim.ts`): de cada cual, solo la
  // gente con la que más se sienta; y, con alguien elegido, solo sus uniones.
  const [trim, setTrim] = useState<SeatTrim>(DEFAULT_TRIM)
  const [onlyChosen, setOnlyChosen] = useState(true)
  const shown = useMemo(
    () =>
      data === undefined
        ? undefined
        : trimSeats(data.people, data.links, trim, onlyChosen ? selected : null),
    [data, trim, onlyChosen, selected],
  )
  // El tamaño de cada burbuja no son sus horas en el clúster, sino su parte de
  // la cercanía de las uniones a la vista: sumadas todas, cuanto más le toca a
  // alguien, más grande (pedido por Alberto, 2026-10-29).
  const nodes = useMemo(() => {
    if (shown === undefined) return []

    const strength = new Map<string, number>()

    for (const link of shown.links) {
      strength.set(link.source, (strength.get(link.source) ?? 0) + link.closeness)
      strength.set(link.target, (strength.get(link.target) ?? 0) + link.closeness)
    }

    return shown.people.map((person) => toNode(person, strength.get(person.login) ?? 0))
  }, [shown])
  const links = useMemo(
    (): NetworkLink[] =>
      shown?.links.map((link) => ({
        source: link.source,
        target: link.target,
        forth: link.closeness,
        back: 0,
      })) ?? [],
    [shown],
  )
  const paint = useCallback(
    (node: NetworkNode) =>
      mode === 'alone' ? scaleColor(node.endogamy, ALONE_SCALE) : colorOf(node, 'community'),
    [mode],
  )
  const byLogin = useMemo(() => new Map(data?.people.map((p) => [p.login, p]) ?? []), [data])
  // Para buscar a alguien: primero quien más horas pasa.
  const byHours = useMemo(() => [...(data?.people ?? [])].sort((x, y) => y.hours - x.hours), [data])
  const [query, setQuery] = useState('')
  // Elegir a alguien (en el grafo, en una lista o al buscar) también lo escribe en el buscador.
  const choose = useCallback((login: string | null) => {
    setSelected(login)
    setQuery(login ?? '')
  }, [])
  const tooltip = useCallback(
    (node: NetworkNode) => {
      const person = byLogin.get(node.login)

      return (
        <>
          <strong>{node.login}</strong>
          {person !== undefined && (
            <>
              <span>{t('seats.tip.hours', { n: number(person.hours) })}</span>
              <span>
                {t('seats.tip.alone', {
                  pct: Math.round(person.alone * 100),
                  partners: person.partners,
                })}
              </span>
            </>
          )}
        </>
      )
    },
    [byLogin, number, t],
  )
  const controls = useMemo(
    () => ({
      zoomIn: t('net.zoomIn'),
      zoomOut: t('net.zoomOut'),
      fit: t('net.fit'),
      find: t('net.find'),
      none: t('net.findNone'),
      gave: t('net.arrows.gave'),
      got: t('net.arrows.got'),
    }),
    [t],
  )

  const chosen = selected === null ? undefined : byLogin.get(selected)
  const partners = useMemo(() => {
    if (chosen === undefined || data === undefined) return []

    return data.links
      .filter((link) => link.source === chosen.login || link.target === chosen.login)
      .sort((x, y) => y.closeness - x.closeness)
      .slice(0, PARTNERS_SHOWN)
      .map((link) => ({
        login: link.source === chosen.login ? link.target : link.source,
        closeness: link.closeness,
        hours: link.hours,
      }))
  }, [chosen, data])
  // Quien más horas pasa sin nadie cerca, entre quien viene a menudo.
  const loneliest = useMemo(
    () =>
      (data?.people ?? [])
        .filter((person) => person.hours >= (data?.days ?? 30) / 2)
        .sort((x, y) => y.alone - x.alone)
        .slice(0, 5),
    [data],
  )

  return (
    <section className="network seats">
      <div className="net-layout">
        <div className="net-rail">
          <div className="net-head">
            <h2>
              {t('seats.title')}
              <InfoTip title={t('seats.title')}>
                <SeatsTour />
              </InfoTip>
            </h2>
            <p className="hint">{t('seats.intro')}</p>
          </div>
          <div className="net-filters">
            <div className="net-filter">
              {/* El selector de periodo de toda la web (`shared/ui/StepPicker`). */}
              <PeriodPicker
                value={period}
                onChange={setPeriod}
                from={dates.from}
                to={dates.to}
                onDates={(from, to) => {
                  setDates({ from, to })
                }}
              />
            </div>
            <div className="net-filter">
              <span className="eyebrow">{t('seats.colour')}</span>
              <PillGroup
                options={MODES}
                value={mode}
                onChange={setMode}
                label={t('seats.colour')}
                text={(option) => t(`seats.mode.${option}`)}
              />
            </div>
            {data !== undefined && (
              <div className="net-filter">
                <label className="seats-person">
                  <span className="eyebrow">{t('common.person')}</span>
                  <input
                    type="search"
                    list="seats-people"
                    value={query}
                    onChange={(event) => {
                      const typed = event.target.value

                      setQuery(typed)
                      // Al vaciarlo, nadie elegido.
                      if (byLogin.has(typed) || typed === '')
                        setSelected(typed === '' ? null : typed)
                    }}
                  />
                </label>
                <datalist id="seats-people">
                  {byHours.map((person) => (
                    <option key={person.login} value={person.login} />
                  ))}
                </datalist>
              </div>
            )}
            <div className="net-filter seats-trim">
              <StepPicker
                options={MOST_OPTIONS}
                value={trim.most}
                onChange={(most) => {
                  setTrim((current) => ({ ...current, most }))
                }}
                label={t('seats.trim.most')}
                text={(most) => (most === 'all' ? t('seats.trim.most.all') : String(most))}
              />
              <StepPicker
                options={SHARE_OPTIONS}
                value={trim.share}
                onChange={(share) => {
                  setTrim((current) => ({ ...current, share }))
                }}
                label={t('seats.trim.share')}
                text={(share) =>
                  share >= 1
                    ? t('seats.trim.share.all')
                    : t('seats.trim.share.value', { pct: Math.round(share * 100) })
                }
              />
              <label className="net-check">
                <input
                  type="checkbox"
                  checked={onlyChosen}
                  onChange={(event) => {
                    setOnlyChosen(event.target.checked)
                  }}
                />
                {t('seats.trim.focus')}
              </label>
            </div>
          </div>
          <ErrorNote error={error} onRetry={() => void reload()} />
          {data !== undefined && (
            <aside className="net-side">
              {chosen !== undefined && (
                <article className="card net-panel">
                  <div className="net-panel-head">
                    <Avatar login={chosen.login} image={chosen.image} size={48} />
                    <div>
                      <PersonLink login={chosen.login} />
                    </div>
                    <button
                      type="button"
                      className="link"
                      aria-label={t('net.close')}
                      onClick={() => {
                        choose(null)
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <dl className="net-facts">
                    <div>
                      <dt>{t('seats.person.hours')}</dt>
                      <dd>{number(chosen.hours)}</dd>
                    </div>
                    <div>
                      <dt>{t('seats.person.alone')}</dt>
                      <dd>{Math.round(chosen.alone * 100)} %</dd>
                    </div>
                    <div>
                      <dt>{t('net.partners')}</dt>
                      <dd>{chosen.partners}</dd>
                    </div>
                  </dl>
                  {chosen.usual.length > 0 && (
                    <p>{t('seats.person.usual', { seats: chosen.usual.join(', ') })}</p>
                  )}
                  {partners.length === 0 ? (
                    <p className="hint">{t('seats.person.nobody')}</p>
                  ) : (
                    <ol className="seats-partners">
                      {partners.map((partner) => (
                        <li key={partner.login}>
                          <button
                            type="button"
                            className="link"
                            onClick={() => {
                              choose(partner.login)
                            }}
                          >
                            {partner.login}
                          </button>
                          <span>
                            {t('seats.person.partner', {
                              closeness: number(partner.closeness),
                              hours: number(partner.hours),
                            })}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              )}
              <div className="net-totals">
                <div className="tile">
                  <span className="eyebrow">{t('common.people')}</span>
                  <strong>{number(data.totals.people)}</strong>
                </div>
                <div className="tile">
                  <span className="eyebrow">{t('seats.total.pairs')}</span>
                  <strong>{number(data.totals.pairs)}</strong>
                </div>
                <div className="tile">
                  <span className="eyebrow">{t('net.total.communities')}</span>
                  <strong>{number(data.totals.communities)}</strong>
                </div>
                <div className="tile">
                  <span className="eyebrow">{t('seats.total.hours')}</span>
                  <strong>{number(data.totals.hours)}</strong>
                </div>
              </div>
              {loneliest.length > 0 && (
                <article className="card">
                  <span className="eyebrow">{t('seats.alone.title')}</span>
                  <ol className="seats-partners">
                    {loneliest.map((person) => (
                      <li key={person.login}>
                        <button
                          type="button"
                          className="link"
                          onClick={() => {
                            choose(person.login)
                          }}
                        >
                          {person.login}
                        </button>
                        <span>
                          {t('seats.alone.row', {
                            pct: Math.round(person.alone * 100),
                            hours: number(person.hours),
                          })}
                        </span>
                      </li>
                    ))}
                  </ol>
                </article>
              )}
              <details className="card">
                <summary>{t('seats.about.title')}</summary>
                <p>{t('seats.about.layout')}</p>
                <p>{t('seats.about.weights')}</p>
                <p>{t('seats.about.log')}</p>
              </details>
            </aside>
          )}
        </div>

        {data !== undefined && (
          <div className="net-stage">
            {nodes.length === 0 ? (
              <p className="estado">{t('seats.empty')}</p>
            ) : (
              <ForceGraph
                nodes={nodes}
                links={links}
                colorOf={paint}
                selected={selected}
                onSelect={choose}
                label={t('seats.graphLabel', { people: nodes.length, links: links.length })}
                tooltip={tooltip}
                controls={controls}
                undirected
              />
            )}
            <p className="net-help">{t('seats.help')}</p>
            {data.links.length > links.length && (
              <p className="net-shown" role="status">
                {tn('seats.trim.shown', data.links.length, { links: number(links.length) })}
              </p>
            )}
            {/* Con un campus grande la API manda solo a quien más horas pasa
                (`GRAPH_BUDGET`): se dice cuánta gente queda fuera. */}
            {nodes.length > 0 && data.totals.people > nodes.length && (
              <p className="net-shown" role="status">
                {t('net.shown', { people: nodes.length, links: links.length })}
                {` · ${t('net.hidden', {
                  people: data.totals.people - nodes.length,
                  links: Math.max(0, data.totals.pairs - links.length),
                })}`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Debajo del grafo, con el mismo periodo: cuánto se usa cada ordenador. */}
      <article className="card seat-heat-card">
        <h3>{t('seats.heat.title')}</h3>
        <ErrorNote error={heat.error} onRetry={() => void heat.reload()} />
        {heat.data !== undefined && <SeatHeatMap heat={heat.data} />}
      </article>
    </section>
  )
}
