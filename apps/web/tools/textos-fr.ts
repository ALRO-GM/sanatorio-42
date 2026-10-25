/**
 * La tipografía del francés, celda a celda (`npm run textos`).
 *
 * - U+00A0 (espacio sin corte) antes de `:` y `%`, y dentro de « ».
 * - U+202F (espacio fino sin corte) antes de `;`, `?` y `!`.
 * - Comillas « », `…` y no `...`, sin dobles espacios.
 * - Miles con U+202F (`10 000`).
 * - Nada de ¿ ¡ ñ ni mayúsculas sin acento (`A la`, `Etape`).
 *
 * No mira dentro de los huecos (`{n}`), las URL, los correos ni el `código`,
 * y solo cuenta la puntuación de una frase: la que va seguida de un espacio o
 * acaba el texto (`10:30`, `a:b` o `%p` no son frases).
 */

const NBSP = '\u00a0'
const NNBSP = '\u202f'

/** Lo que no es prosa: huecos, URL, correos y `código`. */
const RAW = /\{\w+\}|https?:\/\/\S+|[\w.+-]+@[\w-]+\.[\w.]+|`[^`]*`/g

/** Lo que puede venir tras un signo que acaba una frase o una parte de ella. */
const AFTER_PROSE = new Set(['', ' ', NBSP, NNBSP, '»', ')', '?', '!', '…'])

/** Nombres propios con ñ que se dejan como son. */
const SPANISH_NAMES = /Española|España|Protección/g

const UNACCENTED =
  /(?:^|[.!?…]\s)A (?:la|le|les|l'|ton|ta|tes|toi|vous|nous|partir|bientôt|demain|quel|quelle|qui|quoi|plus|un|une|ce|cette|chaque|tout|propos)\b|\b(?:Etat|Etape|Echec|Ecri|Evén|Eval|Etudi|Equipe|Ecole|Elève|Etes|Etre|Ecran|Epreuve|Egal)/

const name = (space: string): string => (space === NBSP ? 'U+00A0' : 'U+202F')

/** Los problemas de tipografía de un texto en francés (vacío si está bien). */
export function frenchTypography(text: string): string[] {
  const problems = new Set<string>()
  const raw = [...text.matchAll(RAW)].map((match) => [match.index, match.index + match[0].length])
  const isRaw = (index: number): boolean =>
    raw.some(([from = 0, to = 0]) => index >= from && index < to)

  for (const match of text.matchAll(/[:;?!%]/g)) {
    const index = match.index
    const sign = match[0]
    const before = text.charAt(index - 1)
    const after = text.charAt(index + 1)

    if (isRaw(index)) continue

    if (sign === '%') {
      if (/\p{L}/u.test(after)) continue
      if (/\d|\}/.test(before)) problems.add('falta U+00A0 antes de «%»')
      else if (before === ' ' || before === NNBSP) problems.add('antes de «%» va U+00A0')
      continue
    }

    if (!AFTER_PROSE.has(after) || before === '' || before === '?' || before === '!') continue

    const wanted = sign === ':' ? NBSP : NNBSP

    if (before === ' ') problems.add(`antes de «${sign}» va ${name(wanted)}, no un espacio normal`)
    else if (before === NBSP || before === NNBSP) {
      if (before !== wanted)
        problems.add(`antes de «${sign}» va ${name(wanted)}, no ${name(before)}`)
    } else problems.add(`falta ${name(wanted)} antes de «${sign}»`)
  }

  // Lo demás, solo en la prosa: lo crudo se cambia por una marca neutra.
  const prose = text.replaceAll(RAW, '\u0000')

  if (/«[^\u00a0]|«$/.test(text)) problems.add('tras la comilla «, U+00A0')
  if (/(?:^|[^\u00a0])»/.test(text)) problems.add('antes de la comilla », U+00A0')
  if (/["“”]/.test(prose)) problems.add('comillas inglesas: van « »')
  if (prose.includes('...')) problems.add('«...»: va «…»')
  if (text.includes('  ')) problems.add('espacio doble')
  if (/[¿¡ñÑ]/.test(prose.replaceAll(SPANISH_NAMES, ''))) problems.add('lleva ¿, ¡ o ñ')
  if (UNACCENTED.test(prose)) problems.add('mayúscula sin acento (À, É…)')
  if (/\d[ \u00a0]\d{3}(?!\d)/.test(prose)) problems.add('los miles van con U+202F')

  for (const [from = 0, to = 0] of raw) {
    if (/[\u00a0\u202f]/.test(text.slice(from, to))) {
      problems.add('espacio sin corte dentro de un hueco, una URL o código')
    }
  }

  return [...problems]
}
