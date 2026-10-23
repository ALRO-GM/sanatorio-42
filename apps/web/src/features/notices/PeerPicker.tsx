import { useEffect, useId, useRef, useState } from 'react'

import { useI18n } from '../../shared/i18n'
import { Icon } from '../../shared/ui/Icon'
import { usePeopleSearch } from '../../shared/hooks/usePeopleSearch'
import { comboboxProps, PeopleResults, usePeopleKeys } from '../../shared/ui/PeopleResults'

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
  const id = useId()
  const keys = usePeopleKeys(people, (person) => {
    onPick(person.login)
  })

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
          {...comboboxProps(id, people !== null, people, keys.active)}
          aria-label={t('notices.peerLabel')}
          value={text}
          placeholder={t('notices.peerLabel')}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={60}
          onChange={(event) => {
            setText(event.target.value)
            keys.reset()
          }}
          onKeyDown={keys.onKeyDown}
        />
      </label>
      {people !== null && (
        <PeopleResults
          id={id}
          className="peer-list"
          people={people}
          active={keys.active}
          label={t('notices.peerLabel')}
          onPick={(person) => {
            onPick(person.login)
          }}
        />
      )}
    </div>
  )
}
