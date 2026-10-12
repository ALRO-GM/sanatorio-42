import { useEffect, useRef, useState } from 'react'

import type { FoundPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Icon } from '../../shared/ui/Icon'
import { recordHref } from '../../shared/links'

/** Lo que se espera tras la última tecla antes de preguntar a la API. */
const WAIT_MS = 180
/** Con menos letras no se busca: saldría medio campus. */
const MIN_LETTERS = 2

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
  const [found, setFound] = useState<FoundPerson[] | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const wanted = text.trim()

  useEffect(() => {
    if (wanted.length < MIN_LETTERS) {
      setFound(null)

      return undefined
    }

    let current = true
    const timer = setTimeout(() => {
      api.searchPeople(wanted).then(
        (people) => {
          // Si entre tanto se ha escrito otra cosa, esta respuesta ya no vale.
          if (current) setFound(people)
        },
        () => {
          if (current) setFound([])
        },
      )
    }, WAIT_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [wanted])

  // Se cierra al pulsar fuera.
  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && box.current?.contains(event.target) === false) {
        setOpen(false)
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
    setText('')
    input.current?.blur()
  }
  const go = (login: string): void => {
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
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
            if (event.key === 'Enter' && found?.[0] !== undefined) go(found[0].login)
          }}
        />
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
                      go(person.login)
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
