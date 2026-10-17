import type { FacilityReport } from '@sanatorio/contracts'

import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'

type FacilityListProps = {
  load: () => Promise<FacilityReport[]>
  resolve: (id: number) => Promise<void>
  /** El staff ve todos los campus: se dice de cuál es cada aviso. */
  showCampus?: boolean
}

/**
 * Los avisos de problemas del edificio: primero los abiertos, del más nuevo al
 * más viejo, y después los resueltos esta semana. Cada uno se da por resuelto
 * con un botón.
 */
export function FacilityList({ load, resolve, showCampus = false }: FacilityListProps) {
  const { t, lang } = useI18n()
  const reports = useAsync(load, [])
  const when = (at: string): string =>
    new Date(at).toLocaleString(localeOf(lang), {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="facility-list">
      <ErrorNote error={reports.error} onRetry={() => void reports.reload()} />
      {reports.data?.length === 0 && <p className="estado">{t('facility.none')}</p>}
      <ul className="stack">
        {reports.data?.map((report) => (
          <li
            key={report.id}
            className={`card facility-item ${report.resolvedAt === null ? '' : 'resolved'}`}
          >
            <span className="facility-head">
              <strong>{t(`facility.category.${report.category}`)}</strong>
              <span className="chip">{report.place}</span>
              {showCampus && report.campusName !== '' && (
                <small className="hint">{report.campusName}</small>
              )}
            </span>
            {report.note !== null && <p>{report.note}</p>}
            <small className="hint">
              {t('facility.by', { login: report.login, when: when(report.createdAt) })}
              {report.resolvedAt !== null &&
                ` · ${t('facility.resolvedBy', { by: report.resolvedBy ?? '', when: when(report.resolvedAt) })}`}
            </small>
            {report.resolvedAt === null && (
              <button
                type="button"
                className="pill"
                onClick={() => {
                  void resolve(report.id).then(() => reports.reload())
                }}
              >
                {t('facility.resolve')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
