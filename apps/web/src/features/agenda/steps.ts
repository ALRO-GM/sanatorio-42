/**
 * Lo pequeño que comparten las piezas de la agenda: los escalones del avance
 * (de 10 en 10, con su nombre: elegir es más rápido que teclear un número) y
 * las cuentas de días.
 */

import type { Translate } from '../../shared/i18n'

const STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/** Los escalones, con el que ya tiene la meta si no es uno de ellos (55, de un daily). */
export const progressSteps = (current = 0): number[] =>
  [...new Set([...STEPS, current])].sort((a, b) => a - b)

/** «0 % · sin empezar», «40 %», «100 % · listo para entregar». */
export const progressLabel = (t: Translate, step: number): string =>
  step === 0 ? t('scrum.progress.zero') : step === 100 ? t('scrum.progress.full') : `${step} %`

/** `YYYY-MM-DD` más `days` días. */
export function plusDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** El instante con el que se fija la cuenta atrás de una meta: el final de su día, en tu hora. */
export function deadlineOf(day: string): string {
  return new Date(`${day}T23:59:00`).toISOString()
}
