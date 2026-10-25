/** Con qué formato se escriben fechas y horas en cada idioma de la web. */
const LOCALES: Record<string, string> = {
  es: 'es-ES',
  en: 'en-GB',
  ca: 'ca-ES',
  eu: 'eu-ES',
  fr: 'fr-FR',
}

/** El formato de un idioma; el de un idioma desconocido es el español. */
export const localeOf = (lang: string): string => LOCALES[lang] ?? 'es-ES'
