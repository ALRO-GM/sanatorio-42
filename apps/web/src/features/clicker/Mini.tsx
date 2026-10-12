import { Icon } from '../../shared/ui/Icon'

const KEY = 'sanatorio_clicker_mini'

/** Si la ventanita se enseña fuera del juego. Viene encendida. */
export function miniOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setMini(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Sin almacenamiento, dura lo que dure la pestaña.
  }
}

/**
 * La ventanita que acompaña fuera del juego: abajo a la izquierda, con las
 * líneas que se llevan escritas, que siguen subiendo mientras la web esté
 * abierta. Pulsarla lleva al juego; la cruz la quita para que no distraiga (se
 * vuelve a poner desde el juego).
 */
export function Mini({
  lines,
  perSecond,
  labels,
  onOpen,
  onClose,
}: {
  lines: string
  perSecond: string
  labels: { open: string; close: string }
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div className="cc-mini" role="status" aria-live="off">
      <button type="button" className="cc-mini-open" title={labels.open} onClick={onOpen}>
        <span className="cc-mini-key" aria-hidden="true">
          {'{}'}
        </span>
        <span>
          <strong>{lines}</strong>
          <small>{perSecond}</small>
        </span>
      </button>
      <button type="button" className="cc-mini-close" aria-label={labels.close} onClick={onClose}>
        <Icon name="cerrar" size={14} />
      </button>
    </div>
  )
}
