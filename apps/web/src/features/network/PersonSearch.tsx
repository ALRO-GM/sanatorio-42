import { useCallback, useState } from 'react'

import type { FoundPerson } from '@sanatorio/contracts'

import { api } from '../../shared/api'
import { mergePeople } from '../../shared/hooks/usePeopleSearch'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Icon } from '../../shared/ui/Icon'
import { PersonInput } from '../../shared/ui/PersonInput'
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

/**
 * Buscador de personas de la red: el de toda la web (`PersonInput`, con foto,
 * login y nombre). Busca por nombre o login en el buscador de personas y, por
 * el principio del login, en la red de los campus elegidos (2026-10-31: antes
 * solo esto último, sin nombres).
 */
export function PersonSearch({ value, me, onChange, campuses }: PersonSearchProps) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  // Con el campo vacío y a la vista, las últimas personas buscadas aquí.
  const [focused, setFocused] = useState(false)
  const [recent, setRecent] = useState<RecentPerson[]>(() => recentOf(RECENT_LIST))
  const search = useCallback(
    async (q: string): Promise<FoundPerson[]> => {
      const [network, named] = await Promise.all([
        api.searchNetworkPeople(q.toLowerCase(), campuses).catch(() => []),
        // Un piscinero sin el buscador de personas se queda con lo de la red.
        api.searchPeople(q).catch((): FoundPerson[] => []),
      ])

      return mergePeople(
        network.map((person) => ({ login: person.login, name: null, image: person.image })),
        named,
      )
    },
    [campuses],
  )

  const choose = (login: string | null, image: string | null = null): void => {
    if (login !== null && login !== me) setRecent(remember(RECENT_LIST, { login, image }))
    setText('')
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
    <div
      className="net-search"
      onFocus={() => {
        setFocused(true)
      }}
    >
      <div className="net-search-row">
        <PersonInput
          value={text}
          label={t('common.person')}
          placeholder={t('net.person.placeholder')}
          search={search}
          onChange={setText}
          onPick={(login, person) => {
            choose(login, person.image)
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
    </div>
  )
}
