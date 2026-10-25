/**
 * El curso de git en el idioma de la web: los textos de cada punto y de cada
 * prueba de grupo. Los comandos, ficheros y ramas son los mismos en todos los
 * idiomas (los comprueba el motor), así que solo cambia lo que se lee.
 */

import { courseLang } from '@sanatorio/course'

import { GROUPS_FR, LEVELS_FR, MISSION_ITEMS_FR } from '../fr/index.js'
import type { GroupMission, MissionItem } from '../groups.js'
import { filled } from '../groups.js'
import type { Level } from '../types.js'
import { BASICS_EN } from './basics.js'
import { GROUPS_EN, MISSION_ITEMS_EN } from './groups.js'
import { SHARED_EN } from './shared.js'
import type { LevelText } from './types.js'

const LEVELS_EN: Readonly<Record<string, LevelText>> = { ...BASICS_EN, ...SHARED_EN }

type Table<T> = Readonly<Record<string, T>>

/**
 * El texto de `key` en ese idioma, o nada si se lee en español (el original).
 * Lo que le falte al francés sale en inglés, como en el resto de la web.
 */
function textIn<T>(key: string, lang: string, en: Table<T>, fr: Table<T>): T | undefined {
  const course = courseLang(lang)

  if (course === 'es') return undefined

  return (course === 'fr' ? fr[key] : undefined) ?? en[key]
}

/** Un punto del curso con sus textos en ese idioma (los que falten, en español). */
export function levelIn(level: Level, lang: string): Level {
  const text = textIn(level.id, lang, LEVELS_EN, LEVELS_FR)

  return text === undefined ? level : { ...level, ...text }
}

/** Una prueba de grupo con su historia y sus tareas en ese idioma. */
export function missionIn(mission: GroupMission, lang: string): GroupMission {
  const text = textIn(mission.gate, lang, GROUPS_EN, GROUPS_FR)

  return text === undefined ? mission : { ...mission, ...text }
}

/** El texto de una misión en ese idioma, rellenado para su persona. */
export function missionItemIn(
  item: Pick<MissionItem, 'text' | 'login' | 'key' | 'n'>,
  lang: string,
): string {
  const template = textIn(item.key, lang, MISSION_ITEMS_EN, MISSION_ITEMS_FR)

  if (template === undefined) return item.text

  return item.login === null ? template : filled(template, { login: item.login, n: item.n ?? 0 })
}

export { LEVELS_EN }
