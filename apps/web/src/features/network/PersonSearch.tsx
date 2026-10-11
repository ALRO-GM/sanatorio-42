import { useEffect, useState } from 'react'

import type { NetworkPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'

type PersonSearchProps = {
  /** Persona en la que está centrado el grafo, o `null`. */
  value: string | null
  /** Login de quien mira, para el atajo "mi red". */
  me: string
  onChange: (login: string | null) => void
}

/** Espera tras la última tecla antes de preguntar a la API. */
const DEBOUNCE_MS = 180

/** Buscador de personas de la red: escribe el principio de un login y elige. */
export function PersonSearch({ value, me, onChange }: PersonSearchProps) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [found, setFound] = useState<NetworkPerson[]>([])

  useEffect(() => {
    const prefix = text.trim().toLowerCase()

    if (prefix === '') {
      setFound([])

      return undefined
    }

    let current = true
    const timer = setTimeout(() => {
      api
        .searchNetworkPeople(prefix)
        .then((people) => {
          if (current) setFound(people)
        })
        .catch(() => {
          if (current) setFound([])
        })
    }, DEBOUNCE_MS)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [text])

  const choose = (login: string | null): void => {
    setText('')
    setFound([])
    onChange(login)
  }

  if (value !== null) {
    return (
      <div className="net-person-chosen">
        <span className="chip">
          {value}
          <button
            type="button"
            aria-label={t('net.person.clear')}
            onClick={() => {
              choose(null)
            }}
          >
            ✕
          </button>
        </span>
      </div>
    )
  }

  return (
    <div className="net-search">
      <div className="net-search-row">
        <input
          type="search"
          value={text}
          placeholder={t('net.person.placeholder')}
          aria-label={t('net.person')}
          onChange={(event) => {
            setText(event.target.value)
          }}
          onKeyDown={(event) => {
            const first = found[0]

            if (event.key === 'Enter' && first !== undefined) {
              choose(first.login)
            }
          }}
        />
        <button
          type="button"
          className="pill"
          onClick={() => {
            choose(me)
          }}
        >
          {t('net.person.me')}
        </button>
      </div>
      {found.length > 0 && (
        <ul className="net-search-list">
          {found.map((person) => (
            <li key={person.login}>
              <button
                type="button"
                onClick={() => {
                  choose(person.login)
                }}
              >
                <Avatar login={person.login} image={person.image} size={22} />
                <span>{person.login}</span>
                <small>{person.corrections}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
