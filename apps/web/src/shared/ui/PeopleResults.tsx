import { useState } from 'react'
import type { KeyboardEvent } from 'react'

import type { FoundPerson as PersonHit } from '@sanatorio/contracts'

import { useI18n } from '../i18n'
import { Avatar } from './Avatar'

/**
 * El teclado de una lista de personas sugeridas bajo un hueco de texto: las
 * flechas mueven la elegida (dando la vuelta), Enter la elige y Escape cierra.
 * Lo comparten el buscador de la cabecera, el de a quién escribir y
 * `PersonInput`: antes solo este último se manejaba con flechas.
 *
 * @returns La posición elegida, el manejador de teclas para el `<input>` y
 *   `reset`, para volver a la primera al escribir.
 */
export function usePeopleKeys(
  people: readonly PersonHit[] | null,
  onPick: (person: PersonHit) => void,
  onEscape?: () => void,
) {
  const [active, setActive] = useState(0)
  const count = people?.length ?? 0
  const current = count === 0 ? 0 : Math.min(active, count - 1)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      onEscape?.()

      return
    }
    if (people === null || count === 0) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((current + (event.key === 'ArrowDown' ? 1 : -1) + count) % count)
    } else if (event.key === 'Enter') {
      const person = people[current]

      // Con la lista abierta, Enter elige; no envía el formulario.
      if (person !== undefined) {
        event.preventDefault()
        onPick(person)
      }
    }
  }

  return {
    active: current,
    onKeyDown,
    reset: () => {
      setActive(0)
    },
  }
}

/** Los `aria-*` que lleva el `<input>` que controla una lista de `PeopleResults`. */
export function comboboxProps(
  id: string,
  open: boolean,
  people: readonly PersonHit[] | null,
  active: number,
) {
  return {
    role: 'combobox',
    'aria-expanded': open,
    'aria-controls': `${id}-list`,
    'aria-autocomplete': 'list',
    'aria-activedescendant':
      open && people !== null && people.length > 0 ? `${id}-${String(active)}` : undefined,
  } as const
}

type PeopleResultsProps = {
  /** El prefijo de los `id`: la lista es `{id}-list` y cada fila `{id}-{posición}`. */
  id: string
  people: readonly PersonHit[]
  /** La fila elegida con las flechas. */
  active: number
  onPick: (person: PersonHit) => void
  label: string
  /** Lo que coloca la lista (desplegable bajo la cabecera, dentro de una ventana…). */
  className: string
  size?: number
}

/**
 * La lista de personas encontradas: foto, login y nombre, la misma en los tres
 * buscadores de la web. Es un `listbox`: con el foco en el hueco de texto, las
 * flechas la recorren y el lector de pantalla anuncia la elegida.
 */
export function PeopleResults({
  id,
  people,
  active,
  onPick,
  label,
  className,
  size = 32,
}: PeopleResultsProps) {
  const { t } = useI18n()

  return (
    <ul
      id={`${id}-list`}
      role="listbox"
      className={`people-results ${className}`}
      aria-label={label}
    >
      {people.length === 0 ? (
        <li className="finder-none">{t('finder.none')}</li>
      ) : (
        people.map((person, index) => (
          <li
            key={person.login}
            id={`${id}-${String(index)}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? 'active' : ''}
            // Antes que el blur del hueco, que cerraría la lista.
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(person)
            }}
          >
            <Avatar login={person.login} image={person.image} size={size} />
            <span>
              <strong>{person.login}</strong>
              {person.name !== null && <small>{person.name}</small>}
            </span>
          </li>
        ))
      )}
    </ul>
  )
}
