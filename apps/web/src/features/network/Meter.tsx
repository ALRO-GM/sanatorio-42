type MeterProps = {
  label: string
  /** De 0 a 100. */
  value: number
}

/** Un índice de 0 a 100 con su barra, de verde (bajo) a rojo (alto). */
export function Meter({ label, value }: MeterProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="net-meter">
      <div className="net-meter-head">
        <span>{label}</span>
        <strong>{clamped}</strong>
      </div>
      <div
        className="net-meter-bar"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
      >
        <span
          style={{
            width: `${clamped}%`,
            background: `hsl(${Math.round(150 - 1.5 * clamped)} 68% 48%)`,
          }}
        />
      </div>
    </div>
  )
}
