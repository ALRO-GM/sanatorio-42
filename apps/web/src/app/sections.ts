/**
 * Secciones de la web. La primera es la portada.
 *
 * Añadir una sección es añadirla aquí (con su icono y su clave `nav.<id>` en
 * los idiomas) y decir qué se pinta en `Clinic.tsx`.
 *
 * `inNav: false` la deja fuera de la fila de pestañas: se llega a ella desde
 * otro sitio (el expediente se abre con la cruz de la cabecera).
 */
export const SECTIONS = [
  { id: 'consulta', icon: '🩺', inNav: true },
  { id: 'guardia', icon: '🛟', inNav: true },
  { id: 'calendario', icon: '📅', inNav: true },
  { id: 'terapia', icon: '🫂', inNav: true },
  { id: 'tablon', icon: '📌', inNav: true },
  { id: 'pizarras', icon: '🧑‍🏫', inNav: true },
  { id: 'red', icon: '🕸️', inNav: true },
  { id: 'expediente', icon: '📋', inNav: false },
] as const

export type Section = (typeof SECTIONS)[number]['id']

export const HOME: Section = SECTIONS[0].id

export function isSection(name: string): name is Section {
  return SECTIONS.some((section) => section.id === name)
}
