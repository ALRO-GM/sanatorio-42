/**
 * La piscina (C Piscine, cursus `9`) tal como la dibuja su grafo de la intra
 * (pedido por Alberto el 2026-10-26, `docs/piscineros.md`): los círculos azul
 * claro son los de shell (Shell 00 y 01), los azul oscuro los de C (C 00 a
 * C 13), y aparte van los proyectos en grupo del fin de semana (los rushes y
 * BSQ) y los exámenes.
 *
 * Los de shell y C, en orden, son el **avance** de un piscinero. Los de aparte
 * no suman al avance, pero se pueden elegir para pedir y dar ayuda (sala de
 * espera, tablón, sprints).
 *
 * Se reconocen por su `slug`, como el common core. Fuera quedan los
 * `c-piscine-exam-checkpoint-*` (prácticas de examen) y `c-piscine-reloaded`,
 * que es del 42cursus.
 */

import type { PiscineGroup } from '@sanatorio/contracts'

type PiscineProject = {
  slug: string
  /** Nombre corto, para el nodo del grafo y el eje del avance. */
  short: string
  group: PiscineGroup
}

const two = (n: number): string => String(n).padStart(2, '0')

/** Los proyectos de la piscina, en el orden en que se dibujan: primero los que cuentan. */
export const PISCINE: readonly PiscineProject[] = [
  ...[0, 1].map((n) => ({
    slug: `c-piscine-shell-${two(n)}`,
    short: `Shell ${two(n)}`,
    group: 'shell' as const,
  })),
  ...Array.from({ length: 14 }, (_, n) => ({
    slug: `c-piscine-c-${two(n)}`,
    short: `C ${two(n)}`,
    group: 'c' as const,
  })),
  ...[0, 1, 2].map((n) => ({
    slug: `c-piscine-rush-${two(n)}`,
    short: `Rush ${two(n)}`,
    group: 'rush' as const,
  })),
  { slug: 'c-piscine-bsq', short: 'BSQ', group: 'rush' },
  ...[0, 1, 2].map((n) => ({
    slug: `c-piscine-exam-${two(n)}`,
    short: `Exam ${two(n)}`,
    group: 'exam' as const,
  })),
  { slug: 'c-piscine-final-exam', short: 'Final', group: 'exam' },
]

/** `true` si el grupo cuenta para el avance: shell y C. */
export const countsForProgress = (group: PiscineGroup): group is 'shell' | 'c' =>
  group === 'shell' || group === 'c'

/** Los que cuentan para el avance, en orden: Shell 00 … C 13. */
export const PISCINE_PROGRESS: readonly (PiscineProject & { group: 'shell' | 'c' })[] =
  PISCINE.flatMap((project) =>
    countsForProgress(project.group) ? [{ ...project, group: project.group }] : [],
  )
