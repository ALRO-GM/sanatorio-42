import { useSyncExternalStore } from 'react'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import {
  AMBIENCE_KINDS,
  AMBIENCE_OPTIONS,
  ambience,
  setAmbience,
  subscribeAmbience,
} from './ambience'
import type { Ambience, AmbienceKind } from './ambience'
import { TRACKS } from './ambience-tracks'

const KEY = 'sanatorio_focus_sound'

/** La última opción de cada tipo, para volver a ella al elegir el tipo otra vez. */
function remembered(): Partial<Record<AmbienceKind, number>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record<AmbienceKind, number>>
  } catch {
    return {}
  }
}

function remember(next: Ambience): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...remembered(), [next.kind]: next.index }))
  } catch {
    // Sin almacenamiento, se empieza siempre por la primera.
  }
}

/**
 * El sonido de fondo del Pomodoro: tres botones (ruido, naturaleza, lo-fi). Al
 * elegir uno se queda resaltado con la opción que suena y los otros dos se
 * encogen; volver a pulsarlo pasa a la siguiente opción de ese tipo (blanco,
 * rosa, marrón…; las diez pistas lo-fi, de más suave a más intensa). El botón
 * del altavoz tachado lo apaga.
 */
export function FocusSound() {
  const { t } = useI18n()
  const now = useSyncExternalStore(subscribeAmbience, ambience)

  const press = (kind: AmbienceKind): void => {
    const options = AMBIENCE_OPTIONS[kind].length
    const index =
      now?.kind === kind
        ? (now.index + 1) % options
        : Math.min(remembered()[kind] ?? 0, options - 1)
    const next = { kind, index }

    remember(next)
    setAmbience(next)
  }

  const optionName = (choice: Ambience): string => {
    if (choice.kind !== 'lofi') {
      return t(`focus.sound.option.${AMBIENCE_OPTIONS[choice.kind][choice.index] ?? ''}`)
    }

    const track = TRACKS[choice.index]

    return t('focus.sound.track', {
      n: choice.index + 1,
      total: TRACKS.length,
      title: track?.title ?? '',
    })
  }

  return (
    <div
      className={`focus-sound ${now === null ? '' : 'chosen'}`}
      role="group"
      aria-label={t('focus.sound.label')}
    >
      {AMBIENCE_KINDS.map((kind) => {
        const on = now?.kind === kind

        return (
          <button
            key={kind}
            type="button"
            className={`focus-sound-kind ${on ? 'on' : now === null ? '' : 'small'}`}
            aria-pressed={on}
            title={on ? t('focus.sound.next') : t(`focus.sound.${kind}`)}
            onClick={() => {
              press(kind)
            }}
          >
            <span>{t(`focus.sound.${kind}`)}</span>
            {on && <small>{optionName(now)}</small>}
          </button>
        )
      })}
      {now !== null && (
        <button
          type="button"
          className="focus-sound-off"
          aria-label={t('focus.sound.off')}
          title={t('focus.sound.off')}
          onClick={() => {
            setAmbience(null)
          }}
        >
          <Icon name="silencio" size={16} />
        </button>
      )}
    </div>
  )
}
