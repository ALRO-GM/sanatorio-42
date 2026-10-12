/**
 * Code Clicker: la sección secreta. Se llega pulsando cien veces la cruz de la
 * cabecera y eligiendo la pastilla roja.
 */

/** Lo que se eligió al llegar a cien. La azul es para siempre. */
export type Pill = 'red' | 'blue'

/** `GET /clicker`: por dónde va alguien en el secreto y su partida guardada. */
export type ClickerState = {
  /** Veces que ha pulsado la cruz. */
  plus: number
  pill: Pill | null
  /** La partida, tal como la guardó la web (JSON), o `null` si no ha jugado. */
  save: string | null
  /**
   * Cuántas veces se ha guardado la partida. Quien guarda dice de cuál partió:
   * si ya no es esa, es que se ha seguido jugando en otro sitio.
   */
  rev: number
  /** Logins de quienes más corrigen en su campus: salen en las noticias del juego. */
  names: string[]
}

/** Cuerpo de `PUT /clicker/save`: la partida y las cifras que van a la clasificación. */
export type ClickerSaveInput = {
  save: string
  /** La `rev` que se cargó, o la que devolvió el último guardado. */
  rev: number
  /** Un identificador de la pestaña, inventado al abrir el juego. */
  session: string
  /** Líneas de código escritas en total, contando todas las partidas. */
  total: number
  perSecond: number
  achievements: number
  prestige: number
}

/** Respuesta de `PUT /clicker/save`: la `rev` que queda tras guardar. */
export type ClickerSaved = { rev: number }

export type ClickerRank = {
  /** Puesto, empezando en 1. */
  rank: number
  login: string
  image: string | null
  /** Nivel dentro del juego: sale de `total`. */
  level: number
  total: number
  perSecond: number
  achievements: number
  prestige: number
}

/** `GET /clicker/board`: quién ha escrito más código. */
export type ClickerBoard = {
  entries: ClickerRank[]
  /** Tu fila, estés o no entre las primeras; `null` si aún no has guardado. */
  me: ClickerRank | null
}
