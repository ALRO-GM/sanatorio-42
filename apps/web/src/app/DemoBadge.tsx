import { DockItem } from '../shared/dock/DockItem'
import { useI18n } from '../shared/i18n'

/** `true` en la web de demostración (`/demo/`): datos inventados, sin servidor. */
const DEMO = import.meta.env.VITE_DEMO === 'true'

/**
 * El aviso de la demostración: una etiqueta pequeña que dice que los datos son
 * inventados y lleva a la web de verdad. Va en la pila de la esquina
 * (`shared/dock`), con las demás ventanitas, para no taparlas; se puede plegar
 * para que no tape nada.
 */
export function DemoBadge() {
  const { t } = useI18n()

  if (!DEMO) return null

  return (
    <DockItem
      id="demo"
      title={t('demo.title')}
      size={{ width: 420, height: 40 }}
      foldedSize={{ width: 110, height: 36 }}
    >
      {({ folded, grip, back, toggle }) => (
        <aside className={`demo-badge ${folded ? 'folded' : ''}`} aria-label={t('demo.title')}>
          {grip}
          <button
            type="button"
            className="demo-badge-toggle"
            aria-expanded={!folded}
            onClick={toggle}
          >
            {t('demo.title')}
          </button>
          {!folded && (
            <>
              <span>{t('demo.about')}</span>
              <a className="link" href="/">
                {t('demo.real')}
              </a>
            </>
          )}
          {back}
        </aside>
      )}
    </DockItem>
  )
}
