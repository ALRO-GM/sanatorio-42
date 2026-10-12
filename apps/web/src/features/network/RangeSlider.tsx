/**
 * Un deslizador con dos tiradores, para elegir un tramo entre `0` y `max`.
 *
 * Son dos `<input type="range">` uno encima de otro: así cada tirador se mueve
 * con el teclado y lo lee un lector de pantalla como cualquier otro. Ninguno
 * puede pasar por encima del otro.
 */
export function RangeSlider({
  max,
  low,
  high,
  onChange,
  lowLabel,
  highLabel,
}: {
  max: number
  low: number
  high: number
  onChange: (low: number, high: number) => void
  lowLabel: string
  highLabel: string
}) {
  const share = (value: number): string => `${max === 0 ? 0 : (value / max) * 100}%`

  return (
    <span
      className="range-slider"
      style={{ '--low': share(low), '--high': share(high) } as React.CSSProperties}
    >
      <input
        type="range"
        min={0}
        max={max}
        value={low}
        aria-label={lowLabel}
        onChange={(event) => {
          onChange(Math.min(Number(event.target.value), high), high)
        }}
      />
      <input
        type="range"
        min={0}
        max={max}
        value={high}
        aria-label={highLabel}
        onChange={(event) => {
          onChange(low, Math.max(Number(event.target.value), low))
        }}
      />
    </span>
  )
}
