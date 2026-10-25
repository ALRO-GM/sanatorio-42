import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react'

import { useMediaQuery } from '../hooks/useMediaQuery'

type Option = string | number

/** Por debajo de este ancho va la rueda; por encima, el desplegable. */
export const WHEEL_QUERY = '(max-width: 640px)'
/** Alto de cada opción de la rueda, en píxeles: lo que hay que arrastrar para pasar a la siguiente. */
const ROW = 32

type StepPickerProps<T extends Option> = {
  /** Las opciones, en orden (de menos a más: 8 meses, 12, …, «Todo»). */
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  /** El rótulo, que se ve al lado y es el nombre accesible. */
  label: string
  text: (option: T) => string
  className?: string
  /** `auto`: desplegable en escritorio y rueda en el móvil. Los otros, para forzar uno. */
  variant?: 'auto' | 'select' | 'wheel'
}

/**
 * El selector de un periodo, o de cualquier escalón de una lista ordenada
 * («más o menos de algo»), igual en toda la web.
 *
 * - En escritorio, un `<select>` nativo y compacto: el teclado, el lector de
 *   pantalla y el móvil que lo abra ya saben usarlo.
 * - En el móvil, una rueda (`role="spinbutton"`): se elige deslizando arriba o
 *   abajo, tocando la opción de al lado o con las flechas. Sin animación si se
 *   pide movimiento reducido (`.step-wheel-list` en `base.css`).
 *
 * Las pastillas (`PillGroup`) siguen siendo para dos o tres opciones que se ven
 * de un vistazo o que no van en orden.
 */
export function StepPicker<T extends Option>(props: StepPickerProps<T>) {
  const small = useMediaQuery(WHEEL_QUERY)
  const wheel = props.variant === 'wheel' || (props.variant !== 'select' && small)

  return wheel ? <Wheel {...props} /> : <Dropdown {...props} />
}

function Dropdown<T extends Option>({
  options,
  value,
  onChange,
  label,
  text,
  className,
}: StepPickerProps<T>) {
  return (
    <label className={`step-picker ${className ?? ''}`.trim()}>
      <span className="step-picker-label">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => {
          const next = options.find((option) => String(option) === event.target.value)

          if (next !== undefined) onChange(next)
        }}
      >
        {options.map((option) => (
          <option key={String(option)} value={String(option)}>
            {text(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

function Wheel<T extends Option>({
  options,
  value,
  onChange,
  label,
  text,
  className,
}: StepPickerProps<T>) {
  const id = useId()
  const index = Math.max(0, options.indexOf(value))
  const last = options.length - 1
  // Lo que se lleva arrastrado (en px) mientras el dedo está encima.
  const [drag, setDrag] = useState<number | null>(null)
  const from = useRef<{ y: number; moved: boolean } | null>(null)
  const go = (next: number): void => {
    const option = options[Math.min(last, Math.max(0, next))]

    if (option !== undefined && option !== value) onChange(option)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? index + 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null

    if (next === null) return
    event.preventDefault()
    go(next)
  }
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    from.current = { y: event.clientY, moved: false }
    try {
      // Que el dedo siga arrastrando aunque salga de la rueda.
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Sin captura (navegadores viejos, pruebas): se arrastra igual mientras esté encima.
    }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (from.current === null) return
    const dy = event.clientY - from.current.y

    if (Math.abs(dy) > 4) from.current.moved = true
    setDrag(dy)
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const start = from.current

    from.current = null
    setDrag(null)
    if (start === null) return
    // Deslizar hacia arriba sube la lista: sale la opción siguiente.
    if (start.moved) {
      go(index - Math.round((event.clientY - start.y) / ROW))
      return
    }
    // Un toque sin arrastrar: la opción tocada (la de arriba o la de abajo).
    const tapped = (event.target as HTMLElement).dataset.step

    if (tapped !== undefined) go(Number(tapped))
  }
  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    if (Math.abs(event.deltaY) < 1) return
    go(index + (event.deltaY > 0 ? 1 : -1))
  }
  const offset = -index * ROW + (drag ?? 0)

  return (
    <div className={`step-picker wheel ${className ?? ''}`.trim()}>
      <span className="step-picker-label" id={`${id}-label`}>
        {label}
      </span>
      <div
        className={`step-wheel ${drag === null ? '' : 'dragging'}`.trim()}
        role="spinbutton"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={index}
        aria-valuetext={text(value)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <ol className="step-wheel-list" style={{ transform: `translateY(${String(offset)}px)` }}>
          {options.map((option, at) => (
            <li
              key={String(option)}
              className={at === index ? 'on' : undefined}
              data-step={at}
              aria-hidden="true"
            >
              {text(option)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
