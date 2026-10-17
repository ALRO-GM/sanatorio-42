/**
 * El texto de «Privacidad y condiciones», de la tabla `legal`: un documento
 * entero guardado en claves (`legal.doc.sections.2.body.1`…, ver `tree.ts`).
 *
 * Tiene que decir lo que la web hace de verdad. Si cambia algo de lo que dice
 * (qué se guarda, cuánto, quién lo ve), se cambia en la tabla **y** la versión
 * (`LEGAL_VERSION` en `modules/legal` de la API): entonces se vuelve a pedir que
 * se acepte.
 *
 * Es un texto de base, escrito con cuidado pero sin abogado: conviene que lo
 * revise alguien de leyes.
 */

import type { useI18n } from '../../shared/i18n'

type Tree = ReturnType<typeof useI18n>['tree']

type LegalSection = { heading: string; body: readonly (string | readonly string[])[] }

type LegalText = {
  title: string
  /** Lo que se enseña antes de aceptar: lo esencial en una lista corta. */
  summary: readonly string[]
  sections: readonly LegalSection[]
}

/**
 * El texto en el idioma elegido. En catalán y euskera, el castellano: el
 * documento no está traducido (`translated` lo dice).
 */
export function legalText(tree: Tree): { text: LegalText; translated: boolean } {
  const { value, translated } = tree('legal.doc')

  return { text: value as LegalText, translated }
}
