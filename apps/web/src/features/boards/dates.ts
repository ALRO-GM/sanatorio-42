const pad = (value: number): string => String(value).padStart(2, '0')

/** `2026-10-10`, en la hora del navegador. Es la clave de cada día del calendario. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `17:30`, en la hora del navegador. */
export function hhmm(iso: string): string {
  const date = new Date(iso)

  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
