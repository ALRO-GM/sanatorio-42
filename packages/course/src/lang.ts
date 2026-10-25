/**
 * En qué idioma se leen los textos de un curso (teoría, ejemplos, pruebas).
 * Los cursos están escritos en español, en inglés y en francés: cada uno lo
 * lee el suyo. El catalán, el euskera y lo desconocido, el español.
 */
export function courseLang(lang: string): 'es' | 'en' | 'fr' {
  return lang === 'en' || lang === 'fr' ? lang : 'es'
}

/**
 * El texto de un curso en ese idioma. Si al francés le falta, sale el inglés
 * (como en el resto de la web, que lo tiene de reserva).
 */
export function courseText<T>(texts: { es: T; en: T; fr?: T }, lang: string): T {
  const course = courseLang(lang)

  if (course === 'fr') return texts.fr ?? texts.en

  return texts[course]
}
