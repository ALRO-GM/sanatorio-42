import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Icon } from '../../shared/ui/Icon'
import { recordHref } from '../../shared/links'
import { forget, recentOf, remember } from '../../shared/recent'
import type { RecentPerson } from '../../shared/recent'
import { usePeopleSearch } from './usePeopleSearch'

/** Las recientes del buscador de la cabecera. */
const RECENT_LIST = 'people'

/**
 * El buscador de personas de la cabecera. Se escribe un login o un nombre, da
 * igual con mayúsculas que sin ellas, y van saliendo quienes lo llevan, con su
 * foto. Elegir a alguien abre su expediente.
 *
 * En pantalla ancha el campo está siempre a la vista; en estrecha es una lupa
 * que lo despliega bajo la cabecera, para que esta siga cabiendo en una fila.
 */
export function PersonFinder() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const found = usePeopleSearch(text)
  // Con el campo vacío y a la vista, las últimas personas buscadas.
  const [focused, setFocused] = useState(false)
  const [recent, setRecent] = useState<RecentPerson[]>(() => recentOf(RECENT_LIST))
  const showRecent = found === null && text.trim() === '' && focused && recent.length > 0

  // Se cierra al pulsar fuera.
  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && box.current?.contains(event.target) === false) {
        setOpen(false)
        setFocused(false)
        setText('')
      }
    }

    document.addEventListener('pointerdown', onDown)

    return () => {
      document.removeEventListener('pointerdown', onDown)
    }
  }, [])

  const close = (): void => {
    setOpen(false)
    setFocused(false)
    setText('')
    input.current?.blur()
  }
  const go = (login: string, image: string | null = null): void => {
    setRecent(remember(RECENT_LIST, { login, image }))
    window.location.hash = recordHref(login)
    close()
  }

  return (
    <div ref={box} className={`finder ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="icon-btn finder-toggle"
        aria-label={t('finder.label')}
        title={t('finder.label')}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          // Tras pintarse el campo, el cursor va a él.
          requestAnimationFrame(() => input.current?.focus())
        }}
      >
        <Icon name="lupa" />
      </button>
      <div className="finder-field">
        <Icon name="lupa" />
        <input
          ref={input}
          type="search"
          value={text}
          placeholder={t('finder.placeholder')}
          aria-label={t('finder.label')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => {
            setText(event.target.value)
          }}
          onFocus={() => {
            setFocused(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
            if (event.key === 'Enter' && found?.[0] !== undefined) {
              go(found[0].login, found[0].image)
            }
          }}
        />
        {showRecent && (
          <ul className="finder-list">
            <li className="finder-recent-head">
              <span>{t('finder.recent')}</span>
              <button
                type="button"
                className="link"
                onClick={() => {
                  forget(RECENT_LIST)
                  setRecent([])
                }}
              >
                {t('finder.recentClear')}
              </button>
            </li>
            {recent.map((person) => (
              <li key={person.login}>
                <button
                  type="button"
                  onClick={() => {
                    go(person.login, person.image)
                  }}
                >
                  <Avatar login={person.login} image={person.image} size={32} />
                  <span>
                    <strong>{person.login}</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {found !== null && (
          <ul className="finder-list">
            {found.length === 0 ? (
              <li className="finder-none">{t('finder.none')}</li>
            ) : (
              found.map((person) => (
                <li key={person.login}>
                  <button
                    type="button"
                    onClick={() => {
                      go(person.login, person.image)
                    }}
                  >
                    <Avatar login={person.login} image={person.image} size={32} />
                    <span>
                      <strong>{person.login}</strong>
                      {person.name !== null && <small>{person.name}</small>}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
