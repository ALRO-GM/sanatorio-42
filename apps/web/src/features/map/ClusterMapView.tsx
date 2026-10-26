import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent, MouseEvent, RefObject } from 'react'

import type { ClusterMap, MapCluster, MapSeat, SeatReservation } from '@sanatorio/contracts'

import { localeOf, useI18n } from '../../shared/i18n'
import type { Translate } from '../../shared/i18n'
import { PillGroup } from '../../shared/ui/PillGroup'
import { recordHref } from '../../shared/links'
import { fitSeats, ROW_LABEL } from './fit'
import type { Density, SeatFit } from './fit'
import {
  DEFAULT_LOOK,
  loadLook,
  lookClasses,
  MATES,
  order,
  rowsTopDown,
  saveLook,
  screenSide,
} from './look'
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

/** Las opciones de hacia dónde se ve el plano, en el orden de los botones. */
const ORIENTATION = ['flipRows', 'flipSeats', 'flipFacing', 'flat'] as const

/** Ajustar al ancho o tamaño real: las dos pastillas del tamaño (`fit.ts`). */
const ZOOM = ['fit', 'full'] as const

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

/**
 * Los valores de fábrica van fuera del componente: si se crearan en cada
 * pintado, el plano entero (`SeatGrid`, memorizado) se volvería a pintar cada
 * vez que se mueve el ratón.
 */
const NO_PICKS: readonly string[] = []
const IN_SESSION = (reservation: SeatReservation): boolean => reservation.inSession

/** El cluster que más interesa abrir: donde hay alguien de guardia, o si no, donde hay más gente. */
function mostRelevant(clusters: readonly MapCluster[]): string | null {
  const best = [...clusters].sort((a, b) => b.onDuty - a.onDuty || b.occupied - a.occupied)[0]

  return best?.id ?? null
}

/** Clases de color de un puesto. El orden de prioridad lo pone el CSS. */
function seatClasses(seat: MapSeat, picked: boolean, reserved: boolean): string {
  return [
    'seat',
    seat.occupant === null && !seat.taken ? 'free' : 'occupied',
    // Alguien a quien no puedes ver: ocupado, sin cara.
    seat.taken ? 'taken' : '',
    seat.occupant?.duty ?? '',
    seat.occupant?.me === true ? 'me' : '',
    // Roto solo se pinta si está libre: si hay alguien sentado, funciona.
    seat.broken !== null && seat.occupant === null && !seat.taken ? 'broken' : '',
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

  if (seat.taken) {
    parts.push(t('map.seatTaken'))
  } else if (seat.occupant === null) {
    parts.push(t('map.seatFree'))
  } else {
    parts.push(seat.occupant.login)
    if (seat.occupant.duty !== null) parts.push(t(`map.duty.${seat.occupant.duty}`))
  }

  if (reserved) parts.push(t('map.seatReserved'))
  if (seat.broken !== null && seat.occupant === null && !seat.taken) parts.push(t('map.seatBroken'))

  return parts.join(' · ')
}

/**
 * El ancho del contenido de una caja, y cómo cambia (al girar el móvil, al
 * abrir un panel). `null` hasta la primera medida.
 */
function useBoxWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const element = ref.current

    if (element === null) return

    const measure = (): void => {
      const style = window.getComputedStyle(element)
      const inner =
        element.clientWidth -
        (Number.parseFloat(style.paddingLeft) || 0) -
        (Number.parseFloat(style.paddingRight) || 0)

      // Sin maquetar (jsdom, una pestaña oculta) el ancho es 0: no se ajusta.
      setWidth(inner > 0 ? Math.floor(inner) : null)
    }
    const observer = new ResizeObserver(measure)

    measure()
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return width
}

type SeatButtonProps = {
  host: string
  className: string
  label: string
  pressed: boolean
  /** El `title`: solo en los libres (en los ocupados lo tapa la ficha). */
  title: string | undefined
  login: string | null
  image: string | null
  online: boolean
  /** El círculo a la vista, o `null` si no se enseña. */
  circle: number | null
  density: Density
}

/**
 * Un puesto. Solo recibe valores sueltos (textos, números) para que `memo` lo
 * deje como está si no ha cambiado nada suyo: al pasar el ratón, al abrir otro
 * puesto o al refrescar el mapa con lo mismo, cientos de puestos no se vuelven
 * a pintar. Los clics y el ratón los recoge la cuadrícula entera (`SeatGrid`),
 * no cada botón.
 */
