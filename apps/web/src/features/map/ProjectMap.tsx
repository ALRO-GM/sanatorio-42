import { useEffect } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { ClusterMapView } from './ClusterMapView'

// La API responde de su copia local, así que refrescar no gasta peticiones de 42.
const REFRESH_MS = 60_000

/**
 * El mapa de la sala de espera de un proyecto: quién hay en cada puesto, con la
 * gente de guardia para ese proyecto resaltada y los puestos de terapia en azul.
 */
export function ProjectMap({
  projectId,
  spotlight = null,
}: {
  projectId: number
  /** Si viene, se resalta a esta gente y se apaga al resto (los filtros de la lista). */
  spotlight?: ReadonlySet<string> | null
}) {
  const { t } = useI18n()
  const { data, error, loading, reload } = useAsync(() => api.getProjectMap(projectId), [projectId])

  useEffect(() => {
    const timer = setInterval(() => {
      // Con la pestaña en segundo plano no se pregunta: nadie lo está mirando.
      if (!document.hidden) void reload()
    }, REFRESH_MS)

    return () => {
      clearInterval(timer)
    }
  }, [reload])

  return (
    <section className="card map-card" aria-label={t('map.title')}>
      <h3>{t('map.title')}</h3>
      {loading && <p>{t('map.loading')}</p>}
      {data === undefined ? (
        <ErrorNote error={error} onRetry={() => void reload()} />
      ) : (
        <ClusterMapView map={data} spotlight={spotlight} />
      )}
    </section>
  )
}
