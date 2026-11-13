import { useMemo, useState } from 'react'

import { exampleOf, parseIp } from '@sanatorio/netsim'
import type { ExampleRun, Unit } from '@sanatorio/netsim'

import { useI18n } from '../../shared/i18n'
import { AddressBits } from './Bits'
import { Diagram } from './Diagram'
import { TripLog, useTrip } from './Trip'

const NONE: ReadonlySet<string> = new Set()

/** Lo que se saca de una dirección, en el orden en que se enseña. */
const PARTS = ['network', 'broadcast', 'first', 'last', 'hosts'] as const

/**
 * El ejemplo de una unidad: lo ejecuta el motor, no está escrito a mano. Antes
 * de verlo se pregunta qué va a pasar (la predicción); luego se lanza el
 * paquete (o se destapa la cuenta) y se ve.
 */
export function Example({ unit, text }: { unit: Unit; text: string | undefined }) {
  const example = useMemo(() => exampleOf(unit), [unit])

  if (example === null) return null

  return (
    <section className="net-example">
      <p className="net-predict">{text}</p>
      {example.kind === 'calc' ? <Sum example={example} /> : <Ping example={example} />}
    </section>
  )
}

/** Una cuenta resuelta: los bits para tocar y, al destaparla, lo que da el motor. */
function Sum({ example }: { example: Extract<ExampleRun, { kind: 'calc' }> }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)

  return (
    <>
      <h4 className="net-calc-given">
        {example.ip} /{example.subnet.prefix} <small>= {example.subnet.mask}</small>
      </h4>
      <AddressBits ip={parseIp(example.ip) ?? 0} prefix={example.subnet.prefix} />
      {shown ? (
        <dl className="net-sum" aria-live="polite">
          {PARTS.map((part) => (
            <div key={part}>
              <dt>{t(`net.ask.${part}`)}</dt>
              <dd>{example.subnet[part]}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <button
          type="button"
          onClick={() => {
            setShown(true)
          }}
        >
          {t('net.example.reveal')}
        </button>
      )}
    </>
  )
}

/**
 * Un ping de ejemplo. Si la unidad trae su error típico, primero se ve la red
 * con el fallo (lo cambiado, resaltado) y dónde muere el paquete; después, la
 * misma red arreglada.
 */
function Ping({ example }: { example: Extract<ExampleRun, { kind: 'net' }> }) {
  const { t } = useI18n()
  const [view, setView] = useState({ fixed: example.broken === null, sent: 0 })
  const broken = view.fixed ? null : example.broken
  const trace = broken?.trace ?? example.trace
  const trip = useTrip(view.sent === 0 ? null : trace, view.sent)
  const changed = useMemo(() => new Set(example.broken?.changed ?? []), [example])

  return (
    <>
      <p className="net-example-state">
        <strong>{t(broken === null ? 'net.example.fixed' : 'net.example.broken')}</strong> ·{' '}
        {t('net.goal', { from: trace.from, to: trace.to })}
      </p>
      <Diagram
        network={broken?.network ?? example.network}
        fields={example.broken === null ? NONE : changed}
        label={t('net.diagram')}
        play={trip.play}
      />
      {view.sent > 0 && <TripLog trace={trace} notes={trip.notes} />}
      <div className="git-actions">
        <button
          type="button"
          className={view.sent === 0 ? 'primary' : 'ghost'}
          onClick={() => {
            setView({ ...view, sent: view.sent + 1 })
          }}
        >
          {view.sent === 0 ? t('net.example.send') : `↺ ${t('shell.example.replay')}`}
        </button>
        {broken !== null && view.sent > 0 && trip.over && (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setView({ fixed: true, sent: view.sent + 1 })
            }}
          >
            {t('net.example.fix')}
          </button>
        )}
      </div>
    </>
  )
}
