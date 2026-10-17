/**
 * Estadísticas de Ayuda: cifras del campus y clasificación de cada sección
 * (sala de espera, tablón, terapia, pizarras y Not-games).
 */

import type { LeaderboardPeriod } from './profile.js'

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
