import { Settings } from '../features/settings/Settings'
import { useI18n } from '../shared/i18n'
import { MadeFor } from '../shared/ui/MadeFor'

type FooterProps = {
  campusId: number | undefined
  onCampusChange: (campusId: number) => Promise<void>
}

/**
 * El pie: el idioma, el campus y el paso a Personalizar, donde están el modo,
 * el tema y la comodidad. Lo de escribir a quien administra está en el menú de la cuenta.
 */
export function Footer({ campusId, onCampusChange }: FooterProps) {
  const { t } = useI18n()

  return (
    <footer className="footer" data-feedback="pie">
      <Settings campusId={campusId} onCampusChange={onCampusChange} />
      <p>
        <MadeFor /> ·{' '}
        <a className="link" href="#/privacidad">
          {t('legal.link')}
        </a>
      </p>
    </footer>
  )
}
