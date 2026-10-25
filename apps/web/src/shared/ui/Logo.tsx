type LogoProps = {
  /**
   * Si viene, la marca es un botón (en la cabecera abre el expediente). Sin él es
   * solo decoración, como en la pantalla de entrada.
   */
  onMarkClick?: () => void
  /** Nombre accesible del botón. Obligatorio en la práctica si hay `onMarkClick`. */
  markLabel?: string
  /** `true` si lo que abre la marca es lo que se está viendo. */
  markActive?: boolean
}

/** La marca de Peer4U: los corchetes angulares del código, `</>` sin la barra. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" style={{ display: 'block' }}>
      <path
        d="M9 6l-6 6 6 6M15 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ onMarkClick, markLabel, markActive = false }: LogoProps) {
  return (
    <div className="logo">
      {onMarkClick === undefined ? (
        <span className="logo-mark" aria-hidden="true">
          <Mark />
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
          <span aria-hidden="true">
            <Mark />
          </span>
        </button>
      )}
      <svg className="ekg" viewBox="0 0 120 30" width="120" height="30" aria-hidden="true">
        <polyline
          points="0,22 14,22 14,8 30,8 30,22 46,22 46,8 62,8 62,22 78,22 78,8 94,8 94,22 120,22"
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
