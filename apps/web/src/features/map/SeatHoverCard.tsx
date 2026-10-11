import type { MapSeat } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { seatName } from './seats'

/** El puesto bajo el ratón y dónde está en la pantalla. */
export type Hovered = {
  seat: MapSeat
  rect: DOMRect
}

/** Alto aproximado de la ficha, para decidir si cabe encima del puesto. */
const CARD_HEIGHT = 190

/**
 * La ficha que flota junto a un puesto ocupado al pasar el ratón (o el foco):
 * la foto en grande, quién es, dónde está sentado y qué proyectos tiene en curso.
 *
 * Va con `position: fixed` y fuera de la caja del mapa, que se desliza de lado y
 * la recortaría. No recibe clics: es solo para mirar; pulsar el puesto abre el
 * detalle de siempre, que es lo que hay en pantallas táctiles.
 */
export function SeatHoverCard({ hovered }: { hovered: Hovered }) {
  const { t } = useI18n()
  const { seat, rect } = hovered
  const occupant = seat.occupant

  if (occupant === null) {
    return null
  }

  // Encima del puesto si cabe; si no (primeras filas con la página arriba), debajo.
  const above = rect.top > CARD_HEIGHT + 12
  const center = rect.left + rect.width / 2
  // Que no se salga por los lados en ventanas estrechas.
  const left = Math.min(Math.max(center, 120), window.innerWidth - 120)

  return (
    <div
      className={`seat-hover ${above ? 'above' : 'below'}`}
      style={{ left, top: above ? rect.top - 10 : rect.bottom + 10 }}
      role="tooltip"
    >
      <Avatar login={occupant.login} image={occupant.image} size={96} />
      <strong>{occupant.login}</strong>
      <span className="seat-host">{seatName(seat.host, t)}</span>
      {occupant.duty !== null && (
        <span className={`badge ${occupant.duty === 'specialist' ? 'specialist' : 'on'}`}>
          {t(`map.duty.${occupant.duty}`)}
        </span>
      )}
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
    </div>
  )
}
