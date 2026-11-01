import { describe, expect, it } from 'vitest'

import { localeOf } from '../src/shared/i18n/locale'
import { formatsFor } from '../src/shared/i18n/useFormat'

/** Las 16:05 del 13 de octubre de 2025, en la hora local de quien mira. */
const WHEN = new Date(2025, 9, 13, 16, 5)

describe('formatsFor: números y fechas en el idioma elegido', () => {
  it('los números siguen el idioma de la web, no el del navegador', () => {
    expect(formatsFor('es').number(1234.5)).toBe('1234,5')
    expect(formatsFor('en').number(1234.5)).toBe('1,234.5')
    expect(formatsFor('es').number(2.456, 1)).toBe('2,5')
    expect(formatsFor('en').number(2.456, 0)).toBe('2')
    expect(formatsFor('en').compact(1_250_000)).toMatch(/^1\.3[mM]$/)
  })

  it('los tamaños llevan la unidad del idioma: GB en español e inglés, Go en francés', () => {
    expect(formatsFor('es').bytes(38_000_000_000)).toBe('38 GB')
    expect(formatsFor('es').bytes(9_040_000_000_000)).toBe('9 TB')
    expect(formatsFor('es').bytes(9_440_000_000_000)).toBe('9,4 TB')
    expect(formatsFor('en').bytes(9_440_000_000_000)).toBe('9.4 TB')
    expect(formatsFor('en').bytes(1_250_000)).toBe('1.3 MB')
    expect(formatsFor('en').bytes(340_400)).toBe('340 kB')
    expect(formatsFor('fr').bytes(38_000_000_000)).toBe('38\u202fGo')
    expect(formatsFor('fr').bytes(9_440_000_000_000)).toBe('9,4\u202fTo')
    expect(formatsFor('fr').bytes(1_250_000)).toBe('1,3\u202fMo')
    // Lo que no llega a un kilobyte se cuenta en kilobytes: «0 kB».
    expect(formatsFor('es').bytes(0)).toBe('0 kB')
  })

  it('los miles van con el separador del idioma', () => {
    expect(formatsFor('fr').number(551_600)).toBe('551\u202f600')
    expect(formatsFor('es').number(551_600)).toBe('551.600')
    expect(formatsFor('en').number(81_723)).toBe('81,723')
  })

  it('cada estilo de fecha tiene su forma', () => {
    const en = formatsFor('en')

    expect(en.time(WHEN)).toBe('16:05')
    expect(en.date(WHEN)).toBe('13/10/2025')
    expect(en.date(WHEN, 'medium')).toBe('13 Oct 2025')
    expect(en.date(WHEN, 'dayMonth')).toBe('13 Oct')
    expect(en.date(WHEN, 'weekday')).toBe('Mon')
    expect(en.date(WHEN, 'long')).toBe('Monday 13 October')
    expect(en.date(WHEN, 'monthLong')).toBe('October 2025')
    expect(en.date('2025-10-01T00:00:00Z', 'monthYear')).toBe('Oct 2025')
    expect(en.dateTime(WHEN)).toBe('13/10/2025, 16:05')
  })

  it('los estilos que antes se escribían a mano en cada pantalla', () => {
    const en = formatsFor('en')

    expect(en.date(WHEN, 'dayMonthYear')).toBe('13 Oct 2025')
    expect(en.date(WHEN, 'dayMonthYY')).toBe('13 Oct 25')
    expect(en.date(WHEN, 'weekdayDayMonth')).toBe('Mon 13 Oct')
    expect(en.date(WHEN, 'longDate')).toBe('13 October 2025')
    expect(en.dateTime(WHEN, 'medium')).toBe('13 Oct 2025, 16:05')
    expect(en.dateTime(WHEN, 'dayMonth')).toBe('13 Oct, 16:05')
    expect(en.dateTime(WHEN, 'numeric')).toBe('13/10/2025, 16:05:00')
    expect(en.dateTime(WHEN, 'short')).toBe(en.dateTime(WHEN))
  })

  it('dicen lo mismo que las llamadas a mano que sustituyen, en cada idioma', () => {
    // Las opciones que llevaba cada pantalla antes de pasar a `useFormat`: el
    // texto no puede cambiar al unificarlas.
    const before = {
      dayMonthYear: { day: 'numeric', month: 'short', year: 'numeric' },
      dayMonthYY: { day: 'numeric', month: 'short', year: '2-digit' },
      weekdayDayMonth: { weekday: 'short', day: 'numeric', month: 'short' },
      longDate: { dateStyle: 'long' },
    } as const
    const beforeTime = {
      medium: { dateStyle: 'medium', timeStyle: 'short' },
      long: { dateStyle: 'long', timeStyle: 'short' },
      dayMonth: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
      weekday: {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      },
      weekdayYear: {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    } as const

    for (const lang of ['es', 'en', 'ca', 'eu', 'fr']) {
      const format = formatsFor(lang)
      const locale = localeOf(lang)

      for (const [style, options] of Object.entries(before)) {
        expect(format.date(WHEN, style as keyof typeof before)).toBe(
          WHEN.toLocaleDateString(locale, options),
        )
      }
      for (const [style, options] of Object.entries(beforeTime)) {
        expect(format.dateTime(WHEN, style as keyof typeof beforeTime)).toBe(
          WHEN.toLocaleString(locale, options),
        )
      }
      // `toLocaleString(locale)` sin opciones: lo que enseñaba el panel.
      expect(format.dateTime(WHEN, 'numeric')).toBe(WHEN.toLocaleString(locale))
      expect(format.number(1234.5)).toBe((1234.5).toLocaleString(locale))
    }
  })

  it('lo raro: una fecha inválida lanza en vez de inventar un texto, y los años lejanos se escriben', () => {
    const es = formatsFor('es')

    // `Intl` lanza con una fecha inválida: quien llama pasa fechas de la API.
    expect(() => es.date('no es una fecha', 'dayMonthYY')).toThrow(RangeError)
    expect(es.date(new Date(Date.UTC(9999, 11, 31, 12)), 'dayMonthYear')).toContain('9999')
    expect(es.date(0, 'longDate')).toMatch(/1970/)
  })

  it('acepta ISO, milisegundos o Date, y un idioma desconocido cae al español', () => {
    const es = formatsFor('es')

    expect(es.time(WHEN.toISOString())).toBe(es.time(WHEN.getTime()))
    expect(formatsFor('xx').date(WHEN)).toBe(es.date(WHEN))
  })

  it('los formateadores se crean una vez por idioma', () => {
    expect(formatsFor('ca')).toBe(formatsFor('ca'))
    expect(formatsFor('ca')).not.toBe(formatsFor('eu'))
    expect(formatsFor('fr')).not.toBe(formatsFor('en'))
  })
})
