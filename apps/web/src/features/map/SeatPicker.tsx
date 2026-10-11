import type { SeatReservation } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ClusterMapView } from './ClusterMapView'

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
}

/**
 * El mapa del campus para elegir puestos: pulsar uno lo añade o lo quita.
 *
 * No deja elegir un puesto que ya tiene reservado otro grupo.
 */
export function SeatPicker({ value, onToggle, when }: SeatPickerProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getCampusMap(), [])

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

  const toggle = (host: string): void => {
    // Un puesto que ya tiene otro grupo no se puede elegir.
    if (!reserved.has(host)) onToggle(host)
  }

  return (
    <ClusterMapView
      map={data}
      picked={value}
      onPick={toggle}
      showReservation={clashes}
      legend={['picked', 'clash', 'occupied', 'free']}
    />
  )
}
