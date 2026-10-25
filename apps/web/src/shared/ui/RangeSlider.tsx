import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'

import { useI18n } from '../i18n'
import { useFormat } from '../i18n/useFormat'
import {
  fineFactor,
  magnetRadius,
  onGrid,
  parseTyped,
  roundStops,
  settle,
  toPosition,
} from './range'
import type { Curve, Grid } from './range'

/** Lo que tienen en común el de un tirador y el de dos. */
type Common = {
  /** Del mínimo al máximo, de `step` en `step` (por defecto, de uno en uno). */
  min?: number
  max: number
  step?: number
  /** `log` para recuentos en los que unos pocos valores enormes se comerían la barra. */
  curve?: Curve
  /** Marcas en la barra (los valores que hay en los datos). Solo se pintan: no limitan nada. */
  ticks?: readonly number[]
  /** Valores a los que se pega el tirador; por defecto, los redondos (`roundStops`). */
  stops?: readonly number[]
  /** Cómo se escribe un valor en su globo y para el lector de pantalla. */
  format?: (value: number) => string
  /**
   * `live`: se avisa a cada paso mientras se arrastra (lo que se pinta en el
   * momento). `release`: solo al soltar, para lo que pregunta a la API.
   */
  commit?: 'live' | 'release'
  disabled?: boolean
  className?: string
}

/**
 * El deslizador de toda la web, de dos tiradores: un tramo entre `min` y `max`.
 * Las reglas, en `docs/interfaz.md` («Deslizadores»).
 */
export function RangeSlider({
  low,
  high,
  onChange,
  lowLabel,
  highLabel,
  minGap = 0,
  ...common
}: Common & {
  low: number
  high: number
  onChange: (low: number, high: number) => void
  lowLabel: string
  highLabel: string
  /** Lo menos que tiene que haber entre los dos tiradores: nunca se cruzan. */
  minGap?: number
}) {
  return (
    <Slides
      {...common}
      values={[low, high]}
      labels={[lowLabel, highLabel]}
      minGap={minGap}
      onChange={(values) => {
        onChange(values[0] ?? low, values[1] ?? high)
      }}
    />
  )
}

/** El mismo deslizador con un solo tirador. */
export function Slider({
  value,
  onChange,
  label,
  ...common
}: Common & { value: number; onChange: (value: number) => void; label: string }) {
  return (
    <Slides
      {...common}
      values={[value]}
      labels={[label]}
      minGap={0}
      onChange={(values) => {
        onChange(values[0] ?? value)
      }}
    />
  )
}

/** Lo que se recuerda mientras se arrastra; vive en un `ref`, no en el estado. */
type Drag = {
  pointer: number
  /** El tirador que se mueve, o `null` si había dos encima y aún no se sabe cuál. */
  index: number | null
  left: number
  width: number
  /** La altura de la barra en pantalla: la distancia del ajuste fino se mide desde aquí. */
  middle: number
  /** Dónde va el tirador, de 0 a 1, antes de pegarlo a un valor. */
  raw: number
  /** Cuánto había entre el puntero y el centro del tirador al cogerlo. */
  offset: number
  lastX: number
  /** Si ya se ha afinado: desde entonces se sigue el movimiento, no dónde está el puntero. */
  fine: boolean
  values: number[]
  grid: Grid
  stops: readonly number[]
}

