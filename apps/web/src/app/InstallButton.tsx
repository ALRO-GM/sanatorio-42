import { useState } from 'react'

import { useInstall } from '../shared/install'
import { useI18n } from '../shared/i18n'
import { Icon } from '../shared/ui/Icon'

/**
 * El icono de instalar de la cabecera. Solo sale si el navegador deja instalar
 * la web y aún no está instalada; en Safari de iPhone y iPad explica cómo,
 * porque allí no hay forma de lanzarlo desde la página.
 */
export function InstallButton() {
  const { t } = useI18n()
  const { way, install } = useInstall()
  const [help, setHelp] = useState(false)

  if (way === null) return null

  return (
    <span className="install">
      <button
        type="button"
        className="icon-btn"
        aria-label={t('app.install')}
        title={t('app.install')}
        aria-expanded={way === 'apple' ? help : undefined}
        onClick={() => {
          if (way === 'prompt') void install()
          else setHelp((open) => !open)
        }}
      >
        <Icon name="instalar" size={20} />
      </button>
      {way === 'apple' && help && (
        <span className="install-help" role="status">
          {t('app.install.apple')}
        </span>
      )}
    </span>
  )
}
