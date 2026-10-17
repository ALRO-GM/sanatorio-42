import { useI18n } from '../../shared/i18n'
import { legalText } from './text'

/** El texto entero de privacidad y condiciones, en el idioma de la web si está traducido. */
export function LegalDocument() {
  const { t, tree } = useI18n()
  const { text, translated } = legalText(tree)

  return (
    <div className="legal-doc">
      {!translated && <p className="hint">{t('legal.untranslated')}</p>}
      {text.sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.body.map((part, index) =>
            typeof part === 'string' ? (
              <p key={index}>{part}</p>
            ) : (
              <ul key={index}>
                {part.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </div>
  )
}
