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
}

/**
 * El mapa del campus para elegir puestos: pulsar uno lo añade o lo quita.
 *
 * No deja elegir un puesto que ya tiene reservado otro grupo.
 */
export function SeatPicker({ value, onToggle }: SeatPickerProps) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getCampusMap(), [])

  if (loading) {
    return <p>{t('map.loading')}</p>
  }

  if (data === undefined) {
    return <ErrorNote error={error} onRetry={() => void reload()} />
  }

  const reserved = new Set(
    data.clusters
      .flatMap((cluster) => cluster.seats)
      .filter((seat) => seat.reservation !== null)
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
      legend={['picked', 'reserved', 'occupied', 'free']}
    />
  )
}
