import type { Detail } from '../shared/detail'
import type { IconName } from '../shared/ui/Icon'
/**
 * Secciones de la web. La portada (`HOME`) es el expediente: lo primero que se
 * ve al entrar es lo tuyo.
 *
 * Añadir una sección es añadirla aquí (con su icono y su clave `nav.<id>` en
 * los idiomas) y decir qué se pinta en `Clinic.tsx`.
 *
 * `inNav: false` la deja fuera de las pestañas que se pueden reordenar: el
 * expediente va siempre el primero, y a la guardia y al panel se llega desde
 * la cabecera. `category` dice bajo qué pestaña de arriba va y `from`, desde
 * qué modo de la interfaz sale.
 *
 * El orden en que salen las pestañas no es el de esta lista: lo decide la
 * personalización (`shared/layout`).
 */
export const SECTIONS = [
  { id: 'consulta', icon: 'consulta', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'tablon', icon: 'tablon', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'terapia', icon: 'terapia', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'pizarras', icon: 'pizarras', inNav: true, category: 'ayuda', from: 'simple' },
  // Not-games: aprender jugando a preguntas de programación con más gente.
  { id: 'notgames', icon: 'pregunta', inNav: true, category: 'ayuda', from: 'normal' },
  // Estadísticas de Ayuda: cifras y clasificación de cada sección. Con rankings:
  // desde el modo normal (el simplificado no enseña rankings).
  { id: 'estadisticas', icon: 'cifras', inNav: true, category: 'ayuda', from: 'normal' },
  { id: 'calendario', icon: 'calendario', inNav: true, category: 'calendario', from: 'simple' },
  { id: 'red', icon: 'red', inNav: true, category: 'datos', from: 'normal' },
  // Avance en el common core frente a la media y los paces (#87).
  { id: 'avance', icon: 'despegue', inNav: true, category: 'datos', from: 'normal' },
  // Clústeres: el plano del campus, en su propia pestaña de arriba.
  { id: 'clusters', icon: 'capas', inNav: true, category: 'clusters', from: 'normal' },
  // Exámenes: el de ahora (en vivo) y sus estadísticas.
  { id: 'examenes', icon: 'medalla', inNav: true, category: 'datos', from: 'normal' },
  // La guardia se abre desde "De guardia", en la cabecera.
  { id: 'guardia', icon: 'guardia', inNav: false },
  { id: 'expediente', icon: 'expediente', inNav: false, category: 'expediente', from: 'simple' },
  // La sección secreta: solo existe para quien eligió la pastilla roja.
  { id: 'clicker', icon: 'terminal', inNav: false },
  // Panel de gestión: solo para quien administra la web.
  { id: 'gestion', icon: 'gestion', inNav: false },
  // Privacidad y condiciones: se llega desde el pie.
  { id: 'privacidad', icon: 'escudo', inNav: false },
] as const satisfies readonly {
  id: string
  icon: IconName
  inNav: boolean
  /** La pestaña de arriba bajo la que va; sin ella, no sale en las pestañas. */
  category?: Category
  /** Desde qué modo de la interfaz sale en las pestañas (`shared/detail.tsx`). */
  from?: Detail
}[]

export type Section = (typeof SECTIONS)[number]['id']

/**
 * Las pestañas de arriba: las secciones van agrupadas por para qué sirven.
 *
 * - Expediente: lo tuyo. Es la portada.
 * - Ayuda: quedar con gente para pedir y dar ayuda, aprender y enseñar.
 * - Calendario: todo lo que tienes, en el tiempo.
 * - Clústeres: el plano del campus, quién está y dónde.
 * - Datos: el campus en cifras (correcciones, exámenes).
 *
 * Una categoría con una sola sección es esa sección; con varias, al abrirla
 * sale una segunda fila con ellas. Dónde va una funcionalidad nueva: la regla
 * de `AGENTS.md` y el mapa de `docs/interfaz.md`.
 */
export const CATEGORIES = [
  { id: 'expediente', icon: 'expediente' },
  { id: 'ayuda', icon: 'corazon' },
  { id: 'calendario', icon: 'calendario' },
  { id: 'clusters', icon: 'capas' },
  { id: 'datos', icon: 'cifras' },
] as const satisfies readonly { id: string; icon: IconName }[]

export type Category = (typeof CATEGORIES)[number]['id']

/** Lo que se sabe de cada sección, con los campos opcionales a la vista. */
type SectionInfo = {
  id: Section
  icon: IconName
  inNav: boolean
  category?: Category
  from?: Detail
}

const SECTION_INFO: readonly SectionInfo[] = SECTIONS

/** La categoría de una sección, o `null` si no va en las pestañas. */
export function categoryOf(section: Section): Category | null {
  return SECTION_INFO.find((entry) => entry.id === section)?.category ?? null
}

/** Las secciones de una categoría, en el orden de esta lista. */
export function sectionsOfCategory(category: Category): SectionInfo[] {
  return SECTION_INFO.filter((entry) => entry.category === category)
}

export const HOME: Section = 'expediente'

/**
 * Si, en Pomodoro, esta sección queda fuera: una de las pestañas que no se ha
 * elegido, o el juego. El expediente (la portada) siempre se puede ver: es
 * adonde se vuelve. Gestión, guardia y privacidad no se eligen y no se cierran.
 */
export function hiddenInFocus(section: Section, chosen: readonly string[]): boolean {
  if (section === HOME) return false
  if (section === 'clicker') return true

  return (
    SECTION_INFO.some((entry) => entry.id === section && entry.inNav) && !chosen.includes(section)
  )
}

export function isSection(name: string): name is Section {
  return SECTIONS.some((section) => section.id === name)
}
