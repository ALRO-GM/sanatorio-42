/**
 * Las sugerencias de mejora de la burbuja de la cabecera
 * (`docs/sugerencias.md`), sin base: qué se acepta y cómo se lee el sitio
 * guardado. Van al buzón de incidencias como un mensaje más (`kind: 'idea'`,
 * `category: 'improvement'`), con la propuesta y el sitio aparte.
 */

import type { TicketPlace } from '@sanatorio/contracts'
import { z } from 'zod'

/** Largo máximo del problema y de la propuesta: dos frases, no una redacción. */
const PROBLEM_MAX = 500
const PROPOSAL_MAX = 500

/**
 * Sugerencias por persona en 24 horas, además del tope de todo el buzón (tres
 * cada diez minutos). Soltar la burbuja cuesta poco: sin esto, una tarde de
 * pruebas llenaría la bandeja de quien administra.
 */
export const SUGGESTIONS_PER_DAY = 10

/** Un texto de una línea, sin caracteres de control. */
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\p{Cc}]*$/u, 'texto no válido')

const placeSchema = z.object({
  section: z.string().regex(/^[a-z]{2,20}$/, 'sección no válida'),
  label: line(80).min(1, 'falta el sitio'),
  detail: line(120).nullable().default(null),
  // Una ruta de CSS hecha por la web: nombres, clases, `[data-feedback=…]` y
  // `:nth-of-type(…)`. Nada de comillas raras ni de saltos de línea.
  selector: z
    .string()
    .max(300)
    .regex(/^[\w\s#.:>()[\]="-]*$/, 'ruta no válida'),
  hash: z
    .string()
    .max(200)
    .regex(/^(#\S*)?$/, 'dirección no válida'),
  viewport: z.object({
    width: z.number().int().min(1).max(20_000),
    height: z.number().int().min(1).max(20_000),
  }),
  theme: z.string().regex(/^[a-z0-9-]{1,40}$/, 'estilo no válido'),
  lang: z.string().regex(/^[a-z]{2}$/, 'idioma no válido'),
  mode: z.enum(['simple', 'normal', 'datos']),
})

export const suggestionSchema = z.object({
  problem: z
    .string()
    .trim()
    .min(5, 'problem: cuéntalo con un poco más de detalle')
    .max(PROBLEM_MAX),
  proposal: z
    .string()
    .trim()
    .max(PROPOSAL_MAX)
    .optional()
    .transform((text) => (text === undefined || text === '' ? null : text)),
  place: placeSchema,
})

/**
 * El sitio guardado de un mensaje, o `null` si no lo tiene o no se entiende
 * (un mensaje de antes, o una fila tocada a mano).
 */
export function placeFrom(stored: unknown): TicketPlace | null {
  if (typeof stored !== 'string' || stored === '') return null

  try {
    const parsed = placeSchema
      .extend({ version: z.string().nullable().default(null) })
      .safeParse(JSON.parse(stored))

    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
