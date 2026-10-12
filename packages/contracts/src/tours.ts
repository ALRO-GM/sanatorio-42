/**
 * Las demostraciones animadas («cómo funciona») y su velocidad.
 */

/**
 * `GET /tours/speeds`: a cuánto va cada demostración de fábrica. `1` es el
 * ritmo con el que se escribió; las que no salen van a `1`.
 */
export type TourSpeeds = {
  speeds: Record<string, number>
}

/**
 * Cuerpo de `POST /tours/speed`: a cuánto ha visto alguien una demostración,
 * respecto a la de fábrica. `1` si no tocó el deslizador; entre `0.5` y `2`.
 */
export type TourRate = {
  name: string
  rate: number
}

/** `GET /admin/tours`: cómo va cada demostración. Solo admins. */
export type TourSpeedStats = {
  /** Personas distintas que hacen falta para ajustar la velocidad. */
  votesToAdjust: number
  tours: {
    name: string
    /** La velocidad de fábrica ahora. */
    speed: number
    /** Desde el último ajuste: cuánta gente la ha acelerado, frenado o dejado. */
    faster: number
    slower: number
    same: number
    /** Lo que la han movido de media: por esto se multiplicará la de fábrica. */
    mean: number
    /** Cuándo se ajustó la última vez, o `null` si nunca. */
    adjustedAt: string | null
  }[]
}

/** Una persona encontrada con el buscador de arriba. */
export type FoundPerson = {
  login: string
  /** Su nombre, si 42 lo da. */
  name: string | null
  image: string | null
}
