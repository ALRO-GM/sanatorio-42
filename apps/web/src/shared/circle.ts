/**
 * Cómo se nombra el círculo de alguien. Un estudiante va por un círculo del
 * common core («Círculo 3»); un piscinero, por el último módulo de C que tiene
 * aprobado («C 06»), o por el Shell si aún no tiene ninguno (pedido por
 * Alberto, 2026-11-01). En el plano los dos son solo el número.
 */

import type { Translate } from './i18n'

export function circleLabel(t: Translate, circle: number, pool: boolean): string {
  if (!pool) return t('map.circle', { n: circle })

  return circle === 0
    ? t('map.circle.shell')
    : t('map.circle.c', { n: String(circle).padStart(2, '0') })
}
