import { useState } from 'react'
import type { SyntheticEvent } from 'react'

import type { FacilityCategory } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { PillGroup } from '../../shared/ui/PillGroup'
import { Icon } from '../../shared/ui/Icon'

const FACILITY_CATEGORIES: readonly FacilityCategory[] = [
  'computer',
  'peripheral',
  'network',
  'toilets',
  'temperature',
  'light',
  'cleaning',
  'other',
]

/**
 * Avisar al staff de un problema (#77 del buzón): qué pasa, con opciones
 * claras; dónde (si no se dice, tu puesto) y, si hace falta, una nota.
 */
export function FacilityForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [category, setCategory] = useState<FacilityCategory | null>(null)
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const { busy, error, run } = useAction()

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault()
    if (category === null) return
    void run(async () => {
      await api.reportFacility({
        category,
        ...(place.trim() === '' ? {} : { place: place.trim() }),
        ...(note.trim() === '' ? {} : { note: note.trim() }),
      })
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="card facility-form" role="status">
        <strong>
          <Icon name="visto" size={16} /> {t('facility.sent')}
        </strong>
        <button type="button" className="pill" onClick={onDone}>
          {t('common.close')}
        </button>
      </div>
    )
  }

  return (
    <form className="card facility-form" onSubmit={submit}>
      <span className="eyebrow">{t('facility.title')}</span>
      <fieldset className="facility-kinds">
        <legend>{t('facility.what')}</legend>
        <PillGroup
          options={FACILITY_CATEGORIES}
          value={category}
          onChange={setCategory}
          text={(option) => t(`facility.category.${option}`)}
        />
      </fieldset>
      <label>
        {t('facility.where')}
        <input
          value={place}
          maxLength={60}
          placeholder={t('facility.wherePlaceholder')}
          onChange={(event) => {
            setPlace(event.target.value)
          }}
        />
      </label>
      <label>
        {category === 'other' ? t('facility.noteRequired') : t('facility.note')}
        <textarea
          value={note}
          maxLength={500}
          rows={2}
          onChange={(event) => {
            setNote(event.target.value)
          }}
        />
      </label>
      <ErrorNote error={error} />
      <div className="actions">
        <button type="submit" className="primary small" disabled={busy || category === null}>
          {t('facility.send')}
        </button>
        <button type="button" className="pill" onClick={onDone}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
