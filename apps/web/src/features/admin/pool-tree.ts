/**
 * Los permisos de piscineros, ordenados como la web (`docs/piscineros.md`):
 * cada pestaña de arriba con sus secciones y, dentro, sus elementos
 * (`sección.elemento`). Lleva todas las claves de `PoolKey`: si se añade una,
 * TypeScript pide ponerla aquí.
 */

import type { PoolKey } from '@sanatorio/contracts'

/** Dónde va cada clave en el árbol del panel. */
type Group = 'yo' | 'ayuda' | 'aprender' | 'campus' | 'extra'

const TREE: Record<PoolKey, Group> = {
  expediente: 'yo',
  'expediente.health': 'yo',
  'expediente.hours': 'yo',
  'expediente.network': 'yo',
  'expediente.achievements': 'yo',
  'expediente.ranking': 'yo',
  agenda: 'yo',
  'agenda.sprint': 'yo',
  consulta: 'ayuda',
  'consulta.map': 'ayuda',
  guardia: 'ayuda',
  tablon: 'ayuda',
  'tablon.graph': 'ayuda',
  'tablon.corrections': 'ayuda',
  terapia: 'ayuda',
  pizarras: 'ayuda',
  notgames: 'aprender',
  'notgames.chess': 'aprender',
  'notgames.review': 'aprender',
  gitcourse: 'aprender',
  'gitcourse.groups': 'aprender',
  shellcourse: 'aprender',
  estadisticas: 'campus',
  calendario: 'yo',
  clusters: 'campus',
  'clusters.online': 'campus',
  'clusters.broken': 'campus',
  'clusters.report': 'campus',
  red: 'campus',
  'red.rankings': 'campus',
  'red.seats': 'campus',
  avance: 'campus',
  'avance.compare': 'campus',
  examenes: 'campus',
  'examenes.live': 'campus',
  'examenes.stats': 'campus',
  clicker: 'extra',
  focus: 'aprender',
  'focus.stats': 'aprender',
  mailbox: 'extra',
  people: 'extra',
  broadcasts: 'extra',
  tickets: 'extra',
}

export const GROUPS: readonly Group[] = ['yo', 'ayuda', 'aprender', 'campus', 'extra']

/** Las secciones (claves sin punto) de un grupo, cada una con sus elementos. */
export function sectionsOf(group: Group): { key: PoolKey; items: PoolKey[] }[] {
  const keys = (Object.keys(TREE) as PoolKey[]).filter((key) => TREE[key] === group)

  return keys
    .filter((key) => !key.includes('.'))
    .map((key) => ({ key, items: keys.filter((item) => item.startsWith(`${key}.`)) }))
}
