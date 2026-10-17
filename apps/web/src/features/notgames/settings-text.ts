import type { QuizSettings } from '@sanatorio/contracts'

import type { Translate } from '../../shared/i18n'

/** Los ajustes de una sala en una línea: «Rápidas y largas · De fácil a difícil · 10 preguntas». */
export function settingsText(t: Translate, settings: QuizSettings): string {
  return [
    t(`notgames.kinds.${settings.kinds}`),
    t(`notgames.difficulty.${settings.difficulty}`),
    t(`notgames.pool.${settings.pool}`),
    t('notgames.nQuestions', { n: settings.questions }),
    settings.competitive ? t('notgames.competitiveShort') : '',
    settings.minCircle === null ? '' : t('notgames.fromCircle', { n: settings.minCircle }),
  ]
    .filter((part) => part !== '')
    .join(' · ')
}
