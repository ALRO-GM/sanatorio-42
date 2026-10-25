import type { ReactNode } from 'react'

import { useI18n } from '../i18n'
import { Avatar } from './Avatar'
import { PersonLink } from './PersonLink'

type RankingRow = {
  login: string
  image: string | null
  rank: number
}

/**
 * Las primeras filas y, si quien mira no sale entre ellas, la suya al final:
 * así siempre ves dónde estás, aunque sea en el puesto 212.
 */
export function withMe<T extends { login: string }>(rows: readonly T[], mine: T | null): T[] {
  return mine !== null && !rows.some((row) => row.login === mine.login)
    ? [...rows, mine]
    : [...rows]
}

type RankingListProps<T extends RankingRow> = {
  rows: readonly T[]
  /** Login de quien mira: su fila se marca con fondo y con la palabra «tú». */
  me: string
  /** Lo que se enseña a la derecha de cada fila (la cifra). */
  value: (row: T) => ReactNode
  /** Nombre de la lista para quien no la ve. */
  label?: string
  className?: string
  /** Clase extra de una fila (la tuya fija arriba o abajo al desplazar, en el Avance). */
  rowClass?: (row: T) => string
}

/**
 * Una clasificación: puesto (con medalla en los tres primeros), foto, nombre y
 * cifra. La misma fila en el expediente y en las estadísticas; antes cada una
 * la escribía a mano. Tu fila lleva, además del fondo, la palabra «tú»: el
 * color solo no basta en modo zen ni para quien no distingue bien los tonos.
 */
export function RankingList<T extends RankingRow>({
  rows,
  me,
  value,
  label,
  className = '',
  rowClass,
}: RankingListProps<T>) {
  const { t } = useI18n()

  return (
    <ol className={`rows ranking ${className}`.trim()} aria-label={label}>
      {rows.map((row) => (
        <li
          key={row.login}
          className={`row plain ${row.login === me ? 'me' : ''} ${rowClass?.(row) ?? ''}`.trim()}
        >
          <span className="rank" aria-label={t('rank.place', { n: row.rank })}>
            <span className={row.rank <= 3 ? `medal medal-${row.rank}` : undefined}>
              {row.rank}
            </span>
          </span>
          <Avatar login={row.login} image={row.image} size={28} />
          <PersonLink login={row.login} />
          {row.login === me && <span className="chip">{t('rank.you')}</span>}
          {value(row)}
        </li>
      ))}
    </ol>
  )
}