const SeatButton = memo(function SeatButton({
  host,
  className,
  label,
  pressed,
  title,
  login,
  image,
  online,
  circle,
  density,
}: SeatButtonProps) {
  return (
    <button
      type="button"
      className={className}
      data-host={host}
      aria-label={label}
      aria-pressed={pressed}
      title={title}
    >
      {login !== null &&
        (density === 'faces' ? (
          <SeatFace key={login} login={login} image={image} />
        ) : density === 'initials' ? (
          <span className="seat-initial">{login.charAt(0).toUpperCase()}</span>
        ) : null)}
      {/* Tiene Sanatorio abierto: un punto verde en la esquina. */}
      {online && <i className="seat-online" />}
      {circle !== null && density !== 'dots' && (
        <b className="seat-circle" aria-hidden="true">
          {circle}
        </b>
      )}
    </button>
  )
})

/** Lo que hace la cuadrícula con un puesto: lo pone `ClusterMapView`, siempre la misma. */
type SeatEvents = {
  click: (seat: MapSeat, button: HTMLElement, event: MouseEvent) => void
  aux: (seat: MapSeat, event: MouseEvent) => void
  hover: (seat: MapSeat | null, button: HTMLElement | null) => void
}

type SeatGridProps = {
  cluster: MapCluster
  me: ClusterMap['me']
  look: MapLook
  openHost: string | null
  picked: readonly string[]
  picking: boolean
  showReservation: (reservation: SeatReservation) => boolean
  spotlight: ReadonlySet<string> | null
  fit: SeatFit
  events: SeatEvents
}

/** El botón de puesto en el que ha caído un evento, con su puesto. */
function seatOf(
  event: { target: EventTarget },
  byHost: ReadonlyMap<string, MapSeat>,
): { seat: MapSeat; button: HTMLElement } | null {
  const target = event.target

  if (!(target instanceof Element)) return null

  const button = target.closest<HTMLElement>('button.seat[data-host]')
  const seat = byHost.get(button?.dataset.host ?? '')

  return button === null || seat === undefined ? null : { seat, button }
}

/**
 * La cuadrícula de un clúster. Va memorizada: la ficha que sale al pasar el
 * ratón vive fuera, así que moverse por el plano no la vuelve a pintar. Un
 * solo manejador por evento para todo el plano, no ocho por puesto.
 */
