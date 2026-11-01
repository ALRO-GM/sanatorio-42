import { errorText, useI18n } from '../i18n'
import { reloadPage } from '../reload'

type ErrorNoteProps = {
  /** Lo que haya fallado. Sin error no se pinta nada. */
  error: unknown
  /** Con «Reintentar», que recarga la página entera (`reloadPage`). */
  retry?: boolean
}

/** Aviso de error con el tono de la web: apagado, nunca en rojo vivo. */
export function ErrorNote({ error, retry = false }: ErrorNoteProps) {
  const { t, lang } = useI18n()

  if (error === null || error === undefined) {
    return null
  }

  return (
    <p className="estado error" role="alert">
      {errorText(t, lang, error)}{' '}
      {retry && (
        <button type="button" className="pill" onClick={reloadPage}>
          {t('app.retry')}
        </button>
      )}
    </p>
  )
}
