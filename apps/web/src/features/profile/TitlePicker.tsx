import { useRef } from 'react'

import type { Profile, TitleId } from '@sanatorio/contracts'

import { titleText } from './title'
import { api } from '../../shared/api'
import { useAction } from '../../shared/hooks/useAsync'
import { useI18n } from '../../shared/i18n'
import { ErrorNote } from '../../shared/ui/ErrorNote'
import { Icon } from '../../shared/ui/Icon'
import { TitleBanner } from '../../shared/ui/TitleBanner'

type TitlePickerProps = Pick<Profile, 'title' | 'titles' | 'hacks' | 'master'> & {
  /** Se ha guardado otro título: hay que volver a pedir el expediente. */
  onSaved: () => Promise<void>
}

/**
 * El desplegable de títulos: cerrado enseña el que luces; abierto, todos, cada
 * uno con la muestra de su banner. Los que aún no tienes salen apagados, con
 * el nivel que los da. Elegir uno lo guarda en la API (que no deja ponerse uno
 * bloqueado) y cambia el banner de tu perfil, el que ven también los demás.
 */
export function TitlePicker({ title, titles, hacks, master, onSaved }: TitlePickerProps) {
  const { t } = useI18n()
  const { busy, error, run } = useAction()
  const details = useRef<HTMLDetailsElement>(null)

  const close = (): void => {
    if (details.current === null) return
    details.current.open = false
    details.current.querySelector('summary')?.focus()
  }

  const choose = async (id: TitleId): Promise<void> => {
    if (id === title) {
      close()

      return
    }
    if (await run(() => api.updateSettings({ title: id }))) {
      await onSaved()
      close()
    }
  }

  return (
    <>
      <details
        ref={details}
        className="title-picker"
        onKeyDown={(event) => {
          // Como el resto de desplegables: Escape lo cierra.
          if (event.key === 'Escape' && details.current?.open === true) {
            event.preventDefault()
            close()
          }
        }}
      >
        <summary>
          <TitleBanner title={title} mini />
          <span className="title-picker-now">
            <span className="eyebrow">{t('xp.titles')}</span>
            <strong>{titleText(t, title, hacks, master)}</strong>
          </span>
          <span className="title-picker-arrow" aria-hidden="true">
            ▾
          </span>
        </summary>

        <ul className="title-options">
          {titles.map((entry) => {
            const active = entry.id === title

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  disabled={busy || !entry.unlocked}
                  onClick={() => void choose(entry.id)}
                >
                  <TitleBanner title={entry.id} mini locked={!entry.unlocked} />
                  <span className="title-option-text">
                    <span>{titleText(t, entry.id, hacks, master)}</span>
                    {!entry.unlocked ? (
                      <small>
                        <Icon name="candado" size={12} /> {t('xp.locked', { level: entry.level })}
                      </small>
                    ) : (
                      active && (
                        <small>
                          <Icon name="hecho" size={12} /> {t('xp.titleActive')}
                        </small>
                      )
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </details>
      <ErrorNote error={error} />
    </>
  )
}
