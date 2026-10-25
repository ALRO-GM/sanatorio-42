import { useI18n } from '../shared/i18n'
import { useAction } from '../shared/hooks/useAsync'
import { switchPoolPreview } from '../shared/pool'

/**
 * La franja de la vista de piscinero (`docs/piscineros.md`): mientras quien
 * administra ve la web como un piscinero, va fija arriba del todo, encima de
 * todo lo demás, para que no se le olvide, y es por donde se vuelve.
 */
export function PoolPreviewBar() {
  const { t } = useI18n()
  const leave = useAction()

  return (
    <aside className="pool-preview-bar" aria-label={t('pool.preview.banner')}>
      <span className="pool-preview-text">{t('pool.preview.banner')}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        disabled={leave.busy}
        onClick={() => {
          void leave.run(() => switchPoolPreview(false))
        }}
      >
        {t('pool.preview.back')}
      </button>
      {leave.error !== null && (
        <span className="pool-preview-failed" role="alert">
          {t('pool.preview.failed')}
        </span>
      )}
    </aside>
  )
}
