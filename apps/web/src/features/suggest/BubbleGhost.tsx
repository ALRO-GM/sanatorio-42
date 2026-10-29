import { createPortal } from 'react-dom'

import { Icon } from '../../shared/ui/Icon'
import type { IconName } from '../../shared/ui/Icon'
import type { Point } from './useCarry'

/**
 * La burbuja suelta que sigue al puntero (o vuelve volando a la cabecera). Con
 * `hint`, una etiqueta al lado dice qué hacer con ella: así un clic sin más
 * ya explica para qué sirve.
 */
export function BubbleGhost({
  at,
  returning,
  icon,
  hint,
}: {
  at: Point
  returning: boolean
  icon: IconName
  hint?: string | undefined
}) {
  return createPortal(
    <span
      className={`suggest-ghost ${returning ? 'returning' : ''}`}
      style={{ left: at.x, top: at.y }}
      aria-hidden="true"
    >
      <Icon name={icon} size={20} />
      {hint !== undefined && !returning && <span className="suggest-ghost-hint">{hint}</span>}
    </span>,
    document.body,
  )
}
