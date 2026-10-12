import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { Tile } from './art'
import type { Card } from './cards'

type CardViewProps = {
  card: Card
  /** Dónde está en pantalla lo que se mira: la ficha se pone a su lado. */
  anchor: DOMRect
  /** Fase de la singularidad, para que la ficha lleve el color del decorado. */
  stage: number
  price: (value: number) => string
  /** En pantalla táctil: el aviso de que hay que tocar otra vez para comprar. */
  hint?: string
}

const GAP = 10
const EDGE = 8

/**
 * La ficha flotante de un edificio, una mejora o un logro.
 *
 * Se pinta fuera del juego, en `body`: dentro quedaría recortada por el borde
 * del panel. Se pone a la izquierda de lo que se mira, como en el original; si
 * no cabe (en el móvil la tienda ocupa todo el ancho), debajo o encima.
 */
export function CardView({ card, anchor, stage, price, hint }: CardViewProps) {
  const box = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = box.current

    if (element === null) return

    const { width, height } = element.getBoundingClientRect()
    const side = anchor.left - GAP - width >= EDGE
    let left = side ? anchor.left - GAP - width : anchor.left + anchor.width / 2 - width / 2
    let top = side ? anchor.top : anchor.bottom + GAP

    if (!side && top + height > window.innerHeight - EDGE) top = anchor.top - GAP - height

    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE))
    top = Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE))
    element.style.left = `${left}px`
    element.style.top = `${top}px`
    element.style.visibility = 'visible'
  })

  return createPortal(
    <div ref={box} className={`cc-card stage-${stage}`} role="tooltip">
      <div className="cc-card-head">
        <Tile
          icon={card.icon}
          size={44}
          {...(card.tier === undefined ? {} : { tier: card.tier })}
          {...(card.label === undefined ? {} : { label: card.label })}
        />
        <span>
          <strong>{card.name}</strong>
          <small>{card.tag}</small>
        </span>
        {card.price !== undefined && (
          <b className={card.able === true ? 'can' : 'cannot'}>{price(card.price)}</b>
        )}
      </div>
      <ul>
        {card.lines.map((line, index) => (
          <li key={index} className={line.tone ?? ''}>
            {line.text}
          </li>
        ))}
      </ul>
      {card.quote !== undefined && <q>{card.quote}</q>}
      {hint !== undefined && <em>{hint}</em>}
    </div>,
    document.body,
  )
}
