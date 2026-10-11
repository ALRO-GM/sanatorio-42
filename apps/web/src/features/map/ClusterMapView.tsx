import { useMemo, useState } from 'react'
import type { FocusEvent, MouseEvent } from 'react'

import type { ClusterMap, MapCluster, MapSeat, SeatReservation } from '@sanatorio/contracts'

import { useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { SeatFace } from './SeatFace'
import { SeatHoverCard } from './SeatHoverCard'
import type { Hovered } from './SeatHoverCard'
import { clusterName, seatName } from './seats'

// Quien pinta el mapa suele necesitar también el nombre de la sala.
export { clusterName }

type ClusterMapViewProps = {
  map: ClusterMap
  /**
   * Si viene, el mapa sirve para elegir puestos: al pulsar uno se llama aquí en
   * vez de enseñar su detalle.
   */
  onPick?: (host: string) => void
  /** Puestos elegidos, en modo elegir. */
  picked?: readonly string[]
  /**
   * Cuándo una reserva de terapia se pinta en azul. Por defecto, solo mientras
   * el grupo está reunido: un puesto reservado para el jueves no tiene por qué
   * salir marcado el martes. Al elegir puestos se pasa otra regla (la que dice
   * si choca con los días y horas que se están eligiendo).
   */
  showReservation?: (reservation: SeatReservation) => boolean
  /** Qué colores explica la leyenda. En modo elegir sobran los de guardia. */
  legend?: readonly LegendItem[]
}

type LegendItem = 'patient' | 'specialist' | 'reserved' | 'clash' | 'occupied' | 'free' | 'picked'

const DEFAULT_LEGEND: readonly LegendItem[] = [
  'specialist',
  'patient',
  'reserved',
  'occupied',
  'free',
]

/** El cluster que más interesa abrir: donde hay alguien de guardia, o si no, donde hay más gente. */
function mostRelevant(clusters: readonly MapCluster[]): string | null {
  const best = [...clusters].sort((a, b) => b.onDuty - a.onDuty || b.occupied - a.occupied)[0]

  return best?.id ?? null
}

/** Clases de color de un puesto. El orden de prioridad lo pone el CSS. */
function seatClasses(seat: MapSeat, picked: boolean, reserved: boolean): string {
  return [
    'seat',
    seat.occupant === null ? 'free' : 'occupied',
    seat.occupant?.duty ?? '',
    seat.occupant?.me === true ? 'me' : '',
    reserved ? 'reserved' : '',
    reserved && seat.reservation?.inSession === true ? 'in-session' : '',
    picked ? 'picked' : '',
  ]
    .filter((name) => name !== '')
    .join(' ')
}

/** Lo que lee un lector de pantalla (y el `title`) en cada puesto. */
function seatLabel(seat: MapSeat, t: Translate, reserved: boolean): string {
  const parts = [seatName(seat.host, t)]

  if (seat.occupant === null) {
    parts.push(t('map.seatFree'))
  } else {
    parts.push(seat.occupant.login)
    if (seat.occupant.duty !== null) parts.push(t(`map.duty.${seat.occupant.duty}`))
  }

  if (reserved) parts.push(t('map.seatReserved'))

  return parts.join(' · ')
}

/**
 * El plano de un campus: un cluster cada vez, con una cuadrícula de puestos.
 *
 * Solo pinta. De dónde sale el mapa y qué pasa al pulsar un puesto lo decide
 * quien lo usa (`ProjectMap` para mirar, `SeatPicker` para elegir).
 */
export function ClusterMapView({
  map,
  onPick,
  picked = [],
  showReservation = (reservation) => reservation.inSession,
  legend = DEFAULT_LEGEND,
}: ClusterMapViewProps) {
  const { t } = useI18n()
  const [chosenCluster, setChosenCluster] = useState<string | null>(null)
  const [openHost, setOpenHost] = useState<string | null>(null)
  // Puesto sobre el que está el ratón (o el foco): su ficha flota al lado.
  const [hovered, setHovered] = useState<Hovered | null>(null)

  const hover = (seat: MapSeat) => (event: MouseEvent | FocusEvent) => {
    if (seat.occupant !== null) {
      setHovered({ seat, rect: event.currentTarget.getBoundingClientRect() })
    }
  }
  const unhover = (): void => {
    setHovered(null)
  }

  const fallback = useMemo(() => mostRelevant(map.clusters), [map.clusters])
  const cluster =
    map.clusters.find((candidate) => candidate.id === chosenCluster) ??
    map.clusters.find((candidate) => candidate.id === fallback)

  if (cluster === undefined) {
    return <p className="estado">{t('map.empty')}</p>
  }

  const byPosition = new Map(cluster.seats.map((seat) => [`${seat.row}:${seat.seat}`, seat]))
  const open = cluster.seats.find((seat) => seat.host === openHost) ?? null
  const rows = Array.from({ length: cluster.rows }, (_, index) => index + 1)
  const columns = Array.from({ length: cluster.seatsPerRow }, (_, index) => index + 1)

  return (
    <div className="cluster-map">
      <div className="filter-pills" role="group" aria-label={t('map.clusters')}>
        {map.clusters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`pill ${entry.id === cluster.id ? 'active' : ''}`}
            aria-pressed={entry.id === cluster.id}
            onClick={() => {
              setChosenCluster(entry.id)
              setOpenHost(null)
            }}
          >
            {clusterName(entry.id, t)}
            <span className="pill-count">
              {entry.onDuty > 0 && <span className="duty-dot" aria-hidden="true" />}
              {entry.occupied}
            </span>
          </button>
        ))}
      </div>

      <div className="map-scroll">
        <div
          className="seat-grid"
          style={{ gridTemplateColumns: `auto repeat(${cluster.seatsPerRow}, var(--seat))` }}
          role="group"
          aria-label={clusterName(cluster.id, t)}
        >
          {rows.map((row) => (
            <div key={row} className="seat-row">
              <span className="row-label" aria-hidden="true">
                {t('map.row', { n: row })}
              </span>
              {columns.map((column) => {
                const seat = byPosition.get(`${row}:${column}`)

                // El plano llega completo; esto solo cubre un hueco inesperado.
                if (seat === undefined) {
                  return <span key={column} className="seat ghost" aria-hidden="true" />
                }

                const isPicked = picked.includes(seat.host)
                const reserved = seat.reservation !== null && showReservation(seat.reservation)
                const label = seatLabel(seat, t, reserved)

                return (
                  <button
                    key={column}
                    type="button"
                    className={`${seatClasses(seat, isPicked, reserved)} ${seat.host === openHost ? 'open' : ''}`}
                    aria-label={label}
                    aria-pressed={onPick === undefined ? seat.host === openHost : isPicked}
                    // Los ocupados ya enseñan su ficha al pasar: el `title` la taparía.
                    title={seat.occupant === null ? label : undefined}
                    onMouseEnter={hover(seat)}
                    onMouseLeave={unhover}
                    onFocus={hover(seat)}
                    onBlur={unhover}
                    onClick={() => {
                      if (onPick === undefined) {
                        setOpenHost(seat.host === openHost ? null : seat.host)
                      } else {
                        onPick(seat.host)
                      }
                    }}
                  >
                    {seat.occupant !== null && (
                      <SeatFace login={seat.occupant.login} image={seat.occupant.image} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {hovered !== null && <SeatHoverCard hovered={hovered} />}
      {open !== null && (
        <SeatDetail
          seat={open}
          reserved={open.reservation !== null && showReservation(open.reservation)}
        />
      )}

      <ul className="map-legend">
        {legend.map((item) => (
          <li key={item}>
            <span
              className={`seat sample ${item === 'clash' ? 'reserved free' : item === 'reserved' ? 'reserved free' : item}`}
            />
            {t(`map.legend.${item}`)}
          </li>
        ))}
      </ul>

      {map.unplaced.length > 0 && (
        <p className="hint">
          {t('map.unplaced')}{' '}
          {map.unplaced.map((entry) => `${entry.login} (${seatName(entry.host, t)})`).join(', ')}
        </p>
      )}
    </div>
  )
}

/** Quién está en el puesto pulsado y si está reservado. */
function SeatDetail({ seat, reserved }: { seat: MapSeat; reserved: boolean }) {
  const { t, lang } = useI18n()
  const { occupant, reservation } = seat

  return (
    <div className="seat-detail" role="status">
      <strong className="seat-host" title={seat.host}>
        {seatName(seat.host, t)}
      </strong>
      {occupant === null ? (
        <span>{t('map.seatFree')}</span>
      ) : (
        <span className="seat-person">
          <Avatar login={occupant.login} image={occupant.image} size={28} />
          <a
            className="profile-link"
            href={`https://profile.intra.42.fr/users/${occupant.login}`}
            target="_blank"
            rel="noreferrer"
          >
            {occupant.login}
          </a>
          {occupant.me && <span className="badge subtle">{t('map.you')}</span>}
          {occupant.duty !== null && (
            <span className={`badge ${occupant.duty === 'specialist' ? 'specialist' : 'on'}`}>
              {t(`map.duty.${occupant.duty}`)}
            </span>
          )}
          {occupant.projects.map((project) => (
            <span key={project} className="chip">
              {project}
            </span>
          ))}
        </span>
      )}
      {reservation !== null && reserved && (
        <span className="seat-reservation">
          {t('map.reservedFor', {
            project: reservation.projectName ?? '?',
            days: reservation.dates
              .map((day) =>
                new Date(`${day}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', {
                  day: 'numeric',
                  month: 'short',
                }),
              )
              .join(', '),
            start: reservation.start,
            end: reservation.end,
          })}
          {reservation.inSession && <span className="badge on">{t('therapy.inSession')}</span>}
        </span>
      )}
    </div>
  )
}
