/**
 * Estadísticas de Ayuda: cifras del campus y clasificación de cada sección
 * (sala de espera, tablón, terapia, pizarras y Not-games).
 */

import type { LeaderboardPeriod } from './profile.js'

/** Las secciones de Ayuda. Quién va más rápido está en el Avance (`StatsRanking`). */
export type StatsSectionId = 'consulta' | 'tablon' | 'terapia' | 'pizarras' | 'notgames'

/** Una cifra del campus. `key` es la del texto (`stats.<sección>.<key>`). */
export type StatsTotal = { key: string; value: number }

export type StatsEntry = {
  /** Puesto, empezando en 1. Quien empata comparte puesto. */
  rank: number
  login: string
  image: string | null
  /** Lo que ordena la clasificación (`stats.<sección>.value`). */
  value: number
  /** Una segunda cifra que desempata y se enseña al lado (`stats.<sección>.extra`). */
  extra: number
}

export type StatsSection = {
  id: StatsSectionId
  totals: StatsTotal[]
  /** Los primeros puestos. */
  ranking: StatsEntry[]
  /** Dónde está quien pregunta, aunque no entre en la lista. `null` si no sale. */
  me: StatsEntry | null
}

/** `GET /stats?period=month|all`: las cifras de Ayuda del campus que se mira. */
export type HelpStats = {
  period: LeaderboardPeriod
  sections: StatsSection[]
}

/** Cómo se mide el avance: parte de cada círculo hecha, u horas estimadas hechas. */
export type ProgressMeasure = 'circles' | 'hours'
/**
 * Con quién se compara: un campus (por defecto, el tuyo) o todos los campus
 * juntos. En las sugerencias (`StatsFastest`), tu campus o uno por campus.
 */
export type ProgressScope = 'campus' | 'all'
/** De qué plan, en la clasificación: los dos juntos, el clásico (C) o el nuevo (Python). */
export type ProgressPlan = 'all' | 'classic' | 'next'
/**
 * Dónde está cada cual en el common core (`docs/blackhole.md`): lo terminó, sigue
 * en él, se lo tragó el black hole (se fue sin terminar) o no se sabe seguro.
 */
export type CoreStatus = 'finished' | 'active' | 'blackholed' | 'unknown'
/**
 * Con qué gente se hace la media: quien terminó, quien sigue más quien terminó
 * (`current`), o quien se tragó el black hole. Nunca entra `unknown`.
 */
export type ProgressPopulation = 'finished' | 'current' | 'blackholed'
/** Los dos planes del common core: el clásico (C) y el nuevo (Python). */
export type CoreTrack = 'classic' | 'next'
/** Un valor (en %) por cada día de `StatsProgress.days`; `null` donde aún no se llega. */
export type ProgressLine = (number | null)[]
/**
 * Un día en que una persona aprobó algo que mueve su línea: el día (desde su
 * inicio), el nombre de cada proyecto y el % en que queda, de las dos maneras.
 */
export type ProgressMilestone = {
  day: number
  projects: string[]
  value: Record<ProgressMeasure, number>
}
/**
 * La línea de una persona, de las dos maneras de medir, con sus hitos. Quien
 * terminó se mide contra lo que hizo hasta terminar: su línea acaba en el 100 %.
 */
export type ProgressTrace = {
  line: Record<ProgressMeasure, ProgressLine>
  /** Las horas de su common core: las de su plan o, si terminó, las de lo que hizo. */
  hours: number
  /** El día (desde su inicio) en que terminó el common core; `null` si no lo ha terminado. */
  finished: number | null
  /** Cada día en que aprobó algo, del primero al último. */
  milestones: ProgressMilestone[]
}
/** La línea de una persona con quien se compara. */
export type ProgressPersonLine = ProgressTrace & { login: string }
/**
 * La línea de una persona de una media con muy poca gente (`StatsProgress.minPeople`).
 * `login` es `null` en la de quien se tragó el black hole: se ve el camino (y lo
 * que aprobó), no quién.
 */
export type ProgressIndividual = ProgressTrace & { login: string | null }

/**
 * Las medias de un sitio: un campus o todos los campus juntos. Cada plan va
 * siempre en su línea.
 */
export type ProgressArea = {
  /** El campus; `null` en todos los campus juntos. */
  id: number | null
  /** Su nombre; `null` en todos juntos o si no se sabe. */
  name: string | null
  /** Medida × población × plan. Sin bastante gente, `null` en cada punto. */
  averages: Record<ProgressMeasure, Record<ProgressPopulation, Record<CoreTrack, ProgressLine>>>
  /**
   * Donde una media tiene menos de `minPeople` personas, la línea de cada una en
   * su lugar (sin quien no se ve). Con bastante gente, vacío: va la media.
   */
  individuals: Record<ProgressPopulation, Record<CoreTrack, ProgressIndividual[]>>
  /** Cuánta gente hay en cada media. */
  people: Record<ProgressPopulation, Record<CoreTrack, number>>
  /** Cuánta gente hay en cada estado, por plan; `unknown` no entra en ninguna media. */
  census: Record<CoreTrack, Record<CoreStatus, number>>
}

/** Un campus que se puede pedir en el Avance. */
export type ProgressCampus = { id: number; name: string }

/**
 * `GET /stats/progress?with=a,b&campuses=22,1`: el avance en el common core a lo
 * largo del tiempo (#87).
 */
