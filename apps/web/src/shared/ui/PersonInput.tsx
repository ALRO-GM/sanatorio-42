import { useId, useState } from 'react'

import { usePeopleSearch } from '../hooks/usePeopleSearch'
import { useI18n } from '../i18n'
import { Avatar } from './Avatar'

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
 */
export function PersonInput(props: {
  value: string
  onChange: (text: string) => void
  onPick: (login: string) => void
  label: string
  placeholder?: string
  exclude?: readonly string[]
  required?: boolean
}) {
  const { t } = useI18n()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const found = usePeopleSearch(props.value)
  const people =
    found?.filter((person) => !(props.exclude ?? []).includes(person.login)).slice(0, 8) ?? null
  // Ya elegido (lo escrito es justo uno de la lista y nada más): no hace falta sugerir.
  const settled = people?.length === 1 && people[0]?.login === props.value.trim().toLowerCase()
  const shown = open && people !== null && !settled
  const pick = (login: string): void => {
    props.onPick(login)
    setOpen(false)
  }

  return (
    <div className="person-input">
      <input
        type="search"
        role="combobox"
        aria-label={props.label}
        aria-expanded={shown}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={shown && people.length > 0 ? `${id}-${String(active)}` : undefined}
        value={props.value}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={60}
        onChange={(event) => {
          props.onChange(event.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
        }}
        onBlur={() => {
          setOpen(false)
        }}
        onKeyDown={(event) => {
          if (!shown || people.length === 0) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => {
              const step = event.key === 'ArrowDown' ? 1 : -1

              return (index + step + people.length) % people.length
            })
          } else if (event.key === 'Enter') {
            const person = people[active]

            // Con la lista abierta, Enter elige; no envía el formulario.
            if (person !== undefined) {
              event.preventDefault()
              pick(person.login)
            }
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {shown && (
        <ul id={`${id}-list`} role="listbox" className="person-options" aria-label={props.label}>
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
                  pick(person.login)
                }}
              >
                <Avatar login={person.login} image={person.image} size={28} />
                <span>
                  <strong>{person.login}</strong>
                  {person.name !== null && <small>{person.name}</small>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
