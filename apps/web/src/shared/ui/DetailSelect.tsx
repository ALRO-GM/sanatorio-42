import { DETAILS, isDetail, setDetail, useDetail } from '../detail'
import { useI18n } from '../i18n'

/** Selector del modo de la interfaz, en el pie y en Personalizar. */
export function DetailSelect() {
  const { t } = useI18n()
  const detail = useDetail()

  return (
    <label className="setting" title={t(`settings.detail.${detail}.hint`)}>
      <span>{t('settings.detail')}</span>
      <select
        value={detail}
        onChange={(event) => {
          if (isDetail(event.target.value)) setDetail(event.target.value)
        }}
      >
        {DETAILS.map((option) => (
          <option key={option} value={option}>
            {t(`settings.detail.${option}`)}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Los tres modos como tarjetas, con lo que enseña cada uno: para la bienvenida. */
export function DetailCards() {
  const { t } = useI18n()
  const detail = useDetail()

  return (
    <div className="detail-cards" role="radiogroup" aria-label={t('settings.detail')}>
      {DETAILS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={detail === option}
          className={`detail-card ${detail === option ? 'active' : ''}`}
          onClick={() => {
            setDetail(option)
          }}
        >
          <strong>{t(`settings.detail.${option}`)}</strong>
          <small>{t(`settings.detail.${option}.hint`)}</small>
        </button>
      ))}
    </div>
  )
}
