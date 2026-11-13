import { useMemo, useState } from 'react'

import { goalKey, LIMITS, wire } from '@sanatorio/netsim'
import type { Evaluation, Field, Node, Scheme, Values } from '@sanatorio/netsim'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { Diagram } from './Diagram'
import { TripLog, useTrip } from './Trip'

type BoardProps = {
  scheme: Scheme
  fields: readonly Field[]
  values: Values
  onChange: (id: string, value: string) => void
  disabled: boolean
  /** La última comprobación (lo que se anima y lo que se marca), y cuántas van. */
  checked: Evaluation | null
  checks: number
}

/**
 * La prueba de un esquema: la red dibujada con lo que hay puesto ahora, los
 * objetivos, el viaje del paquete de la última comprobación (se para donde
 * muere y dice por qué) y, debajo, las fichas donde se rellena lo que falta.
 */
export function SchemeBoard({
  scheme,
  fields,
  values,
  onChange,
  disabled,
  checked,
  checks,
}: BoardProps) {
  const { t } = useI18n()
  const ids = useMemo(() => new Set(fields.map((field) => field.id)), [fields])
  const network = useMemo(() => wire(scheme, values), [scheme, values])
  // Qué objetivo se mira: al comprobar, el primero que falla; después, el que se elija.
  const [picked, setPicked] = useState({ checks: 0, goal: 0, replay: 0 })
  const failing =
    checked === null
      ? 0
      : Math.max(
          0,
          checked.traces.findIndex((trace) => !trace.ok),
        )
  const goal = picked.checks === checks ? picked.goal : failing
  const trace = checked?.traces[goal] ?? null
  const trip = useTrip(
    trace,
    checks * 1000 + goal * 10 + (picked.checks === checks ? picked.replay : 0),
  )

  return (
    <div className="net-scheme">
      <Diagram network={network} fields={ids} label={t('net.diagram')} play={trip.play} />
      <div className="net-scheme-grid">
        <section aria-labelledby="net-goals-title">
          <h4 id="net-goals-title" className="shell-objectives-title">
            {t('net.goals')}
          </h4>
          <ul className="shell-objectives net-goals" aria-label={t('net.goals')}>
            {scheme.goals.map((each, index) => {
              const ok = checked !== null && !checked.misses.includes(goalKey(each))

              return (
                <li key={goalKey(each)} className={ok ? 'ok' : ''}>
                  <span aria-hidden="true">{ok ? '✓' : checked === null ? '○' : '✕'}</span>{' '}
                  {t('net.goal', { from: each.from, to: each.to })}
                  <span className="sr-only">{ok ? t('shell.obj.done') : t('shell.obj.todo')}</span>
                  {checked !== null && (
                    <button
                      type="button"
                      className="ghost net-goal-show"
                      aria-pressed={goal === index}
                      aria-label={t('net.goal.show', { from: each.from, to: each.to })}
                      onClick={() => {
                        setPicked({ checks, goal: index, replay: picked.replay + 1 })
                      }}
                    >
                      <Icon name="visto" size={14} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {trace === null ? (
            <p className="muted net-trip-empty">{t('net.trip.empty')}</p>
          ) : (
            <TripLog trace={trace} notes={trip.notes} />
          )}
        </section>
        <section className="net-cards" aria-label={t('net.config')}>
          {network.nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              fields={ids}
              values={values}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </section>
      </div>
    </div>
  )
}

type CardProps = {
  node: Node
  fields: ReadonlySet<string>
  values: Values
  onChange: (id: string, value: string) => void
  disabled: boolean
}

/**
 * La ficha de un nodo: sus interfaces y sus rutas, con un campo en lo que hay
 * que rellenar y un candado en lo demás. Solo salen las de los nodos con algo
 * que rellenar o con rutas que leer (lo de una máquina ya se ve en el dibujo).
 */
function NodeCard({ node, fields, values, onChange, disabled }: CardProps) {
  const { t } = useI18n()
  const mine = [...fields].some((id) => id.startsWith(`${node.id}.`))
  const host = node.kind === 'host'

  if (node.kind === 'switch' || (!mine && (host || node.routes.length === 0))) return null

  const slot = (id: string, locked: string, name: string) =>
    fields.has(id) ? (
      <input
        className="net-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={LIMITS.value}
        aria-label={name}
        value={values[id] ?? ''}
        disabled={disabled}
        onChange={(event) => {
          onChange(id, event.target.value)
        }}
      />
    ) : (
      <span className="net-locked">
        {locked}
        <Icon name="candado" size={12} />
        <span className="sr-only">{t('net.locked')}</span>
      </span>
    )
  const named = (field: string, iface: string) =>
    host
      ? t('net.input.host', { field: t(`net.field.${field}`), node: node.id })
      : t('net.input.iface', { field: t(`net.field.${field}`), node: node.id, iface })

  return (
    <fieldset className={`net-card ${node.kind}`}>
      <legend>
        {node.id} <small>{t(`net.kind.${node.kind}`)}</small>
      </legend>
      <dl>
        {node.ifaces.map((iface) => (
          <div key={iface.id} className="net-card-row">
            <dt>{host ? t('net.field.ip') : iface.id}</dt>
            <dd>
              {slot(`${node.id}.${iface.id}.ip`, iface.ip, named('ip', iface.id))}
              {slot(`${node.id}.${iface.id}.mask`, iface.mask, named('mask', iface.id))}
            </dd>
          </div>
        ))}
        {node.routes.map((route, index) => {
          const at = `${node.id}.route${index}`
          const of = (field: string) =>
            t('net.input.route', { field: t(`net.field.${field}`), node: node.id, n: index + 1 })

          return (
            <div key={at} className="net-card-row route">
              <dt>{host ? t('net.field.gateway') : t('net.route', { n: index + 1 })}</dt>
              <dd>
                {!host && slot(`${at}.dest`, route.dest, of('dest'))}
                {!host && <span aria-hidden="true">→</span>}
                {slot(
                  `${at}.via`,
                  route.via,
                  host
                    ? t('net.input.host', { field: t('net.field.gateway'), node: node.id })
                    : of('via'),
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </fieldset>
  )
}
