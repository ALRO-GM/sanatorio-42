import { api } from '../../shared/api'
import { useAsync } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { InfoTip } from '../../shared/ui/InfoTip'
import { UNDERSTANDINGS } from '../network/understanding'

/** Respuestas que hacen falta para enseñar las cuentas: las mismas que pide la API. */
const MIN_ANSWERS = 3

/**
 * Qué tal entendieron el problema, en total, las personas a las que corregiste:
 * lo que contestaron tras la corrección. Solo lo ves tú, nunca por persona, y
 * con pocas respuestas no se enseña para que no se sepa de quién es cada una.
 */
export function UnderstoodCard() {
  const { t } = useI18n()
  const { data } = useAsync(() => api.getCorrectionsUnderstood(), [])

  // Es informativo: mientras carga, si falla o si nadie ha contestado, no aparece.
  if (data === undefined || data.total === 0) {
    return null
  }

  return (
    <article className="card">
      <span className="eyebrow">
        {t('net.understood.title')}
        <InfoTip title={t('net.understood.title')}>
          <p>{t('net.understood.hint')}</p>
        </InfoTip>
      </span>
      {data.answers === null ? (
        <p className="hint">{t('net.understood.few', { n: MIN_ANSWERS })}</p>
      ) : (
        <ul className="rows">
          {UNDERSTANDINGS.map((answer) => (
            <li key={answer} className="row plain">
              <span>{t(`net.rate.understanding.${answer}`)}</span>
              <strong className="row-count">{data.answers?.[answer] ?? 0}</strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
