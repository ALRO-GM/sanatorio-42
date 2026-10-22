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
  /** Puntos de evaluación que ha donado a la bolsa de 42: dan logros y producción. */
  donated: number
  /**
   * Cuántas veces se ha guardado la partida. Quien guarda dice de cuál partió:
   * si ya no es esa, es que se ha seguido jugando en otro sitio.
   */
  rev: number
  /** Veces que le han pillado haciendo trampas. */
  caught: number
  /**
   * Le toca vender todo lo que tiene (a la mitad de lo que costó) por haber
   * hecho trampas tres veces o más: hasta entonces no se guarda nada.
   */
  saleDue: boolean
  /**
   * Lo que le ha requisado la policía del código y por qué, hasta que lo vea en
   * el juego (`POST /clicker/seizure/ack`). `null` si no hay nada que contar.
   */
  seizure: ClickerSeizure | null
  /**
   * Logins que salen en las noticias del juego: con quién más se ha corregido
   * quien juega (en los dos sentidos) y, si son pocos, quienes más corrigen en
   * su campus.
   */
  names: string[]
}

/**
 * Los datos de un salto de capital que no cuadra. Son las cifras, no cómo se
 * detecta: quien hizo trampa ve qué no cuadró, no el mecanismo.
 */
export type ClickerEvidence = {
  /** Capital antes y después, y en cuántos segundos. */
  from: number
  to: number
  seconds: number
  /** Líneas por segundo que tenía guardadas entonces. */
  perSecond: number
  /** Se abrió una pull request dorada por entonces. */
  golden: boolean
}

/**
 * Lo que ha hecho la policía del código al pillar una trampa: volver a la última
 * partida buena, vender todos sus edificios y darle la mitad de lo que costaron;
 * la misma cantidad se reparte entre quienes juegan limpio.
 */
export type ClickerSeizure = {
  /**
   * `review`: lo decidió quien administra; `auto`: lo vio la API al guardar;
   * `admin`: una sanción a mano, con su propio mensaje (`note`).
   */
  by: 'review' | 'auto' | 'admin'
  /** Lo que se le devuelve (la mitad de lo que costaron), y lo mismo que se reparte. */
  amount: number
  /** Veces que le han pillado, contando esta: elige el mensaje. */
  n: number
  /** Entre cuántas personas se ha repartido. */
  shared: number
  /** Los datos que no cuadraron, si los hay. */
  evidence: ClickerEvidence | null
  /** Lo que le dice quien administra, en una sanción a mano. */
  note?: string
}

/** Una sanción a mano de quien administra (`POST /admin/clicker/sanction`). */
export type ClickerSanction = {
  login: string
  /** El código que le queda. */
  code: number
  /** Si se le quitan todos los edificios y las mejoras. */
  wipe: boolean
  /** Lo que verá en el juego, con el aviso de la policía del código. */
  note: string
}

/** Una revisión pendiente de contestar: no se puede seguir sin defenderse. */
export type ClickerReview = {
  id: number
  at: string
  evidence: ClickerEvidence
}

/** Lo que decide quien administra sobre un salto sospechoso. */
export type ClickerVerdict = 'cheat' | 'likely' | 'clean'

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
  /** Lo que costó todo lo que se tiene, edificios y mejoras. */
  spent: number
  /**
   * El capital (líneas sin gastar, lo que costó lo que se tiene y lo que deben
   * los bugs) segundo a segundo desde el último guardado: `[segundo, capital]`.
   */
  capital?: [at: number, capital: number][]
  /** Las pulsaciones contadas segundo a segundo, `[segundo, pulsaciones]`. */
  clicks?: [at: number, clicks: number][]
}

/**
 * `GET /clicker/capital?from=&to=`: el historial de capital entre dos momentos
 * (segundos desde 1970; sin ellos, entero), en 300 puntos como mucho.
 *
 * Lo del último día se guarda cada diez segundos; lo de la última semana, cada
 * hora; lo anterior, cada día. No se borra.
 */
export type ClickerCapital = {
  /** `[segundo desde 1970, capital]`, del más antiguo al más nuevo. */
  points: [at: number, capital: number][]
  /** El primer y el último segundo de los que hay historial; `null` si no hay. */
  first: number | null
  last: number | null
}

/** Una partida que se rechazó por tramposa y sigue guardada, por si hay que indultarla. */
export type ClickerCheat = {
  id: number
  login: string
  at: string
  /** `figures`, `ledger`, `rate`, `speed` o `prestige`. */
  why: string
  total: number
  perSecond: number
}

/** Un salto de capital demasiado grande en pocos segundos que no se dio por trampa. */
export type ClickerAlert = {
  id: number
  login: string
  at: string
  /** Segundos que duró el salto, y el capital antes y después. */
  seconds: number
  from: number
  to: number
  /** Se abrió una pull request dorada por entonces: suele ser la explicación. */
  golden: boolean
  /** El capital segundo a segundo alrededor del salto. */
  trace: [at: number, capital: number][]
  /** `open`: por mirar; `asked`: tiene que defenderse; `answered`: ya lo ha hecho. */
  status: 'open' | 'asked' | 'answered'
  /** Su defensa o explicación, si ha contestado. */
  answer: string | null
}

