/**
 * Las frases de ánimo de la guardia, de la tabla `animos`: cincuenta que
 * invitan a ofrecerse (`cheer.ask.*`, cuando aún no hay franjas) y cincuenta que
 * dan las gracias (`cheer.thanks.*`, cuando ya las hay). Cada visita saca una
 * al azar. Se añaden o se quitan filas en la tabla sin tocar nada más.
 */

import type { useI18n } from '../../shared/i18n'

type Tree = ReturnType<typeof useI18n>['tree']

/**
 * Una frase para quien abre su guardia.
 *
 * @param offering `true` si ya se ofrece en alguna franja: toca dar las gracias.
 * @param pick     Número entre 0 y 1 que elige la frase.
 */
export function cheerFor(tree: Tree, offering: boolean, pick: number): string {
  const { value } = tree(offering ? 'cheer.thanks' : 'cheer.ask')
  const list = Array.isArray(value) ? (value as unknown[]).map(String) : []

  return list[Math.floor(pick * list.length) % list.length] ?? ''
}
