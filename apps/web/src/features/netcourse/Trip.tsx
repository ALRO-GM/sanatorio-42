import { useEffect, useMemo, useState } from 'react'

import type { Death, Trace } from '@sanatorio/netsim'

import { useI18n } from '../../shared/i18n'
import type { Playback } from './Diagram'
import { framesOf } from './frames'
import type { Leg, Note } from './frames'

/** Lo que tarda el paquete en ir de un nodo al siguiente. */
const STEP_MS = 520

/** Quien pide menos movimiento ve el final del viaje de golpe, con la misma explicación. */
const still = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * El viaje de un paquete, fotograma a fotograma: por dónde va, qué cables ha
 * recorrido y lo que hay que contar hasta ahí. `run` cambia cada vez que se
 * vuelve a lanzar (aunque la traza sea la misma).
 */
export function useTrip(
  trace: Trace | null,
  run: number,
): { play: Playback | null; notes: Note[]; over: boolean } {
  const frames = useMemo(() => (trace === null ? [] : framesOf(trace)), [trace])
  const last = frames.length - 1
  const [state, setState] = useState({ run: -1, step: 0 })
  // Un viaje nuevo empieza por el principio antes de pintar nada del anterior.
  const step = state.run === run ? Math.min(state.step, Math.max(last, 0)) : still() ? last : 0

  useEffect(() => {
    if (step >= last) return

    const timer = setTimeout(() => {
      setState({ run, step: step + 1 })
    }, STEP_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [run, step, last])

  const frame = frames[step]

  if (frame === undefined) return { play: null, notes: [], over: true }

  const seen = frames.slice(0, step + 1)
  const notes = seen.flatMap((each) => each.notes)
  const death = notes.find((note) => note.kind === 'death')

  return {
    play: {
      frame,
      trail: new Map(seen.flatMap((each) => (each.wire === null ? [] : [[each.wire, each.leg]]))),
      dead: death?.kind === 'death' ? death.death.at : null,
    },
    notes,
    over: step >= last,
  }
}

/** Por qué muere un paquete, en palabras: el código del motor con sus datos. */
function DeathText({ death, leg }: { death: Death; leg: Leg }) {
  const { t } = useI18n()

  return (
    <>
      <strong>{t(`net.leg.${leg}`)}:</strong>{' '}
      {t(`net.death.${death.code}`, {
        node: death.at,
        ip: death.ip ?? '',
        via: death.via ?? '',
        iface: death.iface ?? '',
        other: death.other ?? '',
        kind: death.kind === undefined ? '' : t(`net.reserved.${death.kind}`),
      })}
    </>
  )
}

/** El viaje contado: cada salto con su porqué y, al final, dónde muere o que hay conexión. */
export function TripLog({ trace, notes }: { trace: Trace; notes: readonly Note[] }) {
  const { t } = useI18n()

  return (
    <ol className="net-trip" aria-live="polite">
      {notes.map((note, index) => {
        if (note.kind === 'death')
          return (
            <li key={index} className="net-trip-dead" role="status">
              <DeathText death={note.death} leg={note.leg} />
            </li>
          )
        if (note.kind === 'hop')
          return (
            <li key={index} className={`net-trip-hop ${note.leg}`}>
              <strong>{t(`net.leg.${note.leg}`)}:</strong>{' '}
              {t(`net.hop.${note.hop.rule}`, {
                from: note.hop.from,
                to: note.hop.to,
                dest: note.hop.route?.dest ?? '',
                via: note.hop.route?.via ?? '',
              })}
            </li>
          )

        return (
          <li key={index} className={`net-trip-${note.kind}`}>
            {note.kind === 'arrived'
              ? t('net.arrived', { to: trace.to, ip: trace.source ?? '' })
              : t('net.ok', { from: trace.from })}
          </li>
        )
      })}
    </ol>
  )
}