/** Respuesta de `PUT /clicker/save`. */
export type ClickerSaved = {
  /** La `rev` que queda tras guardar. */
  rev: number
  /** Veces que le han pillado haciendo trampas, contando esta si lo es. */
  caught: number
  /** La partida no se ha guardado: no cuadra, o falta la venta forzosa. Toca volver a cargar. */
  refused: boolean
  /** Lo que le llega del reparto de las trampas de otras personas: hay que sumarlo. */
  gift: number
}

/** `GET /admin/clicker/game?login=`: la partida de alguien, para verla. Solo admins. */
export type ClickerGameView = {
  login: string
  save: string | null
  caught: number
  perSecond: number
}

export type ClickerRank = {
  /** Puesto, empezando en 1. */
  rank: number
  login: string
  image: string | null
  /** Nivel dentro del juego: sale de `total`. */
  level: number
  total: number
  /** Patrimonio: el código sin gastar más lo que costaron sus edificios. Ordena la clasificación. */
  wealth: number
  perSecond: number
  achievements: number
  prestige: number
}

/** `GET /clicker/board`: quién tiene más patrimonio ahora mismo. */
export type ClickerBoard = {
  entries: ClickerRank[]
  /** Tu fila, estés o no entre las primeras; `null` si aún no has guardado. */
  me: ClickerRank | null
}

/** Lo que se sabe de alguien que ha tocado el secreto. */
export type ClickerPlayer = {
  login: string
  /** Veces que ha pulsado la cruz. */
  plus: number
  pill: Pill | null
  /** Las cifras de su partida; a cero si no ha guardado ninguna. */
  level: number
  total: number
  perSecond: number
  achievements: number
  prestige: number
  /** Pulsaciones sobre la tecla, según su partida guardada. */
  clicks: number
  /** Lo que tiene ahora, según su partida guardada: líneas sin gastar y patrimonio. */
  code: number
  wealth: number
  /** Edificios que tiene (sumando todos los tipos) y mejoras compradas. */
  buildings: number
  upgrades: number
  /** Veces que su partida ha llegado a la API. */
  saves: number
  /** Última vez que pulsó la cruz o guardó. */
  updatedAt: string
  /** Trampas que se le han pillado, por qué la última y cuándo. */
  caught: number
  /** `figures`, `ledger`, `rate`, `speed` o `prestige`. */
  caughtWhy: string | null
  caughtAt: string | null
  /**
   * Segundos con el juego abierto en el periodo: viéndolo, con otra ventana
   * delante y con la pestaña oculta.
   */
  seen: number
  back: number
  hidden: number
}

/**
 * `GET /admin/clicker?days=`: el uso de Code Clicker. Solo admins.
 *
 * El tiempo es el del periodo; lo demás es de siempre, porque de la partida
 * solo se guarda cómo está ahora.
 */
export type ClickerUsage = {
  /** Días que cubre el tiempo, contando hoy. */
  days: number
  totals: {
    /** Quienes han pulsado la cruz alguna vez. */
    pressed: number
    /** Quienes llegaron a las cien pulsaciones. */
    reached: number
    red: number
    blue: number
    /** Quienes tienen una partida guardada. */
    players: number
    /** Quienes han pulsado la cruz o guardado en el periodo. */
    active: number
    /** Líneas escritas y guardados entre todas las partidas. */
    total: number
    saves: number
    /** Personas a las que se ha pillado alguna trampa. */
    caught: number
    seen: number
    back: number
    hidden: number
  }
  /** Una fila por persona, la que más ha escrito primero. */
  players: ClickerPlayer[]
  /** Saltos de capital por mirar, el más reciente primero. */
  alerts: ClickerAlert[]
  /** Partidas rechazadas que se pueden indultar, la más reciente primero. */
  cheats: ClickerCheat[]
}

/** Cómo se pilló una trampa: sola al guardar, al revisar un salto o con una sanción a mano. */
export type ClickerCheatHow = 'auto' | 'review' | 'sanction'

/** Una vez que se pilló a alguien, del registro de trampas. */
export type ClickerCheatEntry = {
  id: number
  login: string
  at: string
  how: ClickerCheatHow
  /**
   * Por qué: `figures`, `ledger`, `rate`, `speed`, `prestige` o `clicks` si se
   * vio sola; `review` si se dio por trampa al revisar un salto; `manual` si fue
   * una sanción a mano.
   */
  why: string
  /** Las cifras de la partida que llegó, si se vio al guardar. */
  total: number | null
  perSecond: number | null
  /** Lo que se le requisó para el reparto, en líneas. */
  seized: number
  /** El mensaje que vio en el juego, en una sanción a mano. */
  note: string | null
  /** Cuándo se indultó, o `null`. */
  pardonedAt: string | null
  /** La partida rechazada que aún se guarda y se puede indultar, o `null`. */
  copyId: number | null
}

/** Una persona del registro de trampas, con lo suyo resumido. */
export type ClickerCheater = {
  login: string
  /** Trampas sin indultar. */
  times: number
  first: string
  last: string
  /** Los porqués distintos, del más reciente al más antiguo. */
  whys: string[]
  /** Lo requisado en total. */
  seized: number
  /** Su patrimonio ahora. */
  wealth: number
  /** Si tiene una revisión abierta: pendiente de defenderse o ya defendida. */
  review: 'asked' | 'answered' | null
}

/** `GET /admin/clicker/cheats`: el registro de trampas. Solo admins. */
export type ClickerCheats = {
  /** El más reciente primero. */
  entries: ClickerCheatEntry[]
  /** Quien tiene alguna, la del último pillado primero. */
  people: ClickerCheater[]
}
