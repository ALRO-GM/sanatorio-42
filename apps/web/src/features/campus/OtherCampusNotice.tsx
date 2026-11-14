import { useState } from 'react'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'

const SEEN_KEY = 'sanatorio_other_campus_seen'

/**
 * Cuántas personas más de un campus hacen falta para copiar sus datos, y
 * cuántas para traducir la web a su idioma (#92 del buzón: 10 y 50; antes,
 * cinco y diez). Copiar un campus gasta cuota de 42 y una traducción, horas:
 * con menos gente no compensa.
 */
const PEOPLE_FOR_DATA = 10
const PEOPLE_FOR_LANGUAGE = 50

const seen = (campusId: number): boolean => {
  try {
    return localStorage.getItem(SEEN_KEY) === String(campusId)
  } catch {
    return false
  }
}

/**
 * Para quien entra desde un campus que aún no se copia (#92): lo que ve es de
 * otro campus, y si se juntan diez personas más del suyo lo añadimos; con
 * cincuenta, también su idioma. Se cierra y no vuelve a salir para ese campus.
 */
export function OtherCampusNotice({ campusId }: { campusId: number }) {
  const { t, tn } = useI18n()
  // Es informativo: mientras carga o si falla, el aviso no sale (no hay nada que arreglar).
  const campuses = useAsync(() => api.getCampuses(), [])
  const [closed, setClosed] = useState(() => seen(campusId))
  const mine = campuses.data?.find((campus) => campus.id === campusId)
  const tracked = (campuses.data ?? []).filter((campus) => campus.tracked)

  if (closed || mine === undefined || mine.tracked || tracked.length === 0) return null

  return (
    <aside className="notice other-campus" role="status">
      <p>
        {tn('campus.other', PEOPLE_FOR_DATA, {
          campus: mine.name,
          tracked: tracked.map((campus) => campus.name).join(', '),
          language: PEOPLE_FOR_LANGUAGE,
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
