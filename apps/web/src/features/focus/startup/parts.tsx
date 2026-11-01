import type { ReactNode } from 'react'

import { Icon } from '../../../shared/ui/Icon'
import type { IconName } from '../../../shared/ui/Icon'
import { ItemArt } from './pixel/ItemArt'
import type { ArtOf } from './pixel/ItemArt'

/**
 * Las piezas pequeñas de la pestaña Startup: cifras, puntos de nivel, lo que
 * falta y las tarjetas. Sin texto: iconos y cifras; el nombre, para quien no
 * ve el dibujo.
 */

/** Minutos como `h:mm`: lo mismo en todos los idiomas. */
export const hm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60))}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`

/** El dinero, siempre entero (los decimales del ritmo, con uno). */
export const coins = (amount: number, compact: (value: number) => string): string =>
  amount < 10_000 ? String(Math.floor(amount)) : compact(Math.floor(amount))

/** La moneda dibujada: el dinero no tiene icono de trazo. */
export function Coin({ size = 13 }: { size?: number }) {
  return <span className="su-coin" style={{ width: size, height: size }} aria-hidden="true" />
}

/** Una cifra con su icono; el nombre, solo para quien no ve el icono. */
export function Figure({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: IconName | 'coin'
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <span className={`su-figure ${strong ? 'strong' : ''}`.trim()} title={label}>
      {icon === 'coin' ? <Coin size={16} /> : <Icon name={icon} size={16} />}
      <span className="sr-only">{label}</span>
      <b>{value}</b>
    </span>
  )
}

/** Los niveles comprados de una pieza, como puntos. */
export function Dots({ level, of }: { level: number; of: number }) {
  return (
    <span className="su-dots" aria-hidden="true">
      {Array.from({ length: of }, (_, index) => (
        <i key={index} className={index < level ? 'on' : undefined} />
      ))}
    </span>
  )
}

/** Lo que hace falta, con su icono: tienes / pide. */
export function Need({ icon, have, need }: { icon: IconName; have: number; need: number }) {
  if (need <= 0) return null

  return (
    <span className={`su-need ${have >= need ? 'met' : ''}`.trim()}>
      <Icon name={icon} size={13} />
      {Math.floor(have)}/{need}
    </span>
  )
}

/**
 * Una tarjeta del juego: dibujo, precio (en minutos o, con `cash`, en dinero)
 * y, si no se puede, apagada o con candado.
 */
export function Card({
  art,
  label,
  cost,
  cash = false,
  locked,
  affordable,
  busy,
  onClick,
  children,
}: {
  art: ArtOf
  label: string
  cost: number | null
  cash?: boolean
  locked: boolean
  affordable: boolean
  busy: boolean
  onClick: () => void
  children?: ReactNode
}) {
  const max = cost === null

  return (
    <button
      type="button"
      className={`su-card ${locked ? 'locked' : ''} ${max ? 'max' : ''}`.trim()}
      aria-label={label}
      title={label}
      disabled={busy || locked || max || !affordable}
      onClick={onClick}
    >
      <ItemArt art={art} />
      {children}
      <span className="su-cost">
        {locked ? (
          <Icon name="candado" size={13} />
        ) : max ? (
          <Icon name="hecho" size={13} />
        ) : cash ? (
          <>
            <Coin />
            {cost}
          </>
        ) : (
          <>
            <Icon name="reloj" size={13} />
            {hm(cost)}
          </>
        )}
      </span>
    </button>
  )
}
