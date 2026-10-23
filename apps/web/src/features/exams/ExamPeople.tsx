import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { PersonLink } from '../../shared/ui/PersonLink'

type ExamPerson = { login: string; image: string | null; circle: number | null }

/**
 * La lista de personas de exámenes: foto, nombre, el círculo y lo que cada
 * vista añada (itinerario y estado en vivo, kickoff y plazo en el black hole).
 * Las dos vistas la pintaban a mano igual; así un cambio se hace una vez.
 */
export function ExamPeople<T extends ExamPerson>({
  people,
  badges,
  end,
  rowClass,
  label,
}: {
  people: readonly T[]
  /** Las etiquetas que van tras la del círculo. */
  badges?: (person: T) => ReactNode
  /** Lo que va al final de la fila (la nota, cuánto falta). */
  end: (person: T) => ReactNode
  rowClass?: (person: T) => string
  label?: string
}) {
  const { t } = useI18n()

  return (
    <ul className="exam-people" aria-label={label}>
      {people.map((person) => (
        <li key={person.login} className={rowClass?.(person)}>
          <Avatar login={person.login} image={person.image} size={32} />
          <PersonLink login={person.login} className="" />
          <span className="exam-badges">
            {person.circle !== null && (
              <span className="badge subtle">{t('graph.circle', { n: person.circle })}</span>
            )}
            {badges?.(person)}
          </span>
          {end(person)}
        </li>
      ))}
    </ul>
  )
}
