import type { Translate } from '../../shared/i18n'

/** "Martes y jueves" a partir de `[2, 4]`. */
export function dayNames(days: readonly number[], t: Translate): string {
  const names = t('days.long').split(',')
  const list = days.map((day) => names[day - 1] ?? '')
  const last = list.at(-1)

  if (list.length <= 1 || last === undefined) {
    return list.join('')
  }

  return `${list.slice(0, -1).join(', ')}${t('days.and')}${last.toLowerCase()}`
}
