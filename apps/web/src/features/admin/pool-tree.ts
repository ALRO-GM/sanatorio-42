/**
 * Los permisos de piscineros, ordenados como la web (`docs/piscineros.md`):
 * cada pestaña de arriba con sus secciones y, dentro, sus elementos
 * (`sección.elemento`). Lleva todas las claves de `PoolKey`: si se añade una,
 * TypeScript pide ponerla aquí.
 */

import type { PoolKey } from '@sanatorio/contracts'

/** Dónde va cada clave en el árbol del panel. */
type Group = 'expediente' | 'ayuda' | 'calendario' | 'clusters' | 'datos' | 'extra'

const TREE: Record<PoolKey, Group> = {
  expediente: 'expediente',
  'expediente.health': 'expediente',
  'expediente.hours': 'expediente',
  'expediente.network': 'expediente',
  'expediente.achievements': 'expediente',
  'expediente.ranking': 'expediente',
  consulta: 'ayuda',
  'consulta.map': 'ayuda',
  guardia: 'ayuda',
  tablon: 'ayuda',
  'tablon.graph': 'ayuda',
  'tablon.corrections': 'ayuda',
  terapia: 'ayuda',
  pizarras: 'ayuda',
  notgames: 'ayuda',
  'notgames.chess': 'ayuda',
  'notgames.review': 'ayuda',
  gitcourse: 'ayuda',
  'gitcourse.groups': 'ayuda',
  shellcourse: 'ayuda',
  estadisticas: 'ayuda',
  calendario: 'calendario',
  clusters: 'clusters',
  'clusters.online': 'clusters',
  'clusters.broken': 'clusters',
  'clusters.report': 'clusters',
  red: 'datos',
  'red.rankings': 'datos',
  'red.seats': 'datos',
  avance: 'datos',
  'avance.compare': 'datos',
  examenes: 'datos',
  'examenes.live': 'datos',
  'examenes.stats': 'datos',
  clicker: 'extra',
  focus: 'extra',
  'focus.stats': 'extra',
  mailbox: 'extra',
  people: 'extra',
  broadcasts: 'extra',
  tickets: 'extra',
}

export const GROUPS: readonly Group[] = [
  'expediente',
  'ayuda',
  'calendario',
  'clusters',
  'datos',
  'extra',
]

/** Las secciones (claves sin punto) de un grupo, cada una con sus elementos. */
export function sectionsOf(group: Group): { key: PoolKey; items: PoolKey[] }[] {
  const keys = (Object.keys(TREE) as PoolKey[]).filter((key) => TREE[key] === group)

  return keys
    .filter((key) => !key.includes('.'))
    .map((key) => ({ key, items: keys.filter((item) => item.startsWith(`${key}.`)) }))
}
