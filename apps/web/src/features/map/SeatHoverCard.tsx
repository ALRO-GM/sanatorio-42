import type { ReactNode } from 'react'

import type { MapSeat } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { FocusBadge } from '../../shared/ui/FocusBadge'
import { Icon } from '../../shared/ui/Icon'
import { seatName } from './seats'
import { recordHref } from '../../shared/links'

/** Un puesto y el botón que lo pinta: la ficha se coloca junto a él. */
export type Hovered = {
  seat: MapSeat
  anchor: Element
}

/** Alto aproximado de la ficha, para decidir si cabe encima del puesto. */
const CARD_HEIGHT = 190
/** Lo que añaden los botones cuando está fijada. */
const ACTIONS_HEIGHT = 80

type SeatHoverCardProps = {
  hovered: Hovered
  /**
   * Fijada: se queda abierta tras pulsar el puesto y lleva sus botones. Sin
   * esto es la que sale al pasar el ratón, que no recibe clics.
   */
  pinned?: {
    onClose: () => void
    /** Abre el chat con esa persona; sin él no hay botón de escribir. */
    onChat?: ((login: string) => void) | undefined
    /** Lo que haya que decir además: la reserva del puesto. */
    extra?: ReactNode
  }
}

/**
 * La ficha que flota junto a un puesto ocupado: la foto en grande, quién es,
 * dónde está sentado y qué proyectos tiene en curso. Sale al pasar el ratón (o
 * el foco) y, al pulsar el puesto, se queda abierta con los botones de
 * escribirle y de ir a su expediente.
 *
 * Va con `position: fixed` y fuera de la caja del mapa, que se desliza de lado y
 * la recortaría.
 */
export function SeatHoverCard({ hovered, pinned }: SeatHoverCardProps) {
  const { t } = useI18n()
  const { seat, anchor } = hovered
  const occupant = seat.occupant

  if (occupant === null) {
    return null
  }

  const rect = anchor.getBoundingClientRect()
  const height = CARD_HEIGHT + (pinned === undefined ? 0 : ACTIONS_HEIGHT)
  // Encima del puesto si cabe; si no (primeras filas con la página arriba), debajo.
  const above = rect.top > height + 12
  const center = rect.left + rect.width / 2
  // Que no se salga por los lados en ventanas estrechas: la fijada es más ancha.
  const half = pinned === undefined ? 120 : 140
  const left = Math.min(Math.max(center, half), window.innerWidth - half)

  return (
    <div
      className={`seat-hover ${above ? 'above' : 'below'} ${pinned === undefined ? '' : 'pinned'}`}
      style={{ left, top: above ? rect.top - 10 : rect.bottom + 10 }}
      role={pinned === undefined ? 'tooltip' : 'dialog'}
      aria-label={pinned === undefined ? undefined : occupant.login}
    >
      {pinned !== undefined && (
        <button
          type="button"
          className="link seat-hover-close"
          aria-label={t('layout.close')}
          onClick={pinned.onClose}
        >
          <Icon name="cerrar" />
        </button>
      )}
      <Avatar login={occupant.login} image={occupant.image} size={96} />
      <strong>{occupant.login}</strong>
      <span className="seat-host">{seatName(seat.host, t)}</span>
      <FocusBadge until={occupant.focusUntil} />
      <span className="seat-projects">
        {occupant.me && <span className="badge subtle">{t('map.you')}</span>}
        {occupant.online && !occupant.me && pinned !== undefined && (
          <span className="badge on">{t('clusters.online')}</span>
        )}
        {occupant.circle !== null && (
          <span className="badge subtle">{t('map.circle', { n: occupant.circle })}</span>
        )}
        {occupant.finishedMine !== null && (
          <span className={`badge ${occupant.finishedMine >= 125 ? 'specialist' : 'on'}`}>
            {t('map.finishedMine', { n: occupant.finishedMine })}
          </span>
        )}
        {occupant.duty !== null && (
          <span className={`badge ${occupant.duty === 'specialist' ? 'specialist' : 'on'}`}>
            {t(`map.duty.${occupant.duty}`)}
          </span>
        )}
      </span>
      {occupant.projects.length > 0 ? (
        <span className="seat-projects">
          {occupant.projects.map((project) => (
            <span key={project} className="chip">
              {project}
            </span>
          ))}
        </span>
      ) : (
        <span className="hint">{t('map.noProjects')}</span>
      )}
      {pinned?.extra}
      {pinned !== undefined && (
        <span className="seat-hover-actions">
          {pinned.onChat !== undefined && !occupant.me && (
            <button
              type="button"
              className="primary small"
              onClick={() => {
                pinned.onChat?.(occupant.login)
              }}
            >
              <Icon name="chat" /> {t('clusters.write')}
            </button>
          )}
          <a className="pill" href={recordHref(occupant.login)}>
            <Icon name="expediente" /> {t('map.profile')}
          </a>
        </span>
      )}
    </div>
  )
}
