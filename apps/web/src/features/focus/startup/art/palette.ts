import type { Axis } from '@sanatorio/startup'

/**
 * Los colores de los dibujos de la startup. Son de ilustración plana, iguales
 * en claro y en oscuro (como los post-its): por eso hexadecimales.
 *
 * Cada modelo de negocio tiene el suyo, del mismo orden repartido por la rueda
 * que la Red (`network/colors.ts`).
 */
export const AXIS_COLOR: Record<Axis, string> = {
  front: '#3b8fe0',
  back: '#ef7d3a',
  data: '#3cb46e',
  ai: '#b25be0',
  infra: '#e6b326',
}
