import { useCallback, useMemo, useState } from 'react'

import type { FoundPerson, NetworkLink, NetworkNode, SeatGraph } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import type { SeatDates } from '../../shared/api/types'
import { useAsync } from '../../shared/hooks/useAsync'
import { expectedTotals, timedLoad } from '../../shared/loadMemory'
import { mergePeople } from '../../shared/hooks/usePeopleSearch'
import { localeOf, useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { LoadingActivity } from '../../shared/ui/LoadingActivity'
import { PillGroup } from '../../shared/ui/PillGroup'
import { PeriodPicker } from '../../shared/ui/PeriodPicker'
import { StepPicker } from '../../shared/ui/StepPicker'
import { daysOf } from '../../shared/period'
import type { Period } from '../../shared/period'
import { Avatar } from '../../shared/ui/Avatar'
import { SectionTitle } from '../../shared/ui/SectionTitle'
import { PersonLink } from '../../shared/ui/PersonLink'
import { PersonInput } from '../../shared/ui/PersonInput'
import { colorOf, scaleColor } from './colors'
import { ForceGraph } from './ForceGraph'
import { useReveal } from './reveal'
import { seatLinks, seatNodes } from './seat-view'
import { SeatsTour } from './SeatsTour'
import { DEFAULT_TRIM, MOST_OPTIONS, SHARE_OPTIONS, trimSeats } from './seat-trim'
import type { SeatTrim } from './seat-trim'
import { ReloadState } from '../../shared/ui/Refreshing'

/** «Todo»: los días más que acepta la API (diez años). */
const ALL_DAYS = 3650

/** Cómo se colorea: por grupo de gente que se sienta junta, o por lo solo que se sienta. */
const MODES = ['community', 'alone'] as const

type Mode = (typeof MODES)[number]

/** Las fases del aviso de carga: lo que de verdad hace la API (`seating.service.ts`). */
const LOADING_STEPS = [
  'seats.loading.read',
  'seats.loading.near',
  'seats.loading.groups',
  'seats.loading.place',
] as const

/**
 * Las cifras hacia las que cuenta el aviso la primera vez, antes de saber las
 * de verdad: las de un campus grande con todo el historial, a escala del periodo.
 */
function seatGuess(days: number): Record<string, number> {
  const share = Math.min(1, days / 1_000)

  return {
    hours: Math.round(900_000 * share),
    pairs: Math.round(40_000 * share),
    people: Math.round(300 + 1_700 * Math.sqrt(share)),
  }
}

/** Lo solo que se sienta, de verde (casi siempre con alguien) a rojo (casi siempre solo). */
const ALONE_SCALE = { min: 0, max: 100 }

/** Personas con las que más se sienta alguien que salen en su ficha. */
const PARTNERS_SHOWN = 8

/**
 * La red de asientos (`docs/asientos.md`): con quién se sienta cada cual en
 * los clústeres. Cada unión es la cercanía de dos personas: horas sentadas a
 * la vez por el peso de lo cerca que estaban los puestos.
 */
export function SeatsPage({ me, image = null }: { me?: string; image?: string | null }) {
  const { t, tn, lang } = useI18n()
  const { number } = useFormat()
  const [period, setPeriod] = useState<Period>('all')
  const [dates, setDates] = useState<SeatDates>({ from: '', to: '' })
  // A mano, hasta que haya fecha de inicio se sigue con el último mes.
  const custom = period === 'custom' && dates.from !== '' ? dates : undefined
  const days = period === 'custom' ? 30 : (daysOf(period) ?? ALL_DAYS)
  const key = custom === undefined ? String(days) : `${custom.from}..${custom.to}`
  const [mode, setMode] = useState<Mode>('community')
  // De fábrica, tu propia red: con quién te sientas tú (pedido por Alberto, 2026-10-30).
  const [selected, setSelected] = useState<string | null>(me ?? null)
  const loadId = `seats.${key}`
  const { data, error, loading } = useAsync<SeatGraph>(
    () =>
      timedLoad(
        loadId,
        () => api.getSeatGraph(days, custom),
        ({ totals }) => ({ hours: totals.hours, pairs: totals.pairs, people: totals.people }),
      ),
    [key],
    { keep: loadId },
  )
  const expected = useMemo(() => expectedTotals(loadId, seatGuess(days)), [loadId, days])

  // Recortado en la web, al momento (`seat-trim.ts`): de cada cual, solo la
  // gente con la que más se sienta; y, con alguien elegido, solo sus uniones.
  const [trim, setTrim] = useState<SeatTrim>(DEFAULT_TRIM)
  const [onlyChosen, setOnlyChosen] = useState(true)
  const shown = useMemo(
    () =>
      data === undefined
        ? undefined
        : trimSeats(
            data.people,
            data.links,
            trim,
            // Quien no tiene puestos en el periodo no recorta nada: se ve a todos.
            onlyChosen && data.people.some((person) => person.login === selected) ? selected : null,
          ),
    [data, trim, onlyChosen, selected],
  )
  // El tamaño de cada burbuja es su parte de la cercanía a la vista (`seat-view.ts`).
  const nodes = useMemo(() => (shown === undefined ? [] : seatNodes(shown)), [shown])
  const links = useMemo((): NetworkLink[] => (shown === undefined ? [] : seatLinks(shown)), [shown])
  // Al llegar, aparece desde ti hacia fuera, en vez de todo de golpe.
  const revealed = useReveal(nodes, links, selected ?? me ?? null)
  const paint = useCallback(
    (node: NetworkNode) =>
      mode === 'alone' ? scaleColor(node.endogamy, ALONE_SCALE) : colorOf(node, 'community'),
    [mode],
  )
  const byLogin = useMemo(() => new Map(data?.people.map((p) => [p.login, p]) ?? []), [data])
  // Para buscar a alguien: primero quien más horas pasa.
  const byHours = useMemo(() => [...(data?.people ?? [])].sort((x, y) => y.hours - x.hours), [data])
  const [query, setQuery] = useState(me ?? '')
  // Si un periodo no deja a nadie, se vuelve a la vista de partida: todo el
  // periodo y tu red (pedido por Alberto, 2026-11-01). Si esa también sale
  // vacía, se queda así.
  const [wasEmpty, setWasEmpty] = useState(false)

  if (data?.people.length === 0 && period !== 'all') {
    setPeriod('all')
    setSelected(me ?? null)
    setQuery(me ?? '')
    setWasEmpty(true)
  }
  // Quien no sale en el grafo (quien mira como piscinero desde el panel, o no
  // se ha sentado en el periodo) no queda elegido: se ve el campus entero.
  if (
    data !== undefined &&
    data.people.length > 0 &&
    selected !== null &&
    selected === me &&
    !byLogin.has(selected)
  ) {
    setSelected(null)
    setQuery('')
  }
  // Quien sale en el grafo: por su login aquí mismo y por su nombre en el
  // buscador de personas (solo los que están en el grafo).
  const searchSeated = useCallback(
    async (q: string): Promise<FoundPerson[]> => {
      const wanted = q.trim().toLowerCase()
      const named = await api.searchPeople(q).catch((): FoundPerson[] => [])

      return mergePeople(
        named.filter((person) => byLogin.has(person.login)),
        byHours
          .filter((person) => person.login.includes(wanted))
          .map((person) => ({ login: person.login, name: null, image: person.image })),
      )
    },
    [byLogin, byHours],
  )
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
      shake: t('net.shake'),
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
  // Primera capa (2026-10-29): con quién te sueles sentar y cuánto, sin nadie cerca.
  const answer = useMemo(() => {
    const person = me === undefined ? undefined : byLogin.get(me)

    if (person === undefined || data === undefined) return null

    const names = data.links
      .filter((link) => link.source === person.login || link.target === person.login)
      .sort((x, y) => y.closeness - x.closeness)
      .slice(0, 3)
      .map((link) => (link.source === person.login ? link.target : link.source))

    return names.length === 0 ? null : { names, alone: Math.round(person.alone * 100) }
  }, [me, byLogin, data])
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
            <SectionTitle title={t('seats.title')}>
              <SeatsTour />
            </SectionTitle>
            {answer !== null && (
              <p className="progress-answer neutral net-answer">
                <span className="eyebrow">{t('stats.progress.answer.label')}</span>
                <strong>
                  {t('seats.answer', {
                    names: new Intl.ListFormat(localeOf(lang), { type: 'conjunction' }).format(
                      answer.names,
                    ),
                    alone: answer.alone,
                  })}
                </strong>
              </p>
            )}
            <p className="hint">{t('seats.intro')}</p>
          </div>
          <div className="net-filters">
            {/* `seats-period` y `seats-modes`: para la demostración (`spots` de `SeatsTour`). */}
            <div className="net-filter seats-period">
              {/* El selector de periodo de toda la web (`shared/ui/StepPicker`). */}
              <PeriodPicker
                value={period}
                onChange={(next) => {
                  setPeriod(next)
                  setWasEmpty(false)
                }}
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
                className="seats-modes"
                options={MODES}
                value={mode}
                onChange={setMode}
                label={t('seats.colour')}
                text={(option) => t(`seats.mode.${option}`)}
              />
            </div>
            {data !== undefined && (
              <div className="net-filter">
                <span className="eyebrow">{t('common.person')}</span>
                {/* El buscador de toda la web (`PersonInput`): por nombre o login, con foto. */}
                <div className="seats-person">
                  <PersonInput
                    value={query}
                    label={t('common.person')}
                    placeholder={t('net.person.placeholder')}
                    search={searchSeated}
                    onChange={(typed) => {
                      setQuery(typed)
                      // Escribir el login entero también vale; al vaciarlo, nadie elegido.
                      const login = typed.trim().toLowerCase()

                      if (byLogin.has(login) || login === '')
                        setSelected(login === '' ? null : login)
                    }}
                    onPick={(login) => {
                      setQuery(login)
                      setSelected(login)
                    }}
                  />
                </div>
                {me !== undefined && selected !== me && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => {
                      setQuery(me)
                      setSelected(me)
                    }}
                  >
                    {t('seats.me')}
                  </button>
                )}
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
          <ErrorNote error={error} retry />
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

        {wasEmpty && (
          <p className="hint" role="status">
            {t('net.resetEmpty')}
          </p>
        )}

        {data === undefined && error === null && (
          <div className="net-stage">
            <LoadingActivity
              steps={LOADING_STEPS}
              stats={[
                { key: 'seats.loading.hours', target: expected.totals.hours ?? 0 },
                { key: 'seats.loading.pairs', target: expected.totals.pairs ?? 0 },
                { key: 'seats.loading.people', target: expected.totals.people ?? 0 },
              ]}
              {...(me === undefined ? {} : { who: { login: me, image } })}
              {...(expected.ms === undefined ? {} : { expectedMs: expected.ms })}
            />
          </div>
        )}

        {data !== undefined && <ReloadState loading={loading} error={error} />}
        {data !== undefined && (
          <div className="net-stage">
            {nodes.length === 0 ? (
              <p className="estado">{t('seats.empty')}</p>
            ) : (
              <ForceGraph
                nodes={revealed.nodes}
                links={revealed.links}
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
    </section>
  )
}
