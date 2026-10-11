import { useI18n } from '../../shared/i18n'
import { THEME_CHOICES, useTheme } from '../../shared/theme'

/** Selector de tema: el del sistema, claro o nocturno. */
export function ThemeSelect() {
  const { t } = useI18n()
  const [choice, setChoice] = useTheme()

  return (
    <label className="setting">
      <span>{t('settings.theme')}</span>
      <select
        value={choice}
        onChange={(event) => {
          const next = THEME_CHOICES.find((option) => option === event.target.value)

          if (next !== undefined) setChoice(next)
        }}
      >
        {THEME_CHOICES.map((option) => (
          <option key={option} value={option}>
            {t(`settings.theme.${option}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
