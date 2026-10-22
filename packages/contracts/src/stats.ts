/**
 * Estadísticas de Ayuda: cifras del campus y clasificación de cada sección
 * (sala de espera, tablón, terapia, pizarras y Not-games).
 */

import type { LeaderboardPeriod } from './profile.js'

/** `ritmo`: quién va más rápido en el curso, según el sistema de pace. */
export type StatsSectionId = 'consulta' | 'tablon' | 'terapia' | 'pizarras' | 'notgames' | 'ritmo'

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
/** Un valor (en %) por cada día de `StatsProgress.days`; `null` donde aún no se llega. */
export type ProgressLine = (number | null)[]

/** `GET /stats/progress`: el avance en el common core a lo largo del tiempo (#87). */
export type StatsProgress = {
  /** Días desde el inicio de cada punto de las líneas. */
  days: number[]
  /** El plan de quien mira (o de con quién se compara), si se sabe. */
  track: 'classic' | 'next' | null
  me: Record<ProgressMeasure, ProgressLine> | null
  /** La otra persona con la que se compara (`?with=login`), si la hay. */
  other: { login: string; line: Record<ProgressMeasure, ProgressLine> } | null
  averages: Record<ProgressMeasure, Record<ProgressGroup, ProgressLine>>
  /** Cuánta gente hay en cada media. */
  people: Record<ProgressGroup, number>
  /** Lo que pide cada pace, en `[día, %]`, con el plan de quien mira. */
  paces: Record<ProgressMeasure, { pace: number; points: [number, number][] }[]>
}
