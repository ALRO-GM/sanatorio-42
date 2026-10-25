import { useState } from 'react'

import type { UsageFlows } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { useFormat } from '../../shared/i18n/useFormat'
import { DataTable } from '../../shared/ui/DataTable'
import { durationText } from '../../shared/time'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { SegmentSlider } from '../../shared/ui/SegmentSlider'
import type { SegmentRange } from '../../shared/ui/SegmentSlider'
import { RangePills } from './RangePills'
import { Figure } from './Figure'

const DAY_MS = 24 * 60 * 60_000
const dayOf = (at: number): string => new Date(at).toISOString().slice(0, 10)

/** De dónde se viene cuando la sección es lo primero que se abre. */
const START = 'start'
const WIDTH = 640
const HEIGHT = 470
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 - 8 }
const RING = 172
/** Flechas que se pintan, como mucho: las más repetidas. */
const MAX_EDGES = 40

type Section = UsageFlows['sections'][number]
type Node = { key: string; x: number; y: number; r: number; section: Section | null }

/** Parte de un total, como tanto por ciento redondeado. */
const pct = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((100 * part) / total)

/**
 * Cómo se navega por la web: de qué sección se pasa a cuál, por dónde se entra,
 * dónde se pasa el rato, por cuáles solo se pasa y en cuáles se acaba.
 *
 * El grafo pone la entrada en el centro y las secciones alrededor. El tamaño de
 * cada una es el tiempo que se la mira; el grosor de cada flecha, las veces que
 * se da ese paso. Las cuentas vienen hechas de la API.
 */
export function FlowsPanel({
  segment,
  onSegment,
}: {
  segment: SegmentRange
  onSegment: (next: SegmentRange) => void
}) {
  const { t } = useI18n()
  const [days, setDays] = useState<number>(7)
  const [picked, setPicked] = useState<string | null>(null)
  const { data, error, loading, reload } = useAsync(
    () =>
      api.getFlows({
        from: dayOf(Date.now() - (days - 1) * DAY_MS),
        to: dayOf(Date.now()),
        low: segment.low,
        high: segment.high,
      }),
    [days, segment.low, segment.high],
  )
  const name = (key: string): string => (key === START ? t('admin.flows.start') : t(`nav.${key}`))

  return (
    <>
      <RangePills value={days} onChange={setDays} />

      <SegmentSlider value={segment} onChange={onSegment} told={data?.segment} />

      {loading && <p className="estado">{t('app.loading')}</p>}
      {data === undefined ? (
        <ErrorNote error={error} onRetry={() => void reload()} />
      ) : data.flows.length === 0 ? (
        <p className="estado">{t('admin.flows.empty')}</p>
      ) : (
        <Flows data={data} name={name} picked={picked} onPick={setPicked} />
      )}
    </>
  )
}

