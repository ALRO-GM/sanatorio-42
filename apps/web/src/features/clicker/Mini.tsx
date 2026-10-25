import { DockItem } from '../../shared/dock/DockItem'
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
 * La ventanita que acompaña fuera del juego, con las líneas que se llevan
 * escritas, que siguen subiendo mientras la web esté abierta. Pulsarla lleva
 * al juego; la cruz la quita para que no distraiga (se vuelve a poner desde el
 * juego). Va en la pila de la esquina (`shared/dock`): plegada, solo la tecla.
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
  labels: { title: string; open: string; close: string }
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <DockItem
      id="clicker"
      title={labels.title}
      size={{ width: 190, height: 46 }}
      foldedSize={{ width: 120, height: 46 }}
    >
      {({ folded, grip, controls }) => (
        <div className="cc-mini" role="status" aria-live="off">
          {grip}
          <button
            type="button"
            className="cc-mini-open"
            title={labels.open}
            aria-label={folded ? labels.open : undefined}
            onClick={onOpen}
          >
            <span className="cc-mini-key" aria-hidden="true">
              {'{}'}
            </span>
            {!folded && (
              <span>
                <strong>{lines}</strong>
                <small>{perSecond}</small>
              </span>
            )}
          </button>
          {controls}
          {!folded && (
            <button
              type="button"
              className="cc-mini-close"
              aria-label={labels.close}
              onClick={onClose}
            >
              <Icon name="cerrar" size={14} />
            </button>
          )}
        </div>
      )}
    </DockItem>
  )
}
