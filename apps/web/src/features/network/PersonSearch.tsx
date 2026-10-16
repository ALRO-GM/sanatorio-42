import { useEffect, useState } from 'react'

import type { NetworkPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Icon } from '../../shared/ui/Icon'
import { forget, recentOf, remember } from '../../shared/recent'
import type { RecentPerson } from '../../shared/recent'

/** Las recientes del buscador de la Red. */
const RECENT_LIST = 'network'

type PersonSearchProps = {
  /** Persona en la que está centrado el grafo, o `null`. */
  value: string | null
  /** Login de quien mira, para el atajo "mi red". */
  me: string
  onChange: (login: string | null) => void
  /** Los campus en los que se busca; sin él, el propio. */
  campuses?: string | undefined
}

/** Espera tras la última tecla antes de preguntar a la API. */
const DEBOUNCE_MS = 180

/** Buscador de personas de la red: escribe el principio de un login y elige. */
export function PersonSearch({ value, me, onChange, campuses }: PersonSearchProps) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [found, setFound] = useState<NetworkPerson[]>([])
  // Con el campo vacío y a la vista, las últimas personas buscadas aquí.
  const [focused, setFocused] = useState(false)
  const [recent, setRecent] = useState<RecentPerson[]>(() => recentOf(RECENT_LIST))

  useEffect(() => {
    const prefix = text.trim().toLowerCase()

    if (prefix === '') {
      setFound([])

      return undefined
    }

    let current = true
    const timer = setTimeout(() => {
      api
        .searchNetworkPeople(prefix, campuses)
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
  }, [text, campuses])

  const choose = (login: string | null, image: string | null = null): void => {
    if (login !== null && login !== me) setRecent(remember(RECENT_LIST, { login, image }))
    setText('')
    setFound([])
    setFocused(false)
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
            <Icon name="cerrar" />
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
          onFocus={() => {
            setFocused(true)
          }}
          onKeyDown={(event) => {
            const first = found[0]

            if (event.key === 'Enter' && first !== undefined) {
              choose(first.login, first.image)
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
      {focused && text.trim() === '' && recent.length > 0 && (
        <ul className="net-search-list">
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
                  choose(person.login, person.image)
                }}
              >
                <Avatar login={person.login} image={person.image} size={22} />
                <span>{person.login}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {found.length > 0 && (
        <ul className="net-search-list">
          {found.map((person) => (
            <li key={person.login}>
              <button
                type="button"
                onClick={() => {
                  choose(person.login, person.image)
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
