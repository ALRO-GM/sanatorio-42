/**
 * El grafo de correcciones: cuántas veces ha corregido cada cual cada proyecto
 * y qué grado le da eso. Los grados son los logros de cada proyecto: 1, 3, 5 y
 * 10 correcciones (a partir de 10, maestro del código en ese proyecto).
 */

import type { GraphProject, HolyGraph } from '@sanatorio/contracts'

export const CORRECTION_TIERS = [1, 3, 5, 10] as const

/** El grado de un proyecto: 0 sin corregir, del 1 al 4 según las veces. */
export function tierOf(times: number): number {
  return CORRECTION_TIERS.filter((goal) => times >= goal).length
}

/**
 * Lo que sale en el grafo de correcciones, por círculos: los proyectos que
 * siguen vivos en el campus. `future` son los que aún no ha aprobado (podrá
 * corregirlos cuando los apruebe).
 */
export function correctionRings(
  graph: HolyGraph,
): { circle: number; projects: (GraphProject & { future: boolean; tier: number })[] }[] {
  return graph.circles
    .map(({ circle, projects }) => ({
      circle,
      projects: projects
        .filter((project) => !project.retired || project.corrected > 0)
        .map((project) => ({
          ...project,
          future: project.status !== 'finished',
          tier: tierOf(project.corrected),
        })),
    }))
    .filter((ring) => ring.projects.length > 0)
}

/** Cuántos proyectos hay de cada grado, del 1 al 4. */
export function tierCounts(graph: HolyGraph): number[] {
  const all = graph.circles.flatMap((ring) => ring.projects)

  return CORRECTION_TIERS.map((goal) => all.filter((project) => project.corrected >= goal).length)
}
