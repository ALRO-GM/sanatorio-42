/**
 * En qué idioma se leen los textos de un curso (teoría, ejemplos, pruebas).
 * Los cursos solo están escritos en español y en inglés: el inglés lo lee
 * `en` y también `fr`, que cae al inglés mientras no tenga sus textos (como el
 * resto de la web). El catalán, el euskera y lo desconocido, el español.
 */
export function courseLang(lang: string): 'es' | 'en' {
  return lang === 'en' || lang === 'fr' ? 'en' : 'es'
}
