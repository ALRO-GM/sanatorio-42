import { useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'

const SEEN_KEY = 'sanatorio_other_campus_seen'

const seen = (campusId: number): boolean => {
  try {
    return localStorage.getItem(SEEN_KEY) === String(campusId)
  } catch {
    return false
  }
}

/**
 * Para quien entra desde un campus que aún no se copia (#92): lo que ve es de
 * otro campus, y si se juntan cinco personas más del suyo lo añadimos; con
 * diez, también su idioma. Se cierra y no vuelve a salir para ese campus.
 */
export function OtherCampusNotice({ campusId }: { campusId: number }) {
  const { t } = useI18n()
  // Es informativo: mientras carga o si falla, el aviso no sale (no hay nada que arreglar).
  const campuses = useAsync(() => api.getCampuses(), [])
  const [closed, setClosed] = useState(() => seen(campusId))
  const mine = campuses.data?.find((campus) => campus.id === campusId)
  const tracked = (campuses.data ?? []).filter((campus) => campus.tracked)

  if (closed || mine === undefined || mine.tracked || tracked.length === 0) return null

  return (
    <aside className="notice other-campus" role="status">
      <p>
        {t('campus.other', {
          campus: mine.name,
          tracked: tracked.map((campus) => campus.name).join(', '),
        })}
      </p>
      <button
        type="button"
        className="pill"
        onClick={() => {
          try {
            localStorage.setItem(SEEN_KEY, String(campusId))
          } catch {
            // Sin almacenamiento se cierra igual; volverá a salir la próxima vez.
          }
          setClosed(true)
        }}
      >
        {t('common.ok')}
      </button>
    </aside>
  )
}
