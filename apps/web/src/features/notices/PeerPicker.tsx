import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Icon } from '../../shared/ui/Icon'
import { usePeopleSearch } from '../profile/usePeopleSearch'

/**
 * Elegir a quién escribir: se teclea un login o un nombre y van saliendo
 * quienes lo llevan. A una misma no se le escribe: no sale en la lista.
 */
export function PeerPicker({ me, onPick }: { me: string; onPick: (login: string) => void }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const found = usePeopleSearch(text)
  const people = found?.filter((person) => person.login !== me) ?? null

  useEffect(() => {
    input.current?.focus()
  }, [])

  return (
    <div className="peer-picker">
      <label>
        <span className="sr-only">{t('notices.peerLabel')}</span>
        <Icon name="lupa" />
        <input
          ref={input}
          type="search"
          value={text}
          placeholder={t('notices.peerLabel')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={60}
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && people?.[0] !== undefined) {
              event.preventDefault()
              onPick(people[0].login)
            }
          }}
        />
      </label>
      {people !== null && (
        <ul className="peer-list">
          {people.length === 0 ? (
            <li className="finder-none">{t('finder.none')}</li>
          ) : (
            people.map((person) => (
              <li key={person.login}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(person.login)
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
  )
}
