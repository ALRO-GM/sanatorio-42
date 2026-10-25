import { isLang, LANGS, useI18n } from '../i18n'

export function LangSelect() {
  const { lang, setLang, t } = useI18n()

  return (
    <label className="setting">
      <span>{t('settings.lang')}</span>
      <select
        value={lang}
        onChange={(event) => {
          if (isLang(event.target.value)) setLang(event.target.value)
        }}
      >
        {Object.entries(LANGS)
          .filter(([code, entry]) => entry.unlisted !== true || code === lang)
          .map(([code, { name }]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
      </select>
    </label>
  )
}
