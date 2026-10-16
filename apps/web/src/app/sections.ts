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
 * la cabecera.
 *
 * El orden en que salen las pestañas no es el de esta lista: lo decide la
 * personalización (`shared/layout`).
 */
export const SECTIONS = [
  { id: 'consulta', icon: 'consulta', inNav: true },
  { id: 'tablon', icon: 'tablon', inNav: true },
  { id: 'terapia', icon: 'terapia', inNav: true },
  { id: 'pizarras', icon: 'pizarras', inNav: true },
  { id: 'calendario', icon: 'calendario', inNav: true },
  { id: 'red', icon: 'red', inNav: true },
  { id: 'clusters', icon: 'capas', inNav: true },
  // La guardia se abre desde "De guardia", en la cabecera.
  { id: 'guardia', icon: 'guardia', inNav: false },
  { id: 'expediente', icon: 'expediente', inNav: false },
  // La sección secreta: solo existe para quien eligió la pastilla roja.
  { id: 'clicker', icon: 'terminal', inNav: false },
  // Panel de gestión: solo para quien administra la web.
  { id: 'gestion', icon: 'gestion', inNav: false },
  // Privacidad y condiciones: se llega desde el pie.
  { id: 'privacidad', icon: 'escudo', inNav: false },
] as const satisfies readonly { id: string; icon: IconName; inNav: boolean }[]

export type Section = (typeof SECTIONS)[number]['id']

export const HOME: Section = 'expediente'

export function isSection(name: string): name is Section {
  return SECTIONS.some((section) => section.id === name)
}
