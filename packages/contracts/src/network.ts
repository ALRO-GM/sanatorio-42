/**
 * Red de correcciones: quién ha corregido a quién en el 42cursus de un campus.
 *
 * Cada corrección es una arista dirigida (corrector → corregido). La API las
 * junta por pareja y calcula sobre ellas la endogamia: cuánto se corrige la
 * gente siempre con las mismas personas y cuánto se devuelven las correcciones.
 */

/** Por dónde va la copia de las correcciones de 42. */
export type NetworkSync = {
  /** `pending`: aún no ha empezado · `copying`: a medias · `done`: al día. */
  phase: 'pending' | 'copying' | 'done'
  /** Correcciones copiadas. */
  rows: number
  /** Las que hay en 42, si ya se sabe. */
  total: number | null
  /** La más antigua y la más reciente copiadas (ISO-8601). */
  first: string | null
  last: string | null
}

/** Una persona del grafo. */
export type NetworkNode = {
  login: string
  image: string | null
  /** No es del campus: solo sale como vecina de quien sí lo es. */
  external: boolean
  /** Correcciones que ha hecho y que ha recibido, con los filtros puestos. */
  given: number
  received: number
  /** Personas distintas con las que se ha cruzado. */
  partners: number
  /** Índice de endogamia, de 0 a 100. Ver `NetworkTotals.endogamy`. */
  endogamy: number
  /** Parte de sus correcciones que son "devueltas" (0-1). */
  reciprocity: number
  /** Parte de sus correcciones que repiten con alguien ya visto (0-1). */
  repetition: number
  /** Comunidad a la que pertenece: `0` es la mayor. Sale de quién corrige a quién. */
  community: number
  /** Año de su primera corrección en el campus: una pista de su promoción. */
  cohort: number | null
}

/** Dos personas que se han corregido. Sin dirección: los dos sentidos van dentro. */
export type NetworkLink = {
  source: string
  target: string
  /** Veces que `source` ha corregido a `target`. */
  forth: number
  /** Veces que `target` ha corregido a `source`. */
  back: number
}

export type NetworkTotals = {
  /** Correcciones que cumplen los filtros (cada corregido cuenta una). */
  corrections: number
  people: number
  /** Parejas distintas que se han cruzado. */
  pairs: number
  /** Parejas en las que las dos personas se han corregido mutuamente. */
  mutualPairs: number
  /**
   * Endogamia media, de 0 a 100, ponderada por actividad. Para cada persona es
   * la media de dos cosas: cuánto repite con la misma gente y cuánto de lo que
   * corrige se lo devuelven.
   */
  endogamy: number
  reciprocity: number
  repetition: number
  communities: number
}

/** Filtros con los que se pidió el grafo, ya normalizados. */
export type NetworkQuery = {
  from: string | null
  to: string | null
  /** Persona en la que se centra, o `null` si es todo el campus. */
  login: string | null
  projectId: number | null
  /** Correcciones mínimas entre dos personas para pintar su unión. */
  min: number
  /** Tope de personas que se devuelven. */
  limit: number
}

/** `GET /network`. */
export type NetworkGraph = {
  query: NetworkQuery
  nodes: NetworkNode[]
  links: NetworkLink[]
  /** Calculado sobre todo lo que cumple los filtros, no solo sobre lo que se pinta. */
  totals: NetworkTotals
  /** Lo que se ha quedado fuera por el tope, o `null` si está todo. */
  hidden: { nodes: number; links: number } | null
  /** Las parejas que más se han corregido entre sí. */
  topPairs: NetworkLink[]
  /** Proyectos con correcciones, para el filtro. */
  projects: { id: number; name: string; corrections: number }[]
  sync: NetworkSync
}

/** `GET /network/people?q=`: logins que empiezan así, para el buscador. */
export type NetworkPerson = { login: string; image: string | null; corrections: number }
