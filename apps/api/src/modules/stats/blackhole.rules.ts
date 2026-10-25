/**
 * Si alguien terminó el common core, sigue en él, se lo tragó el black hole o
 * no se sabe seguro (`docs/blackhole.md`, con los datos que lo justifican).
 * Sin base ni red.
 *
 * La fecha de black hole de 42 no basta: el staff da días, hay congelaciones y,
 * desde el sistema de pace, muchas fechas pasadas no significan nada (en una
 * muestra de Madrid, 17 de cada 100 con la fecha vencida seguían activos y
 * con proyectos abiertos). Lo que sí es de fiar es lo que 42 hace al echar a
 * alguien: le pone `end_at` al cursus y le desactiva la cuenta (`active?`
 * falso). Ante la duda, `unknown`: no entra en ninguna media.
 */

import type { CoreStatus } from '@sanatorio/contracts'

const DAY_MS = 86_400_000

/** Días que tiene que llevar fuera para darlo por hecho: lo que tarda el staff en deshacer un error. */
export const SETTLE_DAYS = 30
/** Sin hacer nada en este tiempo y con la fecha de black hole pasada, no se sabe si sigue. */
export const STALE_DAYS = 120

/** Los grados del 42cursus de quien terminó el common core (`Member` es el nombre de antes). */
const FINISHED_GRADES: ReadonlySet<string> = new Set(['Transcender', 'Alumni', 'Member'])

/** Lo que se sabe del paso de alguien por el 42cursus (fechas en ms). `null`: no consta. */
export type CoreFacts = {
  grade: string | null
  endAt: number | null
  blackholedAt: number | null
  /** Si la cuenta sigue activa (`active?`); `null` si 42 no lo dice. */
  active: boolean | null
  alumni: boolean
  /**
   * Lo último que hizo: apuntarse a un proyecto o mover uno abierto. No vale
   * cuándo cambió uno aprobado: 42 los toca en lote años después.
   */
  lastActivity: number | null
  /**
   * Si aprobó lo que cierra el common core: ft_transcendence y el examen 6
   * (`exam-rank-06` o `42next-exam-rank-06`). Sin eso, el grado no basta.
   */
  closedCore: boolean
}

export function coreStatusOf(facts: CoreFacts | null, now: number): CoreStatus {
  if (facts === null) return 'unknown'
  if (facts.alumni || (facts.grade !== null && FINISHED_GRADES.has(facts.grade))) {
    // El grado solo con las dos pruebas: hay `Alumni` del plan de antes de 2020
    // (sin ft_transcendence ni examen 6), cuentas de staff y de pruebas con el
    // grado puesto a mano y quien no tiene sus proyectos en la réplica. No
    // terminaron este common core ni siguen en él: no se sabe.
    return facts.closedCore ? 'finished' : 'unknown'
  }

  if (facts.endAt !== null) {
    const settled = facts.endAt <= now - SETTLE_DAYS * DAY_MS
    // Si se apuntó a algo bien pasado el fin, volvió por otro camino: no se sabe.
    const back =
      facts.lastActivity !== null && facts.lastActivity > facts.endAt + SETTLE_DAYS * DAY_MS

    return facts.active === false && settled && !back ? 'blackholed' : 'unknown'
  }

  // Sin fin pero con la cuenta cerrada: suspendida, trasladada… no se sabe.
  if (facts.active !== true) return 'unknown'
  if (facts.blackholedAt === null || facts.blackholedAt > now) return 'active'

  // Con la fecha pasada sigue dentro si se mueve (días extra, pace nuevo); si
  // no, puede estar congelada o a punto de salir.
  return facts.lastActivity !== null && facts.lastActivity >= now - STALE_DAYS * DAY_MS
    ? 'active'
    : 'unknown'
}
