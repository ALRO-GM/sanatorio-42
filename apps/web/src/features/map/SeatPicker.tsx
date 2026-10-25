import { useState } from 'react'

import type { MapSeat, SeatReservation } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ClusterMapView } from './ClusterMapView'
import { proposeSeats } from './propose'

type SeatPickerProps = {
  /** Puestos elegidos hasta ahora. */
  value: readonly string[]
  /**
   * Se ha pulsado un puesto que se puede elegir. Quien usa el selector decide si
   * lo añade o lo quita (y aplica su tope): así dos pulsaciones seguidas no se
   * pisan, porque cada una parte del estado más reciente.
   */
  onToggle: (host: string) => void
  /**
   * Días y horas para los que se están eligiendo los puestos. Un puesto que otro
   * grupo tiene reservado solo estorba si coincide en día y hora.
   */
  when: { dates: readonly string[]; start: string; end: string }
  /** Cambia todos los elegidos de golpe por los que propone el mapa. */
  onPropose: (hosts: string[]) => void
  /** Cuántos puestos se pueden elegir como mucho. */
  max: number
}

/**
 * El mapa del campus para elegir puestos: pulsar uno lo añade o lo quita.
 *
 * No deja elegir un puesto que ya tiene reservado otro grupo.
 */
export function SeatPicker({ value, onToggle, when, onPropose, max }: SeatPickerProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getCampusMap(), [])
  // Cuántos puestos se quieren proponer, y si la última vez no había hueco.
  const [wanted, setWanted] = useState(Math.min(4, max))
  const [noRoom, setNoRoom] = useState(false)

  if (loading) {
    return <p>{t('map.loading')}</p>
  }

  if (data === undefined) {
    return <ErrorNote error={error} onRetry={() => void reload()} />
  }

  /** `true` si esa reserva coincide en algún día y se pisa en la hora con lo que se elige. */
  const clashes = (reservation: SeatReservation): boolean =>
    reservation.dates.some((day) => when.dates.includes(day)) &&
    reservation.start < when.end &&
    when.start < reservation.end

  const reserved = new Set(
    data.clusters
      .flatMap((cluster) => cluster.seats)
      .filter((seat) => seat.reservation !== null && clashes(seat.reservation))
      .map((seat) => seat.host),
  )

  const broken = new Set(
    data.clusters
      .flatMap((cluster) => cluster.seats)
      .filter((seat) => seat.broken !== null && seat.occupant === null && !seat.taken)
      .map((seat) => seat.host),
  )

  const toggle = (host: string): void => {
    // Un puesto que ya tiene otro grupo, o que no funciona, no se puede elegir.
    if (!reserved.has(host) && !broken.has(host)) onToggle(host)
  }

  const propose = (): void => {
    const hosts = proposeSeats(data, wanted, (seat: MapSeat) => reserved.has(seat.host))

    setNoRoom(hosts === null)
    if (hosts !== null) onPropose(hosts)
  }

  return (
    <>
      <div className="seat-propose">
        <label>
          {t('map.proposeHow')}
          <select
            value={wanted}
            onChange={(event) => {
              setWanted(Number(event.target.value))
            }}
          >
            {Array.from({ length: max - 1 }, (_, index) => index + 2).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="pill active" onClick={propose}>
          {t('map.propose')}
        </button>
        <span className="hint">{noRoom ? t('map.proposeNone') : t('map.proposeHint')}</span>
      </div>
      <ClusterMapView
        map={data}
        picked={value}
        onPick={toggle}
        showReservation={clashes}
        legend={['picked', 'clash', 'occupied', 'free', 'broken']}
      />
    </>
  )
}
