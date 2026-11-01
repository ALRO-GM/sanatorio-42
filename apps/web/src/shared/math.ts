/**
 * Cuentas pequeñas que se repetían en varias pantallas (barras, rellenos,
 * cuentas atrás de pregunta).
 */

/** `value` dentro de `[low, high]`; de fábrica, de 0 a 1. `NaN` queda en `low`. */
export function clamp(value: number, low = 0, high = 1): number {
  return Number.isNaN(value) ? low : Math.min(high, Math.max(low, value))
}

/**
 * Lo que le queda a una pregunta con hora de empiezo y de fin: los segundos
 * enteros (redondeando hacia arriba, nunca negativos) y la parte que queda,
 * de 1 a 0, para la barra. Un tramo vacío o al revés cuenta como de 1 ms.
 */
export function timeLeft(
  startsAt: number,
  endsAt: number,
  now: number,
): { seconds: number; share: number } {
  return {
    seconds: Math.max(0, Math.ceil((endsAt - now) / 1000)),
    share: clamp((endsAt - now) / Math.max(1, endsAt - startsAt)),
  }
}
