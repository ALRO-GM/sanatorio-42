import type { PoolAccess, PoolKey } from '@sanatorio/contracts'

import type { Detail } from '../shared/detail'
import { poolAllows } from '../shared/pool'
import type { IconName } from '../shared/ui/Icon'
/**
 * Secciones de la web. La portada (`HOME`) es el expediente: lo primero que se
 * ve al entrar es lo tuyo.
 *
 * Añadir una sección es añadirla aquí (con su icono y su clave `nav.<id>` en
 * los idiomas) y decir qué se pinta en `Clinic.tsx`.
 *
 * `inNav: false` la deja fuera de las pestañas que se pueden reordenar: el
 * expediente va siempre el primero de Yo, y al panel se llega desde el menú. `category` dice bajo qué pestaña de arriba va y `from`, desde
 * qué modo de la interfaz sale.
 *
 * El orden en que salen las pestañas no es el de esta lista: lo decide la
 * personalización (`shared/layout`).
 */
export const SECTIONS = [
  // Yo: lo tuyo. La portada es el expediente; con él, tu agenda (Scrum por
  // proyecto, `docs/agenda.md`) y tu calendario.
  { id: 'agenda', icon: 'agenda', inNav: true, category: 'yo', from: 'normal' },
  { id: 'calendario', icon: 'calendario', inNav: true, category: 'yo', from: 'simple' },
  // Ayuda: pedir y dar ayuda, quedar con gente.
  { id: 'consulta', icon: 'consulta', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'tablon', icon: 'tablon', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'terapia', icon: 'terapia', inNav: true, category: 'ayuda', from: 'simple' },
  { id: 'pizarras', icon: 'pizarras', inNav: true, category: 'ayuda', from: 'simple' },
  // La guardia: ofrecer ayuda. El interruptor sigue en la cabecera, que es lo
  // que se toca a diario; la página, con las demás de Ayuda.
  { id: 'guardia', icon: 'guardia', inNav: true, category: 'ayuda', from: 'simple' },
  // Aprender: practicar y concentrarse. Not-games (preguntas con más gente,
  // con los cursos de git y de shell dentro, de momento).
  { id: 'notgames', icon: 'pregunta', inNav: true, category: 'aprender', from: 'normal' },
  // Campus: cómo va el campus y cómo vas tú frente a él.
  { id: 'clusters', icon: 'capas', inNav: true, category: 'campus', from: 'normal' },
  // Avance en el common core frente a la media y los paces (#87).
  { id: 'avance', icon: 'despegue', inNav: true, category: 'campus', from: 'normal' },
  { id: 'red', icon: 'red', inNav: true, category: 'campus', from: 'normal' },
  // Exámenes: el de ahora (en vivo), el último y sus estadísticas.
  { id: 'examenes', icon: 'medalla', inNav: true, category: 'campus', from: 'normal' },
  // Clasificaciones de cada sección de Ayuda. Son rankings: desde el modo
  // normal (el simplificado no los enseña).
  { id: 'estadisticas', icon: 'cifras', inNav: true, category: 'campus', from: 'normal' },
  { id: 'expediente', icon: 'expediente', inNav: false, category: 'yo', from: 'simple' },
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
 * Las pestañas de arriba: las secciones van agrupadas por para qué viene cada
 * cual (reorganización del 2026-10-29, `docs/interfaz.md`).
 *
 * - Yo: lo tuyo. Es la portada; con ella, tu agenda y tu calendario.
 * - Ayuda: pedir y dar ayuda, quedar con gente, la guardia.
 * - Aprender: practicar, cursos y juegos de preguntas.
 * - Campus: el campus en cifras y mapas (clústeres, avance, red, exámenes).
 *
 * Una categoría con una sola sección es esa sección; con varias, al abrirla
 * sale una segunda fila con ellas. Dónde va una funcionalidad nueva: la regla
 * de `AGENTS.md` y el mapa de `docs/interfaz.md`.
 */
export const CATEGORIES = [
  { id: 'yo', icon: 'expediente' },
  { id: 'ayuda', icon: 'corazon' },
  { id: 'aprender', icon: 'pregunta' },
  { id: 'campus', icon: 'capas' },
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
 * El permiso de piscinero de cada sección (`docs/piscineros.md`); `null` la
 * que no depende de él: privacidad, siempre; gestión, solo quien administra.
 */
const POOL_KEY: Record<Section, PoolKey | null> = {
  agenda: 'agenda',
  consulta: 'consulta',
  tablon: 'tablon',
  terapia: 'terapia',
  pizarras: 'pizarras',
  notgames: 'notgames',
  estadisticas: 'estadisticas',
  calendario: 'calendario',
  red: 'red',
  avance: 'avance',
  clusters: 'clusters',
  examenes: 'examenes',
  guardia: 'guardia',
  expediente: 'expediente',
  clicker: 'clicker',
  gestion: null,
  privacidad: null,
}

/**
 * Si un piscinero no puede abrir esta sección. La portada nunca se cierra: es
 * adonde se vuelve, y sin el permiso enseña solo un saludo.
 */
export function blockedForPool(section: Section, access: PoolAccess): boolean {
  const key = POOL_KEY[section]

  return section !== HOME && key !== null && !poolAllows(key, access)
}

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
