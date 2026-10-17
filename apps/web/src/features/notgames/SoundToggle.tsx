import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { setGameSound, useGameSoundOn } from './sounds'

/** Enciende o apaga los sonidos de los juegos (se recuerda). */
export function SoundToggle() {
  const { t } = useI18n()
  const on = useGameSoundOn()

  return (
    <button
      type="button"
      className="pill icon-only"
      aria-pressed={on}
      aria-label={t('notgames.sound')}
      title={t('notgames.sound')}
      onClick={() => {
        setGameSound(!on)
      }}
    >
      <Icon name={on ? 'altavoz' : 'silencio'} size={16} />
    </button>
  )
}
