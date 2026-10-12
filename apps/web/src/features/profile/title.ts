/** A partir de cuántas trampas pilladas el título de Code Clicker lleva contador. */
const COUNTED_FROM = 3

/**
 * El título del banner, tal como se lee. El de quien ha hecho trampas en Code
 * Clicker tres veces o más lleva al lado las veces que le han pillado.
 */
export function titleText(t: (key: string) => string, title: string, hacks: number): string {
  const name = t(`title.${title}`)

  return title === 'hacker_cazado' && hacks >= COUNTED_FROM ? `${name} ×${hacks}` : name
}
