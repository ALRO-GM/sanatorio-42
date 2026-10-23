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
  const { t, lang, tree } = useI18n()
  const status = useAsync(() => (signedIn ? api.getLegal() : Promise.resolve(null)), [signedIn])
  const accepted = status.data?.acceptedAt ?? null

  return (
    <section className="legal-page">
      <h2>{legalText(tree).text.title}</h2>
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
          {/* El fichero se descarga directo del enlace: la web no lo lee, así
              que avisa de antemano de cómo viene marcado. */}
          <p className="hint">{t('legal.exportHint')}</p>
        </article>
      )}
      <article className="card">
        <LegalDocument />
      </article>
    </section>
  )
}
