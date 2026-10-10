import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

import type { SyncStatus } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { LangSelect } from './LangSelect'

type SettingsProps = {
  /** Campus que se está mirando. `undefined` mientras carga el perfil. */
  campusId: number | undefined
  onCampusChange: (campusId: number) => Promise<void>
}

/**
 * Ajustes del pie: idioma, campus y de cuándo son los datos de 42.
 *
 * Van en el pie y no en la cabecera, que tiene que seguir cabiendo en una fila.
 */
export function Settings({ campusId, onCampusChange }: SettingsProps) {
  const { t } = useI18n()
  const campuses = useAsync(() => api.getCampuses(), [])
  const [saving, setSaving] = useState(false)

  const change = async (event: ChangeEvent<HTMLSelectElement>): Promise<void> => {
    setSaving(true)

    try {
      await onCampusChange(Number(event.target.value))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings" aria-label={t('settings.label')}>
      <LangSelect />
      {campuses.data !== undefined && campuses.data.length > 0 && campusId !== undefined && (
        <label className="setting">
          <span>{t('settings.campus')}</span>
          <select value={campusId} onChange={(event) => void change(event)} disabled={saving}>
            {campuses.data.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
                {campus.tracked ? '' : ` (${t('settings.campusLazy')})`}
              </option>
            ))}
          </select>
        </label>
      )}
      <SyncNote campusId={campusId} />
    </div>
  )
}

/** "Puestos actualizados hace 2 min", o cuánto falta por copiar del campus. */
function SyncNote({ campusId }: { campusId: number | undefined }) {
  const { t } = useI18n()
  const [status, setStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    let current = true
    const load = (): void => {
      api.getSyncStatus().then(
        (next) => {
          if (current) setStatus(next)
        },
        () => {
          // Es informativo: si falla, simplemente no se enseña.
        },
      )
    }

    load()
    const timer = setInterval(load, 60_000)

    return () => {
      current = false
      clearInterval(timer)
    }
  }, [])

  const campus = status?.campuses.find((entry) => entry.id === campusId)

  if (campus === undefined) {
    return null
  }

  const { phase, rows, total } = campus.backfill

  if (phase !== 'done') {
    return (
      <span className="sync-note">
        {total !== null && total > 0
          ? t('sync.copying', { pct: Math.min(99, Math.round((rows / total) * 100)) })
          : t('sync.copyingStart')}
      </span>
    )
  }

  if (campus.locationsAt === null) {
    return null
  }

  const min = Math.round((Date.now() - Date.parse(campus.locationsAt)) / 60_000)

  return <span className="sync-note">{min < 1 ? t('sync.now') : t('sync.fresh', { min })}</span>
}
