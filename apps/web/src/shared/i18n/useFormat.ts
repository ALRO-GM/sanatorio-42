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
  /** `13 oct 2025`, con las partes dichas una a una (`medium` puede ordenarlas distinto). */
  | 'dayMonthYear'
  /** `13 oct 25`: una fecha corta en una lista apretada. */
  | 'dayMonthYY'
  /** `lun, 13 oct`: un día de un grupo, que se lee junto a otros. */
  | 'weekdayDayMonth'
  /** `13 de octubre de 2025`: una fecha que se lee entera (cuándo aceptaste algo). */
  | 'longDate'

/** Los estilos de fecha y hora. */
type DateTimeStyle =
  /** `13/10/25, 16:05`. */
  | 'short'
  /** `13 oct 2025, 16:05`. */
  | 'medium'
  /** `13 de octubre de 2025, 16:05`. */
  | 'long'
  /** `13/10/2025, 16:05:00`: lo que da `toLocaleString()` sin opciones, para el panel. */
  | 'numeric'
  /** `13 oct, 16:05`. */
  | 'dayMonth'
  /** `lunes, 13 de octubre, 16:05`. */
  | 'weekday'
  /** `lunes, 13 de octubre de 2025, 16:05`: lo que se confirma antes de mover algo. */
  | 'weekdayYear'

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
  dateTime: (value: Moment, style?: DateTimeStyle) => string
}

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: {},
  medium: { dateStyle: 'medium' },
  dayMonth: { day: 'numeric', month: 'short' },
  monthYear: { month: 'short', year: 'numeric', timeZone: 'UTC' },
  weekday: { weekday: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  monthLong: { month: 'long', year: 'numeric' },
  dayMonthYear: { day: 'numeric', month: 'short', year: 'numeric' },
  dayMonthYY: { day: 'numeric', month: 'short', year: '2-digit' },
  weekdayDayMonth: { weekday: 'short', day: 'numeric', month: 'short' },
  longDate: { dateStyle: 'long' },
}

const HOUR = { hour: '2-digit', minute: '2-digit' } as const

const DATE_TIME_OPTIONS: Record<DateTimeStyle, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short', timeStyle: 'short' },
  medium: { dateStyle: 'medium', timeStyle: 'short' },
  long: { dateStyle: 'long', timeStyle: 'short' },
  numeric: {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  },
  dayMonth: { day: 'numeric', month: 'short', ...HOUR },
  weekday: { weekday: 'long', day: 'numeric', month: 'long', ...HOUR },
  weekdayYear: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...HOUR },
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
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const time = new Intl.DateTimeFormat(locale, HOUR)
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
  // Un formateador de fecha por estilo, montado la primera vez que se pide.
  const moments = new Map<string, Intl.DateTimeFormat>()
  const momentOf = (key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
    let format = moments.get(key)

    if (format === undefined) {
      format = new Intl.DateTimeFormat(locale, options)
      moments.set(key, format)
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
    date: (value, style = 'short') =>
      momentOf(`date:${style}`, DATE_OPTIONS[style]).format(toDate(value)),
    dateTime: (value, style = 'short') =>
      momentOf(`dateTime:${style}`, DATE_TIME_OPTIONS[style]).format(toDate(value)),
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
