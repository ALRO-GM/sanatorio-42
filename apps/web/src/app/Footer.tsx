import { Settings } from '../features/settings/Settings'
import { useI18n } from '../shared/i18n'

type FooterProps = {
  campusId: number | undefined
  onCampusChange: (campusId: number) => Promise<void>
  /** Abre el formulario de incidencias y sugerencias. */
  onInbox: () => void
}

/** El pie: idioma, tema y campus, y la puerta al buzón de incidencias y sugerencias. */
export function Footer({ campusId, onCampusChange, onInbox }: FooterProps) {
  const { t } = useI18n()

  return (
    <footer className="footer">
      <Settings campusId={campusId} onCampusChange={onCampusChange} />
      <button type="button" className="link" onClick={onInbox}>
        ✉ {t('inbox.open')}
      </button>
      <p>{t('app.footer')}</p>
    </footer>
  )
}
