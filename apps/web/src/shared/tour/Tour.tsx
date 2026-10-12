import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { Icon } from '../ui/Icon'

/**
 * Lo que toda demostración tiene en cada instante, haga lo que haga: en qué
 * escena está, dónde va el ratón y qué frase acompaña a la acción.
 */
export type Base = {
  scene: number
  /** Fundido a negro entre escenas. */
  dark: boolean
  /** Hacia dónde va el ratón: un `data-tour` de la escena. */
  cursor: string
  press: boolean
  /** Arrastrando algo: el ratón y lo arrastrado se mueven a la vez. */
  drag: boolean
  /** Número de la frase: la clave es `tour.<name>.<n>`. */
  caption: number
  done: boolean
}

export type Shot<S> = S & Base

/** Un momento del guion: a los `at` milisegundos, cambia esto. */
export type Cue<S> = readonly [at: number, change: Partial<Shot<S>>]

const BASE: Base = {
  scene: 0,
  dark: false,
  cursor: 'rest',
  press: false,
  drag: false,
  caption: 1,
  done: false,
}

/**
 * Cuánto se estira el guion. Los tiempos de cada demostración se escriben a
 * ritmo de quien ya sabe usar la web; quien la ve por primera vez necesita la
 * mitad más para leer la frase y seguir al ratón. Las transiciones de CSS se
 * estiran igual (`--pace` en `tour.css`).
 */
const PACE = 1.5

/** Ir hasta algo y pulsarlo: el ratón llega, aprieta, pasa lo que sea y suelta. */
export function click<S>(at: number, cursor: string, change: Partial<Shot<S>> = {}): Cue<S>[] {
  const go: Partial<Base> = { cursor }
  const down: Partial<Base> = { press: true }
  const up: Partial<Base> = { press: false }

  return [
    [at, go as Partial<Shot<S>>],
    [at + 620, down as Partial<Shot<S>>],
    [at + 700, change],
    [at + 830, up as Partial<Shot<S>>],
  ]
}

/** Cambio de escena con un fundido a negro breve. */
export function cut<S>(at: number, change: Partial<Shot<S>>): Cue<S>[] {
  const dark: Partial<Base> = { dark: true }
  const light: Partial<Base> = { dark: false }

  return [
    [at, dark as Partial<Shot<S>>],
    [at + 400, change],
    [at + 750, light as Partial<Shot<S>>],
  ]
}

/**
 * Escribir letra a letra: el campo `key` cuenta cuántas letras van, y la escena
 * enseña ese trozo del texto. Así el guion no depende del idioma.
 */
export function typing<S>(at: number, key: keyof S, letters: number, step = 60): Cue<S>[] {
  return Array.from({ length: letters }, (_, index): Cue<S> => {
    const change = { [key]: index + 1 } as Partial<Shot<S>>

    return [at + index * step, change]
  })
}

type TourProps<S> = {
  /** Nombre de la demostración: sus frases son `tour.<name>.1`, `.2`… */
  name: string
  /** Cómo empieza lo propio de esta demostración. */
  start: S
  script: readonly Cue<S>[]
  /** Las frases que cuentan los pasos, en orden, para quien no quiere animación. */
  steps: readonly number[]
  /** Pestaña que se ve abierta en la cabecera de mentira. */
  tab: (shot: Shot<S>) => string
  /** Avisos sin leer en la campana; `0` si no pinta nada. */
  bell?: (shot: Shot<S>) => number
  /** La escena, pintada a partir de cómo está todo en ese instante. */
  children: (shot: Shot<S>) => ReactNode
}

/**
 * Una demostración animada: cómo se usa una parte de la web, enseñado en vez
 * de contado. Un ratón de mentira recorre un decorado en miniatura siguiendo un
 * guion, con una frase muy corta por acción y un fundido entre escenas.
 *
 * Es un decorado: nada de lo que se ve es un control de verdad ni llama a la
 * API. Quien prefiere menos movimiento ve los mismos pasos como lista.
 */
export function Tour<S extends object>({
  name,
  start,
  script,
  steps,
  tab,
  bell,
  children,
}: TourProps<S>) {
  const { t } = useI18n()
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [take, setTake] = useState(0)
  const [shot, setShot] = useState<Shot<S>>({ ...start, ...BASE })
  const stage = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (still) return

    setShot({ ...start, ...BASE })

    const end = script.reduce((last, [at]) => Math.max(last, at), 0) + 1800
    const done: Partial<Base> = { done: true }
    const cues: Cue<S>[] = [...script, [end, done as Partial<Shot<S>>]]
    const timers = cues.map(([at, change]) =>
      setTimeout(() => {
        setShot((current) => ({ ...current, ...change }))
      }, at * PACE),
    )

    return () => {
      timers.forEach(clearTimeout)
    }
    // El guion y el inicio son constantes de cada demostración.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, take])

  // El ratón va al centro de lo que toque. Se mide en cada cambio, después de
  // pintar, porque muchos destinos (un desplegable, un botón) acaban de aparecer.
  useLayoutEffect(() => {
    const target = stage.current?.querySelector(`[data-tour="${shot.cursor}"]`)

    if (stage.current === null || target === null || target === undefined) return

    const frame = stage.current.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    const next = {
      x: Math.round(box.left - frame.left + box.width / 2),
      y: Math.round(box.top - frame.top + box.height / 2),
    }

    setPoint((current) => (current.x === next.x && current.y === next.y ? current : next))
  }, [shot])

  if (still) {
    return (
      <ol className="tour-steps">
        {steps.map((step) => (
          <li key={step}>{t(`tour.${name}.${step}`)}</li>
        ))}
      </ol>
    )
  }

  const unread = bell?.(shot) ?? 0

  return (
    <div className="tour">
      <div ref={stage} className="tour-stage" aria-hidden="true">
        <div className="tour-bar">
          <span className="tour-dots" />
          <span className="tour-tab">{tab(shot)}</span>
          <span className={`tour-bell ${unread > 0 ? 'ringing' : ''}`} data-tour="bell">
            <Icon name="campana" size={15} />
            {unread > 0 && <i>{unread}</i>}
          </span>
        </div>
        <div className="tour-scene">{children(shot)}</div>
        <span className="tour-anchor" data-tour="rest" style={{ left: '80%', top: '82%' }} />
        <div className={`tour-fade ${shot.dark ? 'on' : ''}`} />
        <div
          className={`tour-cursor ${shot.drag ? 'drag' : ''} ${shot.press ? 'press' : ''}`}
          style={{ ['--x' as string]: `${point.x}px`, ['--y' as string]: `${point.y}px` }}
        >
          <span>
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path
                d="M5 3l14 8-6.2 1.6L9.6 19z"
                fill="#fff"
                stroke="#17211d"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>

      <p className="tour-caption" role="status">
        <span key={shot.caption}>{t(`tour.${name}.${shot.caption}`)}</span>
      </p>
      <div className="actions">
        <button
          type="button"
          className="pill"
          disabled={!shot.done}
          onClick={() => {
            setTake((current) => current + 1)
          }}
        >
          {t('tour.replay')}
        </button>
      </div>
    </div>
  )
}
