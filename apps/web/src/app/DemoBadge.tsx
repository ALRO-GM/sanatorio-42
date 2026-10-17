import { useState } from 'react'

import { useI18n } from '../shared/i18n'

/** `true` en la web de demostración (`/demo/`): datos inventados, sin servidor. */
const DEMO = import.meta.env.VITE_DEMO === 'true'

/**
 * El aviso de la demostración: una etiqueta pequeña en una esquina que dice que
 * los datos son inventados y lleva a la web de verdad. Se puede plegar, para que
 * no tape nada.
 */
export function DemoBadge() {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  if (!DEMO) return null

  return (
    <aside className={`demo-badge ${open ? '' : 'folded'}`} aria-label={t('demo.title')}>
      <button
        type="button"
        className="demo-badge-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
        }}
      >
        {t('demo.title')}
      </button>
      {open && (
        <>
          <span>{t('demo.about')}</span>
          <a className="link" href="/">
            {t('demo.real')}
          </a>
        </>
      )}
    </aside>
  )
}