function Slides({
  min = 0,
  max,
  step = 1,
  curve = 'linear',
  ticks,
  stops: givenStops,
  format,
  commit = 'live',
  disabled = false,
  className,
  values,
  labels,
  minGap,
  onChange,
}: Common & {
  values: number[]
  labels: string[]
  minGap: number
  onChange: (values: number[]) => void
}) {
  const { t } = useI18n()
  const { number } = useFormat()
  const track = useRef<HTMLDivElement>(null)
  const thumbs = useRef<(HTMLDivElement | null)[]>([])
  const drag = useRef<Drag | null>(null)
  // Lo que se enseña mientras se arrastra: no depende de lo que diga el padre
  // ni de los datos que se recarguen mientras tanto.
  const [draft, setDraft] = useState<{ values: number[]; grid: Grid } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null)

  const liveGrid = useMemo<Grid>(() => ({ min, max, step, curve }), [min, max, step, curve])
  const grid = draft?.grid ?? liveGrid
  const shown = draft?.values ?? values
  const stops = useMemo(() => givenStops ?? roundStops(liveGrid), [givenStops, liveGrid])
  const write = format ?? ((value: number) => number(value))

  /** Entre qué valores puede ir el tirador `index` sin cruzarse con el otro. */
  const bounds = (index: number, current: readonly number[], on: Grid): [number, number] => {
    const before = current[index - 1]
    const after = current[index + 1]

    return [
      before === undefined ? on.min : Math.min(on.max, before + minGap),
      after === undefined ? on.max : Math.max(on.min, after - minGap),
    ]
  }

  /** `current` con el tirador `index` en `value`, sin cruzarse. */
  const placed = (current: readonly number[], index: number, value: number, on: Grid): number[] => {
    const [low, high] = bounds(index, current, on)
    const next = [...current]

    next[index] = Math.min(high, Math.max(low, onGrid(value, on)))

    return next
  }

  const send = (next: number[]): void => {
    if (next.some((value, index) => value !== values[index])) onChange(next)
  }

  const move = (state: Drag, x: number, y: number): void => {
    const factor = fineFactor(y - state.middle)

    if (factor < 1) state.fine = true
    if (state.index === null) {
      // Dos tiradores juntos: manda hacia dónde se empieza a mover.
      if (x === state.lastX) return
      state.index = x > state.lastX ? state.values.length - 1 : 0
    }
    state.raw = state.fine
      ? state.raw + ((x - state.lastX) * factor) / state.width
      : (x - state.left) / state.width - state.offset
    state.lastX = x
    const index = state.index
    const [low, high] = bounds(index, state.values, state.grid)

    // La posición tampoco se escapa de su hueco: al volver se mueve en el acto.
    state.raw = Math.min(
      toPosition(high, state.grid),
      Math.max(toPosition(low, state.grid), state.raw),
    )
    const radius = magnetRadius(state.width, factor, state.stops, state.grid)
    const value = settle(state.raw, state.values[index] ?? null, state.grid, state.stops, radius)
    const next = placed(state.values, index, value, state.grid)

    setZoom(state.fine ? Math.max(1, Math.round(1 / factor)) : 1)
    if (next[index] === state.values[index]) return
    state.values = next
    setDraft({ values: next, grid: state.grid })
    if (commit === 'live') send(next)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (disabled || drag.current !== null || event.button !== 0 || track.current === null) return
    const box = track.current.getBoundingClientRect()
    const width = box.width > 0 ? box.width : 1
    const at = (event.clientX - box.left) / width
    const grabbed = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]')
    const positions = values.map((value) => toPosition(value, liveGrid))
    let index: number | null

    if (grabbed !== null) {
      index = Number(grabbed.dataset.thumb)
      // Dos tiradores en el mismo sitio: se sabrá cuál al moverse.
      if (positions.filter((position) => position === positions[index ?? 0]).length > 1) {
        index = null
      }
    } else {
      // En la barra: el tirador más cercano salta allí.
      const distances = positions.map((position) => Math.abs(position - at))
      const nearest = Math.min(...distances)
      const tied = distances.flatMap((distance, at2) => (distance === nearest ? [at2] : []))

      index =
        tied.length > 1
          ? at < (positions[tied[0] ?? 0] ?? 0)
            ? (tied[0] ?? 0)
            : (tied.at(-1) ?? 0)
          : (tied[0] ?? 0)
    }
    event.preventDefault()
    // Así el arrastre sigue aunque el puntero salga de la barra (jsdom no lo trae).
    const capture: Partial<Pick<HTMLElement, 'setPointerCapture'>> = track.current

    capture.setPointerCapture?.call(track.current, event.pointerId)
    const focus = thumbs.current[index ?? 0]

    focus?.focus()
    const state: Drag = {
      pointer: event.pointerId,
      index,
      left: box.left,
      width,
      middle: box.top + box.height / 2,
      raw: grabbed === null ? at : (positions[index ?? 0] ?? 0),
      offset: grabbed === null ? 0 : at - (positions[index ?? 0] ?? 0),
      lastX: event.clientX,
      fine: false,
      values: [...values],
      grid: liveGrid,
      stops,
    }

    drag.current = state
    setDraft({ values: [...values], grid: liveGrid })
    if (grabbed === null) move(state, event.clientX, event.clientY)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current

    if (state?.pointer !== event.pointerId) return
    move(state, event.clientX, event.clientY)
  }

  const finish = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current

    if (state?.pointer !== event.pointerId) return
    drag.current = null
    setDraft(null)
    setZoom(1)
    if (commit === 'release') send(state.values)
  }

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return
    const big = step * 10
    const current = values[index] ?? min
    const deltas: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: big,
      PageDown: -big,
    }
    let target: number | null = null

    if (event.key === 'Home') target = min
    else if (event.key === 'End') target = max
    else if (event.key === 'Enter') {
      event.preventDefault()
      openEditor(index, String(current))

      return
    } else {
      const delta = deltas[event.key]

      if (delta !== undefined) target = current + delta * (event.shiftKey ? 10 : 1)
    }
    if (target === null) return
    event.preventDefault()
    send(placed(values, index, target, liveGrid))
  }

  // Al cerrar con Intro o Escape, el campo pierde el foco y avisaría otra vez
  // al desaparecer: esto lo da por cerrado en el acto.
  const closed = useRef(false)
  const openEditor = (index: number, text: string): void => {
    closed.current = false
    setEditing({ index, text })
  }
  const closeEditor = (keep: boolean): void => {
    if (editing === null || closed.current) return
    closed.current = true
    const typed = keep ? parseTyped(editing.text, liveGrid) : null

    setEditing(null)
    if (typed !== null) send(placed(values, editing.index, typed, liveGrid))
    thumbs.current[editing.index]?.focus()
  }

  const positions = shown.map((value) => toPosition(value, grid))
  // Dos globos casi juntos se apartan: el de la izquierda a su izquierda y el otro a la derecha.
  const crowded =
    positions.length === 2 && Math.abs((positions[1] ?? 0) - (positions[0] ?? 0)) < 0.18
  const shownTicks = useMemo(
    () =>
      [...new Set(ticks ?? [])]
        .filter((tick) => tick >= grid.min && tick <= grid.max)
        .map((tick) => toPosition(tick, grid)),
    [ticks, grid],
  )
  const style = {
    '--low': `${(positions.length === 2 ? (positions[0] ?? 0) : 0) * 100}%`,
    '--high': `${(positions.at(-1) ?? 0) * 100}%`,
  } as CSSProperties

  return (
    <div
      className={[
        'range-slider',
        draft === null ? '' : 'dragging',
        zoom > 1 ? 'fine' : '',
        disabled ? 'disabled' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="range-values">
        {shown.map((value, index) => {
          const position = (positions[index] ?? 0) * 100
          const shift = crowded ? (index === 0 ? '-100%' : '0%') : `-${position}%`

          return editing?.index === index ? (
            <input
              key={index}
              className="range-edit"
              style={{ left: `${position}%`, transform: `translateX(${shift})` }}
              inputMode="decimal"
              aria-label={labels[index]}
              // Se abre al pedirlo: el foco va a lo que se va a escribir.
              autoFocus
              value={editing.text}
              onChange={(event) => {
                setEditing({ index, text: event.target.value })
              }}
              onFocus={(event) => {
                event.target.select()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  closeEditor(true)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  closeEditor(false)
                }
              }}
              onBlur={() => {
                closeEditor(true)
              }}
            />
          ) : (
            <button
              key={index}
              type="button"
              className="range-value"
              // El teclado llega con Intro desde el tirador: así no hay dos paradas por tirador.
              tabIndex={-1}
              disabled={disabled}
              style={{ left: `${position}%`, transform: `translateX(${shift})` }}
              aria-label={t('range.edit', { what: labels[index] ?? '' })}
              title={t('range.edit', { what: labels[index] ?? '' })}
              onClick={() => {
                openEditor(index, String(value))
              }}
            >
              {write(value)}
            </button>
          )
        })}
      </div>
      <div
        ref={track}
        className="range-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      >
        <span className="range-rail" />
        <span className="range-fill" />
        {shownTicks.map((tick) => (
          <span key={tick} className="range-tick" style={{ left: `${tick * 100}%` }} />
        ))}
        {shown.map((value, index) => {
          const [low, high] = bounds(index, shown, grid)

          return (
            <div
              key={index}
              ref={(element) => {
                thumbs.current[index] = element
              }}
              data-thumb={index}
              className="range-thumb"
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={labels[index]}
              aria-valuemin={low}
              aria-valuemax={high}
              aria-valuenow={value}
              aria-valuetext={write(value)}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              aria-keyshortcuts="Enter"
              style={{ left: `${(positions[index] ?? 0) * 100}%` }}
              onKeyDown={(event) => {
                onKeyDown(index, event)
              }}
            />
          )
        })}
      </div>
      {draft !== null && (
        // Mientras se arrastra: cómo afinar o, si ya se afina, cuánto. Va encima
        // de lo de arriba, sin moverlo: nada cambia de sitio mientras se arrastra.
        <span className="range-hint">
          {zoom > 1 ? t('range.fine', { n: zoom }) : t('range.away')}
        </span>
      )}
    </div>
  )
}
