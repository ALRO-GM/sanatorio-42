import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { REQUESTER_TAGS } from '../help/tags'
import { Icon } from '../../shared/ui/Icon'

/**
 * Cómo te han descrito quienes te ayudaron. No son notas: son cuatro formas de
 * llegar a pedir ayuda, y ninguna es mejor que otra.
 */
export function AskedCard() {
  const { t } = useI18n()
  const { data } = useAsync(() => api.getHelpReputation(), [])

  // Es informativo: mientras carga o si falla, la tarjeta no aparece.
  if (data === undefined) {
    return null
  }

  return (
    <article className="card">
      <span className="eyebrow">{t('help.askedTitle')}</span>
      <p className="hint">{t('help.askedHint')}</p>
      <ul className="rows">
        {REQUESTER_TAGS.map(({ tag, emoji }) => (
          <li key={tag} className="row plain">
            <span className="row-icon" aria-hidden="true">
              <Icon name={emoji} size={20} />
            </span>
            <span>{t(`help.tag.${tag}`)}</span>
            <strong className="row-count">{data.asked[tag]}</strong>
          </li>
        ))}
      </ul>
    </article>
  )
}