function Flows({
  data,
  name,
  picked,
  onPick,
}: {
  data: UsageFlows
  name: (key: string) => string
  picked: string | null
  onPick: (key: string | null) => void
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const { sections, flows, sessions } = data
  const most = <T,>(items: readonly T[], value: (item: T) => number): T | undefined =>
    items.reduce<T | undefined>(
      (best, item) => (best === undefined || value(item) > value(best) ? item : best),
      undefined,
    )
  const longest = most(sections, (section) => section.seen)
  const entry = most(sections, (section) => section.entries)
  const exit = most(sections, (section) => section.exits)
  const steps = flows.reduce((sum, flow) => sum + flow.count, 0)
  const topVisits = Math.max(1, ...sections.map((section) => section.visits))
  const topFlow = Math.max(1, ...flows.map((flow) => flow.count))
  /** Lo que sale de cada sección, para decir qué parte se lleva cada paso. */
  const leaving = (key: string): number =>
    key === START ? sessions : (sections.find((section) => section.key === key)?.onward ?? 0)
  const shown = picked === null ? flows : flows.filter((f) => f.from === picked || f.to === picked)

  return (
    <>
      <div className="stat-cards">
        <Figure label={t('admin.flows.sessions')} value={number(sessions)} strong />
        <Figure
          label={t('admin.flows.depth')}
          value={sessions === 0 ? 0 : Math.round((10 * steps) / sessions) / 10}
        />
        {longest !== undefined && (
          <Figure
            label={t('admin.flows.longest')}
            value={`${name(longest.key)} · ${durationText(longest.seen)}`}
          />
        )}
        {entry !== undefined && (
          <Figure
            label={t('admin.flows.entry')}
            value={`${name(entry.key)} · ${pct(entry.entries, sessions)} %`}
          />
        )}
        {exit !== undefined && (
          <Figure
            label={t('admin.flows.exit')}
            value={`${name(exit.key)} · ${pct(
              exit.exits,
              sections.reduce((sum, section) => sum + section.exits, 0),
            )} %`}
          />
        )}
      </div>

      <article className="card">
        <span className="eyebrow">{t('admin.flows.graph')}</span>
        <FlowGraph data={data} name={name} picked={picked} onPick={onPick} />
        <ul className="map-legend">
          {(['stay', 'pass', 'end'] as const).map((role) => (
            <li key={role}>
              <span className={`flow-key ${role}`} /> {t(`admin.flows.role.${role}`)}
            </li>
          ))}
        </ul>
        <p className="hint">{t('admin.flows.hint')}</p>
      </article>

      <article className="card">
        <span className="eyebrow">{t('admin.flows.sections')}</span>
        <DataTable
          id="flows-sections"
          rows={sections}
          rowKey={(section) => section.key}
          rowClass={(section) => (section.key === picked ? 'picked' : '')}
          columns={[
            {
              id: 'section',
              label: t('admin.flows.section'),
              sort: (section) => name(section.key),
              first: 'asc',
              cell: (section) => (
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    onPick(section.key === picked ? null : section.key)
                  }}
                >
                  {name(section.key)}
                </button>
              ),
            },
            {
              id: 'visits',
              label: t('admin.flows.visits'),
              sort: (section) => section.visits,
              cell: (section) => (
                <>
                  <Bar part={section.visits / topVisits} />
                  {number(section.visits)}
                </>
              ),
            },
            {
              id: 'entries',
              label: t('admin.flows.entries'),
              sort: (section) => section.entries,
              cell: (section) => `${section.entries} · ${pct(section.entries, sessions)} %`,
            },
            {
              id: 'exits',
              label: t('admin.flows.exits'),
              sort: (section) => section.exitRate,
              cell: (section) => `${section.exits} · ${Math.round(section.exitRate * 100)} %`,
            },
            {
              id: 'seen',
              label: t('admin.flows.time'),
              sort: (section) => section.seen,
              cell: (section) => (section.seen > 0 ? durationText(section.seen) : '—'),
            },
            {
              id: 'avgSeen',
              label: t('admin.flows.perVisit'),
              sort: (section) => section.avgSeen,
              cell: (section) => (section.avgSeen > 0 ? durationText(section.avgSeen) : '—'),
            },
            {
              id: 'role',
              label: t('admin.flows.role'),
              sort: (section) => section.role,
              first: 'asc',
              cell: (section) =>
                section.role === null ? '—' : t(`admin.flows.role.${section.role}`),
            },
          ]}
        />
      </article>

      <article className="card">
        <span className="eyebrow">
          {picked === null
            ? t('admin.flows.steps')
            : t('admin.flows.stepsOf', { name: name(picked) })}
        </span>
        <DataTable
          id="flows-steps"
          rows={shown}
          limit={25}
          rowKey={(flow) => `${flow.from}>${flow.to}`}
          columns={[
            {
              id: 'step',
              label: t('admin.flows.step'),
              sort: (flow) => `${name(flow.from)} ${name(flow.to)}`,
              first: 'asc',
              cell: (flow) => `${name(flow.from)} → ${name(flow.to)}`,
            },
            {
              id: 'count',
              label: t('admin.flows.times'),
              sort: (flow) => flow.count,
              cell: (flow) => (
                <>
                  <Bar part={flow.count / topFlow} />
                  {number(flow.count)}
                </>
              ),
            },
            {
              id: 'share',
              label: t('admin.flows.share'),
              sort: (flow) => flow.count / Math.max(1, leaving(flow.from)),
              cell: (flow) => `${pct(flow.count, leaving(flow.from))} %`,
            },
            {
              id: 'people',
              label: t('common.people'),
              sort: (flow) => flow.people,
              cell: (flow) => flow.people,
            },
          ]}
        />
        <p className="hint">{t('admin.flows.shareHint')}</p>
      </article>
    </>
  )
}

