/** Cómo enseña Docker tamaños, tiempos y tablas. */

/** Bytes en unidades de 1000, como `docker images` (`13.3kB`, `192MB`, `1.12GB`). */
export function human(bytes: number): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0

  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }

  const text =
    value >= 100 || unit === 0
      ? value.toFixed(0)
      : value >= 10
        ? value.toFixed(1)
        : value.toFixed(2)

  return `${text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}${units[unit] ?? 'B'}`
}

/** «3 seconds», «About a minute», «12 minutes»: el contador del mundo avanza uno por orden. */
export function ago(ticks: number): string {
  const seconds = Math.max(1, ticks * 7 + 2)

  if (seconds < 60) return `${seconds} seconds`
  if (seconds < 120) return 'About a minute'

  return `${Math.floor(seconds / 60)} minutes`
}

/** Una tabla con columnas separadas por al menos tres espacios (como la CLI de Docker). */
export function table(head: string[], rows: string[][]): string {
  const widths = head.map((title, i) =>
    Math.max(title.length, ...rows.map((row) => (row[i] ?? '').length)),
  )
  const line = (cells: string[]) =>
    cells
      .map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd((widths[i] ?? 0) + 3)))
      .join('')
      .trimEnd()

  return [line(head), ...rows.map(line)].join('\n') + '\n'
}

/** `512m`, `1g`, `256MB` → bytes (0 si no se entiende). */
export function bytesOf(text: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*([bkmg])?b?$/i.exec(text.trim())

  if (match === null) return 0

  const unit = { b: 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[
    (match[2] ?? 'b').toLowerCase() as 'b' | 'k' | 'm' | 'g'
  ]

  return Math.round(Number(match[1]) * unit)
}
