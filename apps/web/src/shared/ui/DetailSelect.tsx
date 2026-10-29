import { DETAILS, setDetail, useDetail } from '../detail'
import { useI18n } from '../i18n'

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
