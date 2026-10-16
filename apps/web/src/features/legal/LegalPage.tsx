import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { localeOf, useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { LegalDocument } from './LegalDocument'
import { legalText } from './text'

/**
 * Privacidad y condiciones: el texto, cuándo lo aceptaste y la descarga de todo
 * lo tuyo. Sin sesión (desde la pantalla de entrada) se ve solo el texto.
 */
export function LegalPage({ signedIn }: { signedIn: boolean }) {
  const { t, lang } = useI18n()
  const status = useAsync(() => (signedIn ? api.getLegal() : Promise.resolve(null)), [signedIn])
  const accepted = status.data?.acceptedAt ?? null

  return (
    <section className="legal-page">
      <h2>{legalText(lang).text.title}</h2>
      {signedIn && (
        <article className="card legal-actions">
          <p className="hint">
            {accepted === null
              ? t('legal.notAccepted')
              : t('legal.acceptedOn', {
                  date: new Date(accepted).toLocaleDateString(localeOf(lang), {
                    dateStyle: 'long',
                  }),
                })}
          </p>
          <a className="button primary small" href={api.exportUrl()} download>
            <Icon name="abajo" size={14} /> {t('legal.export')}
          </a>
        </article>
      )}
      <article className="card">
        <LegalDocument />
      </article>
    </section>
  )
}
