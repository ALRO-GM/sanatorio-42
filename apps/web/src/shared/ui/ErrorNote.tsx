import { errorText, useI18n } from '../i18n'

type ErrorNoteProps = {
  /** Lo que haya fallado. Sin error no se pinta nada. */
  error: unknown
  onRetry?: () => void
}

/** Aviso de error con el tono de la web: apagado, nunca en rojo vivo. */
export function ErrorNote({ error, onRetry }: ErrorNoteProps) {
  const { t, lang } = useI18n()

  if (error === null || error === undefined) {
    return null
  }

  return (
    <p className="estado error" role="alert">
      {errorText(t, lang, error)}{' '}
      {onRetry && (
        <button className="pill" onClick={onRetry}>
          {t('app.retry')}
        </button>
      )}
    </p>
  )
}
