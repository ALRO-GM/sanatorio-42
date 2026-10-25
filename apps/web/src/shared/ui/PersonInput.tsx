import { useId, useState } from 'react'

import type { FoundPerson } from '@sanatorio/contracts'

import { usePeopleSearch } from '../hooks/usePeopleSearch'
import { comboboxProps, PeopleResults, usePeopleKeys } from './PeopleResults'

/**
 * Un hueco para escribir un login que, mientras se escribe, sugiere los
 * perfiles que lo llevan (foto, login y nombre), como el buscador de la
 * cabecera. Se elige con el ratón o con las flechas y Enter; también vale
 * escribir el login entero.
 *
 * @param value Lo escrito.
 * @param onChange Cada tecla.
 * @param onPick Al elegir a alguien de la lista: su login.
 * @param exclude Logins que no se sugieren (p. ej., quien mira).
 * @param search Dónde buscar, si no es el buscador de personas de siempre.
 */
export function PersonInput(props: {
  value: string
  onChange: (text: string) => void
  onPick: (login: string) => void
  label: string
  placeholder?: string
  exclude?: readonly string[]
  required?: boolean
  search?: (q: string) => Promise<FoundPerson[]>
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const found = usePeopleSearch(props.value, props.search)
  const people =
    found?.filter((person) => !(props.exclude ?? []).includes(person.login)).slice(0, 8) ?? null
  // Ya elegido (lo escrito es justo uno de la lista y nada más): no hace falta sugerir.
  const settled = people?.length === 1 && people[0]?.login === props.value.trim().toLowerCase()
  const shown = open && people !== null && !settled
  const pick = (login: string): void => {
    props.onPick(login)
    setOpen(false)
  }
  const keys = usePeopleKeys(
    shown ? people : null,
    (person) => {
      pick(person.login)
    },
    () => {
      setOpen(false)
    },
  )

  return (
    <div className="person-input">
      <input
        type="search"
        {...comboboxProps(id, shown, people, keys.active)}
        aria-label={props.label}
        value={props.value}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={60}
        onChange={(event) => {
          props.onChange(event.target.value)
          keys.reset()
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
        }}
        onBlur={() => {
          setOpen(false)
        }}
        onKeyDown={keys.onKeyDown}
      />
      {shown && (
        <PeopleResults
          id={id}
          className="person-options"
          people={people}
          active={keys.active}
          label={props.label}
          size={28}
          onPick={(person) => {
            pick(person.login)
          }}
        />
      )}
    </div>
  )
}
