import { useI18n } from '../i18n'
import { intraHref } from '../links'

/** Quien hace la web: el pie lleva a su perfil de la intra. */
const AUTHOR = 'albrodri'

/** «Peer4U · Hecho para albrodri», con el login enlazado donde cada idioma lo pone. */
export function MadeFor() {
  const { t } = useI18n()
  const [before, after = ''] = t('app.footer').split('{author}')

  return (
    <>
      {before}
      <a className="link" href={intraHref(AUTHOR)} target="_blank" rel="noreferrer">
        {AUTHOR}
      </a>
      {after}
    </>
  )
}
