/**
 * Cómo se escribe el tiempo en toda la web. Antes cada reloj (exámenes,
 * Pomodoro, salas, panel) lo formateaba a su manera; aquí va una vez.
 *
 * Las abreviaturas `s`, `min` y `h` son las mismas en los cuatro idiomas, así
 * que no pasan por las tablas de textos.
 */

const two = (value: number): string => String(value).padStart(2, '0')

/**
 * Una cuenta atrás o un cronómetro: `4:59`, y con horas `1:05:09`.
 *
 * @param seconds Segundos que faltan o que han pasado; lo negativo es `0:00`.
 */
export function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60

  return hours > 0 ? `${hours}:${two(minutes)}:${two(rest)}` : `${minutes}:${two(rest)}`
}

/** Una duración, en corto: «40 s», «7 min», «2 h 05 min». */
export function durationText(seconds: number): string {
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} s`

  const minutes = Math.round(seconds / 60)

  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${two(minutes % 60)} min`
}
