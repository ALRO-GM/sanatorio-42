import type { ReactNode } from 'react'

import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { PersonLink } from '../../shared/ui/PersonLink'

type ExamPerson = { login: string; image: string | null; circle: number | null }

/**
 * La lista de personas de exámenes: foto, nombre, el círculo y lo que cada
 * vista añada (itinerario y estado en vivo, kickoff y plazo en el black hole).
 * Las dos vistas la pintaban a mano igual; así un cambio se hace una vez.
 *
 * Cada persona es una ficha compacta (pedido por Alberto, 2026-10-30: había
 * que desplazarse mucho): la foto grande a la izquierda, el nombre y las
 * etiquetas en dos líneas, la nota grande a la derecha con la mejor debajo y la
 * barra a lo ancho.
 */
export function ExamPeople<T extends ExamPerson>({
  people,
  badges,
  end,
  corner,
  footer,
  rowClass,
  label,
}: {
  people: readonly T[]
  /** Las etiquetas que van tras la del círculo. */
  badges?: (person: T) => ReactNode
  /** Lo que va al final de la fila (la nota, cuánto falta). */
  end: (person: T) => ReactNode
  /** Un dato pequeño bajo lo del final (la mejor nota). */
  corner?: (person: T) => ReactNode
  /** Lo que va debajo, a lo ancho de la fila (la barra de progreso). */
  footer?: (person: T) => ReactNode
  rowClass?: (person: T) => string
  label?: string
}) {
  const { t } = useI18n()

  return (
    <ul className="exam-people" aria-label={label}>
      {people.map((person) => (
        <li key={person.login} className={rowClass?.(person)}>
          <span className="exam-face">
            <Avatar login={person.login} image={person.image} size={56} />
          </span>
          <span className="exam-who">
            <PersonLink login={person.login} className="" />
            <span className="exam-badges">
              {person.circle !== null && (
                <span className="badge subtle">{t('graph.circle', { n: person.circle })}</span>
              )}
              {badges?.(person)}
            </span>
          </span>
          <span className="exam-score">
            {end(person)}
            {corner?.(person)}
          </span>
          {footer?.(person)}
        </li>
      ))}
    </ul>
  )
}