const SeatGrid = memo(function SeatGrid({
  cluster,
  me,
  look,
  openHost,
  picked,
  picking,
  showReservation,
  spotlight,
  fit,
  events,
}: SeatGridProps) {
  const { t } = useI18n()
  const byHost = useMemo(
    () => new Map(cluster.seats.map((seat) => [seat.host, seat])),
    [cluster.seats],
  )
  const byPosition = useMemo(
    () => new Map(cluster.seats.map((seat) => [`${seat.row}:${seat.seat}`, seat])),
    [cluster.seats],
  )
  const chosen = useMemo(() => new Set(picked), [picked])
  const rows = rowsTopDown(cluster.rows, look)
  const columns = order(cluster.seatsPerRow, look.flipSeats)
  const { size, gap, density } = fit
  const style = {
    gridTemplateColumns: `${String(ROW_LABEL - gap)}px repeat(${String(cluster.seatsPerRow)}, ${String(size)}px)`,
    '--seat': `${String(size)}px`,
    '--seat-gap': `${String(gap)}px`,
  } as CSSProperties

  const hover = (event: MouseEvent | FocusEvent): void => {
    const found = seatOf(event, byHost)

    events.hover(found?.seat ?? null, found?.button ?? null)
  }

  return (
    <div
      className={`seat-grid density-${density} ${look.flat ? '' : 'staggered'}`}
      style={style}
      role="group"
      aria-label={clusterName(cluster.id, t)}
      onMouseOver={hover}
      onMouseLeave={() => {
        events.hover(null, null)
      }}
      onFocus={hover}
      onBlur={() => {
        events.hover(null, null)
      }}
      onMouseDown={(event) => {
        // Sin el desplazamiento automático del botón central.
        if (event.button === 1 && (seatOf(event, byHost)?.seat.occupant ?? null) !== null) {
          event.preventDefault()
        }
      }}
      onAuxClick={(event) => {
        const found = seatOf(event, byHost)

        if (found !== null) events.aux(found.seat, event)
      }}
      onClick={(event) => {
        const found = seatOf(event, byHost)

        if (found !== null) events.click(found.seat, found.button, event)
      }}
    >
      {rows.map((row) => (
        <div key={row} className="seat-row">
          <span className="row-label" aria-hidden="true">
            {density === 'faces' ? t('map.row', { n: row }) : row}
          </span>
          {columns.map((column) => {
            const seat = byPosition.get(`${row}:${column}`)

            // El plano llega completo; esto solo cubre un hueco inesperado.
            if (seat === undefined) {
              return <span key={column} className="seat ghost" aria-hidden="true" />
            }

            const isPicked = chosen.has(seat.host)
            const reserved = seat.reservation !== null && showReservation(seat.reservation)
            const label = seatLabel(seat, t, reserved)
            const occupant = seat.occupant

            return (
              <SeatButton
                key={column}
                host={seat.host}
                className={[
                  seatClasses(seat, isPicked, reserved),
                  `screen-${screenSide(seat.seat, look)}`,
                  seat.host === openHost ? 'open' : '',
                  ...lookClasses(seat, me, look),
                  ...(spotlight === null || occupant === null
                    ? []
                    : [spotlight.has(occupant.login) ? 'spot' : 'dim']),
                ]
                  .filter((name) => name !== '')
                  .join(' ')}
                label={label}
                pressed={picking ? isPicked : seat.host === openHost}
                title={occupant === null ? label : undefined}
                login={occupant?.login ?? null}
                image={occupant?.image ?? null}
                online={occupant?.online === true}
                circle={
                  look.circles && typeof occupant?.circle === 'number' ? occupant.circle : null
                }
                density={density}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
})

/**
 * El plano de un campus: un cluster cada vez, con una cuadrícula de puestos.
 *
 * Solo pinta. De dónde sale el mapa y qué pasa al pulsar un puesto lo decide
 * quien lo usa (`ProjectMap` para mirar, `SeatPicker` para elegir).
 *
 * Los clústeres grandes (París) se encogen para caber a lo ancho, con cara,
 * con inicial o como puntos según el sitio (`fit.ts`); «100 %» los devuelve a
 * su tamaño, deslizándose de lado.
 */
export function ClusterMapView({
  map,
  onPick,
  onChat,
  picked = NO_PICKS,
  showReservation = IN_SESSION,
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
  const box = useRef<HTMLDivElement>(null)
  const width = useBoxWidth(box)
  const change = (next: MapLook): void => {
    setLook(next)
    saveLook(next)
  }
  // Al elegir puestos el plano se ve de fábrica: sin giros ni resaltados. El
  // tamaño sí es el que cada cual haya elegido.
  const tools = onPick === undefined
  const shown = useMemo<MapLook>(
    () => (tools ? look : { ...DEFAULT_LOOK, fit: look.fit }),
    [tools, look],
  )

  // Lo último que se ha pintado, para que los manejadores de la cuadrícula
  // sean siempre los mismos y no la obliguen a pintarse otra vez.
  const latest = useRef({ openHost, onPick, tools })

  latest.current = { openHost, onPick, tools }

  const events = useMemo<SeatEvents>(
    () => ({
      click: (seat, button, event) => {
        const now = latest.current

        if (now.tools && (event.ctrlKey || event.metaKey) && seat.occupant !== null) {
          openRecord(seat)
        } else if (now.onPick === undefined) {
          setOpenAnchor(button)
          setOpenHost(seat.host === now.openHost ? null : seat.host)
        } else {
          now.onPick(seat.host)
        }
      },
      aux: (seat, event) => {
        // El botón central (o con Ctrl o Cmd) abre su expediente en otra pestaña.
        if (event.button === 1 && latest.current.tools) openRecord(seat)
      },
      hover: (seat, button) => {
        // Si es el mismo puesto, el mismo estado: React no vuelve a pintar.
        setHovered((before) =>
          seat === null || button === null || seat.occupant === null
            ? null
            : before?.seat === seat && before.anchor === button
              ? before
              : { seat, anchor: button },
        )
      },
    }),
    [],
  )

  // La ficha fijada sigue a su puesto al deslizar la página o el plano, y se
  // cierra con Escape o al pulsar fuera. Seguirla es un pintado por fotograma
  // como mucho, y solo de la ficha: el plano está memorizado.
  useEffect(() => {
    if (openHost === null) return

    let frame = 0
    const follow = (): void => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        setMoved((count) => count + 1)
      })
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenHost(null)
    }
    const onDown = (event: PointerEvent): void => {
      const target = event.target

      // Pulsar otro puesto ya cambia de ficha: eso lo lleva su propio clic. Y
      // lo de debajo del plano (avisar de que no funciona) es del puesto abierto.
      if (
        target instanceof Element &&
        target.closest('.seat-hover.pinned, .seat, .seat-detail') !== null
      )
        return

      setOpenHost(null)
    }

    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [openHost])

  const fallback = useMemo(() => mostRelevant(map.clusters), [map.clusters])
  const cluster =
    map.clusters.find((candidate) => candidate.id === chosenCluster) ??
    map.clusters.find((candidate) => candidate.id === fallback)
  const fit = useMemo(
    () => fitSeats(width, cluster?.seatsPerRow ?? 0, shown.fit),
    [width, cluster?.seatsPerRow, shown.fit],
  )

  if (cluster === undefined) {
    return <p className="estado">{t('map.empty')}</p>
  }

  const open = cluster.seats.find((seat) => seat.host === openHost) ?? null
  const reservation = open?.reservation ?? null
  const openReservation = reservation !== null && showReservation(reservation) ? reservation : null
  // El puesto abierto, si hay alguien sentado: es el que lleva ficha fijada.
  const openTaken = open?.occupant === undefined || open.occupant === null ? null : open

  return (
    <div className="cluster-map">
      <PillGroup
        options={map.clusters.map((entry) => entry.id)}
        value={cluster.id}
        onChange={(id) => {
          setChosenCluster(id)
          setOpenHost(null)
          setHovered(null)
        }}
        label={t('map.clusters')}
        text={(id) => {
          const entry = map.clusters.find((one) => one.id === id)

          return (
            <>
              {clusterName(id, t)}
              <span className="pill-count">
                {(entry?.onDuty ?? 0) > 0 && <span className="duty-dot" aria-hidden="true" />}
                {entry?.occupied ?? 0}
              </span>
            </>
          )
        }}
      />

      {(tools || fit.overflows) && (
        <div className="map-bar">
          {tools && (
            <div className="map-tools" role="group" aria-label={t('map.look')}>
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
                        mates: on
                          ? look.mates.filter((one) => one !== mate)
                          : [...look.mates, mate],
                      })
                    }}
                  >
                    <i className={`mate-dot mate-${mate}`} aria-hidden="true" />
                    {t(`map.mate.${mate}`)}
                  </button>
                )
              })}
              <span className="map-tools-sep" aria-hidden="true" />
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
            </div>
          )}

          {/* Solo si el clúster no cabe a tamaño real: ajustarlo o verlo al 100 %. Va
          en la misma fila que los resaltados, a la derecha. */}
          {fit.overflows && (
            <PillGroup
              className="map-zoom"
              options={ZOOM}
              value={shown.fit ? 'fit' : 'full'}
              onChange={(zoom) => {
                change({ ...look, fit: zoom === 'fit' })
              }}
              label={t('map.zoomLabel')}
              text={(zoom) => (zoom === 'fit' ? t('map.zoomFit') : t('map.zoomFull'))}
            />
          )}
        </div>
      )}

      <div className="map-scroll" ref={box}>
        <SeatGrid
          cluster={cluster}
          me={map.me}
          look={shown}
          openHost={openHost}
          picked={picked}
          picking={!tools}
          showReservation={showReservation}
          spotlight={spotlight}
          fit={fit}
          events={events}
        />
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
          <span>
            {open.taken
              ? t('map.seatTaken')
              : open.broken === null
                ? t('map.seatFree')
                : t('map.seatBroken')}
          </span>
          {openReservation !== null && <ReservationNote reservation={openReservation} />}
          {onBroken !== undefined && !open.taken && (
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

      {/* La colocación se ajusta una vez y se olvida: plegada, debajo del plano. */}
      {tools && (
        <details className="map-placement">
          <summary>{t('map.placement')}</summary>
          <div className="map-tools" role="group" aria-label={t('map.placement')}>
            {ORIENTATION.map((option) => (
              <button
                key={option}
                type="button"
                className={`pill ${look[option] ? 'active' : ''}`}
                aria-pressed={look[option]}
                onClick={() => {
                  change({ ...look, [option]: !look[option] })
                }}
              >
                {t(`map.${option}`)}
              </button>
            ))}
          </div>
        </details>
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
