type LogoProps = {
  /**
   * Si viene, la cruz es un botón (en la cabecera abre el expediente). Sin él es
   * solo decoración, como en la pantalla de entrada.
   */
  onMarkClick?: () => void
  /** Nombre accesible del botón. Obligatorio en la práctica si hay `onMarkClick`. */
  markLabel?: string
  /** `true` si lo que abre la cruz es lo que se está viendo. */
  markActive?: boolean
}

export function Logo({ onMarkClick, markLabel, markActive = false }: LogoProps) {
  return (
    <div className="logo">
      {onMarkClick === undefined ? (
        <span className="logo-mark" aria-hidden="true">
          +
        </span>
      ) : (
        <button
          type="button"
          className={`logo-mark logo-mark-btn ${markActive ? 'active' : ''}`}
          onClick={onMarkClick}
          aria-label={markLabel}
          title={markLabel}
          aria-current={markActive ? 'page' : undefined}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}
      <svg className="ekg" viewBox="0 0 120 30" width="120" height="30" aria-hidden="true">
        <polyline
          points="0,15 25,15 35,15 42,4 50,26 58,15 80,15 90,8 98,22 106,15 120,15"
          fill="none"
          stroke="#00babc"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
