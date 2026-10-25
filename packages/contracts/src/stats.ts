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
/** Con quién se compara: el campus de quien mira, o todos los campus. */
export type ProgressScope = 'campus' | 'all'
/** De qué plan: los dos juntos, el clásico (C) o el nuevo (Python). */
export type ProgressPlan = 'all' | 'classic' | 'next'
export type ProgressGroup = `${ProgressScope}-${ProgressPlan}`
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

/** `GET /stats/progress`: el avance en el common core a lo largo del tiempo (#87). */
export type StatsProgress = {
  /** Días desde el inicio de cada punto de las líneas. */
  days: number[]
  /** El plan de quien mira (o de con quién se compara), si se sabe. */
  track: CoreTrack | null
  me: Record<ProgressMeasure, ProgressLine> | null
  /** La otra persona con la que se compara (`?with=login`), si la hay. */
  other: { login: string; line: Record<ProgressMeasure, ProgressLine> } | null
  averages: Record<ProgressMeasure, Record<ProgressPopulation, Record<ProgressGroup, ProgressLine>>>
  /** Cuánta gente hay en cada media. */
  people: Record<ProgressPopulation, Record<ProgressGroup, number>>
  /** Cuánta gente hay en cada estado, por alcance y plan; `unknown` no entra en ninguna media. */
  census: Record<ProgressScope, Record<CoreTrack, Record<CoreStatus, number>>>
  /**
   * Para los ejes. `circles[n]`: el % de tener completos los círculos 0…n, con el
   * plan de quien mira. `hours`: las horas de todo el common core de quien mira
   * (con su versión de cada proyecto) y las de cada plan.
   */
  axis: { circles: number[]; hours: number; planHours: Record<CoreTrack, number> }
  /** Lo que pide cada pace, en `[día, %]`, con el plan de quien mira. */
  paces: Record<ProgressMeasure, { pace: number; points: [number, number][] }[]>
}

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
