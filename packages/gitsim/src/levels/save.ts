/**
 * Un commit de verdad para montar un punto o resolverlo: un fichero nuevo,
 * `git add` y `git commit`. Como en git, un commit sin nada preparado se niega,
 * así que cada commit de un punto lleva su cambio. El fichero sale del mensaje
 * («lo mío» → `lo-mio.txt`): commits distintos tocan ficheros distintos y unir
 * ramas no choca salvo donde el punto lo busca.
 */

/** «Versión 1.0» → `version-1-0`. */
const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function save(message: string, file = `${slug(message)}.txt`): string[] {
  return [`echo "${message}" > ${file}`, `git add ${file}`, `git commit -m "${message}"`]
}
