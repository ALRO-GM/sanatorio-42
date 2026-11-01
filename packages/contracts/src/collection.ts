/**
 * El álbum de correcciones del tablón (`docs/correcciones-coleccion.md`): qué
 * parte de los proyectos que puedes corregir has corregido al menos una vez,
 * comparado con otra gente, y lo raro que es cada «cromo».
 */

/**
 * Con quién te comparas:
 * - `friends`: las 10 personas con las que más te has corregido (en los dos
 *   sentidos, como en la red de correcciones), y tú.
 * - `kickoff`: quien entró el mismo mes que tú (un piscinero: su piscina).
 * - `circle`: quien va por tu mismo círculo (no lo hay en la piscina).
 * - `world`: todo tu mundo del campus (estudiantes o piscineros).
 */
export type CollectionGroup = 'friends' | 'kickoff' | 'circle' | 'world'

/** Lo raro que es un proyecto: de quienes lo pueden corregir, cuántos lo han hecho. */
export type CollectionRarity = {
  projectId: number
  /** Gente de tu mundo que lo aprobó: la que lo puede corregir. */
  eligible: number
  /** De ellas, las que lo han corregido al menos una vez. */
  holders: number
  /** `holders / eligible`, de 0 a 1 con tres decimales (0 si nadie lo puede corregir). */
  share: number
}

/** Tu puesto en un grupo, para el resumen. */
export type CollectionStanding = {
  group: CollectionGroup
  /** De qué grupo se trata: el kickoff (`AAAA-MM`), el círculo (`"3"`) o `null`. */
  label: string | null
  /** Gente del grupo con algo que corregir (tú incluido, si lo tienes). */
  size: number
  /** Tu puesto (los empates comparten puesto), o `null` si aún no tienes nada que corregir. */
  rank: number | null
}

/** Una fila de la clasificación de completitud. */
export type CollectionEntry = {
  rank: number
  login: string
  image: string | null
  /** Proyectos que puede corregir y ha corregido al menos una vez. */
  collected: number
  /** Proyectos que puede corregir: los aprobados que siguen vivos en el campus. */
  eligible: number
  /** `collected / eligible`, de 0 a 1 con tres decimales. */
  share: number
}

/**
 * `GET /corrections/collection?group=friends|kickoff|circle|world` (sin
 * `group`, `friends`): la rareza de cada proyecto en tu mundo, tu puesto en
 * cada grupo que tienes y la clasificación del elegido. Solo sale (y cuenta)
 * la gente que puedes ver, así que los puestos no tienen huecos.
 */
export type CorrectionCollection = {
  rarity: CollectionRarity[]
  /** Los grupos que tienes, en el orden de `CollectionGroup`. */
  standings: CollectionStanding[]
  group: CollectionGroup
  /** Las primeras filas del grupo elegido (50 como mucho). */
  rows: CollectionEntry[]
  /** Tu fila, aunque no salga entre las primeras; `null` si no tienes nada que corregir. */
  me: CollectionEntry | null
}
