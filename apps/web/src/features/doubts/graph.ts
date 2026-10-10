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
    .find((project) => project.status === 'in_progress' && project.projectId !== null)
}
