import { useI18n } from '../../shared/i18n'
import { TEXT_SIZES, useComfort } from '../../shared/comfort'

/** Tamaño del texto, colores para daltonismo y modo zen. */
export function ComfortSettings() {
  const { t } = useI18n()
  const [comfort, setComfort] = useComfort()

  return (
    <>
      <label className="setting">
        <span>{t('settings.text')}</span>
        <select
          value={comfort.text}
          onChange={(event) => {
            const value = event.target.value
            const size = TEXT_SIZES.find((option) => String(option) === value)

            setComfort({ ...comfort, text: size ?? 'auto' })
          }}
        >
          <option value="auto">{t('settings.text.auto')}</option>
          {TEXT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} %
            </option>
          ))}
        </select>
      </label>
      <label className="setting duty-check" title={t('settings.cvdHint')}>
        <input
          type="checkbox"
          checked={comfort.cvd}
          onChange={(event) => {
            setComfort({ ...comfort, cvd: event.target.checked })
          }}
        />
        <span>{t('settings.cvd')}</span>
      </label>
      <label className="setting duty-check" title={t('settings.zenHint')}>
        <input
          type="checkbox"
          checked={comfort.zen}
          onChange={(event) => {
            setComfort({ ...comfort, zen: event.target.checked })
          }}
        />
        <span>{t('settings.zen')}</span>
      </label>
    </>
  )
}
