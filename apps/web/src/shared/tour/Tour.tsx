import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { TourName } from '@sanatorio/contracts'

import { api } from '../api'
import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import { Icon } from '../ui/Icon'
import { DemoSpot } from '../ui/InfoTip'
import { RATES, useTourSpeed } from './speed'

/**
 * Lo que toda demostración tiene en cada instante, haga lo que haga: en qué
 * escena está, dónde va el ratón y qué frase acompaña a la acción.
 */
type Base = {
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
 * mitad más para leer la frase y seguir al ratón. Sobre eso va la velocidad de
 * cada demostración (`speed.ts`). Las transiciones de CSS se estiran igual
 * (`--pace`, que pone el decorado).
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

/** Una demostración: su nombre, cómo empieza y su guion. Se hace con `defineTour`. */
export type TourDef<S> = {
  /** Nombre de la demostración: sus frases son `tour.<name>.1`, `.2`… (tabla `demos`). */
  name: TourName
  /** Cómo empieza lo propio de esta demostración. */
  start: S
  script: readonly Cue<S>[]
  /** Las frases que cuentan los pasos, en orden, para quien no quiere animación. */
  steps: readonly number[]
  /**
   * De qué parte de la web de verdad habla cada paso (paso → selector CSS): si
   * se suelta el interrogante encima, la demostración empieza en ese paso.
   */
  spots: Readonly<Partial<Record<number, string>>>
}

/**
 * Define una demostración. Las frases (`caption`) son los pasos que se leen
 * sin animación: salen solas del guion, en orden. Cada paso tiene además su
 * título (`tour.<name>.title.<n>`), y con `spots`, el sitio de la web del que
 * habla (pedido por Alberto, 2026-10-30).
 *
 * Cada fichero de demostración exporta lo que devuelve como `TOUR`: así los
 * tests la encuentran sin apuntarla en ningún sitio (`tests/tours.test.ts`).
 */
export function defineTour<S extends object>(
  name: TourName,
  start: S,
  script: readonly Cue<S>[],
  spots: Readonly<Partial<Record<number, string>>> = {},
): TourDef<S> {
  const captions = script.flatMap(([, change]) =>
    change.caption === undefined ? [] : [change.caption],
  )

  return {
    name,
    start,
    script,
    steps: [...new Set([1, ...captions])].sort((a, b) => a - b),
    spots,
  }
}

/** Lo que dura el guion entero, con el último respiro antes de darlo por visto. */
function lengthOf<S>(script: readonly Cue<S>[]): number {
  return script.reduce((last, [at]) => Math.max(last, at), 0) + 1800
}

/** Cómo está todo a los `at` ms del guion: lo de antes, ya aplicado. */
function shotAt<S extends object>(start: S, script: readonly Cue<S>[], at: number): Shot<S> {
  const shot: Shot<S> = { ...start, ...BASE }

  for (const [when, change] of [...script].sort((a, b) => a[0] - b[0])) {
    if (when <= at) Object.assign(shot, change)
  }
  // Saltando, no se queda nada a medias: ni a oscuras ni con el botón apretado.
  return { ...shot, dark: false, press: false }
}

/**
 * Dónde empieza cada frase del guion, para saltar a ella desde la barra de
 * progreso: la primera vez que sale, un poco antes, para ver llegar al ratón.
 */
function chaptersOf<S>(tour: TourDef<S>): { step: number; at: number }[] {
  return tour.steps.map((step) => {
    const first = tour.script.find(([, change]) => change.caption === step)?.[0] ?? 0

    return { step, at: step === 1 ? 0 : Math.max(0, first - 700) }
  })
}

/**
 * El paso que habla del sitio donde se soltó el interrogante: el del sitio más
 * cercano, de dentro hacia fuera. `null` si ninguno habla de él.
 */
export function stepAt(spots: TourDef<object>['spots'], spot: Element | null): number | null {
  const entries = Object.entries(spots).flatMap(([step, selector]) =>
    selector === undefined ? [] : [[Number(step), selector] as const],
  )

  for (let node = spot; node !== null; node = node.parentElement) {
    const found = entries.find(([, selector]) => node.matches(selector))

    if (found !== undefined) return found[0]
  }

  return null
}

/** Cómo va la reproducción: desde qué punto del guion (ms) y si está en marcha. */
type Run = { take: number; from: number; playing: boolean }

type TourProps<S> = {
  /** La demostración, de `defineTour`. */
  tour: TourDef<S>
  /** Pestaña de arriba que se ve abierta en la cabecera de mentira. */
  tab: (shot: Shot<S>) => string
  /** Pestaña de la segunda fila, si la sección va dentro de una de arriba. */
  sub?: (shot: Shot<S>) => string
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
export function Tour<S extends object>({ tour, tab, sub, bell, children }: TourProps<S>) {
  const { name, start, script, steps } = tour
  const { t } = useI18n()
  const { number } = useFormat()
  const spot = useContext(DemoSpot)
  const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const length = lengthOf(script)
  const chapters = chaptersOf(tour)
  // Abierta desde el interrogante encima de algo: desde el paso que habla de eso.
  const [first] = useState(() => stepAt(tour.spots, spot))
  // Justo cuando sale su frase: con el margen de la barra se vería aún la anterior.
  const [run, setRun] = useState<Run>(() => ({
    take: 0,
    from: first === null ? 0 : (script.find(([, change]) => change.caption === first)?.[0] ?? 0),
    playing: true,
  }))
  const [shot, setShot] = useState<Shot<S>>({ ...start, ...BASE })
  const stage = useRef<HTMLDivElement>(null)
  const [point, setPoint] = useState({ x: 0, y: 0 })
  // Cada pulsación deja una onda donde está el ratón: la clave la vuelve a lanzar.
  const [ripples, setRipples] = useState(0)
  // Cuándo empezó a contar el guion (ms del reloj), para saber por dónde va al pausar.
  const startedAt = useRef(0)
  const { base, rate, choose } = useTourSpeed(name)
  // Cuánto se estira el guion ahora: el ritmo de lectura, entre la velocidad de
  // fábrica de esta demostración y lo que la haya movido quien mira.
  const pace = PACE / (base * rate)
  // Lo último que se le ha dicho a la API de cómo la ve esta persona.
  const told = useRef<number | null>(null)

  // Vista entera, se cuenta a cuánto se ha visto: con lo de todo el mundo la
  // API ajusta la velocidad de fábrica. Una vez por velocidad, no por repetición.
  useEffect(() => {
    if (!shot.done || told.current === rate) return

    told.current = rate
    api.sendTourSpeed(name, rate).catch(() => {
      // Es para afinar el ritmo: si no llega, no pasa nada.
    })
  }, [shot.done, rate, name])

  useEffect(() => {
    if (still) return

    setShot(run.from === 0 ? { ...start, ...BASE } : shotAt(start, script, run.from))
    if (!run.playing) return

    startedAt.current = performance.now() - run.from * pace

    const done: Partial<Base> = { done: true }
    const cues: Cue<S>[] = [...script, [length, done as Partial<Shot<S>>]]
    const timers = cues
      .filter(([at]) => at > run.from)
      .map(([at, change]) =>
        setTimeout(
          () => {
            setShot((current) => ({ ...current, ...change }))
          },
          (at - run.from) * pace,
        ),
      )

    return () => {
      timers.forEach(clearTimeout)
    }
    // El guion y el inicio son constantes de cada demostración.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, run, pace])

  // Una onda por pulsación, en el sitio del ratón.
  useEffect(() => {
    if (shot.press) setRipples((current) => current + 1)
  }, [shot.press])

  /** Por dónde va el guion ahora mismo, en ms. */
  const now = (): number =>
    run.playing ? Math.min(length, (performance.now() - startedAt.current) / pace) : run.from
  const replay = (): void => {
    setRun((current) => ({ take: current.take + 1, from: 0, playing: true }))
  }
  const toggle = (): void => {
    if (shot.done) {
      replay()
      return
    }
    const at = now()

    setRun((current) => ({ take: current.take + 1, from: at, playing: !current.playing }))
  }
  const seek = (at: number): void => {
    setRun((current) => ({ take: current.take + 1, from: at, playing: true }))
  }

  // El ratón va al centro de lo que toque. Se mide en cada cambio, después de
  // pintar, porque muchos destinos (un desplegable, un botón) acaban de aparecer.
  useLayoutEffect(() => {
    const target = stage.current?.querySelector(`[data-tour="${shot.cursor}"]`)

    // Lo que señala el ratón se ilumina un poco (`[data-hot]` en `tour.css`).
    stage.current?.querySelectorAll('[data-hot]').forEach((element) => {
      if (element !== target) element.removeAttribute('data-hot')
    })
    if (shot.cursor !== 'rest') target?.setAttribute('data-hot', '')

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
          <li key={step} className={step === first ? 'on' : undefined}>
            <strong>{t(`tour.${name}.title.${step}`)}</strong> {t(`tour.${name}.${step}`)}
          </li>
        ))}
      </ol>
    )
  }

  const unread = bell?.(shot) ?? 0

  return (
    <div className="tour">
      <div
        ref={stage}
        className="tour-stage"
        aria-hidden="true"
        // Las transiciones del decorado se estiran lo mismo que el guion.
        style={{ ['--pace' as string]: pace }}
      >
        <div className="tour-bar">
          <span className="tour-dots" />
          <span className="tour-tab">{tab(shot)}</span>
          {sub !== undefined && <span className="tour-subtab">{sub(shot)}</span>}
          <span className={`tour-bell ${unread > 0 ? 'ringing' : ''}`} data-tour="bell">
            <Icon name="campana" size={15} />
            {unread > 0 && <i>{unread}</i>}
          </span>
        </div>
        <div className="tour-scene">{children(shot)}</div>
        <span className="tour-anchor" data-tour="rest" style={{ left: '80%', top: '82%' }} />
        <div className={`tour-fade ${shot.dark ? 'on' : ''}`} />
        {ripples > 0 && (
          <span
            key={ripples}
            className="tour-ripple"
            style={{ ['--x' as string]: `${point.x}px`, ['--y' as string]: `${point.y}px` }}
          />
        )}
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

      <div className="tour-progress">
        <span
          key={`${String(run.take)}-${String(run.playing)}`}
          className={`tour-progress-bar ${run.playing && !shot.done ? 'running' : ''}`}
          style={{
            ['--from' as string]: shot.done ? 1 : run.from / length,
            ['--left' as string]: `${String(((length - run.from) * pace) / 1000)}s`,
          }}
        />
        {chapters.map(({ step, at }) => (
          <button
            key={step}
            type="button"
            className={`tour-chapter ${shot.caption === step ? 'on' : ''}`}
            style={{ left: `${String((at / length) * 100)}%` }}
            aria-label={t('tour.jump', { n: step, text: t(`tour.${name}.title.${step}`) })}
            title={`${String(step)}. ${t(`tour.${name}.title.${step}`)}`}
            onClick={() => {
              seek(at)
            }}
          />
        ))}
      </div>
      <p className="tour-caption" role="status">
        <span key={shot.caption}>
          <small className="tour-step-title">
            {t('tour.stepTitle', {
              n: shot.caption,
              total: steps.length,
              title: t(`tour.${name}.title.${shot.caption}`),
            })}
          </small>
          {t(`tour.${name}.${shot.caption}`)}
        </span>
      </p>
      <div className="actions">
        <label className="tour-speed">
          <span>{t('tour.speed', { n: number(rate) })}</span>
          <input
            type="range"
            min={0}
            max={RATES.length - 1}
            step={1}
            value={RATES.findIndex((option) => option === rate)}
            aria-valuetext={`×${rate}`}
            onChange={(event) => {
              // Cambiarla sigue desde donde iba: los pasos ya programados iban a la de antes.
              const at = shot.done ? 0 : now()

              choose(RATES[Number(event.target.value)] ?? 1)
              setRun((current) => ({ take: current.take + 1, from: at, playing: true }))
            }}
          />
        </label>
        <button type="button" className="pill" onClick={toggle}>
          {shot.done ? t('tour.replay') : run.playing ? t('tour.pause') : t('tour.play')}
        </button>
        {!shot.done && run.from + (run.playing ? 1 : 0) > 0 && (
          <button type="button" className="pill" onClick={replay}>
            {t('tour.restart')}
          </button>
        )}
      </div>
    </div>
  )
}
