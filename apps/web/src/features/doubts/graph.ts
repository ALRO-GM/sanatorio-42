import type { GraphProject, GraphSignals, HolyGraph } from '@sanatorio/contracts'

/** Las tres cosas de las que avisa el grafo, por orden de urgencia. */
export const SIGNALS = ['unanswered', 'proposals', 'missingGuide'] as const

export type Signal = (typeof SIGNALS)[number]

/** Lo que se pinta en la marca de cada aviso. Los textos, en `graph.signal.<aviso>`. */
export const SIGNAL_GLYPH: Record<Signal, string> = {
  unanswered: '?',
  proposals: '✎',
  missingGuide: '+',
}

export function hasSignal(signals: GraphSignals, signal: Signal): boolean {
  return signal === 'missingGuide' ? signals.missingGuide : signals[signal] > 0
}

/**
 * El aviso que enseña un nodo. Como mucho uno, el más urgente: tres marcas en
 * cada círculo no se leerían. El resto se ve al abrir el proyecto.
 */
export function mainSignal(signals: GraphSignals): Signal | null {
  return SIGNALS.find((signal) => hasSignal(signals, signal)) ?? null
}

/** Los avisos de varios proyectos juntos, para la burbuja de una serie. */
export function mergeSignals(projects: readonly GraphProject[]): GraphSignals {
  return {
    unanswered: projects.reduce((sum, project) => sum + project.signals.unanswered, 0),
    proposals: projects.reduce((sum, project) => sum + project.signals.proposals, 0),
    missingGuide: projects.some((project) => project.signals.missingGuide),
  }
}

/** Cuántos proyectos tienen cada aviso, para el resumen de arriba. */
export function countSignals(graph: HolyGraph): Record<Signal, number> {
  const projects = graph.circles.flatMap((circle) => circle.projects)

  return {
    // Las dudas se cuentan una a una; lo demás, por proyecto.
    unanswered: projects.reduce((sum, project) => sum + project.signals.unanswered, 0),
    proposals: projects.reduce((sum, project) => sum + project.signals.proposals, 0),
    missingGuide: projects.filter((project) => project.signals.missingGuide).length,
  }
}

/** El proyecto por el que abrir el tablón: el primero que la persona tenga en curso. */
export function firstInProgress(graph: HolyGraph): GraphProject | undefined {
  return graph.circles
    .flatMap((circle) => circle.projects)
    .find((project) => project.status === 'in_progress')
}

/** Cómo se pinta un proyecto: su estado, o "cerrado" si aún no lo tiene disponible. */
export type NodeLook = GraphProject['status'] | 'locked'

export const lookOf = (project: GraphProject): NodeLook =>
  project.locked ? 'locked' : project.status

/** Módulos que tiene que haber de una serie en un círculo para que merezca agruparlos. */
const MIN_SERIES = 3

/**
 * Lo que se dibuja en un círculo: proyectos sueltos y series.
 *
 * Una serie son varios módulos numerados (`Python Module 00`…`10`): once
 * burbujas iguales saturan el círculo, así que van en una sola, que se puede
 * abrir para verlos uno a uno.
 */
export type RingItem =
  | { kind: 'project'; project: GraphProject }
  | { kind: 'series'; series: string; projects: GraphProject[] }

/**
 * Agrupa los proyectos de un círculo.
 *
 * @param expanded Series abiertas: sus módulos salen sueltos.
 */
export function itemsOf(
  projects: readonly GraphProject[],
  expanded: ReadonlySet<string>,
): RingItem[] {
  const items: RingItem[] = []
  const bySeries = new Map<string, GraphProject[]>()

  for (const project of projects) {
    if (project.series !== null) {
      bySeries.set(project.series, [...(bySeries.get(project.series) ?? []), project])
    }
  }

  for (const project of projects) {
    const members = project.series === null ? undefined : bySeries.get(project.series)

    if (
      project.series === null ||
      members === undefined ||
      members.length < MIN_SERIES ||
      expanded.has(project.series)
    ) {
      items.push({ kind: 'project', project })
    } else if (members[0] === project) {
      // La serie ocupa el sitio de su primer módulo.
      items.push({ kind: 'series', series: project.series, projects: members })
    }
  }

  return items
}

/** Las series que hay en el grafo (las que tienen módulos suficientes), con su círculo. */
export function seriesIn(graph: HolyGraph): { series: string; circle: number; total: number }[] {
  return graph.circles.flatMap(({ circle, projects }) =>
    itemsOf(projects, new Set()).flatMap((item) =>
      item.kind === 'series' ? [{ series: item.series, circle, total: item.projects.length }] : [],
    ),
  )
}

/**
 * Cuánto de un círculo lleva aprobado la persona, de 0 a 1.
 *
 * Cuenta por horas, no por número de proyectos: aprobar el de 120 horas avanza
 * más que aprobar un módulo de 6. Los que no tienen horas cuentan como la media
 * de los que sí.
 *
 * Los de un grupo de «elige uno» (`choice`: so_long, FdF o fract-ol) son un solo
 * hueco, del tamaño medio del grupo, y está hecho si se aprobó cualquiera: si no,
 * nadie llegaría nunca al 100 %.
 */
export function completion(projects: readonly GraphProject[]): number {
  const known = projects.flatMap((project) => (project.hours === null ? [] : [project.hours]))
  const average =
    known.length === 0 ? 1 : known.reduce((sum, hours) => sum + hours, 0) / known.length
  const weight = (project: GraphProject): number => project.hours ?? average
  // Cada hueco: un proyecto suelto, o un grupo entero de «elige uno».
  const slots = new Map<string, GraphProject[]>()

  for (const project of projects) {
    const key =
      project.choice === null ? `project:${project.projectId}` : `choice:${project.choice}`

    slots.set(key, [...(slots.get(key) ?? []), project])
  }

  let total = 0
  let done = 0

  for (const members of slots.values()) {
    const size = members.reduce((sum, project) => sum + weight(project), 0) / members.length

    total += size
    if (members.some((project) => project.status === 'finished')) done += size
  }

  return total === 0 ? 0 : done / total
}