export type StatsProgress = {
  /** Días desde el inicio de cada punto de las líneas. */
  days: number[]
  /** El plan de quien mira (o de con quién se compara), si se sabe. */
  track: CoreTrack | null
  me: ProgressTrace | null
  /**
   * Tu campus: el de tu 42cursus, no el que estés mirando en la web. Es el que
   * va por defecto y el de las sugerencias y la clasificación.
   */
  home: number
  /** Los campus que se pueden pedir: los que sigue la web, y el tuyo. */
  available: ProgressCampus[]
  /** Las medias de cada campus pedido (`?campuses=`; sin pedir, el tuyo), en ese orden. */
  campuses: ProgressArea[]
  /** Las medias de todos los campus juntos. */
  all: ProgressArea
  /**
   * Las personas con las que se compara (`?with=a,b`), en el orden pedido. Quien
   * no tiene datos o no se ve (otro mundo, oculta) no sale.
   */
  others: ProgressPersonLine[]
  /** Con cuánta gente se hace media. */
  minPeople: number
  /**
   * Para los ejes. `circles[n]`: el % de tener completos los círculos 0…n, con el
   * plan de quien mira. `hours`: las horas de todo el common core de quien mira
   * (con su versión de cada proyecto; si terminó, las de lo que hizo) y las de
   * cada plan.
   */
  axis: { circles: number[]; hours: number; planHours: Record<CoreTrack, number> }
  /** Lo que pide cada pace, en `[día, %]`, con el plan de quien mira. */
  paces: Record<ProgressMeasure, { pace: number; points: [number, number][] }[]>
}

/** Una persona que terminó el common core deprisa: sugerencia para compararse. */
export type FastestEntry = {
  login: string
  image: string | null
  /** El nombre de su campus, si se sabe. */
  campus: string | null
  /** Días desde su inicio en el 42cursus hasta terminar. */
  days: number
}

/**
 * `GET /stats/progress/fastest`: quien terminó el common core más deprisa, por
 * plan. `campus`: los primeros de tu campus (`StatsProgress.home`); `all`: el primero de
 * cada campus. Sin quien no se ve.
 */
export type StatsFastest = Record<ProgressScope, Record<CoreTrack, FastestEntry[]>>

/** Por qué se ordena quién va más rápido: el círculo en el que está, o el % hecho por círculos o por horas. */
export type RankingBy = 'circle' | 'circles' | 'hours'

/** Una persona en la clasificación de quién va más rápido. */
export type RankingEntry = {
  /** Puesto, empezando en 1. Quien empata en lo que ordena comparte puesto. */
  rank: number
  login: string
  image: string | null
  track: CoreTrack
  /** El círculo en el que está (0-6); 7 si terminó el common core. */
  circle: number
  /** % hecho por círculos y por horas (sobre las de su plan). */
  circles: number
  hours: number
}

/**
 * `GET /stats/ranking`: quién va más rápido en el campus, sin quien se tragó el
 * black hole ni quien no se sabe. Va por páginas: `entries` empieza en `offset`.
 */
export type StatsRanking = {
  /** Los meses en que entró gente (kickoffs), con cuánta gente de la clasificación, del más reciente al más antiguo. */
  kickoffs: { month: string; people: number }[]
  /** Cuánta gente entra con los filtros. */
  total: number
  offset: number
  entries: RankingEntry[]
  /** Quien mira, si entra con los filtros, aunque no salga en la página. */
  me: RankingEntry | null
}

/** Un día en que un piscinero aprobó proyectos que cuentan: cuáles y con cuántos se queda. */
export type PiscineMilestone = { day: number; projects: string[]; value: number }

/**
 * La línea de un piscinero: cuántos proyectos de los que cuentan (Shell 00 …
 * C 13) lleva aprobados al acabar cada día de `PiscineProgress.days`; `null`
 * los días que aún no ha vivido.
 */
export type PiscineTrace = {
  line: ProgressLine
  /** Cuántos lleva aprobados hoy. */
  done: number
  milestones: PiscineMilestone[]
}

/**
 * Una media de piscineros: la línea (proyectos aprobados de media; `null` en
 * los días con menos de `minPeople` personas), cuánta gente entra y, si en
 * total son menos de `minPeople`, la línea de cada cual. `login` es `null` en
 * quien ya no es de tu mundo (las piscinas anteriores: hoy son estudiantes o
 * ya no están).
 */
export type PiscineAverage = {
  line: ProgressLine
  people: number
  individuals: (PiscineTrace & { login: string | null })[]
  /** El inicio de la piscina más antigua que entra (ISO-8601); `null` sin nadie. */
  since: string | null
}

/**
 * `GET /stats/progress/piscine?with=a,b`: el Avance de un piscinero
 * (`docs/piscineros.md`). El eje es el día de piscina; lo que cuenta son los
 * proyectos Shell 00 … C 13 aprobados. Los rushes, BSQ y los exámenes no suman.
 */
export type PiscineProgress = {
  /** Días desde el inicio de la piscina: 0, 1, 2… */
  days: number[]
  /** Los proyectos que cuentan, en su orden: el eje vertical. */
  steps: { short: string; group: 'shell' | 'c' }[]
  /** Tu inicio de piscina (ISO-8601), o `null` si no se sabe. */
  startedAt: string | null
  me: PiscineTrace | null
  /** Tu piscina: quien la empezó en tu campus a la vez que tú (una semana arriba o abajo). */
  cohort: PiscineAverage
  /** Las piscinas anteriores de tu campus, de los tres últimos años. */
  past: PiscineAverage
  /** Las personas con quien te comparas (`?with=`): piscineros de tu campus. */
  others: (PiscineTrace & { login: string })[]
  minPeople: number
  /** El nombre de tu campus, si se sabe. */
  campus: string | null
}
