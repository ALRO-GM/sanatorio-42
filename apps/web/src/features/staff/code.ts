/**
 * Lo que el staff escribe en el campo del código, ya limpio.
 *
 * Lo normal es que tecleen las cuatro letras, pero también pueden pegar el
 * nombre entero del fichero (`horas-validadas_jdoe_…_K7QF.csv`): entonces se
 * queda con el código, que es lo último antes de la extensión.
 */
export function codeFromName(typed: string): string {
  const fromFile = /_([A-Za-z0-9]{4})\.csv\s*$/i.exec(typed)
  const raw = fromFile === null ? typed : (fromFile[1] ?? '')

  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .slice(0, 12)
}

/** Minutos como horas y minutos: `95` → `1 h 35 min`. Nunca negativo. */
export function hoursText(minutes: number): string {
  const whole = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0
  const hours = Math.floor(whole / 60)
  const rest = whole % 60

  return hours === 0 ? `${rest} min` : `${hours} h ${String(rest).padStart(2, '0')} min`
}
