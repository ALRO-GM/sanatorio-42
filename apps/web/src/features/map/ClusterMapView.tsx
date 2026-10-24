import { useEffect, useMemo, useState } from 'react'
import type { FocusEvent, MouseEvent } from 'react'

import type { ClusterMap, MapCluster, MapSeat, SeatReservation } from '@sanatorio/contracts'

import { localeOf, useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import { recordHref } from '../../shared/links'
import { loadLook, lookClasses, MATES, order, saveLook } from './look'
import type { MapLook } from './look'
import { SeatFace } from './SeatFace'
import { SeatHoverCard } from './SeatHoverCard'
import type { Hovered } from './SeatHoverCard'
import { clusterName, seatName } from '../../shared/seats'

// Quien pinta el mapa suele necesitar también el nombre de la sala.
export { clusterName }

type ClusterMapViewProps = {
  map: ClusterMap
  /**
   * Si viene, el mapa sirve para elegir puestos: al pulsar uno se llama aquí en
   * vez de enseñar su detalle.
   */
  onPick?: (host: string) => void
  /** Si viene, la ficha de quien ocupa un puesto ofrece escribirle. */
  onChat?: (login: string) => void
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
  /** Si viene, se resalta a esta gente y se apaga al resto (los filtros de una lista). */
  spotlight?: ReadonlySet<string> | null
  /** Si viene, en un puesto libre se puede avisar de que no funciona, o de que ya sí. */
  onBroken?: ((host: string, broken: boolean) => void) | undefined
}

/** Abre el expediente de quien ocupa un puesto en otra pestaña. */
function openRecord(seat: MapSeat): void {
  if (seat.occupant !== null) window.open(recordHref(seat.occupant.login), '_blank', 'noopener')
}

type LegendItem =
  | 'patient'
  | 'specialist'
  | 'reserved'
  | 'clash'
  | 'occupied'
  | 'free'
  | 'picked'
  | 'online'
  | 'broken'

const DEFAULT_LEGEND: readonly LegendItem[] = [
  'specialist',
  'patient',
  'reserved',
  'occupied',
  'free',
  'broken',
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
    // Roto solo se pinta si está libre: si hay alguien sentado, funciona.
    seat.broken !== null && seat.occupant === null ? 'broken' : '',
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
  if (seat.broken !== null && seat.occupant === null) parts.push(t('map.seatBroken'))

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
  onChat,
  picked = [],
  showReservation = (reservation) => reservation.inSession,
  legend = DEFAULT_LEGEND,
  spotlight = null,
  onBroken,
}: ClusterMapViewProps) {
  const { t } = useI18n()
  const [chosenCluster, setChosenCluster] = useState<string | null>(null)
  const [openHost, setOpenHost] = useState<string | null>(null)
  // El botón del puesto abierto: su ficha se queda fijada junto a él.
  const [openAnchor, setOpenAnchor] = useState<Element | null>(null)
  // Puesto sobre el que está el ratón (o el foco): su ficha flota al lado.
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const [, setMoved] = useState(0)
  // Girado, con círculos y a quién resaltar: lo elige cada cual y se recuerda.
  const [look, setLook] = useState<MapLook>(loadLook)
  const change = (next: MapLook): void => {
    setLook(next)
    saveLook(next)
  }
  // Al elegir puestos el plano se ve tal cual: sin giros ni resaltados.
  const tools = onPick === undefined
  const shown: MapLook = tools ? look : { flip: false, circles: false, mates: [] }

  const hover = (seat: MapSeat) => (event: MouseEvent | FocusEvent) => {
    if (seat.occupant !== null) {
      setHovered({ seat, anchor: event.currentTarget })
    }
  }

  // La ficha fijada sigue a su puesto al deslizar la página o el plano, y se
  // cierra con Escape o al pulsar fuera.
  useEffect(() => {
    if (openHost === null) return

    const follow = (): void => {
      setMoved((count) => count + 1)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenHost(null)
    }
    const onDown = (event: PointerEvent): void => {
      const target = event.target

      // Pulsar otro puesto ya cambia de ficha: eso lo lleva su propio clic.
      if (target instanceof Element && target.closest('.seat-hover.pinned, .seat') !== null) return

      setOpenHost(null)
    }

    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)

    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [openHost])
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
  const reservation = open?.reservation ?? null
  const openReservation = reservation !== null && showReservation(reservation) ? reservation : null
  // El puesto abierto, si hay alguien sentado: es el que lleva ficha fijada.
  const openTaken = open?.occupant === undefined || open.occupant === null ? null : open
  const rows = order(cluster.rows, shown.flip)
  const columns = order(cluster.seatsPerRow, shown.flip)

  return (
    <div className="cluster-map">
      <PillGroup
        options={map.clusters.map((entry) => entry.id)}
        value={cluster.id}
        onChange={(id) => {
          setChosenCluster(id)
          setOpenHost(null)
        }}
        label={t('map.clusters')}
        text={(id) => {
          const entry = map.clusters.find((one) => one.id === id)

          return (
            <>
              {clusterName(id, t)}
              <span className="pill-count">
                {(entry?.onDuty ?? 0) > 0 && <span className="duty-dot" aria-hidden="true" />}
                {entry?.occupied}
              </span>
            </>
          )
        }}
      />

      {tools && (
        <div className="map-tools" role="group" aria-label={t('map.look')}>
          <button
            type="button"
            className={`pill ${look.flip ? 'active' : ''}`}
            aria-pressed={look.flip}
            onClick={() => {
              change({ ...look, flip: !look.flip })
            }}
          >
            ⟲ {t('map.flip')}
          </button>
          <button
            type="button"
            className={`pill ${look.circles ? 'active' : ''}`}
            aria-pressed={look.circles}
            onClick={() => {
              change({ ...look, circles: !look.circles })
            }}
          >
            {t('map.circles')}
          </button>
          <span className="map-tools-label">{t('map.highlight')}</span>
          {MATES.map((mate) => {
            const on = look.mates.includes(mate)

            return (
              <button
                key={mate}
                type="button"
                className={`pill mate-pill mate-${mate} ${on ? 'active' : ''}`}
                aria-pressed={on}
                disabled={mate === 'circle' && map.me.circle === null}
                onClick={() => {
                  change({
                    ...look,
                    mates: on ? look.mates.filter((one) => one !== mate) : [...look.mates, mate],
                  })
                }}
              >
                <i className={`mate-dot mate-${mate}`} aria-hidden="true" />
                {t(`map.mate.${mate}`)}
              </button>
            )
          })}
        </div>
      )}

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
                    className={[
                      seatClasses(seat, isPicked, reserved),
                      seat.host === openHost ? 'open' : '',
                      ...lookClasses(seat, map.me, shown),
                      ...(spotlight === null || seat.occupant === null
                        ? []
                        : [spotlight.has(seat.occupant.login) ? 'spot' : 'dim']),
                    ].join(' ')}
                    aria-label={label}
                    aria-pressed={onPick === undefined ? seat.host === openHost : isPicked}
                    // Los ocupados ya enseñan su ficha al pasar: el `title` la taparía.
                    title={seat.occupant === null ? label : undefined}
                    onMouseEnter={hover(seat)}
                    onMouseLeave={unhover}
                    onFocus={hover(seat)}
                    onBlur={unhover}
                    // El botón central (o con Ctrl o Cmd) abre su expediente en otra pestaña.
                    onMouseDown={(event) => {
                      // Sin el desplazamiento automático del botón central.
                      if (event.button === 1 && seat.occupant !== null) event.preventDefault()
                    }}
                    onAuxClick={(event) => {
                      if (event.button === 1 && tools) openRecord(seat)
                    }}
                    onClick={(event) => {
                      if (tools && (event.ctrlKey || event.metaKey) && seat.occupant !== null) {
                        openRecord(seat)
                      } else if (onPick === undefined) {
                        setOpenAnchor(event.currentTarget)
                        setOpenHost(seat.host === openHost ? null : seat.host)
                      } else {
                        onPick(seat.host)
                      }
                    }}
                  >
                    {seat.occupant !== null && (
                      <SeatFace login={seat.occupant.login} image={seat.occupant.image} />
                    )}
                    {/* Tiene Sanatorio abierto: un punto verde en la esquina. */}
                    {seat.occupant?.online === true && <i className="seat-online" />}
                    {shown.circles && typeof seat.occupant?.circle === 'number' && (
                      <b className="seat-circle" aria-hidden="true">
                        {seat.occupant.circle}
                      </b>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* La del ratón no sale encima de la que ya está fijada. */}
      {hovered !== null && hovered.seat.host !== openHost && <SeatHoverCard hovered={hovered} />}
      {openTaken !== null && openAnchor !== null && (
        <SeatHoverCard
          hovered={{ seat: openTaken, anchor: openAnchor }}
          pinned={{
            onChat,
            onClose: () => {
              setOpenHost(null)
            },
            extra: openReservation !== null && <ReservationNote reservation={openReservation} />,
          }}
        />
      )}
      {/* Un puesto libre no tiene ficha: lo suyo se dice debajo del plano. */}
      {open !== null && openTaken === null && (
        <div className="seat-detail" role="status">
          <strong className="seat-host" title={open.host}>
            {seatName(open.host, t)}
          </strong>
          <span>{open.broken === null ? t('map.seatFree') : t('map.seatBroken')}</span>
          {openReservation !== null && <ReservationNote reservation={openReservation} />}
          {onBroken !== undefined && (
            <button
              type="button"
              className="pill"
              onClick={() => {
                onBroken(open.host, open.broken === null)
              }}
            >
              {open.broken === null ? t('map.reportBroken') : t('map.fixed')}
            </button>
          )}
        </div>
      )}

      <ul className="map-legend">
        {legend.map((item) => (
          <li key={item}>
            <span
              className={`seat sample ${item === 'clash' ? 'reserved free' : item === 'reserved' ? 'reserved free' : item === 'online' ? 'occupied' : item === 'broken' ? 'free broken' : item}`}
            >
              {item === 'online' && <i className="seat-online" />}
            </span>
            {t(`map.legend.${item}`)}
          </li>
        ))}
      </ul>

      {tools && <p className="hint">{t('map.middleClick')}</p>}

      {map.unplaced.length > 0 && (
        <p className="hint">
          {t('map.unplaced')}{' '}
          {map.unplaced.map((entry) => `${entry.login} (${seatName(entry.host, t)})`).join(', ')}
        </p>
      )}
    </div>
  )
}

/** Para qué proyecto y cuándo está reservado un puesto. */
function ReservationNote({ reservation }: { reservation: SeatReservation }) {
  const { t, lang } = useI18n()

  return (
    <span className="seat-reservation">
      {t('map.reservedFor', {
        project: reservation.projectName ?? '?',
        days: reservation.dates
          .map((day) =>
            new Date(`${day}T12:00:00`).toLocaleDateString(localeOf(lang), {
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
  )
}
