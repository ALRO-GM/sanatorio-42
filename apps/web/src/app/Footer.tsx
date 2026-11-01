import { Settings } from '../features/settings/Settings'
import { useI18n } from '../shared/i18n'
import { intraHref } from '../shared/links'

/** Quien hace la web: el pie lleva a su perfil de la intra. */
const AUTHOR = 'albrodri'

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
  // El login va enlazado dentro de la frase, donde cada idioma lo pone.
  const [before, after = ''] = t('app.footer').split('{author}')

  return (
    <footer className="footer" data-feedback="pie">
      <Settings campusId={campusId} onCampusChange={onCampusChange} />
      <p>
        {before}
        <a className="link" href={intraHref(AUTHOR)} target="_blank" rel="noreferrer">
          {AUTHOR}
        </a>
        {after} ·{' '}
        <a className="link" href="#/privacidad">
          {t('legal.link')}
        </a>
      </p>
    </footer>
  )
}