/** Una barra con su cifra al lado: la barra compara, la cifra dice cuánto. */
function Bar({ part }: { part: number }) {
  return (
    <span className="cell-bar" aria-hidden="true">
      <i style={{ width: `${Math.max(2, Math.round(part * 100))}%` }} />
    </span>
  )
}

/** El grafo: la entrada en el centro, las secciones en corro y una flecha por paso. */
function FlowGraph({
  data,
  name,
  picked,
  onPick,
}: {
  data: UsageFlows
  name: (key: string) => string
  picked: string | null
  onPick: (key: string | null) => void
}) {
  const { t } = useI18n()
  const { sections, flows } = data
  const topSeen = Math.max(1, ...sections.map((section) => section.seen))
  const nodes = new Map<string, Node>([
    [START, { key: START, ...CENTER, r: 16, section: null }],
    ...sections.map((section, index): [string, Node] => {
      // Empieza arriba y gira como un reloj, de la más visitada a la menos.
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / sections.length

      return [
        section.key,
        {
          key: section.key,
          x: CENTER.x + RING * Math.cos(angle),
          y: CENTER.y + RING * Math.sin(angle),
          r: 11 + 21 * Math.sqrt(section.seen / topSeen),
          section,
        },
      ]
    }),
  ])
  const edges = flows.slice(0, MAX_EDGES)
  const top = Math.max(1, ...edges.map((flow) => flow.count))

  return (
    <div className="flow-graph">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={t('admin.flows.graph')}>
        <defs>
          <marker
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" />
          </marker>
        </defs>
        {edges.map((flow) => {
          const from = nodes.get(flow.from)
          const to = nodes.get(flow.to)

          if (from === undefined || to === undefined) return null

          const [dx, dy] = [to.x - from.x, to.y - from.y]
          const length = Math.hypot(dx, dy) || 1
          const [ux, uy] = [dx / length, dy / length]
          // La curva se abomba hacia un lado: la ida y la vuelta no se pisan.
          const bend = length * 0.16
          const [cx, cy] = [(from.x + to.x) / 2 - uy * bend, (from.y + to.y) / 2 + ux * bend]
          const [x1, y1] = [from.x + ux * from.r, from.y + uy * from.r]
          const [x2, y2] = [to.x - ux * (to.r + 5), to.y - uy * (to.r + 5)]
          const weight = flow.count / top
          const dim = picked !== null && flow.from !== picked && flow.to !== picked

          return (
            <path
              key={`${flow.from}>${flow.to}`}
              className={`flow-edge ${flow.from === START ? 'entry' : ''}`}
              d={`M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`}
              strokeWidth={1 + 7 * weight}
              opacity={dim ? 0.05 : 0.25 + 0.6 * weight}
              markerEnd="url(#flow-arrow)"
            >
              <title>
                {name(flow.from)} → {name(flow.to)}: {flow.count}
              </title>
            </path>
          )
        })}
        {[...nodes.values()].map((node) => (
          <g
            key={node.key}
            className={`flow-node ${node.section?.role ?? ''} ${node.key === START ? 'start' : ''} ${node.key === picked ? 'picked' : ''}`}
            transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`}
            role="button"
            tabIndex={0}
            aria-pressed={node.key === picked}
            onClick={() => {
              onPick(node.key === picked ? null : node.key)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPick(node.key === picked ? null : node.key)
              }
            }}
          >
            <circle r={node.r} />
            <text y={node.r + 14} textAnchor="middle">
              {name(node.key)}
            </text>
            {node.section !== null && (
              <text className="flow-figure" y={node.r + 27} textAnchor="middle">
                {node.section.visits} · {durationText(node.section.seen)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
