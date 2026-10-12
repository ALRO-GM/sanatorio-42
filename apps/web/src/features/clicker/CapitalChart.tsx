import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import type { Lang } from '@sanatorio/contracts'

import { localeOf } from '../../shared/i18n'
import { short } from './texts'

const WIDTH = 600
const HEIGHT = 160
const PAD = 6
/** Menos que esto de ancho no es arrastrar: es un clic. */
const MIN_DRAG = 0.02

/**
 * El capital a lo largo del tiempo, en escala logarítmica: en un juego donde
 * todo crece por multiplicación, es la única en la que se ve algo más que el
 * último tramo. Un salto raro se nota como un escalón.
 *
 * @param points `[segundo desde 1970, capital]`, del más antiguo al más nuevo.
 * @param seconds Si la serie dura poco: pone la hora con segundos en vez del día.
 * @param onSelect Si viene, se puede arrastrar sobre la gráfica para acercarse
 *   a ese tramo: recibe el segundo en que empieza y en el que acaba.
 */
export function CapitalChart({
  points,
  lang,
  label,
  seconds = false,
  onSelect,
}: {
  points: readonly [number, number][]
  lang: Lang
  label: string
  seconds?: boolean
  onSelect?: (from: number, to: number) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  // Dónde empezó a arrastrar y por dónde va, de 0 a 1 a lo ancho.
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null)
  const [first, last] = [points[0], points.at(-1)]

  if (first === undefined || last === undefined || points.length < 2) return null

  const log = (value: number): number => Math.log10(Math.max(1, value))
  const values = points.map(([, capital]) => log(capital))
  const low = Math.min(...values)
  const high = Math.max(...values, low + 0.01)
  const span = Math.max(1, last[0] - first[0])
  const x = (at: number): number => PAD + ((at - first[0]) / span) * (WIDTH - 2 * PAD)
  const y = (value: number): number =>
    HEIGHT - PAD - ((log(value) - low) / (high - low)) * (HEIGHT - 2 * PAD)
  const line = points
    .map(([at, capital]) => `${x(at).toFixed(1)},${y(capital).toFixed(1)}`)
    .join(' ')
  const when = new Intl.DateTimeFormat(
    localeOf(lang),
    seconds || span < 2 * 86_400
      ? { timeStyle: seconds ? 'medium' : 'short', ...(seconds ? {} : { dateStyle: 'short' }) }
      : { dateStyle: 'short' },
  )

  const share = (event: PointerEvent): number => {
    const box = svg.current?.getBoundingClientRect()

    return box === undefined ? 0 : Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
  }
  const at = (part: number): number => Math.round(first[0] + part * span)
  const picking =
    onSelect === undefined
      ? {}
      : {
          onPointerDown: (event: PointerEvent<SVGSVGElement>) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDrag({ start: share(event), end: share(event) })
          },
          onPointerMove: (event: PointerEvent<SVGSVGElement>) => {
            if (drag !== null) setDrag({ start: drag.start, end: share(event) })
          },
          onPointerUp: () => {
            if (drag !== null && Math.abs(drag.end - drag.start) >= MIN_DRAG) {
              onSelect(at(Math.min(drag.start, drag.end)), at(Math.max(drag.start, drag.end)))
            }

            setDrag(null)
          },
          onPointerCancel: () => {
            setDrag(null)
          },
        }

  return (
    <figure className="cc-chart">
      <figcaption>{label}</figcaption>
      <div className="cc-chart-body">
        <span className="cc-chart-scale">
          <span>{short(10 ** high, lang, 1)}</span>
          <span>{short(10 ** low, lang, 1)}</span>
        </span>
        <svg
          ref={svg}
          className={onSelect === undefined ? '' : 'pickable'}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label}
          {...picking}
        >
          <polygon
            className="cc-chart-fill"
            points={`${x(first[0])},${HEIGHT - PAD} ${line} ${x(last[0])},${HEIGHT - PAD}`}
          />
          <polyline className="cc-chart-line" points={line} />
          {drag !== null && (
            <rect
              className="cc-chart-pick"
              x={Math.min(drag.start, drag.end) * WIDTH}
              y={0}
              width={Math.abs(drag.end - drag.start) * WIDTH}
              height={HEIGHT}
            />
          )}
        </svg>
      </div>
      <span className="cc-chart-times">
        <span>{when.format(new Date(first[0] * 1000))}</span>
        <span>{when.format(new Date(last[0] * 1000))}</span>
      </span>
    </figure>
  )
}
