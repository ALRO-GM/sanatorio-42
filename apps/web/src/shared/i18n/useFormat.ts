import { useMemo } from 'react'

import { useI18n } from './index'
import { localeOf } from './locale'

type Moment = string | number | Date

/** Los estilos de fecha que usa la web, con nombre, para que no se repitan las opciones. */
type DateStyle =
  /** `13/10/2025`. */
  | 'short'
  /** `13 oct 2025`. */
  | 'medium'
  /** `13 oct`. */
  | 'dayMonth'
  /** `oct 2025`, en UTC: el mes de una kickoff no depende de la zona horaria. */
  | 'monthYear'
  /** `mar.`. */
  | 'weekday'
  /** `martes, 13 de octubre`. */
  | 'long'
  /** `octubre de 2025`. */
  | 'monthLong'

type Formats = {
  /** `1.234` con, como mucho, `digits` decimales. */
  number: (value: number, digits?: number) => string
  /** `1,2 M`. */
  compact: (value: number) => string
  /**
   * Un tamaño en bytes, con la unidad del idioma: `38 GB`, `9 TB`; en
   * francés, `38 Go`, `9 To`. Unidades de mil (kB, MB, GB, TB).
   */
  bytes: (value: number) => string
  /** `16:05`. */
  time: (value: Moment) => string
  date: (value: Moment, style?: DateStyle) => string
  /** `13/10/25, 16:05`. */
  dateTime: (value: Moment) => string
}

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: {},
  medium: { dateStyle: 'medium' },
  dayMonth: { day: 'numeric', month: 'short' },
  monthYear: { month: 'short', year: 'numeric', timeZone: 'UTC' },
  weekday: { weekday: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  monthLong: { month: 'long', year: 'numeric' },
}

const toDate = (value: Moment): Date => (value instanceof Date ? value : new Date(value))

/** Las unidades de `bytes`, de mayor a menor, con lo que vale cada una. */
const BYTE_UNITS = [
  ['terabyte', 1e12],
  ['gigabyte', 1e9],
  ['megabyte', 1e6],
  ['kilobyte', 1e3],
] as const

/** Los formateadores de cada idioma, creados una vez: `Intl.*Format` es caro de montar. */
const cache = new Map<string, Formats>()

/**
 * Fechas y números en el idioma elegido en la web (no en el del navegador).
 * Para funciones puras que ya reciben `lang`; en un componente, `useFormat`.
 */
export function formatsFor(lang: string): Formats {
  const locale = localeOf(lang)
  const known = cache.get(locale)

  if (known !== undefined) return known

  const numbers = new Map<number | undefined, Intl.NumberFormat>()
  const dates = new Map<DateStyle, Intl.DateTimeFormat>()
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' })
  const numberOf = (digits: number | undefined): Intl.NumberFormat => {
    let format = numbers.get(digits)

    if (format === undefined) {
      format = new Intl.NumberFormat(
        locale,
        digits === undefined ? {} : { maximumFractionDigits: digits },
      )
      numbers.set(digits, format)
    }

    return format
  }
  const dateOf = (style: DateStyle): Intl.DateTimeFormat => {
    let format = dates.get(style)

    if (format === undefined) {
      format = new Intl.DateTimeFormat(locale, DATE_OPTIONS[style])
      dates.set(style, format)
    }

    return format
  }

  const units = new Map<string, Intl.NumberFormat>()
  const bytes = (value: number): string => {
    const [unit, size] =
      BYTE_UNITS.find(([, each]) => Math.abs(value) >= each) ?? (['kilobyte', 1e3] as const)
    const scaled = value / size
    // Un decimal solo donde dice algo: «9,4 TB», pero «38 GB» y «340 kB».
    const digits = unit === 'kilobyte' || Math.abs(scaled) >= 10 ? 0 : 1
    const id = `${unit}:${digits}`
    let format = units.get(id)

    if (format === undefined) {
      format = new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
        maximumFractionDigits: digits,
      })
      units.set(id, format)
    }

    return format.format(scaled)
  }

  const formats: Formats = {
    number: (value, digits) => numberOf(digits).format(value),
    compact: (value) => compact.format(value),
    bytes,
    time: (value) => time.format(toDate(value)),
    date: (value, style = 'short') => dateOf(style).format(toDate(value)),
    dateTime: (value) => dateTime.format(toDate(value)),
  }

  cache.set(locale, formats)

  return formats
}

/**
 * Los formatos del idioma elegido, para pintar. Antes cada pantalla llamaba a
 * `toLocaleString` (28 veces sin idioma: salía el del navegador) o montaba un
 * `Intl.*Format` en cada pintado; aquí van una vez por idioma.
 */
export function useFormat(): Formats {
  const { lang } = useI18n()

  return useMemo(() => formatsFor(lang), [lang])
}
